-- Equipment Grade (설비 등급) system
-- CNC machine classification per "Tiêu chuẩn phân cấp máy CNC Outs" (ALMUS 2026.01.09).
--
-- Model:
--   * equipment_grade_criteria — company-wide standard (the checksheet). NOT factory-scoped.
--   * equipment_grade_checks   — one current measurement per (equipment, criteria). Factory-scoped.
--                                Re-checkable/editable at any time (upsert on the unique key).
--   * equipments.grade         — cached overall grade = WORST included item grade.
--                                Recomputed automatically by a trigger whenever a check changes,
--                                so the grade is always re-evaluable (requirement #6).
--
-- The threshold -> item-grade logic lives in the app (src/lib/grade.ts, unit-tested); the DB only
-- performs the simple "worst included item grade" aggregation, so there is a single source of truth
-- for the complex comparison rules.

-- ============================================================
-- 1) equipments: cached overall grade
-- ============================================================
alter table public.equipments
  add column if not exists grade text,
  add column if not exists grade_evaluated_at timestamptz;

alter table public.equipments drop constraint if exists equipments_grade_check;
alter table public.equipments
  add constraint equipments_grade_check
  check (grade is null or grade in ('A+', 'A', 'B', 'C', 'D'));

-- ============================================================
-- 2) Grade criteria master (the checksheet) — company-wide standard
-- ============================================================
create table if not exists public.equipment_grade_criteria (
  id                uuid primary key default gen_random_uuid(),
  item_no           int  not null unique,                 -- stable ordinal (1..n)
  ref_no            int,                                   -- original reference number in the standard
  category_ko       text, category_vi  text,
  item_ko           text, item_vi      text,
  position_ko       text, position_vi  text,
  condition_ko      text, condition_vi text,
  device_ko         text, device_vi    text,
  unit              text,
  comparison        text not null
                    check (comparison in ('lower_is_better','higher_is_better','range','pass_fail','level_count')),
  threshold_a_plus  numeric, threshold_a numeric, threshold_b numeric, threshold_c numeric,
  range_min         numeric, range_max  numeric,
  raw_a_plus        text, raw_a text, raw_b text, raw_c text, raw_d text,  -- human-readable standard per grade
  included_in_grade boolean not null default true,        -- excluded items are measured but do not affect the grade
  display_order     int  not null default 0,
  is_active         boolean not null default true,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);
comment on table public.equipment_grade_criteria is 'CNC 설비 등급 평가 기준 (체크시트 항목 마스터, 전사 공통 표준)';

-- ============================================================
-- 3) Per-equipment grade checks — factory-scoped, one current row per (equipment, criteria)
-- ============================================================
create table if not exists public.equipment_grade_checks (
  id             uuid primary key default gen_random_uuid(),
  equipment_id   uuid not null references public.equipments(id) on delete cascade,
  criteria_id    uuid not null references public.equipment_grade_criteria(id) on delete cascade,
  factory_id     text not null,
  measured_value numeric,            -- numeric comparisons (lower/higher/range/level_count)
  measured_bool  boolean,            -- pass_fail / range pass
  measured_text  text,               -- raw entry (e.g. "OK"/"NG")
  item_grade     text check (item_grade is null or item_grade in ('A+','A','B','C','D')),
  checked_by     uuid references public.users(id) on delete set null,
  checked_at     timestamptz default now(),
  notes          text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  unique (equipment_id, criteria_id)
);
comment on table public.equipment_grade_checks is '설비별 등급 평가 측정 기록 (상시 재평가/수정 가능, equipment+criteria upsert)';

create index if not exists idx_grade_checks_equipment on public.equipment_grade_checks(equipment_id);
create index if not exists idx_grade_checks_criteria  on public.equipment_grade_checks(criteria_id);
create index if not exists idx_grade_checks_factory   on public.equipment_grade_checks(factory_id);

-- updated_at maintenance (reuses existing helper)
drop trigger if exists trg_grade_criteria_updated_at on public.equipment_grade_criteria;
create trigger trg_grade_criteria_updated_at
  before update on public.equipment_grade_criteria
  for each row execute function public.update_updated_at_column();

drop trigger if exists trg_grade_checks_updated_at on public.equipment_grade_checks;
create trigger trg_grade_checks_updated_at
  before update on public.equipment_grade_checks
  for each row execute function public.update_updated_at_column();

