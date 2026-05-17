import { defineFlow } from '@genkit-ai/flow';
import { embed } from '@genkit-ai/ai';
import { textEmbedding004 } from '@genkit-ai/googleai'; // Gemini Pro 호환 최신 임베딩 모델
import * as z from 'zod';
import { Pool } from 'pg';

/**
 * ────────────────────────────────────────────────────────
 * 지능형 사례 매칭 (Intelligent Case Matcher) 백엔드 모듈
 * ────────────────────────────────────────────────────────
 * PostgreSQL의 pgvector 확장을 사용하여 텍스트 임베딩을 저장하고
 * 사용자 질문과 가장 유사한 과거 판례/공공데이터를 검색합니다.
 * 
 * [DB 사전 준비사항]
 * 1. CREATE EXTENSION IF NOT EXISTS vector;
 * 2. ALTER TABLE public_guidelines ADD COLUMN embedding vector(768);
 * ────────────────────────────────────────────────────────
 */

// PostgreSQL 커넥션 풀 설정
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/teachguard',
});

// ==============================================================
// 1. 임베딩 생성 및 DB 적재 로직 (데이터 적재 시 활용)
// ==============================================================
export const embedAndStoreFlow = defineFlow(
  {
    name: 'embedAndStoreFlow',
    inputSchema: z.object({
      id: z.string().describe('DB 레코드의 고유 ID'),
      content: z.string().describe('임베딩할 원본 텍스트 (사건 개요, 판례 내용 등)'),
      tableName: z.string().default('public_guidelines')
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string()
    })
  },
  async (input) => {
    try {
      // 1. Gemini Text Embedding 모델을 사용하여 텍스트를 벡터로 변환
      const embeddingResult = await embed({
        model: textEmbedding004,
        content: input.content,
      });

      // 반환된 벡터 데이터 추출
      const vector = embeddingResult; 

      // 2. PostgreSQL(pgvector)에 벡터값 업데이트
      // 주의: pgvector는 배열 형태의 문자열 '[v1, v2, ...]'을 입력받습니다.
      const query = `
        UPDATE ${input.tableName} 
        SET embedding = $1 
        WHERE id = $2
      `;
      // JavaScript 배열을 pgvector가 인식할 수 있는 문자열 형태로 변환
      const vectorString = `[${vector.join(',')}]`;
      
      await pool.query(query, [vectorString, input.id]);

      return { success: true, message: `레코드 ${input.id} 임베딩 저장 완료` };
    } catch (error: any) {
      console.error('Embedding failed:', error);
      return { success: false, message: error.message };
    }
  }
);

// ==============================================================
// 2. 시맨틱 검색 로직 (사용자가 질문할 때 활용)
// ==============================================================
export const semanticSearchFlow = defineFlow(
  {
    name: 'semanticSearchFlow',
    inputSchema: z.object({
      query: z.string().describe('사용자가 입력한 사건 내용 또는 질문'),
      limit: z.number().default(3).describe('검색할 최대 유사 사례 개수'),
      tableName: z.string().default('public_guidelines')
    }),
    outputSchema: z.object({
      results: z.array(z.object({
        id: z.string(),
        title: z.string(),
        content: z.string(),
        similarity: z.number().describe('코사인 유사도 (1에 가까울수록 유사함)')
      }))
    })
  },
  async (input) => {
    try {
      // 1. 사용자 쿼리를 임베딩 벡터로 변환 (DB에 저장된 데이터와 동일한 모델 사용)
      const queryEmbedding = await embed({
        model: textEmbedding004,
        content: input.query,
      });

      const vectorString = `[${queryEmbedding.join(',')}]`;

      // 2. pgvector의 코사인 거리 연산자 (<=>) 를 사용하여 가장 유사한 레코드 검색
      // 1 - (거리) = 코사인 유사도로 변환하여 직관적으로 제공
      const query = `
        SELECT 
          id, 
          title, 
          content,
          1 - (embedding <=> $1::vector) as similarity
        FROM ${input.tableName}
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT $2
      `;
      
      const { rows } = await pool.query(query, [vectorString, input.limit]);

      return { results: rows };
    } catch (error: any) {
      console.error('Semantic search failed:', error);
      throw new Error('시맨틱 검색 중 오류가 발생했습니다.');
    }
  }
);

// ==============================================================
// 3. Express API 라우터 스켈레톤 연결 예시
// 이 코드를 src/index.ts의 라우팅 부분에 추가하여 연동할 수 있습니다.
// ==============================================================
/*
import { runFlow } from '@genkit-ai/flow';
import { semanticSearchFlow } from './caseMatcher';

app.post('/api/cases/match', authenticateJWT, async (req, res) => {
  try {
    const { query, limit } = req.body;
    if (!query) return res.status(400).json({ error: '사건 내용(query)을 입력해주세요.' });

    const matchResult = await runFlow(semanticSearchFlow, { query, limit });
    return res.json(matchResult);
  } catch (error) {
    return res.status(500).json({ error: 'AI 매칭 서버 오류' });
  }
});
*/
