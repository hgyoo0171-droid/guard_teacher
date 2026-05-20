import { embed } from '@genkit-ai/ai/embedder';
import { textEmbeddingGecko001 } from '@genkit-ai/googleai';
import { Pool } from 'pg';
import dotenv from 'dotenv';
// Genkit 설정을 불러옵니다 (API 키 등)
import './genkit.config'; 

dotenv.config();

/**
 * ────────────────────────────────────────────────────────
 * 일괄 임베딩 처리 배치(Batch) 스크립트
 * ────────────────────────────────────────────────────────
 * Python 수집 스크립트로 DB에 적재된 'public_incident_cases' 
 * 테이블의 텍스트 데이터를 순회하며, 임베딩 벡터가 없는 레코드에 대해
 * Google Gemini 임베딩 모델을 호출하고 벡터값을 업데이트합니다.
 * ────────────────────────────────────────────────────────
 */

const pool = new Pool({
  // 실제 로컬 또는 서버의 DB 커넥션 스트링을 사용하세요
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/teachguard_db',
});

async function runBatchEmbedding() {
  const tableName = 'public_incident_cases';
  console.log(`\n🚀 [Batch] '${tableName}' 테이블 임베딩 배치 작업을 시작합니다...\n`);

  try {
    // 1. 임베딩 벡터가 생성되지 않은(NULL) 데이터만 조회
    const selectQuery = `
      SELECT "사건ID" as id, "사건개요" as content 
      FROM ${tableName} 
      WHERE embedding IS NULL
    `;
    const { rows } = await pool.query(selectQuery);

    if (rows.length === 0) {
      console.log('✅ [Batch] 새로 임베딩할 레코드가 없습니다. 작업을 종료합니다.');
      return;
    }

    console.log(`[Batch] 총 ${rows.length}개의 레코드에 대해 임베딩을 생성합니다.\n`);

    // 2. 순차적으로 임베딩 API 호출 및 DB 업데이트 
    // API Rate Limit(429 Too Many Requests) 방지를 위해 병렬 처리 대신 순차(for...of) 처리
    let successCount = 0;
    
    for (const row of rows) {
      if (!row.content) continue;

      try {
        console.log(`[-] ID: ${row.id} 임베딩 생성 중...`);
        
        // Gemini Text Embedding 호출
        const embeddingResult = await embed({
          embedder: textEmbeddingGecko001,
          content: row.content,
        });

        // pgvector 저장을 위한 문자열 변환
        const vectorString = `[${embeddingResult.join(',')}]`;

        // DB 업데이트
        const updateQuery = `
          UPDATE ${tableName} 
          SET embedding = $1 
          WHERE "사건ID" = $2
        `;
        
        await pool.query(updateQuery, [vectorString, row.id]);
        console.log(`[+] ID: ${row.id} 임베딩 저장 완료!`);
        successCount++;

        // API Rate Limit 완화를 위한 0.5초 대기 (필요시 조절)
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (err: any) {
        console.error(`[!] ID: ${row.id} 처리 실패:`, err.message);
      }
    }

    console.log(`\n🎉 [Batch] 작업 완료! (성공: ${successCount}건 / 전체: ${rows.length}건)`);
    
  } catch (error) {
    console.error('\n❌ [Batch] 데이터베이스 연결 또는 쿼리 오류 발생:', error);
  } finally {
    pool.end();
  }
}

// Node.js 스크립트 단독 실행 시 작동
if (require.main === module) {
  runBatchEmbedding();
}
