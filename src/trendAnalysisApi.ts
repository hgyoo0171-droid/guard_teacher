import { defineFlow } from '@genkit-ai/flow';
import { generate } from '@genkit-ai/ai';
import { geminiPro } from '@genkit-ai/googleai';
import * as z from 'zod';
import { Pool } from 'pg';

/**
 * ────────────────────────────────────────────────────────
 * 예방 및 트렌드 분석 리포트 (Trend Analysis API) 백엔드 모듈
 * ────────────────────────────────────────────────────────
 * DB에 저장된 익명화된 교권침해 데이터 통계를 주기적으로 집계하고, 
 * Gemini Pro 모델을 사용하여 인사이트 및 예방 가이드를 요약 제공합니다.
 * ────────────────────────────────────────────────────────
 */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/teachguard_db',
});

// 트렌드 통계 산출 및 AI 요약 분석 Flow
export const generateTrendReportFlow = defineFlow(
  {
    name: 'generateTrendReportFlow',
    inputSchema: z.object({
      period: z.string().default('최근 6개월').describe('분석 기간 지정'),
    }),
    outputSchema: z.object({
      chartData: z.array(z.object({
        type: z.string(),
        count: z.number(),
      })).describe('차트 시각화를 위한 유형별 발생 건수'),
      monthlyData: z.array(z.object({
        month: z.string(),
        count: z.number(),
      })).describe('월별 발생 추이 데이터'),
      aiSummary: z.string().describe('Gemini Pro가 분석한 마크다운 형태의 인사이트 요약'),
    }),
  },
  async (input) => {
    try {
      // 1. 유형별 데이터 통계 집계 쿼리 (가장 흔한 침해 유형 Top 5)
      // 실제 환경에서는 '추출된_침해유형' 컬럼을 사용합니다.
      const typeQuery = `
        SELECT "추출된_침해유형" as type, COUNT(*) as count 
        FROM public_incident_cases 
        WHERE "추출된_침해유형" IS NOT NULL
        GROUP BY "추출된_침해유형" 
        ORDER BY count DESC 
        LIMIT 5
      `;
      const { rows: typeRows } = await pool.query(typeQuery);

      // 모의 데이터 (DB 데이터가 부족할 경우 UI 시각화를 위해 기본값 제공)
      let chartData = typeRows.map((r: any) => ({ type: r.type, count: parseInt(r.count) }));
      if (chartData.length === 0) {
        chartData = [
          { type: '폭언/모욕', count: 145 },
          { type: '수업방해', count: 98 },
          { type: '폭행/상해', count: 42 },
          { type: '명예훼손', count: 28 },
          { type: '성희롱', count: 15 },
        ];
      }

      // 월별 데이터 모의 집계 (실제 구현 시 DATE_TRUNC 활용)
      const monthlyData = [
        { month: '1월', count: 20 },
        { month: '2월', count: 15 },
        { month: '3월', count: 50 },
        { month: '4월', count: 45 },
        { month: '5월', count: 60 },
        { month: '6월', count: 65 },
      ];

      // 2. AI(Gemini 1.5 Flash) 분석 요약 요청 (REST API 직접 호출)
      const statsJson = JSON.stringify(chartData, null, 2);
      const promptText = `당신은 교육청 교권보호 위원회의 최고 데이터 분석가입니다.
아래는 ${input.period} 동안 집계된 교권 침해 유형별 발생 건수 통계 데이터입니다.

[집계 데이터]
${statsJson}
월별 추이: 학기 초(3월)부터 꾸준히 증가하여 5~6월에 최고조에 달하는 양상을 보임. (현재 월별 추이는 데모용 샘플 데이터입니다.)

[지시 사항]
위 통계를 바탕으로 다음 세 가지 항목을 포함하는 '예방 및 트렌드 분석 리포트'를 마크다운 형식으로 작성해 주세요.
1. 핵심 트렌드 분석: 데이터에서 가장 두드러지는 특징 2가지를 요약하세요. (예: 어떤 침해가 가장 많은지, 시기적 특성은 무엇인지)
2. 주요 원인 추론: 이러한 통계적 패턴이 발생하는 원인을 교육 현장의 관점에서 합리적으로 추론하세요.
3. 선제적 예방 대책 가이드: 교장 및 교사들이 취할 수 있는 실무적인 예방 대책을 3가지 제안하세요.
- 응답은 정중하고 통찰력 있는 보고서 어조를 유지하세요.`;

      const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
      
      // 동적으로 모델 조회
      const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`);
      const modelsData: any = await modelsRes.json();
      const availableModel = modelsData?.models?.find((m: any) => 
        m.name.includes('gemini') && m.supportedGenerationMethods?.includes('generateContent')
      );
      
      const targetModel = availableModel ? availableModel.name : 'models/gemini-1.5-flash';
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/${targetModel}:generateContent?key=${geminiApiKey}`;
      
      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
      });
      
      const geminiData: any = await geminiRes.json();
      const aiSummaryText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || 'AI 분석 결과를 불러오지 못했습니다.';

      return {
        chartData,
        monthlyData,
        aiSummary: aiSummaryText,
      };
    } catch (error: any) {
      console.error('Trend Report Generation Error:', error);
      throw new Error('리포트 생성 중 오류가 발생했습니다.');
    }
  }
);