-- ============================================================
-- 4) Recompute equipment overall grade = WORST included item grade
-- ============================================================
create or replace function public.recompute_equipment_grade(p_equipment_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_max_rank int;
  v_grade    text;
begin
  -- Worst grade wins (a machine is only as good as its weakest included measurement).
  select max(
           case ch.item_grade
             when 'D' then 4 when 'C' then 3 when 'B' then 2 when 'A' then 1 when 'A+' then 0
           end)
    into v_max_rank
    from public.equipment_grade_checks ch
    join public.equipment_grade_criteria c on c.id = ch.criteria_id
   where ch.equipment_id = p_equipment_id
     and ch.item_grade is not null
     and c.included_in_grade = true
     and c.is_active = true;

  v_grade := case v_max_rank
               when 4 then 'D' when 3 then 'C' when 2 then 'B' when 1 then 'A' when 0 then 'A+'
               else null
             end;

  update public.equipments
     set grade = v_grade,
         grade_evaluated_at = case when v_grade is null then null else now() end,
         updated_at = now()
   where id = p_equipment_id;
end;
$$;

create or replace function public.trg_recompute_equipment_grade()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recompute_equipment_grade(old.equipment_id);
    return old;
  end if;
  perform public.recompute_equipment_grade(new.equipment_id);
  return new;
end;
$$;

drop trigger if exists trg_grade_checks_recompute on public.equipment_grade_checks;
create trigger trg_grade_checks_recompute
  after insert or update or delete on public.equipment_grade_checks
  for each row execute function public.trg_recompute_equipment_grade();

-- When a manager changes whether a criterion is active or counts toward the grade,
-- re-aggregate the overall grade for every equipment that has a check on that criterion
-- (uses the same pure-SQL aggregation; thresholds are not involved here).
create or replace function public.trg_criteria_recompute_grades()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (new.included_in_grade is distinct from old.included_in_grade)
     or (new.is_active is distinct from old.is_active) then
    perform public.recompute_equipment_grade(s.equipment_id)
      from (select distinct equipment_id
              from public.equipment_grade_checks
             where criteria_id = new.id) s;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_grade_criteria_recompute on public.equipment_grade_criteria;
create trigger trg_grade_criteria_recompute
  after update on public.equipment_grade_criteria
  for each row execute function public.trg_criteria_recompute_grades();

-- These run only via triggers (as the function owner); no client role should call them
-- directly via /rest/v1/rpc. Revoke from PUBLIC so anon/authenticated do not inherit EXECUTE.
revoke execute on function public.recompute_equipment_grade(uuid)        from public;
revoke execute on function public.trg_recompute_equipment_grade()        from public;
revoke execute on function public.trg_criteria_recompute_grades()        from public;

-- ============================================================
-- 5) Row Level Security
-- ============================================================
alter table public.equipment_grade_criteria enable row level security;
alter table public.equipment_grade_checks  enable row level security;

-- Criteria: readable by all authenticated users; writable by managers/admin (role <= 2).
drop policy if exists grade_criteria_select on public.equipment_grade_criteria;
create policy grade_criteria_select on public.equipment_grade_criteria
  for select to authenticated using (true);

drop policy if exists grade_criteria_insert on public.equipment_grade_criteria;
create policy grade_criteria_insert on public.equipment_grade_criteria
  for insert to authenticated
  with check ((select public.get_user_role((select auth.uid()))) <= 2);

drop policy if exists grade_criteria_update on public.equipment_grade_criteria;
create policy grade_criteria_update on public.equipment_grade_criteria
  for update to authenticated
  using      ((select public.get_user_role((select auth.uid()))) <= 2)
  with check ((select public.get_user_role((select auth.uid()))) <= 2);

drop policy if exists grade_criteria_delete on public.equipment_grade_criteria;
create policy grade_criteria_delete on public.equipment_grade_criteria
  for delete to authenticated
  using ((select public.get_user_role((select auth.uid()))) <= 2);

-- Checks: factory-scoped (mirrors pm_executions). Admin (role 1) sees/writes across factories.
drop policy if exists grade_checks_select on public.equipment_grade_checks;
create policy grade_checks_select on public.equipment_grade_checks
  for select to authenticated
  using ((factory_id = (select public.get_user_factory_id((select auth.uid()))))
         or ((select public.get_user_role((select auth.uid()))) = 1));

