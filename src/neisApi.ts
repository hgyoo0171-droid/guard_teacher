import { defineFlow } from '@genkit-ai/flow';
import * as z from 'zod';

/**
 * ────────────────────────────────────────────────────────
 * NEIS 교육정보 개방 포털 연동 (학교 기본정보 검색)
 * ────────────────────────────────────────────────────────
 * 사용자가 입력한 학교명을 바탕으로 NEIS API를 호출하여
 * 정확한 학교명, 소속 교육지원청, 주소 등을 조회합니다.
 * ────────────────────────────────────────────────────────
 */

export const searchSchoolInfoFlow = defineFlow(
  {
    name: 'searchSchoolInfoFlow',
    inputSchema: z.object({
      schoolName: z.string().describe('검색할 학교 이름 (예: 서울초등학교)'),
    }),
    outputSchema: z.array(z.object({
      schoolName: z.string(),
      officeOfEducation: z.string().describe('소속 시도교육청'),
      localOfficeOfEducation: z.string().describe('관할 교육지원청'),
      address: z.string(),
    })).describe('검색된 학교 정보 목록'),
  },
  async (input) => {
    try {
      // 환경 변수에서 API 키 로드
      const apiKey = process.env.NEIS_API_KEY || 'c5d68d19fa7a45249181ff6dfa0f43b3';
      if (!apiKey) {
        throw new Error('NEIS_API_KEY가 설정되지 않았습니다.');
      }

      const url = `https://open.neis.go.kr/hub/schoolInfo?KEY=${apiKey}&Type=json&pIndex=1&pSize=5&SCHUL_NM=${encodeURIComponent(input.schoolName)}`;
      
      const response = await fetch(url);
      const data: any = await response.json();

      // NEIS API 에러 체크 (검색 결과가 없을 경우 등)
      if (data.RESULT && data.RESULT.CODE !== 'INFO-000') {
        console.warn(`[NEIS API] ${data.RESULT.MESSAGE}`);
        return [];
      }

      if (!data.schoolInfo || !data.schoolInfo[1] || !data.schoolInfo[1].row) {
        return [];
      }

      const schools = data.schoolInfo[1].row;

      return schools.map((school: any) => ({
        schoolName: school.SCHUL_NM,
        officeOfEducation: school.ATPT_OFCDC_SC_NM, // 시도교육청명
        localOfficeOfEducation: school.JU_ORG_NM, // 관할조직명 (교육지원청)
        address: school.ORG_RDNMA, // 도로명주소
      }));

    } catch (error) {
      console.error('NEIS API 통신 중 오류가 발생했습니다:', error);
      throw new Error('학교 정보를 불러오는 데 실패했습니다.');
    }
  }
);
