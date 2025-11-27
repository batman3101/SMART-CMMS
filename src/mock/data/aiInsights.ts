import type { AIInsight } from '@/types'

export const mockAIInsights: AIInsight[] = [
  {
    id: '1',
    insight_type: 'anomaly',
    title: 'CNC-023 이상 패턴 감지',
    description:
      'CNC-023 설비의 고장 빈도가 최근 2주간 평균 대비 150% 증가했습니다. 스핀들 베어링 마모가 의심되며, 예방정비를 권장합니다.',
    data: {
      equipment_code: 'CNC-023',
      failure_increase: 150,
      recommended_action: 'PM',
      urgency: 'high',
    },
    generated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    insight_type: 'prediction',
    title: '예지보전 추천: CNC-145',
    description:
      '과거 데이터 분석 결과, CNC-145 설비의 스핀들 모터 교체 시기가 약 2주 후로 예측됩니다. 미리 부품을 준비하시기 바랍니다.',
    data: {
      equipment_code: 'CNC-145',
      predicted_failure_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      component: 'spindle_motor',
      confidence: 0.87,
    },
    generated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    insight_type: 'recommendation',
    title: '수리 효율성 개선',
    description:
      '긴급수리 건의 평균 처리 시간이 지난달 대비 25% 개선되었습니다. 테크니션 김철수님의 응답 시간이 가장 빠릅니다.',
    data: {
      improvement_rate: 25,
      best_technician: '김철수',
      avg_response_time_minutes: 15,
      urgency: 'low',
    },
    generated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    insight_type: 'trend',
    title: '월요일 고장 집중 패턴',
    description:
      '분석 결과, 전체 고장의 35%가 월요일에 발생합니다. 주말 후 설비 점검 강화를 권장합니다. 특히 A동의 월요일 고장률이 높습니다.',
    data: {
      monday_failure_rate: 35,
      highest_building: 'A동',
      recommendation: 'weekend_post_check',
      urgency: 'medium',
    },
    generated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '5',
    insight_type: 'recommendation',
    title: '부품 재고 알림',
    description:
      '베어링 6205 (BRG-6205) 사용량이 증가 추세입니다. 현재 사용 패턴으로 볼 때 2주 내 재고 부족이 예상됩니다.',
    data: {
      part_code: 'BRG-6205',
      current_stock: 15,
      weekly_usage: 8,
      reorder_point: 20,
      urgency: 'medium',
    },
    generated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '6',
    insight_type: 'anomaly',
    title: 'DBR-002 품질 이슈 연관성',
    description:
      'DBR-002 설비에서 발생한 수리 건 중 40%가 품질 불량과 연관됩니다. 설비 정밀도 점검을 권장합니다.',
    data: {
      equipment_code: 'DBR-002',
      quality_related_rate: 40,
      recommended_action: 'precision_check',
      urgency: 'high',
    },
    generated_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
]

// AI Chat sample responses
export const mockAIChatResponses: Record<string, string> = {
  '이번 주 가장 많이 고장난 설비는':
    '이번 주 가장 많이 고장난 설비는 **CNC-023**입니다. 총 4건의 고장이 발생했으며, 주요 원인은 스핀들 베어링 마모로 추정됩니다. 예방정비를 권장드립니다.',

  'CNC-001 설비의 최근 수리 이력 알려줘':
    '**CNC-001** 설비의 최근 수리 이력입니다:\n\n1. 2025-01-24: PM (정기점검) - 완료\n2. 2025-01-20: 고장수리 (쿨런트 누유) - 완료\n3. 2025-01-15: PM (필터 교체) - 완료\n\n최근 30일간 총 3건의 수리가 있었으며, 평균 수리 시간은 1.5시간입니다.',

  'PM 일정이 다가오는 설비 목록':
    '향후 7일 내 PM 예정 설비 목록입니다:\n\n| 설비번호 | 예정일 | PM 유형 |\n|---------|--------|--------|\n| CNC-045 | 01/27 | 월간 PM |\n| CNC-089 | 01/28 | 월간 PM |\n| CL-002 | 01/29 | 분기 PM |\n| CNC-156 | 01/30 | 월간 PM |\n\n총 4대의 설비가 PM 예정입니다.',

  '평균 수리 시간이 가장 긴 수리 유형은':
    '수리 유형별 평균 수리 시간 분석 결과입니다:\n\n1. **긴급수리 (EM)**: 평균 3.2시간\n2. 고장수리 (BR): 평균 2.1시간\n3. 예지보전 (PD): 평균 1.8시간\n4. 제품불량 (QA): 평균 1.5시간\n5. 정기 유지보수 (PM): 평균 1.2시간\n\n긴급수리의 평균 시간이 가장 깁니다. 예방정비 강화로 긴급수리 발생을 줄이는 것을 권장합니다.',
}

export const getInsightsByType = (type: string) =>
  mockAIInsights.filter((i) => i.insight_type === type)

export const getRecentInsights = (limit: number = 5) =>
  mockAIInsights
    .sort(
      (a, b) =>
        new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime()
    )
    .slice(0, limit)
