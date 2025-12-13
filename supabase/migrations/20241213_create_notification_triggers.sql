-- 알림 트리거 함수 생성
-- 정비 기록 및 PM 일정 변경 시 자동으로 알림을 발송하는 트리거

-- ============================================
-- 1. 긴급 수리 알림 트리거
-- ============================================

-- 긴급 수리 등록 시 알림 전송 함수
CREATE OR REPLACE FUNCTION notify_emergency_repair()
RETURNS TRIGGER AS $$
DECLARE
    equipment_record RECORD;
    edge_function_url TEXT;
BEGIN
    -- 긴급 수리(EM)인 경우에만 실행
    IF NEW.repair_type_id IS NOT NULL THEN
        -- repair_type이 'EM'인지 확인
        PERFORM 1 FROM repair_types WHERE id = NEW.repair_type_id AND code = 'EM';
        IF NOT FOUND THEN
            RETURN NEW;
        END IF;
    ELSE
        RETURN NEW;
    END IF;

    -- 설비 정보 조회
    SELECT equipment_code, equipment_name, equipment_name_ko, building
    INTO equipment_record
    FROM equipments
    WHERE id = NEW.equipment_id;

    -- Edge Function 호출 (pg_net 확장 필요)
    -- 참고: pg_net 확장이 없는 경우 이 부분은 주석 처리하고
    -- 클라이언트에서 직접 Edge Function을 호출하세요

    /*
    SELECT net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/notify-emergency',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := jsonb_build_object(
            'equipment_code', equipment_record.equipment_code,
            'equipment_name', COALESCE(equipment_record.equipment_name_ko, equipment_record.equipment_name),
            'maintenance_id', NEW.id::text,
            'symptom', NEW.symptom,
            'building', equipment_record.building
        )
    );
    */

    -- 대안: user_notifications 테이블에 직접 삽입
    INSERT INTO user_notifications (user_id, type, title, message, data)
    SELECT
        u.id,
        'emergency',
        '긴급수리 발생',
        '[' || equipment_record.equipment_code || '] ' || COALESCE(NEW.symptom, '긴급수리가 요청되었습니다.'),
        jsonb_build_object(
            'equipment_code', equipment_record.equipment_code,
            'maintenance_id', NEW.id::text,
            'building', equipment_record.building
        )
    FROM users u
    WHERE u.role IN (1, 2, 3)  -- Admin, Supervisor, Technician
      AND u.is_active = true;

    RAISE NOTICE '[Trigger] 긴급 수리 알림 생성: %', equipment_record.equipment_code;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_notify_emergency_repair ON maintenance_records;
CREATE TRIGGER trigger_notify_emergency_repair
    AFTER INSERT ON maintenance_records
    FOR EACH ROW
    EXECUTE FUNCTION notify_emergency_repair();


-- ============================================
-- 2. 장시간 수리 알림 (스케줄러로 처리 권장)
-- ============================================

-- 장시간 수리 체크 및 알림 함수
-- 이 함수는 pg_cron 또는 외부 스케줄러에서 주기적으로 호출
CREATE OR REPLACE FUNCTION check_long_repairs(threshold_minutes INTEGER DEFAULT 120)
RETURNS INTEGER AS $$
DECLARE
    long_repair RECORD;
    notification_count INTEGER := 0;
    duration_minutes INTEGER;
BEGIN
    -- 진행 중인 수리 중 기준 시간 초과한 건 조회
    FOR long_repair IN
        SELECT
            mr.id,
            mr.equipment_id,
            mr.technician_id,
            mr.start_time,
            e.equipment_code,
            e.equipment_name_ko,
            EXTRACT(EPOCH FROM (NOW() - mr.start_time)) / 60 AS duration_mins
        FROM maintenance_records mr
        JOIN equipments e ON e.id = mr.equipment_id
        WHERE mr.status = 'in_progress'
          AND mr.start_time < NOW() - (threshold_minutes || ' minutes')::INTERVAL
    LOOP
        duration_minutes := FLOOR(long_repair.duration_mins);

        -- 이미 알림이 발송되었는지 확인 (중복 방지)
        IF NOT EXISTS (
            SELECT 1 FROM user_notifications
            WHERE data->>'maintenance_id' = long_repair.id::text
              AND type = 'long_repair'
              AND created_at > NOW() - INTERVAL '1 hour'
        ) THEN
            -- 담당자와 관리자에게 알림
            INSERT INTO user_notifications (user_id, type, title, message, data)
            SELECT
                u.id,
                'long_repair',
                '장시간 수리 경고',
                '[' || long_repair.equipment_code || '] 수리가 ' ||
                FLOOR(duration_minutes / 60) || '시간 ' ||
                (duration_minutes % 60) || '분을 초과했습니다.',
                jsonb_build_object(
                    'equipment_code', long_repair.equipment_code,
                    'maintenance_id', long_repair.id::text,
                    'duration_minutes', duration_minutes
                )
            FROM users u
            WHERE (u.id = long_repair.technician_id OR u.role IN (1, 2))
              AND u.is_active = true;

            notification_count := notification_count + 1;
        END IF;
    END LOOP;

    RETURN notification_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- 3. 수리 완료 알림 트리거
