-- maintenance_records 테이블에 used_parts JSONB 컬럼 추가
-- 사용된 부품 정보를 저장: [{part_code, part_name, quantity}]

ALTER TABLE maintenance_records
ADD COLUMN IF NOT EXISTS used_parts JSONB DEFAULT '[]'::jsonb;

-- 컬럼 설명 추가
COMMENT ON COLUMN maintenance_records.used_parts IS '사용된 부품 목록 [{part_code, part_name, quantity}]';
