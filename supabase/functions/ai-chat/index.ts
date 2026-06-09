import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
  }>;
}

async function callGemini(prompt: string): Promise<string> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data: GeminiResponse = await response.json();
  return data.candidates[0]?.content?.parts[0]?.text || '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let language = 'ko';

  try {
    const body = await req.json();
    const message = body.message;
    language = body.language || 'ko';
    // Factory scoping: this function uses the service-role key (which bypasses RLS),
    // so every query MUST be scoped by factory_id explicitly or it leaks across factories.
    const factory_id = body.factory_id;

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!factory_id) {
      return new Response(
        JSON.stringify({ error: 'factory_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ========== 날짜 범위 계산 ==========
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // 이번 주 (월요일 시작)
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() + mondayOffset);
    const thisWeekStartStr = thisWeekStart.toISOString().split('T')[0];

    // 최근 7일, 30일
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    let contextData = `\n\n===== CMMS 데이터베이스 현황 (${today} 기준) =====`;

    // ========== 1. 설비 현황 (항상 조회) ==========
    const { count: totalEquipment } = await supabase
      .from('equipments')
      .select('*', { count: 'exact', head: true })
      .eq('factory_id', factory_id)
      .eq('is_active', true);

    const { data: statusData } = await supabase
      .from('equipments')
      .select('status')
      .eq('factory_id', factory_id)
      .eq('is_active', true);

    const statusCounts = { normal: 0, repair: 0, pm: 0, emergency: 0, standby: 0 };
    statusData?.forEach(e => {
      if (e.status in statusCounts) {
        statusCounts[e.status as keyof typeof statusCounts]++;
      }
    });

    contextData += `\n\n[1. 설비 현황]`;
    contextData += `\n- 총 활성 설비: ${totalEquipment}대`;
    contextData += `\n- 정상: ${statusCounts.normal}대`;
    contextData += `\n- 수리 중: ${statusCounts.repair}대`;
    contextData += `\n- PM 중: ${statusCounts.pm}대`;
    contextData += `\n- 긴급: ${statusCounts.emergency}대`;
    contextData += `\n- 대기: ${statusCounts.standby}대`;

    // 현재 수리/긴급 상태인 설비 목록
    if (statusCounts.repair > 0 || statusCounts.emergency > 0) {
      const { data: problemEquipments } = await supabase
        .from('equipments')
        .select('equipment_code, equipment_name, status')
        .eq('factory_id', factory_id)
        .eq('is_active', true)
        .in('status', ['repair', 'emergency'])
        .limit(20);

      if (problemEquipments && problemEquipments.length > 0) {
        contextData += `\n\n현재 수리/긴급 상태 설비:`;
        problemEquipments.forEach(e => {
          contextData += `\n  - ${e.equipment_code} (${e.equipment_name}): ${e.status === 'emergency' ? '긴급' : '수리 중'}`;
        });
      }
    }

    // ========== 2. 고장 빈도 통계 (항상 조회) ==========
    // 이번 주 데이터
    const { data: thisWeekMaint } = await supabase
      .from('maintenance_records')
      .select(`
        equipment_id,
        equipment:equipments(equipment_code, equipment_name),
        repair_type:repair_types(code, name)
      `)
      .eq('factory_id', factory_id)
      .gte('date', thisWeekStartStr);

    // 최근 7일 데이터
    const { data: last7DaysMaint } = await supabase
      .from('maintenance_records')
      .select(`
        equipment_id,
        equipment:equipments(equipment_code, equipment_name),
        repair_type:repair_types(code, name)
      `)
      .eq('factory_id', factory_id)
      .gte('date', sevenDaysAgo.toISOString().split('T')[0]);

    // 최근 30일 데이터
    const { data: last30DaysMaint } = await supabase
      .from('maintenance_records')
      .select(`
        equipment_id, date, symptom, duration_minutes, status,
        equipment:equipments(equipment_code, equipment_name),
        repair_type:repair_types(code, name),
        technician:users(name)
      `)
      .eq('factory_id', factory_id)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false });

    // 고장 빈도 계산 함수
    const calculateFailureRanking = (records: typeof thisWeekMaint) => {
      if (!records || records.length === 0) return [];

      const counts: Record<string, { count: number; code: string; name: string; types: Record<string, number> }> = {};

      records.forEach(r => {
        const eq = r.equipment as { equipment_code: string; equipment_name: string } | null;
        const rt = r.repair_type as { code: string; name: string } | null;
        if (!eq) return;

        const key = r.equipment_id;
        if (!counts[key]) {
          counts[key] = { count: 0, code: eq.equipment_code, name: eq.equipment_name, types: {} };
        }
        counts[key].count++;
        if (rt) {
          counts[key].types[rt.name] = (counts[key].types[rt.name] || 0) + 1;
        }
      });

      return Object.values(counts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    };

    contextData += `\n\n[2. 고장 빈도 통계]`;

    // 이번 주
    const thisWeekRanking = calculateFailureRanking(thisWeekMaint);
    contextData += `\n\n▶ 이번 주 (${thisWeekStartStr} ~ ${today}): 총 ${thisWeekMaint?.length || 0}건`;
    if (thisWeekRanking.length > 0) {
      contextData += `\n  고장 빈도 상위 설비:`;
      thisWeekRanking.forEach((item, i) => {
        const typeStr = Object.entries(item.types).map(([t, c]) => `${t}:${c}`).join(', ');
        contextData += `\n  ${i + 1}. ${item.code} (${item.name}): ${item.count}건 [${typeStr}]`;
      });
    } else {
      contextData += `\n  정비 기록 없음`;
    }

    // 최근 7일
    const last7DaysRanking = calculateFailureRanking(last7DaysMaint);
    contextData += `\n\n▶ 최근 7일: 총 ${last7DaysMaint?.length || 0}건`;
    if (last7DaysRanking.length > 0) {
      contextData += `\n  고장 빈도 상위 설비:`;
      last7DaysRanking.forEach((item, i) => {
        const typeStr = Object.entries(item.types).map(([t, c]) => `${t}:${c}`).join(', ');
        contextData += `\n  ${i + 1}. ${item.code} (${item.name}): ${item.count}건 [${typeStr}]`;
      });
    }

    // 최근 30일
    const last30DaysRanking = calculateFailureRanking(last30DaysMaint);
    contextData += `\n\n▶ 최근 30일: 총 ${last30DaysMaint?.length || 0}건`;
    if (last30DaysRanking.length > 0) {
      contextData += `\n  고장 빈도 상위 설비:`;
      last30DaysRanking.slice(0, 5).forEach((item, i) => {
        contextData += `\n  ${i + 1}. ${item.code}: ${item.count}건`;
      });
    }

    // ========== 3. 수리 유형별 통계 ==========
    contextData += `\n\n[3. 수리 유형별 통계 (최근 7일)]`;
    if (last7DaysMaint && last7DaysMaint.length > 0) {
      const typeCounts: Record<string, number> = {};
      last7DaysMaint.forEach(r => {
        const rt = r.repair_type as { name: string } | null;
        const typeName = rt?.name || '미분류';
        typeCounts[typeName] = (typeCounts[typeName] || 0) + 1;
      });
      Object.entries(typeCounts)
        .sort(([, a], [, b]) => b - a)
        .forEach(([type, count]) => {
          contextData += `\n- ${type}: ${count}건`;
        });
    }

    // ========== 4. 최근 정비 기록 ==========
    contextData += `\n\n[4. 최근 정비 기록 (최근 10건)]`;
    if (last30DaysMaint && last30DaysMaint.length > 0) {
      last30DaysMaint.slice(0, 10).forEach(r => {
        const eq = r.equipment as { equipment_code: string } | null;
        const rt = r.repair_type as { name: string } | null;
        const tech = r.technician as { name: string } | null;
        contextData += `\n- ${r.date}: ${eq?.equipment_code || 'N/A'} | ${rt?.name || 'N/A'} | ${r.status} | ${r.duration_minutes || 0}분 | ${tech?.name || 'N/A'}`;
      });

      // 평균 수리 시간
      const withDuration = last30DaysMaint.filter(r => r.duration_minutes && r.duration_minutes > 0);
      if (withDuration.length > 0) {
        const avgDuration = withDuration.reduce((sum, r) => sum + (r.duration_minutes || 0), 0) / withDuration.length;
        contextData += `\n\n평균 수리 시간 (30일): ${Math.round(avgDuration)}분`;
      }
    }

    // ========== 5. PM 일정 현황 ==========
    const { data: pmSchedules } = await supabase
      .from('pm_schedules')
      .select(`
        scheduled_date, status, priority,
        equipment:equipments(equipment_code, equipment_name),
        template:pm_templates(name)
      `)
      .eq('factory_id', factory_id)
      .in('status', ['scheduled', 'overdue', 'in_progress'])
      .order('scheduled_date', { ascending: true })
      .limit(20);

    contextData += `\n\n[5. PM 일정 현황]`;
    if (pmSchedules && pmSchedules.length > 0) {
      const overdue = pmSchedules.filter(s => s.status === 'overdue');
      const upcoming = pmSchedules.filter(s => s.status === 'scheduled');
      const inProgress = pmSchedules.filter(s => s.status === 'in_progress');

      contextData += `\n- 지연됨: ${overdue.length}건`;
      contextData += `\n- 예정됨: ${upcoming.length}건`;
      contextData += `\n- 진행 중: ${inProgress.length}건`;

      if (overdue.length > 0) {
        contextData += `\n\n지연된 PM:`;
        overdue.slice(0, 5).forEach(s => {
          const eq = s.equipment as { equipment_code: string } | null;
          const tmpl = s.template as { name: string } | null;
          contextData += `\n  - ${s.scheduled_date}: ${eq?.equipment_code || 'N/A'} - ${tmpl?.name || 'N/A'}`;
        });
      }
    } else {
      contextData += `\n예정된 PM 일정 없음`;
    }

    // ========== 6. 특정 설비 코드가 언급된 경우 상세 조회 ==========
    const equipmentCodeMatch = message.match(/[A-Z]{2,4}-\d{2,4}/gi);
    if (equipmentCodeMatch) {
      for (const code of equipmentCodeMatch.slice(0, 3)) {
        const equipmentCode = code.toUpperCase();

        const { data: equipment } = await supabase
          .from('equipments')
          .select('*, equipment_type:equipment_types(*)')
          .eq('factory_id', factory_id)
          .eq('equipment_code', equipmentCode)
          .single();

        if (equipment) {
          contextData += `\n\n[특정 설비 상세: ${equipmentCode}]`;
          contextData += `\n- 설비명: ${equipment.equipment_name}`;
          contextData += `\n- 유형: ${equipment.equipment_type?.name || 'N/A'}`;
          contextData += `\n- 상태: ${equipment.status}`;
          contextData += `\n- 건물: ${equipment.building || 'N/A'}`;
          contextData += `\n- 제조사: ${equipment.manufacturer || 'N/A'}`;

          const { data: eqRecords } = await supabase
            .from('maintenance_records')
            .select('date, symptom, repair_content, duration_minutes, status, repair_type:repair_types(name)')
            .eq('factory_id', factory_id)
            .eq('equipment_id', equipment.id)
            .order('date', { ascending: false })
            .limit(5);

          if (eqRecords && eqRecords.length > 0) {
            contextData += `\n\n최근 정비 이력:`;
            eqRecords.forEach(r => {
              const rt = r.repair_type as { name: string } | null;
              contextData += `\n  - ${r.date}: ${rt?.name || 'N/A'} | ${r.symptom || '증상 미입력'} | ${r.status}`;
            });
          }
        }
      }
    }

    // ========== AI 프롬프트 생성 ==========
    const langInstruction = language === 'vi'
      ? 'Respond in Vietnamese.'
      : 'Respond in Korean.';

    const prompt = `You are an AI assistant for AMMS (ALMUS Maintenance Management System), a CNC equipment maintenance management system for a Vietnamese factory with ${totalEquipment} active equipment.

User Question: ${message}

Database Context:${contextData}

Instructions:
1. ${langInstruction}
2. Answer the question based ONLY on the data provided above.
3. Be specific - mention equipment codes, dates, and numbers when available.
4. If asked about "이번 주" (this week), use the "이번 주" section data.
5. If asked about failure frequency or most broken equipment, use the "고장 빈도 통계" section.
6. Format lists and statistics clearly.
7. If the data doesn't contain enough information for the question, explain what specific data is missing.

Provide a helpful, data-driven response:`;

    const aiResponse = await callGemini(prompt);

    return new Response(
      JSON.stringify({
        response: aiResponse,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        error: errorMessage,
        response: language === 'vi'
          ? 'Xin lỗi, đã xảy ra lỗi khi xử lý câu hỏi của bạn. Vui lòng thử lại sau.'
          : '죄송합니다. 질문 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
