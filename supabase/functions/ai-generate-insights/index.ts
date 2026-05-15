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

interface InsightData {
  insight_type: string;
  title: string;
  description: string;
  content: string;
  data: Record<string, unknown>;
  severity: string;
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

  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const factory_id = (body as { factory_id?: string }).factory_id;

    if (!factory_id) {
      return new Response(
        JSON.stringify({ error: 'factory_id is required in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { count: totalEquipment } = await supabase
      .from('equipments')
      .select('*', { count: 'exact', head: true })
      .eq('factory_id', factory_id)
      .eq('is_active', true);

    const { data: allEquipments } = await supabase
      .from('equipments')
      .select('status, equipment_code, equipment_name')
      .eq('factory_id', factory_id)
      .eq('is_active', true);

    const statusCounts = {
      normal: 0,
      repair: 0,
      pm: 0,
      emergency: 0,
      standby: 0,
    };

    if (allEquipments) {
      allEquipments.forEach(e => {
        if (e.status in statusCounts) {
          statusCounts[e.status as keyof typeof statusCounts]++;
        }
      });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: maintenanceRecords } = await supabase
      .from('maintenance_records')
      .select('*, equipment:equipments(*), repair_type:repair_types(*), technician:users(*)')
      .eq('factory_id', factory_id)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false });

    const { data: pmSchedules } = await supabase
      .from('pm_schedules')
      .select('*, equipment:equipments(*), template:pm_templates(*)')
      .eq('factory_id', factory_id)
      .in('status', ['scheduled', 'overdue']);

    const stats = {
      totalEquipment: totalEquipment || 0,
      normalEquipment: statusCounts.normal,
      repairEquipment: statusCounts.repair + statusCounts.emergency,
      pmEquipment: statusCounts.pm,
      totalMaintenance: maintenanceRecords?.length || 0,
      completedMaintenance: maintenanceRecords?.filter(m => m.status === 'completed').length || 0,
      emergencyMaintenance: maintenanceRecords?.filter(m => m.repair_type?.code === 'EM').length || 0,
      avgRepairTime: (maintenanceRecords?.filter(m => m.duration_minutes)
        .reduce((sum, m) => sum + (m.duration_minutes || 0), 0) || 0) /
        (maintenanceRecords?.filter(m => m.duration_minutes).length || 1),
      overduepm: pmSchedules?.filter(p => p.status === 'overdue').length || 0,
      upcomingPM: pmSchedules?.filter(p => p.status === 'scheduled').length || 0,
    };

    const failureCounts: Record<string, { count: number; equipment: unknown }> = {};
    maintenanceRecords?.forEach(record => {
      const eqId = record.equipment_id;
      if (!failureCounts[eqId]) {
        failureCounts[eqId] = { count: 0, equipment: record.equipment };
      }
      failureCounts[eqId].count++;
    });

    const topFailures = Object.entries(failureCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5);

    const prompt = `You are an AI analyst for a CNC equipment maintenance management system (CMMS) in a Vietnamese factory.

Analyze the following data and generate exactly 5 actionable insights in JSON format.

Current Statistics (Factory: ${factory_id}):
- Total Equipment: ${stats.totalEquipment}
- Normal: ${stats.normalEquipment}, Under Repair: ${stats.repairEquipment}, PM: ${stats.pmEquipment}
- Maintenance Records (30 days): ${stats.totalMaintenance}
- Completed: ${stats.completedMaintenance}, Emergency: ${stats.emergencyMaintenance}
- Average Repair Time: ${Math.round(stats.avgRepairTime)} minutes
- Overdue PM: ${stats.overduepm}, Upcoming PM: ${stats.upcomingPM}

Top 5 Equipment with Most Failures:
${topFailures.map(([id, data], i) =>
  `${i+1}. Equipment ${(data.equipment as { equipment_code?: string })?.equipment_code || id}: ${data.count} failures`
).join('\n')}

Recent Emergency Repairs:
${maintenanceRecords?.filter(m => m.repair_type?.code === 'EM').slice(0, 5).map(m =>
  `- ${m.equipment?.equipment_code}: ${m.symptom || 'No description'}`
).join('\n') || 'None'}

Generate insights in this exact JSON format (array of 5 objects):
[
  {
    "insight_type": "anomaly|prediction|recommendation|trend",
    "title": "Brief title in Korean",
    "description": "Detailed description in Korean (2-3 sentences)",
    "severity": "info|warning|critical",
    "equipment_codes": ["array of related equipment codes if any"],
    "action_required": "Recommended action in Korean"
  }
]

Focus on:
1. Equipment failure patterns
2. PM schedule optimization
3. Emergency repair trends
4. Efficiency improvements
5. Predictive maintenance suggestions

Respond ONLY with the JSON array, no other text.`;

    const geminiResponse = await callGemini(prompt);

    let insights: InsightData[] = [];
    try {
      let cleanedResponse = geminiResponse.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.slice(7);
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.slice(3);
      }
      if (cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(0, -3);
      }

      const parsed = JSON.parse(cleanedResponse.trim());
      insights = parsed.map((item: Record<string, unknown>) => ({
        insight_type: (item.insight_type as string) || 'recommendation',
        title: (item.title as string) || 'Insight',
        description: (item.description as string) || '',
        content: (item.action_required as string) || '',
        data: {
          equipment_codes: item.equipment_codes || [],
          urgency: item.severity === 'critical' ? 'high' : item.severity === 'warning' ? 'medium' : 'low',
        },
        severity: (item.severity as string) || 'info',
      }));
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError);
      insights = [
        {
          insight_type: 'trend',
          title: '정비 현황 요약',
          description: `최근 30일간 ${stats.totalMaintenance}건의 정비가 수행되었으며, 그 중 ${stats.emergencyMaintenance}건이 긴급 수리입니다.`,
          content: '정기 PM 일정 준수를 통해 긴급 수리를 줄일 수 있습니다.',
          data: { urgency: 'medium' },
          severity: 'info',
        },
      ];
    }

    // Delete only this factory's previous insights
    await supabase
      .from('ai_insights')
      .delete()
      .eq('factory_id', factory_id);

    const { data: insertedInsights, error: insertError } = await supabase
      .from('ai_insights')
      .insert(insights.map(i => ({
        ...i,
        factory_id,
        is_read: false,
        generated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })))
      .select();

    if (insertError) {
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        insights: insertedInsights,
        generated_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
