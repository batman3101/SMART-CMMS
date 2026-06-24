-- Add two "Spindle vibration (스핀들 진동 / Độ rung trục chính)" items to the
-- Spindle & Motor spindle grade category, per the updated ALMUS CNC standard.
--   item_no 25: vibration @ Spindle, 3 KRPM    — ≤1.5 / ≤2.0 / ≤2.5 / ≤3.5 / >3.5 m/s²
--   item_no 26: vibration @ Spindle motor, 24 KRPM — ≤8.5 / ≤10 / ≤12 / ≤15 / >15 m/s²
-- Both are lower_is_better and count toward the grade. display_order 25/26 places
-- them at the end of the Spindle group (the checksheet buckets by category), so no
-- existing rows need renumbering. Category strings match the existing seed exactly
-- so the items group under "Spindle & Motor spindle".

insert into public.equipment_grade_criteria (
  item_no, ref_no, category_ko, category_vi, item_ko, item_vi, position_ko, position_vi,
  condition_ko, condition_vi, device_ko, device_vi, unit, comparison,
  threshold_a_plus, threshold_a, threshold_b, threshold_c, range_min, range_max,
  raw_a_plus, raw_a, raw_b, raw_c, raw_d, included_in_grade, display_order
) values
(25, 11, '스핀들 & 모터 스핀들', 'Spindle & Motor spindle', '스핀들 진동', 'Độ rung trục chính', '스핀들', 'Trục chính', '3 KRPM 속도', 'Tốc độ 3KRPM', '진동 측정기', 'Máy đo độ rung', 'm/s²', 'lower_is_better', 1.5, 2.0, 2.5, 3.5, NULL, NULL, '≤1.5', '≤2.0', '≤2.5', '≤3.5', '> 3.5', true, 25),
(26, 12, '스핀들 & 모터 스핀들', 'Spindle & Motor spindle', '스핀들 진동', 'Độ rung trục chính', '스핀들 모터', 'Động cơ trục chính', '24 KRPM 속도', 'Tốc độ 24KRPM', '진동 측정기', 'Máy đo độ rung', 'm/s²', 'lower_is_better', 8.5, 10, 12, 15, NULL, NULL, '≤8.5', '≤10', '≤12', '≤15', '> 15', true, 26)
on conflict (item_no) do update set
  ref_no = excluded.ref_no,
  category_ko = excluded.category_ko, category_vi = excluded.category_vi,
  item_ko = excluded.item_ko, item_vi = excluded.item_vi,
  position_ko = excluded.position_ko, position_vi = excluded.position_vi,
  condition_ko = excluded.condition_ko, condition_vi = excluded.condition_vi,
  device_ko = excluded.device_ko, device_vi = excluded.device_vi,
  unit = excluded.unit, comparison = excluded.comparison,
  threshold_a_plus = excluded.threshold_a_plus, threshold_a = excluded.threshold_a,
  threshold_b = excluded.threshold_b, threshold_c = excluded.threshold_c,
  range_min = excluded.range_min, range_max = excluded.range_max,
  raw_a_plus = excluded.raw_a_plus, raw_a = excluded.raw_a, raw_b = excluded.raw_b,
  raw_c = excluded.raw_c, raw_d = excluded.raw_d,
  included_in_grade = excluded.included_in_grade, display_order = excluded.display_order,
  is_active = true, updated_at = now();
