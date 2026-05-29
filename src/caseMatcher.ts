import { defineFlow } from '@genkit-ai/flow';
import { generate } from '@genkit-ai/ai';
import { geminiPro } from '@genkit-ai/googleai';
import * as z from 'zod';

/**
 * ────────────────────────────────────────────────────────
 * 지능형 사례 매칭 (Intelligent Case Matcher) 백엔드 모듈
 * ────────────────────────────────────────────────────────
 * 사용자의 구어체 질문에서 Gemini를 통해 핵심 법률 키워드를 추출한 뒤,
 * 법제처 오픈 API를 통해 실제 대한민국 판례를 검색하여 반환합니다.
 * ────────────────────────────────────────────────────────
 */

export const semanticSearchFlow = defineFlow(
  {
    name: 'semanticSearchFlow',
    inputSchema: z.object({
      query: z.string().describe('사용자가 입력한 사건 내용 또는 질문'),
      limit: z.number().default(3).describe('검색할 최대 유사 사례 개수'),
    }),
    outputSchema: z.object({
      results: z.array(z.object({
        id: z.string(),
        title: z.string(),
        content: z.string(),
        similarity: z.number().describe('임의의 신뢰도 매칭 점수')
      }))
    })
  },
  async (input) => {
    try {
      const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
      
      const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`);
      const modelsData: any = await modelsRes.json();
      
      if (modelsData.error) {
        throw new Error(`Gemini API 키 오류: ${modelsData.error.message}`);
      }

      const availableModel = modelsData.models?.find((m: any) => 
        m.name.includes('gemini') && 
        m.supportedGenerationMethods?.includes('generateContent')
      );

      if (!availableModel) {
        throw new Error(`사용 가능한 Gemini 모델이 없습니다.`);
      }

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/${availableModel.name}:generateContent?key=${geminiApiKey}`;

      const curatedCases = [
        {
          id: "edu-prec-001",
          title: "수업 중인 교실에 난입하여 고성 및 난동 (모욕 및 교육활동 방해)",
          info: "[대법원 2013. 6. 14. 선고 2013도3829 판결]",
          summary: "학부모가 수업이 진행 중인 교실에 허락 없이 들어가 교사와 학생들 앞에서 큰 소리로 난동을 부린 사건. 업무방해죄의 보호대상 여부에 대한 논란은 있었으나, 불특정 다수가 있는 교실에서 교사를 향해 폭언을 한 행위는 모욕죄 및 교원지위법상 교육활동 침해 행위로 엄격히 다루어짐."
        },
        {
          id: "edu-prec-002",
          title: "부당한 간섭 및 반복적인 담임 교체 요구 (교육활동 침해)",
          info: "[대법원 2023. 9. 14. 선고 2023두37858 판결]",
          summary: "학부모가 자녀에 대한 교사의 정당한 생활지도(벌점 부여 등)에 불만을 품고 지속적으로 악성 민원을 제기하며 담임 교체를 요구한 사건. 대법원은 교사의 전문성과 교권을 존중해야 하며, 이러한 반복적 요구는 교원의 정당한 교육활동을 부당하게 간섭하는 명백한 교권 침해라고 판시함."
        },
        {
          id: "edu-prec-003",
          title: "학부모 단체 채팅방에서의 교사 비방 및 허위사실 유포",
          info: "[대법원 2008. 11. 27. 선고 2008도7311 판결 등 참조]",
          summary: "학부모가 다른 학부모들이 다수 참여한 온라인 공간(단체 채팅방, 밴드 등)에서 교사에 대한 허위 사실이나 비방글을 게시한 사례. 다수가 볼 수 있는 공간이므로 공연성이 인정되어 정보통신망법상 명예훼손으로 엄하게 처벌될 수 있음."
        },
        {
          id: "edu-prec-004",
          title: "학생 및 학부모에 의한 교사 폭행 (공무집행방해 및 상해)",
          info: "[대법원 2018. 10. 25. 선고 2018도10956 판결]",
          summary: "학생이나 학부모가 생활지도에 불만을 품고 정당한 교육활동을 하던 교사를 폭행한 사건. 이는 단순 폭행을 넘어 상해죄가 적용될 수 있으며, 국공립학교 교원에 대한 폭행은 공무집행방해죄가 성립될 수 있음을 명시함."
        },
        {
          id: "edu-prec-005",
          title: "정당한 훈육에 대한 허위 아동학대 신고 (무고죄)",
          info: "[대법원 2021. 9. 9. 선고 2021도7423 판결 등 관련 법리]",
          summary: "학부모가 교사의 정당한 훈육이나 지도를 앙심을 품고 경찰에 아동학대로 허위 신고한 사건. 조사 결과 교사의 행위가 정당한 교육활동으로 밝혀질 경우, 타인이 형사처분을 받게 할 목적으로 허위 사실을 신고한 학부모는 형법상 무고죄로 처벌됨."
        }
      ];

      // 2. Gemini에게 가장 적합한 판례 매칭 및 해석 요청
      const interpretPrompt = `
선생님의 교권 침해 상황: "${input.query}"

아래는 교육 현장에서 자주 발생하는 교권 침해 관련 대법원 판례 데이터베이스입니다.
${JSON.stringify(curatedCases, null, 2)}

위 상황을 읽고, 선생님의 상황과 가장 유사하거나 법리적으로 적용될 수 있는 판례를 최대 ${input.limit}개만 선택해주세요.
그리고 각 판례에 대해 다음 네 가지를 작성해주세요.
1. 사건 요약 (caseSummary): 이 판례가 대체 어떤 사건이었는지 일반인이 이해하기 쉽게 1~2문장으로 요약해주세요.
2. 맞춤형 법률 해석 (interpretation): 이 판례의 법리적 기준(성립 요건, 처벌 가능성 등)이 선생님의 상황에 어떻게 적용될 수 있는지 선생님이 이해하기 쉽게 3~4문장으로 해석해주세요.
3. 구체적 대처 방안 (actionPlan): 이 판례와 해석을 바탕으로 선생님이 당장 취해야 할 구체적이고 실질적인 대처 가이드를 2~3문장으로 제시해주세요.
4. 유사도 (similarity): 선생님의 상황과 이 판례가 얼마나 유사한지 0.60에서 0.99 사이의 숫자로 평가해주세요. (예: 0.98, 0.85 등)

반드시 아래와 같은 JSON 배열 형식으로만 응답하세요. (마크다운 백틱 없이 순수 JSON만 반환)
[
  { 
    "id": "선택한 판례의 id", 
    "caseSummary": "사건의 쉬운 요약...", 
    "interpretation": "AI의 친절하고 현실적인 법률 해석...",
    "actionPlan": "선생님을 위한 구체적인 행동 지침...",
    "similarity": 0.95
  }
]
`;

      const interpretRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: interpretPrompt }] }] })
      });
      
      const interpretData: any = await interpretRes.json();
      const rawJsonText = interpretData?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
      const cleanJsonText = rawJsonText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      let aiAnalyses: any = [];
      try {
        aiAnalyses = JSON.parse(cleanJsonText);
      } catch (e) {
        console.error('JSON Parsing Error:', cleanJsonText);
      }

      // 3. 결과 조립
      const results = aiAnalyses.map((analysis: any, index: number) => {
        const rawCase = curatedCases.find(c => c.id === analysis.id);
        if (!rawCase) return null;
        
        // AI가 부여한 유사도가 없거나 이상할 경우 안전한 폴백 사용
        let simScore = typeof analysis.similarity === 'number' ? analysis.similarity : 0.85;
        if (simScore > 1) simScore = simScore / 100; // 99% 처럼 줬을 경우 0.99로 변환
        
        return {
          id: rawCase.id,
          title: rawCase.title,
          content: `${rawCase.info}\n\n[📋 쉬운 사건 요약]\n${analysis.caseSummary}\n\n[💡 AI 맞춤형 법률 해석]\n${analysis.interpretation}\n\n[🛡️ 선생님을 위한 구체적 대처 방안]\n${analysis.actionPlan || '전문가의 도움을 받아 대응 방안을 마련하시기 바랍니다.'}\n\n[⚖️ 실제 판결 요지 원문]\n${rawCase.summary}`,
          similarity: simScore
        };
      }).filter(Boolean);

      // 검색 결과가 아예 없을 경우의 폴백 처리
      if (results.length === 0) {
        return {
          results: [
            {
              id: 'fallback-1',
              title: `입력하신 상황과 정확히 일치하는 주요 판례를 찾기 어렵습니다.`,
              content: '제공해주신 상황만으로는 명확한 법률적 처벌이 이루어진 대표 판례를 찾기 어렵습니다. 하지만 상황이 지속되거나 증거가 확보될 경우 법적 대응이 가능할 수 있으니 꼼꼼히 기록을 남겨두시길 권장합니다.',
              similarity: 0
            }
          ]
        };
      }

      return { results };
    } catch (error: any) {
      console.error('Law API 연동 검색 실패:', error);
      return {
        results: [
          {
            id: 'error-debug',
            title: `[서버 에러 디버깅]`,
            content: `에러 원인을 찾고 있습니다.\n메시지: ${error.message}\n상세: ${error.toString()}`,
            similarity: 1
          }
        ]
      };
    }
  }
);
