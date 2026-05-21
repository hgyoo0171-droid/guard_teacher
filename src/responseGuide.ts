import { defineFlow, runFlow } from '@genkit-ai/flow';
import { generate } from '@genkit-ai/ai';
// 요구사항에 맞춰 최신 Gemini Pro 모델을 사용합니다 (genkit 플러그인에 따라 모델명은 변경될 수 있습니다)
import { gemini15Pro } from '@genkit-ai/googleai'; 
import * as z from 'zod';
import { semanticSearchFlow } from './caseMatcher';
import { injectLegalLinks } from './legalLinker';

/**
 * ────────────────────────────────────────────────────────
 * AI 단계별 대응 도구 (Step-by-Step Response Tool) 백엔드 모듈
 * ────────────────────────────────────────────────────────
 * RAG(Retrieval Augmented Generation) 패턴을 적용하여,
 * 1) DB에서 유사 사례 및 매뉴얼 검색 (Retrieval)
 * 2) 컨텍스트와 시스템 페르소나 프롬프트를 조합하여 Gemini Pro에 전달 (Augmented)
 * 3) 실행 가능한 단계별 상담 가이드 생성 (Generation)
 * ────────────────────────────────────────────────────────
 */

export const intelligentResponseFlow = defineFlow(
  {
    name: 'intelligentResponseFlow',
    inputSchema: z.object({
      query: z.string().describe('사용자가 겪은 사건 상황 및 고민 내용'),
    }),
    outputSchema: z.object({
      response: z.string().describe('AI가 생성한 마크다운 형식의 단계별 대응 가이드'),
      referenceCases: z.number().describe('RAG에 활용된 유사 사례 개수'),
    }),
  },
  async (input) => {
    // ==============================================================
    // 1. RAG - Retrieval (검색 단계)
    // ==============================================================
    // 사용자의 질문(query)을 기반으로 가장 유사한 3건의 사례를 pgvector에서 가져옵니다.
    // (앞서 5-1 단계에서 만든 semanticSearchFlow를 재사용하여 RAG 파이프라인 구성)
    const searchResult = await runFlow(semanticSearchFlow, {
      query: input.query,
      limit: 3
    });

    const contextCases = searchResult.results;

    // ==============================================================
    // 2. RAG - Augmentation (컨텍스트 조합 단계)
    // ==============================================================
    let contextText = '아래는 현재 상황과 관련된 과거 유사 교권침해 사례 및 공식 처분 결과입니다:\n';
    
    if (contextCases && contextCases.length > 0) {
      contextCases.forEach((c, idx) => {
        // 실제 데이터베이스 스키마(title 유무 등)에 따라 속성은 유연하게 매핑합니다.
        contextText += `\n[관련 사례 ${idx + 1}] (유사도: ${Math.round(c.similarity * 100)}%)\n`;
        contextText += `- 사건 요약 및 처분 결과: ${c.content}\n`;
      });
    } else {
      contextText += '\n정확히 일치하는 판례를 찾지 못했습니다. 대한민국 일반 교권보호 매뉴얼 및 교원지위법을 기준으로 안내합니다.\n';
    }

    // ==============================================================
    // 3. RAG - Generation (생성 단계 및 프롬프트 엔지니어링)
    // ==============================================================
    // Gemini Pro 모델을 호출하며 상담사 페르소나와 명확한 액션 플랜 생성을 강제합니다.
    const aiResult = await generate({
      model: gemini15Pro,
      prompt: `당신은 상처받은 대한민국 교사들을 위한 전문적이고 따뜻한 교권 보호 전담 법률 상담사(Counselor) 'TeachGuard AI'입니다.

선생님께서 현재 다음과 같은 곤란한 상황을 겪고 계십니다:
"${input.query}"

[참고 자료 - 검색된 유사 사례 및 공식 처분 결과]
${contextText}

[지시 사항]
1. 따뜻한 공감과 위로: 가장 먼저, 극심한 스트레스 상황에 놓인 선생님의 고충에 깊이 공감하고 심리적으로 안심시켜 주는 따뜻한 위로의 말을 건네세요.
2. 맞춤형 단계별 액션 플랜 (Step-by-Step): 제공된 [참고 자료]의 조치 결과를 바탕으로, 지금 당장 선생님이 해야 할 구체적이고 실행 가능한 행동 지침을 단계별로 명확히 제시하세요.
   - 1단계: 즉각적인 대처 (예: 현장 증거 채집, 격리, 대화 녹음 고지 등)
   - 2단계: 행정적 대처 (예: 학교장/교무실 서면 보고, 교권보호위원회 소집 요구 절차 등)
   - 3단계: 장기적 대처 (예: 심리 치료, 법적 고발 고려 등)
3. 법적/행정적 권리 안내: 교원지위법에 명시된 특별휴가, 심리상담 지원, 치료비 선지급 등 선생님이 당장 활용할 수 있는 권리를 꼭 포함하세요.
4. 마크다운(Markdown) 포맷 준수: 볼드체, 기호 등을 적절히 사용하여 가독성 높은 UI로 렌더링될 수 있게 정중하고 신뢰감 있는 톤으로 작성하세요.`,
    });

    // 최종 결과 반환 시 Legal Linker를 통해 법률 조항 하이퍼링크 변환 후처리
    const linkedResponse = injectLegalLinks(aiResult.text());

    return {
      response: linkedResponse,
      referenceCases: contextCases?.length || 0,
    };
  }
);

// ==============================================================
// 4. Express API 라우터 스켈레톤 연결 예시
// 이 코드를 src/index.ts 라우팅 영역에 추가하여 엔드포인트를 완성합니다.
// ==============================================================
/*
import { runFlow } from '@genkit-ai/flow';
import { intelligentResponseFlow } from './responseGuide';

app.post('/api/cases/guide', authenticateJWT, async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: '상황 설명(query)이 필요합니다.' });

    // RAG 기반 단계별 가이드 생성 Flow 실행
    const guideResult = await runFlow(intelligentResponseFlow, { query });
    return res.json(guideResult);
  } catch (error) {
    console.error('AI Guide Generation Error:', error);
    return res.status(500).json({ error: '가이드 생성 중 서버 오류가 발생했습니다.' });
  }
});
*/