-- ============================================

CREATE OR REPLACE FUNCTION notify_repair_completed()
RETURNS TRIGGER AS $$
DECLARE
    equipment_record RECORD;
BEGIN
    -- 상태가 'completed'로 변경된 경우에만
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN

        -- 설비 정보 조회
        SELECT equipment_code, equipment_name, equipment_name_ko
        INTO equipment_record
        FROM equipments
        WHERE id = NEW.equipment_id;

        -- 관리자에게 완료 알림
        INSERT INTO user_notifications (user_id, type, title, message, data)
        SELECT
            u.id,
            'completed',
            '수리 완료',
            '[' || equipment_record.equipment_code || '] 설비 수리가 완료되었습니다.' ||
            CASE WHEN NEW.rating IS NOT NULL THEN ' (평점: ' || NEW.rating || '/10)' ELSE '' END,
            jsonb_build_object(
                'equipment_code', equipment_record.equipment_code,
                'maintenance_id', NEW.id::text,
                'rating', NEW.rating
            )
        FROM users u
        WHERE u.role IN (1, 2)  -- Admin, Supervisor
          AND u.is_active = true
          AND u.id != NEW.technician_id;  -- 담당자 제외 (본인은 알 필요 없음)

        RAISE NOTICE '[Trigger] 수리 완료 알림 생성: %', equipment_record.equipment_code;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_repair_completed ON maintenance_records;
CREATE TRIGGER trigger_notify_repair_completed
    AFTER UPDATE ON maintenance_records
    FOR EACH ROW
    EXECUTE FUNCTION notify_repair_completed();


-- ============================================
-- 4. PM 일정 알림 (스케줄러로 처리)
-- ============================================

-- PM 일정 알림 함수
-- 이 함수는 pg_cron 또는 외부 스케줄러에서 매일 호출
CREATE OR REPLACE FUNCTION check_pm_schedules_and_notify()
RETURNS TABLE(
    notified_today INTEGER,
    notified_tomorrow INTEGER,
    notified_3days INTEGER
) AS $$
DECLARE
    today_count INTEGER := 0;
    tomorrow_count INTEGER := 0;
    three_days_count INTEGER := 0;
    pm_record RECORD;
