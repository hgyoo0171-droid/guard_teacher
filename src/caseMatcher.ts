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

      // 1. Gemini를 이용하여 구어체 문장에서 핵심 법률 검색어(키워드) 추출
      const keywordResponse = await generate({
        model: geminiPro,
        prompt: `다음은 교권 침해를 당한 교사가 자신의 상황을 설명한 글입니다. 이 상황을 바탕으로 대한민국의 법제처 판례 검색 엔진에서 검색할 가장 핵심적인 '법률 키워드' 딱 1개 또는 2개를 추출해주세요.
(예: 모욕, 폭행, 명예훼손, 업무방해, 아동학대 등)
반드시 키워드 단어만 띄어쓰기로 구분해서 답변하고 다른 말은 절대 하지 마세요.
상황: "${input.query}"`,
      });

      const extractedKeyword = keywordResponse.text().trim().split(' ')[0] || '교권침해';
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
      const results = await Promise.all(precList.map(async (prec: any, index: number) => {
        let contentText = `[사건정보] ${prec.법원명} ${prec.사건종류명} (${prec.선고일자} 선고 ${prec.사건번호})\n`;
        
        try {
          // 본문 상세 조회 API 호출 (판결 요지 추출용)
          const detailUrl = `https://www.law.go.kr/DRF/lawService.do?OC=${apiKey}&target=prec&type=JSON&ID=${prec.판례일련번호}`;
          const detailRes = await fetch(detailUrl);
          const detailData: any = await detailRes.json();
          
          if (detailData?.PrecService?.판결요지) {
             // 판결 요지에 들어있는 HTML 태그 제거
             let summary = detailData.PrecService.판결요지.replace(/<[^>]*>?/gm, '');
             // 너무 길 경우 자르기
             if (summary.length > 300) summary = summary.substring(0, 300) + '... (상략)';
             contentText += `\n[판결요지]\n${summary}`;
          } else {
             contentText += `\n[상세 내용]\n이 사건은 ${extractedKeyword}와(과) 관련된 판례입니다. 상세한 판결 요지는 국가법령정보센터에서 사건번호로 조회하실 수 있습니다.`;
          }
        } catch (err) {
          contentText += `\n[상세 내용]\n이 사건은 ${extractedKeyword} 관련 판례입니다.`;
        }

        return {
          id: prec.판례일련번호 || `prec-${Date.now()}-${index}`,
          title: prec.사건명 || '관련 사건 판례',
          content: contentText,
          // API에 유사도 개념이 없으므로, 검색어 연관성에 따라 가상의 높은 점수 부여 ( UI 표시용 )
          similarity: 0.99 - (index * 0.03) 
        };
      }));

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
