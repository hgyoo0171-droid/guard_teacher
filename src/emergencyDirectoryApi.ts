import { defineFlow } from '@genkit-ai/flow';
import * as z from 'zod';
import { Pool } from 'pg';

/**
 * ────────────────────────────────────────────────────────
 * 긴급 지원 디렉토리 (Emergency Support Directory) 백엔드
 * ────────────────────────────────────────────────────────
 * 공공데이터포털(data.go.kr)의 교원치유지원센터 API를 연동합니다.
 * API 응답 지연 또는 미승인 상태를 대비해 안전한 폴백(Fallback) 구조를 갖춥니다.
 * ────────────────────────────────────────────────────────
 */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/teachguard_db',
});

// 테스트/폴백용 교원치유지원센터 데이터
const FALLBACK_CENTERS = [
  { id: '1', region: '서울', category: '교원치유센터', name: '서울특별시교육청 교원치유지원센터', phone: '02-399-9096', description: '심리상담 및 법률 자문 지원' },
  { id: '2', region: '경기', category: '에듀힐링센터', name: '경기도교육청 교권보호지원센터', phone: '031-249-0585', description: '긴급 위기 개입 및 갈등 중재' },
  { id: '3', region: '전국', category: '법률지원', name: '교직원공제회 무료법률상담', phone: '1577-3400', description: '형사/민사 소송 지원 등' },
];

// 1. 공공데이터포털 기반 긴급 지원 연락처 조회 Flow
export const getEmergencyContactsFlow = defineFlow(
  {
    name: 'getEmergencyContactsFlow',
    inputSchema: z.object({
      region: z.string().optional(),
      category: z.string().optional(),
      searchQuery: z.string().optional(),
    }),
    outputSchema: z.array(z.object({
      id: z.string(),
      region: z.string(),
      category: z.string(),
      name: z.string(),
      phone: z.string(),
      address: z.string().optional(),
      description: z.string().optional(),
    })),
  },
  async (input) => {
    try {
      // 환경 변수에서 API 키 로드
      const apiKey = process.env.DATA_GO_KR_API_KEY;
      if (!apiKey) {
        console.warn('DATA_GO_KR_API_KEY가 설정되지 않아 폴백 데이터를 반환합니다.');
        return FALLBACK_CENTERS;
      }

      // 공공데이터포털 전국교원치유지원센터표준데이터 API 호출
      const url = `http://api.data.go.kr/openapi/tn_pubr_public_techer_curesprt_cntr_api?serviceKey=${apiKey}&type=json&pageNo=1&numOfRows=100`;
      
      const response = await fetch(url);
      const data: any = await response.json();

      // 공공데이터포털 에러 코드 (예: 12 - NO OPENAPI SERVICE ERROR 등) 처리
      if (data?.response?.header?.resultCode && data.response.header.resultCode !== '00') {
        console.warn(`[공공데이터 API 에러] ${data.response.header.resultMsg}`);
        return FALLBACK_CENTERS;
      }

      const items = data?.response?.body?.items;
      if (!items || !Array.isArray(items)) {
        return FALLBACK_CENTERS;
      }

      // 공공데이터 결과를 클라이언트 스키마에 맞게 매핑
      let mappedContacts = items.map((item: any, index: number) => ({
        id: `pub-${index}`,
        region: item.ctprvnNm || '전국', // 시도명
        category: '교원치유센터',
        name: item.techerCuresprtCntrNm, // 교원치유지원센터명
        phone: item.operPhoneNumber, // 운영전화번호
        address: item.rdnmadr, // 소재지도로명주소
        description: item.curesprtCn, // 치유지원내용
      }));

      // 프론트엔드 필터링 로직 반영
      if (input.region && input.region !== '전체') {
        mappedContacts = mappedContacts.filter((c: any) => c.region.includes(input.region));
      }
      if (input.searchQuery) {
        mappedContacts = mappedContacts.filter((c: any) => 
          c.name.includes(input.searchQuery) || (c.description && c.description.includes(input.searchQuery))
        );
      }

      return mappedContacts.length > 0 ? mappedContacts : FALLBACK_CENTERS;

    } catch (error) {
      console.error('공공데이터 통신 오류, 폴백 사용:', error);
      return FALLBACK_CENTERS;
    }
  }
);

// 2. 관리자용 연락처 정보 업데이트/추가 Flow (기존 DB 구조 유지)
export const updateEmergencyContactFlow = defineFlow(
  {
    name: 'updateEmergencyContactFlow',
    inputSchema: z.object({
      region: z.string(),
      category: z.string(),
      name: z.string(),
      phone: z.string(),
      description: z.string().optional(),
    }),
    outputSchema: z.object({ success: z.boolean(), message: z.string() }),
  },
  async (input) => {
    try {
      const query = `
        INSERT INTO emergency_support_contacts (region, category, name, phone, description)
        VALUES ($1, $2, $3, $4, $5)
      `;
      await pool.query(query, [input.region, input.category, input.name, input.phone, input.description || '']);
      return { success: true, message: '연락처가 성공적으로 등록되었습니다.' };
    } catch (error) {
      console.error('Directory Update Error:', error);
      return { success: false, message: '연락처 등록에 실패했습니다.' };
    }
  }
);
