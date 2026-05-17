import { defineFlow } from '@genkit-ai/flow';
import * as z from 'zod';
import { Pool } from 'pg';

/**
 * ────────────────────────────────────────────────────────
 * 긴급 지원 디렉토리 (Emergency Support Directory) 백엔드
 * ────────────────────────────────────────────────────────
 * 지역 교육청, 교원치유지원센터 등 긴급 연락처 정보를 제공하고
 * 관리자가 쉽게 업데이트할 수 있도록 설계된 모듈입니다.
 * ────────────────────────────────────────────────────────
 */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/teachguard_db',
});

// 1. 긴급 지원 연락처 조회 Flow (지역 및 유형 필터링)
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
      let query = `SELECT * FROM emergency_support_contacts WHERE 1=1`;
      const values: any[] = [];
      let paramIndex = 1;

      if (input.region && input.region !== '전체') {
        query += ` AND region = $${paramIndex}`;
        values.push(input.region);
        paramIndex++;
      }
      if (input.category && input.category !== '전체') {
        query += ` AND category = $${paramIndex}`;
        values.push(input.category);
        paramIndex++;
      }
      if (input.searchQuery) {
        query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
        values.push(`%${input.searchQuery}%`);
      }

      query += ` ORDER BY region ASC, name ASC`;
      
      const { rows } = await pool.query(query, values);

      // 백엔드 DB가 비어있을 경우 프론트엔드 테스트를 위한 모의 데이터 반환
      if (rows.length === 0) {
        return [
          { id: '1', region: '서울', category: '교원치유센터', name: '서울특별시교육청 교원치유지원센터', phone: '02-399-9096', description: '심리상담 및 법률 자문 지원' },
          { id: '2', region: '경기', category: '에듀힐링센터', name: '경기도교육청 교권보호지원센터', phone: '031-249-0585', description: '긴급 위기 개입 및 갈등 중재' },
          { id: '3', region: '전국', category: '법률지원', name: '교직원공제회 무료법률상담', phone: '1577-3400', description: '형사/민사 소송 지원 등' },
        ];
      }

      return rows;
    } catch (error) {
      console.error('Directory Fetch Error:', error);
      throw new Error('긴급 연락처 정보를 불러오는 데 실패했습니다.');
    }
  }
);

// 2. 관리자용 연락처 정보 업데이트/추가 Flow
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
