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
      const apiKey = process.env.LAW_API_KEY;
      if (!apiKey) {
        throw new Error('법제처 API 키(LAW_API_KEY)가 설정되지 않았습니다.');
      }

      const promptText = `다음은 교권 침해를 당한 교사가 자신의 상황을 설명한 글입니다. 이 상황을 바탕으로 대한민국의 법제처 판례 검색 엔진에서 검색할 가장 핵심적인 '법률 키워드' 딱 1개 또는 2개를 추출해주세요.
(예: 모욕, 폭행, 명예훼손, 업무방해, 아동학대 등)
반드시 키워드 단어만 띄어쓰기로 구분해서 답변하고 다른 말은 절대 하지 마세요.
상황: "${input.query}"`;

      const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
      
      // 구글 API에서 현재 사용 가능한 모델 목록을 동적으로 조회
      const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`);
      const modelsData: any = await modelsRes.json();
      
      if (modelsData.error) {
        throw new Error(`Gemini API 키 오류: ${modelsData.error.message}`);
      }

      // generateContent를 지원하는 gemini 모델 중 첫 번째를 자동 선택
      const availableModel = modelsData.models?.find((m: any) => 
        m.name.includes('gemini') && 
        m.supportedGenerationMethods?.includes('generateContent')
      );

      if (!availableModel) {
        throw new Error(`사용 가능한 Gemini 모델이 없습니다. 응답: ${JSON.stringify(modelsData)}`);
      }

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/${availableModel.name}:generateContent?key=${geminiApiKey}`;
      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }]
        })
      });
      
      const geminiData: any = await geminiRes.json();
      if (geminiData.error) {
        throw new Error(`Gemini API 오류: ${geminiData.error.message}`);
      }
      
      const extractedText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '교권침해';
      const extractedKeyword = extractedText.trim().split(' ')[0] || '교권침해';
      console.log(`[CaseMatcher] 추출된 법률 키워드: ${extractedKeyword}`);

      // 2. 법제처 판례 목록 API 호출
      const searchUrl = `https://www.law.go.kr/DRF/lawSearch.do?OC=${apiKey}&target=prec&type=JSON&query=${encodeURIComponent(extractedKeyword)}`;
      
      const response = await fetch(searchUrl);
      const data: any = await response.json();

      let precList = data?.PrecSearch?.prec || [];
      if (!Array.isArray(precList)) {
        precList = [precList]; // 결과가 1개일 경우 객체로 반환되는 것 방지
      }

      // 지정된 limit만큼만 자르기
      precList = precList.slice(0, input.limit);

      // 3. 각 판례별 상세 본문(판결요지) API 호출하여 데이터 조립
      const rawResults = await Promise.all(precList.map(async (prec: any, index: number) => {
        let summary = '';
        try {
          const detailUrl = `https://www.law.go.kr/DRF/lawService.do?OC=${apiKey}&target=prec&type=JSON&ID=${prec.판례일련번호}`;
          const detailRes = await fetch(detailUrl);
          const detailData: any = await detailRes.json();
          if (detailData?.PrecService?.판결요지) {
             summary = detailData.PrecService.판결요지.replace(/<[^>]*>?/gm, '');
             if (summary.length > 500) summary = summary.substring(0, 500) + '...';
          }
        } catch (err) {}
        
        return {
          id: prec.판례일련번호 || `prec-${Date.now()}-${index}`,
          title: prec.사건명 || '관련 사건 판례',
          summary: summary,
          info: `[${prec.법원명} ${prec.사건종류명} ${prec.선고일자} ${prec.사건번호}]`
        };
      }));

      // 4. 검색된 판례가 선생님의 상황에 어떻게 적용되는지 Gemini에게 해석 요청
      const interpretPrompt = `
선생님의 교권 침해 상황: "${input.query}"
검색된 법률 키워드: ${extractedKeyword}

아래는 국가법령정보센터에서 검색된 실제 판례들입니다. 표면적으로는 학교와 무관해 보일 수 있으나 법리적으로는 동일한 죄목(${extractedKeyword})입니다.
각 판례의 법리적 기준이 선생님의 상황에 어떻게 적용될 수 있는지(예: 성립 요건, 처벌 가능성 등)를 선생님이 이해하기 쉽게 3~4문장으로 해석해주세요.

판례 데이터:
${JSON.stringify(rawResults)}

반드시 아래와 같은 JSON 배열 형식으로만 응답하세요. (마크다운 백틱 없이 순수 JSON만 반환)
[
  { "id": "판례일련번호", "interpretation": "AI의 친절한 법률 해석..." }
]
`;

      let interpretations: any = [];
      try {
        const interpretRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: interpretPrompt }] }] })
        });
        const interpretData: any = await interpretRes.json();
        const rawJsonText = interpretData?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
        const cleanJsonText = rawJsonText.replace(/```json/g, '').replace(/```/g, '').trim();
        interpretations = JSON.parse(cleanJsonText);
      } catch (e) {
        console.error('Gemini 해석 오류', e);
      }

      const results = rawResults.map((raw, index) => {
        const interpretation = interpretations.find((i: any) => i.id === raw.id)?.interpretation || 
          `${extractedKeyword} 관련 판례입니다. 위 사례의 법리적 기준이 선생님의 상황에도 유사하게 적용될 수 있습니다.`;
          
        return {
          id: raw.id,
          title: raw.title,
          content: `${raw.info}\n\n[💡 AI 맞춤형 법률 해석]\n${interpretation}\n\n[실제 판결 요지]\n${raw.summary || '판결 요지가 제공되지 않는 사건입니다.'}`,
          similarity: 0.99 - (index * 0.03) 
        };
      });

      // 검색 결과가 아예 없을 경우의 폴백 처리
      if (results.length === 0) {
        return {
          results: [
            {
              id: 'fallback-1',
              title: `'${extractedKeyword}' 관련 유사 판례를 찾을 수 없습니다.`,
              content: '현재 입력하신 상황에 대한 법제처 공공데이터 판례 검색 결과가 존재하지 않습니다. 표현을 조금 바꾸어 다시 검색해보시거나, 전문가의 직접 상담을 권장합니다.',
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
