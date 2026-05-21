import { defineFlow, runFlow } from '@genkit-ai/flow';
import { generate } from '@genkit-ai/ai';
import { gemini15Pro } from '@genkit-ai/googleai';
import * as z from 'zod';
import { semanticSearchFlow } from './caseMatcher';

/**
 * ────────────────────────────────────────────────────────
 * 예측 결과 분석 도구 (Predictive Outcome Analysis Tool)
 * ────────────────────────────────────────────────────────
 * RAG 패턴과 Chain-of-Thought (CoT), Few-shot Learning을 융합하여
 * 현재 발생한 교권침해 사건의 최종 법적/행정적 궤적(결과)을 
 * 예측하고 확률 기반으로 시나리오를 제공하는 백엔드 로직입니다.
 * ────────────────────────────────────────────────────────
 */

export const predictiveOutcomeFlow = defineFlow(
  {
    name: 'predictiveOutcomeFlow',
    inputSchema: z.object({
      query: z.string().describe('사용자가 입력한 사건 세부 내용 및 정황'),
    }),
    outputSchema: z.object({
      prediction: z.string().describe('AI가 생성한 마크다운 형식의 결과 예측 분석 보고서'),
    }),
  },
  async (input) => {
    // 1. 과거 교권보호위원회 결정 데이터 및 유사 사례 RAG 검색
    // 2. 과거의 유사 사례 검색을 통해 실제 결과 참조 (RAG 패턴)
    const similarCases = await runFlow(semanticSearchFlow, {
      query: input.query,
      limit: 3
    });

    const contextCases = similarCases.results;

    let contextText = '--- [참고 데이터: 과거 유사 사건 및 실제 교보위 처분 결과] ---\n';
    if (contextCases && contextCases.length > 0) {
      contextCases.forEach((c, idx) => {
        contextText += `[사례 ${idx + 1}] (유사도: ${Math.round(c.similarity * 100)}%)\n`;
        contextText += `내용 및 결과: ${c.content}\n\n`;
      });
    } else {
      contextText += '검색된 유사 판례가 없습니다. 교원지위법 통상 기준에 따릅니다.\n\n';
    }

    // 2. Chain-of-Thought (CoT) 및 Few-shot Learning 기반 프롬프트 엔지니어링
    // AI가 단순히 찍는 것이 아니라 논리적으로 생각(추론)하며 확률을 계산하도록 강제합니다.
    const aiResult = await generate({
      model: gemini15Pro,
      prompt: `당신은 대한민국 교육청 교권보호위원회 상임 전문 변호사이자 데이터 분석가입니다.
사용자가 처한 사건의 정황과 과거 위원회 처분 데이터를 바탕으로 사건의 최종 궤적과 법적/행정적 처분 결과를 예측해야 합니다.

[분석해야 할 현재 사건]
"${input.query}"

${contextText}

[Few-shot 예시: 분석 및 예측 방식]
사건: 학부모가 교무실에서 다수가 보는 앞 교사에게 "자질이 없다"며 고함을 지름
<생각의 흐름 (Chain of Thought)>
1. 행위의 심각성: 공공장소(교무실)에서의 폭언은 '모욕'에 해당함.
2. 법적 쟁점: 다수가 있었으므로 '공연성'이 성립됨.
3. 과거 유사 사례 대조: 과거 유사 사례에서 대부분 교원지위법 제15조 위반으로 인정되었으며, 심한 경우 형사상 모욕죄로 벌금형이 나옴. 
4. 위원회 성향: 최근 교육청은 폭언에 대해 특별교육 이수를 강하게 권고함.
</생각의 흐름>
예측 시나리오:
- 시나리오 A (확률 70%): 학부모 특별교육 이수 10시간 및 접근 금지 행정 처분 (이유: 일반적인 교보위의 모욕 대응 수위)
- 시나리오 B (확률 30%): 형사 고발 이관 및 벌금형 100~200만원 (이유: 피해 교사가 형사 고소를 병행할 경우 공연성 인정 가능성이 매우 높음)

[지시 사항]
위 Few-shot 예시를 참고하여, 다음 구조로 마크다운(Markdown) 보고서를 작성하세요.
1. 사건 쟁점 분석: 현재 사건의 법적, 행정적 쟁점을 요약하세요.
2. <생각의 흐름 (Chain of Thought)>: 반드시 이 태그를 사용하여, 심각성 -> 법적 쟁점 -> 유사 사례 대조 -> 예측에 이르는 논리적 추론 과정을 명확히 텍스트로 적으세요.
3. 예측 시나리오 및 확률: 최소 2개 이상의 가능한 결과(징계 수위, 행정 처분, 화해 권고, 수사기관 고발 등)와 그에 따른 예상 확률(%)을 제시하고, 그 확률의 근거(이유)를 명시하세요.
4. 전문적이고 분석적인 어조를 유지하세요.`,
    });

    return {
      prediction: aiResult.text(),
    };
  }
);

// ==============================================================
// Express API 라우터 스켈레톤 연결 예시 (src/index.ts)
// ==============================================================
/*
import { runFlow } from '@genkit-ai/flow';
import { predictiveOutcomeFlow } from './predictiveAnalysis';

app.post('/api/cases/predict', authenticateJWT, async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: '사건 내용(query)이 필요합니다.' });

    // 예측 분석 도구 Flow 실행
    const predictionResult = await runFlow(predictiveOutcomeFlow, { query });
    return res.json(predictionResult);
  } catch (error) {
    console.error('Prediction Generation Error:', error);
    return res.status(500).json({ error: '예측 분석 중 서버 오류가 발생했습니다.' });
  }
});
*/