drop policy if exists grade_checks_insert on public.equipment_grade_checks;
create policy grade_checks_insert on public.equipment_grade_checks
  for insert to authenticated
  with check ((factory_id = (select public.get_user_factory_id((select auth.uid()))))
              or ((select public.get_user_role((select auth.uid()))) = 1));

drop policy if exists grade_checks_update on public.equipment_grade_checks;
create policy grade_checks_update on public.equipment_grade_checks
  for update to authenticated
  using      ((factory_id = (select public.get_user_factory_id((select auth.uid()))))
              or ((select public.get_user_role((select auth.uid()))) = 1))
  with check ((factory_id = (select public.get_user_factory_id((select auth.uid()))))
              or ((select public.get_user_role((select auth.uid()))) = 1));

drop policy if exists grade_checks_delete on public.equipment_grade_checks;
create policy grade_checks_delete on public.equipment_grade_checks
  for delete to authenticated
  using ((factory_id = (select public.get_user_factory_id((select auth.uid()))))
         or ((select public.get_user_role((select auth.uid()))) = 1));

-- ============================================================
-- 6) Seed the standard checksheet (24 items, idempotent)
-- ============================================================
insert into public.equipment_grade_criteria (
  item_no, ref_no, category_ko, category_vi, item_ko, item_vi, position_ko, position_vi,
  condition_ko, condition_vi, device_ko, device_vi, unit, comparison,
  threshold_a_plus, threshold_a, threshold_b, threshold_c, range_min, range_max,
  raw_a_plus, raw_a, raw_b, raw_c, raw_d, included_in_grade, display_order
) values
(1, 1, '테이블', 'Bàn máy', '머신 레벨링(수평)', 'Cân bằng máy', 'X축', 'Trục X', NULL, NULL, '레벨링기', 'Leveling', 'μm', 'lower_is_better', 20, 30, 40, 50, NULL, NULL, '≤20', '≤30', '≤40', '≤50', '>50', false, 1),
(2, 2, '테이블', 'Bàn máy', '머신 레벨링(수평)', 'Cân bằng máy', 'Y축', 'Trục Y', NULL, NULL, '레벨링기', 'Leveling', 'μm', 'lower_is_better', 20, 30, 40, 50, NULL, NULL, '≤20', '≤30', '≤40', '≤50', '>50', false, 2),
(3, 3, '스핀들 & 모터 스핀들', 'Spindle & Motor spindle', '스핀들 런아웃', 'Độ đảo trục chính', '런아웃 샤프트(커플링)', 'Runout Shaft (Couplink)', NULL, NULL, '다이얼 게이지', 'Đồng hồ so', 'μm', 'lower_is_better', 3, 6, 8, 10, NULL, NULL, '≤ 3', '≤ 6', '≤ 8', '≤ 10', '> 10', true, 3),
(4, 4, '스핀들 & 모터 스핀들', 'Spindle & Motor spindle', '스핀들 런아웃', 'Độ đảo trục chính', '테스트바 0mm 위치', 'Vị trí 0mm ở testbar', NULL, NULL, '다이얼 게이지 & 테스트바', 'Đồng hồ so và Testbar', 'μm', 'lower_is_better', 8, 15, 25, 35, NULL, NULL, '≤ 8', '≤ 15', '≤ 25', '≤ 35', '> 35', true, 4),
(5, 5, '스핀들 & 모터 스핀들', 'Spindle & Motor spindle', '스핀들 런아웃', 'Độ đảo trục chính', '테스트바 200mm 위치', 'Vị trí 200mm ở testbar', NULL, NULL, '다이얼 게이지 & 테스트바', 'Đồng hồ so và Testbar', 'μm', 'lower_is_better', 15, 30, 40, 50, NULL, NULL, '≤ 15', '≤ 30', '≤ 40', '≤ 50', '> 50', true, 5),
(6, 6, '스핀들 & 모터 스핀들', 'Spindle & Motor spindle', '스핀들 축과 Z축 이동 간 평행도', 'Độ song song giữa trục chính và trục Z', 'Z-X 평면', 'Phương Z-X', '테스트바 200mm 이동', 'Hành trình 200 mm trên testbar', '다이얼 게이지 & 테스트바', 'Đồng hồ so và Testbar', 'μm', 'lower_is_better', 15, 20, 25, 30, NULL, NULL, '≤15', '≤20', '≤25', '≤30', '>30', true, 6),
(7, 7, '스핀들 & 모터 스핀들', 'Spindle & Motor spindle', '스핀들 축과 Z축 이동 간 평행도', 'Độ song song giữa trục chính và trục Z', 'Z-Y 평면', 'Phương Z-Y', '테스트바 200mm 이동', 'Hành trình 200 mm trên testbar', '다이얼 게이지 & 테스트바', 'Đồng hồ so và Testbar', 'μm', 'lower_is_better', 15, 20, 25, 30, NULL, NULL, '≤15', '≤20', '≤25', '≤30', '>30', true, 7),
(8, 8, '스핀들 & 모터 스핀들', 'Spindle & Motor spindle', '스핀들 클램핑력', 'Lực kẹp trục chính', '스핀들', 'Trục chính', NULL, NULL, 'Dynaforce (SBT30-DF10)', 'Dynaforce (SBT30-DF10)', 'KN', 'higher_is_better', 2.7, 2.2, 2.0, 1.8, NULL, NULL, '≥ 2.7', '≥ 2.2', '≥ 2.0', '≥ 1.8', '< 1.8', true, 8),
(9, 9, '스핀들 & 모터 스핀들', 'Spindle & Motor spindle', '스핀들 부하', 'Tải trục chính', '모터 스핀들', 'Motor spindle', '20 KRPM 속도', 'Tốc độ 20KRPM', 'CNC 모니터', 'Monitor CNC', '%', 'lower_is_better', 27, 30, 32, 36, NULL, NULL, '≤27', '≤30', '≤32', '≤36', '> 36', true, 9),
(10, 10, '스핀들 & 모터 스핀들', 'Spindle & Motor spindle', '스핀들 부하', 'Tải trục chính', '모터 스핀들', 'Motor spindle', '22 KRPM 속도', 'Tốc độ 22KRPM', 'CNC 모니터', 'Monitor CNC', '%', 'lower_is_better', 39, 41, 44, 46, NULL, NULL, '≤39', '≤41', '≤44', '≤46', '> 46', true, 10),
(11, 13, '스핀들 & 모터 스핀들', 'Spindle & Motor spindle', '스핀들 밸런서', 'Balancer spindle', '스핀들 모터', 'Động cơ trục chính', NULL, NULL, '밸런서 SB-7707 RB', 'Balancer SB-7707 RB', 'μm', 'level_count', 9, 8, 7, 6, NULL, NULL, '9 cấp tốc độ <1 μm', '8 cấp tốc độ <1 μm', '7 cấp tốc độ <1 μm', '6 cấp tốc độ <1 μm', 'Dưới 6 cấp tốc độ < 1μm', true, 11),
(12, 14, '스핀들 & 모터 스핀들', 'Spindle & Motor spindle', '스핀들 밸런서', 'Balancer spindle', '스핀들 어셈블리', 'Trục chính (Spindle assy)', NULL, NULL, '밸런서 SB-7707 RB', 'Balancer SB-7707 RB', 'μm', 'level_count', 9, 8, 7, 6, NULL, NULL, '9 cấp tốc độ <1 μm', '8 cấp tốc độ <1 μm', '7 cấp tốc độ <1 μm', '6 cấp tốc độ <1 μm', 'Dưới 6 cấp tốc độ < 1μm', true, 12),
(13, 15, '볼스크류 & LM 가이드', 'Ballscrew, LM guide', '백래시', 'Backlash', 'X축 백래시', 'Độ rơ trục X', NULL, NULL, '다이얼 게이지', 'Đồng hồ so', 'μm', 'lower_is_better', 8.5, 25, 30, 40, NULL, NULL, '≤8.5', '≤25', '≤30', '≤ 40', '> 40', true, 13),
(14, 16, '볼스크류 & LM 가이드', 'Ballscrew, LM guide', '백래시', 'Backlash', 'Y축 백래시', 'Độ rơ trục Y', NULL, NULL, '다이얼 게이지', 'Đồng hồ so', 'μm', 'lower_is_better', 8.5, 20, 30, 40, NULL, NULL, '≤8.5', '≤ 20', '≤ 30', '≤ 40', '> 40', true, 14),
(15, 21, '볼스크류 & LM 가이드', 'Ballscrew, LM guide', 'X축-Y축 이동 직각도', 'Độ vuông góc X-Y', 'X-Y축', 'Trục X-Y', '300mm 측정 이동', 'Hành trình 300 mm', '정반 GC-101, 다이얼 게이지', 'Thước đá vuông 300x300, đồng hồ so', 'μm', 'lower_is_better', 15, 20, 40, 50, NULL, NULL, '≤ 15', '≤ 20', '≤ 40', '≤ 50', '> 50', true, 15),
(16, 22, '볼스크류 & LM 가이드', 'Ballscrew, LM guide', 'Z축 이동과 테이블면 직각도', 'Độ vuông góc giữa chuyển động trục Z với mặt bàn', 'Z-X 평면', 'Phương Z-X', '300mm 측정 이동', 'Hành trình 300 mm', '정반 GC-101, 다이얼 게이지', 'Thước đá vuông 300x300, đồng hồ so', 'μm', 'lower_is_better', 15, 20, 40, 50, NULL, NULL, '≤ 15', '≤ 20', '≤ 40', '≤ 50', '> 50', true, 16),
(17, 23, '볼스크류 & LM 가이드', 'Ballscrew, LM guide', 'Z축 이동과 테이블면 직각도', 'Độ vuông góc giữa chuyển động trục Z với mặt bàn', 'Z-Y 평면', 'Phương Z-Y', '300mm 측정 이동', 'Hành trình 300 mm', '정반 GC-101, 다이얼 게이지', 'Thước đá vuông 300x300, đồng hồ so', 'μm', 'lower_is_better', 15, 20, 40, 50, NULL, NULL, '≤ 15', '≤ 20', '≤ 40', '≤ 50', '> 50', true, 17),
(18, 24, 'DDR/DDRT', 'DDR/DDRT', 'DDR 편차', 'Độ lệch của DDR', 'Z 방향', 'Theo phương Z', NULL, NULL, '다이얼 게이지', 'Đồng hồ so', 'μm', 'lower_is_better', 8, 10, 15, 20, NULL, NULL, '≤8', '≤10', '≤15', '≤20', '>20', true, 18),
(19, 25, 'DDR/DDRT', 'DDR/DDRT', 'DDR 편차', 'Độ lệch của DDR', 'Y 방향', 'Theo phương Y', NULL, NULL, '다이얼 게이지', 'Đồng hồ so', 'μm', 'lower_is_better', 5, 8, 10, 15, NULL, NULL, '≤5', '≤8', '≤10', '≤15', '>15', true, 19),
(20, 26, 'DDR/DDRT', 'DDR/DDRT', 'A축 공압 점검', 'Áp suất khí trục A', 'DDR', 'DDR', NULL, NULL, '공압 게이지', 'Đồng hồ đo áp suất khí', 'Kpa', 'range', NULL, NULL, NULL, NULL, 2, 10, '2~10', '2~10', '2~10', '2~10', 'Not', true, 20),
(21, 27, 'DDR/DDRT', 'DDR/DDRT', 'A축 브레이크 점검', 'Lực kẹp phanh trục A', 'DDR', 'DDR', NULL, NULL, 'CNC 모니터', 'Monitor CNC', 'OK/NG', 'pass_fail', NULL, NULL, NULL, NULL, NULL, NULL, 'OK', 'OK', 'OK', 'OK', 'NG', true, 21),
(22, 28, 'DDR/DDRT', 'DDR/DDRT', '스윙 진직도 점검', 'Kiểm tra độ thẳng swing', '스윙 0도', 'Swing ở 0 độ', '스윙 상부면', 'Mặt trên swing', '다이얼 게이지', 'Đồng hồ so', 'μm', 'lower_is_better', 30, 35, 40, 45, NULL, NULL, '≤30', '≤35', '≤40', '≤45', '>45', true, 22),
(23, 30, 'DDR/DDRT', 'DDR/DDRT', '스윙 진직도 점검', 'Kiểm tra độ thẳng swing', '스윙 90도', 'Swing ở 90 độ', '스윙 상부면', 'Mặt trên swing', '다이얼 게이지', 'Đồng hồ so', 'μm', 'lower_is_better', 40, 45, 50, 55, NULL, NULL, '≤40', '≤45', '≤50', '≤55', '>55', true, 23),
(24, 32, 'DDR/DDRT', 'DDR/DDRT', '스윙 진직도 점검', 'Kiểm tra độ thẳng swing', '스윙 270도', 'Swing ở 270 độ', '스윙 상부면', 'Mặt trên swing', '다이얼 게이지', 'Đồng hồ so', 'μm', 'lower_is_better', 40, 45, 50, 55, NULL, NULL, '≤40', '≤45', '≤50', '≤55', '>55', true, 24)
on conflict (item_no) do nothing;
