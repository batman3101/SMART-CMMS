-- FCM 푸시 알림을 위한 테이블 생성
-- 실행: supabase db push 또는 Supabase Dashboard에서 SQL 실행

-- ============================================
-- 1. 사용자 FCM 토큰 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS user_fcm_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fcm_token TEXT NOT NULL,
    device_type TEXT DEFAULT 'web' CHECK (device_type IN ('web', 'android', 'ios')),
    device_info JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- 동일 사용자-토큰 조합은 유니크
    UNIQUE(user_id, fcm_token)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_fcm_tokens_user_id ON user_fcm_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_fcm_tokens_is_active ON user_fcm_tokens(is_active);
CREATE INDEX IF NOT EXISTS idx_user_fcm_tokens_fcm_token ON user_fcm_tokens(fcm_token);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_user_fcm_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_fcm_tokens_updated_at ON user_fcm_tokens;
CREATE TRIGGER trigger_update_user_fcm_tokens_updated_at
    BEFORE UPDATE ON user_fcm_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_user_fcm_tokens_updated_at();

-- RLS 정책
ALTER TABLE user_fcm_tokens ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 토큰만 조회/수정 가능
CREATE POLICY "Users can view own tokens" ON user_fcm_tokens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens" ON user_fcm_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens" ON user_fcm_tokens
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens" ON user_fcm_tokens
    FOR DELETE USING (auth.uid() = user_id);

-- 서비스 롤은 모든 토큰 접근 가능 (Edge Function용)
CREATE POLICY "Service role can access all tokens" ON user_fcm_tokens
    FOR ALL USING (auth.role() = 'service_role');


-- ============================================
-- 2. 알림 로그 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'info',
    title TEXT NOT NULL,
    body TEXT,
    data JSONB DEFAULT '{}',
    target_users UUID[] DEFAULT '{}',
    target_roles INTEGER[] DEFAULT '{}',
    target_departments TEXT[] DEFAULT '{}',
    is_broadcast BOOLEAN DEFAULT false,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    errors TEXT[] DEFAULT '{}',
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at);

-- RLS 정책 (관리자만 조회 가능)
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view notification logs" ON notification_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 1
        )
    );

CREATE POLICY "Service role can manage notification logs" ON notification_logs
    FOR ALL USING (auth.role() = 'service_role');


-- ============================================
-- 3. 사용자별 알림 테이블 (인앱 알림)
-- ============================================
CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'info',
    title TEXT NOT NULL,
    message TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON user_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at DESC);

-- RLS 정책
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON user_notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON user_notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all notifications" ON user_notifications
    FOR ALL USING (auth.role() = 'service_role');


-- ============================================
-- 4. 푸시 알림 설정 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS user_push_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    enabled BOOLEAN DEFAULT true,
    emergency BOOLEAN DEFAULT true,
    long_repair BOOLEAN DEFAULT true,
    completed BOOLEAN DEFAULT true,
    pm_schedule BOOLEAN DEFAULT true,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_user_push_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_push_settings_updated_at ON user_push_settings;
CREATE TRIGGER trigger_update_user_push_settings_updated_at
    BEFORE UPDATE ON user_push_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_user_push_settings_updated_at();

-- RLS 정책
ALTER TABLE user_push_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own push settings" ON user_push_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push settings" ON user_push_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push settings" ON user_push_settings
    FOR UPDATE USING (auth.uid() = user_id);


-- ============================================
-- 코멘트 추가
-- ============================================
COMMENT ON TABLE user_fcm_tokens IS '사용자별 FCM 토큰 저장 테이블';
COMMENT ON TABLE notification_logs IS '푸시 알림 전송 로그';
COMMENT ON TABLE user_notifications IS '사용자별 인앱 알림';
COMMENT ON TABLE user_push_settings IS '사용자별 푸시 알림 설정';