BEGIN
    -- 오늘 예정된 PM (아직 알림 안 보낸 것)
    FOR pm_record IN
        SELECT
            ps.id,
            ps.assigned_technician_id,
            e.equipment_code,
            pt.name_ko AS template_name
        FROM pm_schedules ps
        JOIN equipments e ON e.id = ps.equipment_id
        JOIN pm_templates pt ON pt.id = ps.template_id
        WHERE ps.scheduled_date = CURRENT_DATE
          AND ps.status = 'scheduled'
          AND (ps.notified_today IS NULL OR ps.notified_today = false)
    LOOP
        -- 담당자에게 알림
        IF pm_record.assigned_technician_id IS NOT NULL THEN
            INSERT INTO user_notifications (user_id, type, title, message, data)
            VALUES (
                pm_record.assigned_technician_id,
                'pm_schedule',
                'PM 일정 알림 (오늘)',
                '[' || pm_record.equipment_code || '] ' || pm_record.template_name || ' 정기점검 예정',
                jsonb_build_object(
                    'equipment_code', pm_record.equipment_code,
                    'schedule_id', pm_record.id::text,
                    'scheduled_date', CURRENT_DATE::text
                )
            );
        END IF;

        -- 알림 발송 표시
        UPDATE pm_schedules SET notified_today = true WHERE id = pm_record.id;
        today_count := today_count + 1;
    END LOOP;

    -- 내일 예정된 PM
    FOR pm_record IN
        SELECT
            ps.id,
            ps.assigned_technician_id,
            e.equipment_code,
            pt.name_ko AS template_name
        FROM pm_schedules ps
        JOIN equipments e ON e.id = ps.equipment_id
        JOIN pm_templates pt ON pt.id = ps.template_id
        WHERE ps.scheduled_date = CURRENT_DATE + INTERVAL '1 day'
          AND ps.status = 'scheduled'
          AND (ps.notified_1day IS NULL OR ps.notified_1day = false)
    LOOP
        IF pm_record.assigned_technician_id IS NOT NULL THEN
            INSERT INTO user_notifications (user_id, type, title, message, data)
            VALUES (
                pm_record.assigned_technician_id,
                'pm_schedule',
                'PM 일정 알림 (내일)',
                '[' || pm_record.equipment_code || '] ' || pm_record.template_name || ' 정기점검 예정',
                jsonb_build_object(
                    'equipment_code', pm_record.equipment_code,
                    'schedule_id', pm_record.id::text,
                    'scheduled_date', (CURRENT_DATE + INTERVAL '1 day')::text
                )
            );
        END IF;

        UPDATE pm_schedules SET notified_1day = true WHERE id = pm_record.id;
        tomorrow_count := tomorrow_count + 1;
    END LOOP;

    -- 3일 후 예정된 PM
    FOR pm_record IN
        SELECT
            ps.id,
            ps.assigned_technician_id,
            e.equipment_code,
            pt.name_ko AS template_name
        FROM pm_schedules ps
        JOIN equipments e ON e.id = ps.equipment_id
        JOIN pm_templates pt ON pt.id = ps.template_id
        WHERE ps.scheduled_date = CURRENT_DATE + INTERVAL '3 days'
          AND ps.status = 'scheduled'
          AND (ps.notified_3days IS NULL OR ps.notified_3days = false)
    LOOP
        IF pm_record.assigned_technician_id IS NOT NULL THEN
            INSERT INTO user_notifications (user_id, type, title, message, data)
            VALUES (
                pm_record.assigned_technician_id,
                'pm_schedule',
                'PM 일정 알림 (3일 전)',
                '[' || pm_record.equipment_code || '] ' || pm_record.template_name || ' 정기점검 예정',
                jsonb_build_object(
                    'equipment_code', pm_record.equipment_code,
                    'schedule_id', pm_record.id::text,
                    'scheduled_date', (CURRENT_DATE + INTERVAL '3 days')::text
                )
            );
        END IF;

        UPDATE pm_schedules SET notified_3days = true WHERE id = pm_record.id;
        three_days_count := three_days_count + 1;
    END LOOP;

    RETURN QUERY SELECT today_count, tomorrow_count, three_days_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- 5. Cron Job 설정 (pg_cron 확장 필요)
-- ============================================

-- pg_cron 확장이 활성화된 경우에만 실행
-- Supabase Dashboard에서 Extensions > pg_cron 활성화 필요

/*
-- 매 30분마다 장시간 수리 체크
SELECT cron.schedule(
    'check-long-repairs',
    '*//*30 * * * *',
    $$SELECT check_long_repairs(120)$$
);

-- 매일 오전 8시에 PM 일정 알림
SELECT cron.schedule(
    'notify-pm-schedules',
    '0 8 * * *',
    $$SELECT * FROM check_pm_schedules_and_notify()$$
);
*/


-- ============================================
-- 코멘트 추가
-- ============================================
COMMENT ON FUNCTION notify_emergency_repair() IS '긴급 수리 등록 시 자동 알림 트리거 함수';
COMMENT ON FUNCTION check_long_repairs(INTEGER) IS '장시간 수리 체크 및 알림 함수 (스케줄러 호출용)';
COMMENT ON FUNCTION notify_repair_completed() IS '수리 완료 시 자동 알림 트리거 함수';
COMMENT ON FUNCTION check_pm_schedules_and_notify() IS 'PM 일정 알림 함수 (스케줄러 호출용)';
