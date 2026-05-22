import express from 'express';
import { defineFlow, runFlow } from '@genkit-ai/flow';
import { generate } from '@genkit-ai/ai';
import { geminiPro } from '@genkit-ai/googleai';
import * as z from 'zod';
import dotenv from 'dotenv';

// genkit.config.ts의 설정을 먼저 로드합니다.
import './genkit.config';
import { generateTrendReportFlow } from './trendAnalysisApi';
import { semanticSearchFlow } from './caseMatcher';
import { searchSchoolInfoFlow } from './neisApi';
import { getEmergencyContactsFlow } from './emergencyDirectoryApi';

dotenv.config();

const app = express();
app.use(express.json());

// CORS 허용 설정 미들웨어
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 확장된 Request 인터페이스 정의 (TypeScript용)
interface AuthenticatedRequest extends express.Request {
  user?: {
    id: string;
    email: string;
    name: string;
    schoolName: string;
  };
}

// 사용자 인증 검증 미들웨어 스켈레톤 (보안 접근 제어 구현)
const authenticateJWT = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    // Authorization: Bearer <token> 형태 검증
    const token = authHeader.split(' ')[1];
    
    // 모의 토큰 검증 로직 (실제 서비스에서는 jwt.verify(token, JWT_SECRET) 등을 활용하여 보안 검증 수행)
    const expectedToken = 'TeachGuardSecureToken_KimTeacher2026';
    if (token === expectedToken) {
      req.user = {
        id: 'user-uuid-1234',
        email: 'teacher@school.go.kr',
        name: '김선생',
        schoolName: '서울한국초등학교'
      };
      return next();
    }
  }

  // 인증 토큰이 없거나 유효하지 않은 경우 401 Unauthorized 반환 (사용자 비공개 보안 관리)
  return res.status(401).json({ 
    error: 'Unauthorized', 
    message: '인증 토큰이 누락되었거나 유효하지 않습니다. 비공개 사건 진행 정보에 접근할 권한이 없습니다.' 
  });
};

// 모의 DB 데이터 저장소 (서버 메모리 기반 작동)
let mockProgressLogs: any[] = [];

// 1. 교권 침해 상황 맞춤형 대응 가이드 생성 Flow 정의
export const teachGuardGuideFlow = defineFlow(
  {
    name: 'teachGuardGuideFlow',
    inputSchema: z.object({
      category: z.string(), // 침해 유형 (예: 폭언, 협박 등)
      description: z.string(), // 상황 설명
      schoolLevel: z.string().optional(), // 초등/중등/고등 등
    }),
    outputSchema: z.object({
      guidelines: z.string(), // 행동 강령 및 대처법
      legalReference: z.string(), // 법적 근거 정보
      psychologicalSupport: z.string(), // 심리적 지원 조언
    }),
  },
  async (input) => {
    const response = await generate({
      model: geminiPro,
      prompt: `
        당신은 대한민국 교사의 권리를 보호하고 지원하는 전문 AI 법률 및 행동 가이드 'TeachGuard AI'입니다.
        다음 교권 침해 상황에 대해 교사가 취해야 할 신속하고 정확한 대처 가이드를 제공해 주세요.

        [상황 정보]
        - 침해 분류: ${input.category}
        - 학교급: ${input.schoolLevel || '미지정'}
        - 사건 상세 내용: ${input.description}

        [답변 요구사항]
        1. 행동 강령 및 대처법: 당장 취해야 할 물리적/행정적 행동(예: 증거 수집, 격리 요청, 교권보호위원회 개최 요청 등)을 단계별로 설명해 주세요.
        2. 법적 근거 정보: 해당 침해 행위가 '교원의 지위 향상 및 교육활동 보호를 위한 특별법(교원지위법)' 또는 형법상 어떤 조항에 저촉될 수 있는지 안내해 주세요.
        3. 심리적 지원 조언: 극심한 스트레스 상황에 놓인 교사에게 위로를 건네고, 심리 상담 지원처(예: 에듀힐링센터 등) 정보를 포함해 주세요.

        답변은 반드시 한국어의 존댓말로 신뢰감 있고 친절하게 작성해 주세요.
      `,
    });

    const text = response.text();
    
    // 단순 파싱 예시 (실제 서비스에서는 JSON 출력 모드 또는 구분자 사용)
    return {
      guidelines: text,
      legalReference: "교원의 지위 향상 및 교육활동 보호를 위한 특별법 제15조 및 관련 조항 참고",
      psychologicalSupport: "교육청 에듀힐링센터 또는 교원치유지원센터(지역별 연락처 확인 필요)를 통한 상담 신청 권장"
    };
  }
);

// 2. 가이드 생성 API 엔드포인트
app.post('/api/guide', async (req, res) => {
  try {
    const { category, description, schoolLevel } = req.body;
    
    if (!category || !description) {
      return res.status(400).json({ error: 'category와 description은 필수 항목입니다.' });
    }

    const result = await runFlow(teachGuardGuideFlow, {
      category,
      description,
      schoolLevel
    });

    return res.json(result);
  } catch (error: any) {
    console.error('Error running flow:', error);
    return res.status(500).json({ error: error.message || '서버 오류가 발생했습니다.' });
  }
});

// 3. 사건 진행 로그 조회 API (인증 필요)
app.get('/api/progress-logs', authenticateJWT as any, (req: AuthenticatedRequest, res) => {
  try {
    // 보안: 오직 로그인한 본인(user_id)의 기록만 필터링하여 반환
    const userLogs = mockProgressLogs.filter(log => log.user_id === req.user?.id);
    console.log(`[API] 유저 ${req.user?.name}의 사건 진행 로그 ${userLogs.length}건 조회 완료.`);
    return res.json(userLogs);
  } catch (error: any) {
    console.error('Error fetching progress logs:', error);
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

// 4. 사건 진행 로그 저장 API (인증 필요)
app.post('/api/progress-logs', authenticateJWT as any, (req: AuthenticatedRequest, res) => {
  try {
    const { step, stepTitle, logDate, location, content, requiredDocuments, remarks } = req.body;

    if (!step || !stepTitle || !logDate || !content) {
      return res.status(400).json({ error: '필수 필드(step, stepTitle, logDate, content)가 누락되었습니다.' });
    }

    // 새 로그 객체 생성 및 인증된 유저 ID 주입
    const newLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user_id: req.user!.id,
      step: parseInt(step),
      stepTitle,
      logDate,
      location,
      content,
      requiredDocuments,
      remarks
    };

    mockProgressLogs.push(newLog);
    // 단계별로 정렬 유지
    mockProgressLogs.sort((a, b) => a.step - b.step);

    console.log(`[API] 유저 ${req.user?.name}의 새로운 사건 진행 로그(스텝 ${step}) 저장 완료.`);
    return res.status(201).json(newLog);
  } catch (error: any) {
    console.error('Error saving progress log:', error);
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

// 5. 사건 진행 로그 수정 API (PUT)
app.put('/api/progress-logs/:id', authenticateJWT as any, (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const logIndex = mockProgressLogs.findIndex(log => log.id === id && log.user_id === req.user?.id);

    if (logIndex === -1) {
      return res.status(404).json({ error: '로그를 찾을 수 없거나 권한이 없습니다.' });
    }

    mockProgressLogs[logIndex] = { ...mockProgressLogs[logIndex], ...updateData };
    mockProgressLogs.sort((a, b) => a.step - b.step);
    
    console.log(`[API] 유저 ${req.user?.name}의 사건 진행 로그 수정 완료.`);
    return res.json(mockProgressLogs[logIndex]);
  } catch (error: any) {
    console.error('Error updating progress log:', error);
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

// 6. 사건 진행 로그 삭제 API (DELETE)
app.delete('/api/progress-logs/:id', authenticateJWT as any, (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const logIndex = mockProgressLogs.findIndex(log => log.id === id && log.user_id === req.user?.id);

    if (logIndex === -1) {
      return res.status(404).json({ error: '로그를 찾을 수 없거나 권한이 없습니다.' });
    }

    mockProgressLogs.splice(logIndex, 1);
    console.log(`[API] 유저 ${req.user?.name}의 사건 진행 로그 삭제 완료.`);
    return res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting progress log:', error);
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

// ==========================================
// 익명 커뮤니티 (Anonymous Peer Support Network) 기능
// ==========================================

// 모의 DB 데이터 저장소
let mockAnonymousPosts: any[] = [
  {
    id: 'post-1',
    original_user_id: 'user-uuid-1234',
    title: '학부모 민원으로 너무 힘듭니다.',
    content: '매일 퇴근 후에도 연락이 오는데 어떻게 대처해야 할까요?',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

let mockAnonymousComments: any[] = [
  {
    id: 'comment-1',
    post_id: 'post-1',
    original_user_id: 'user-uuid-5678',
    content: '업무용 폰을 개통하시고, 퇴근 후에는 전원을 꺼두시는 것을 추천합니다.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

// 콘텐츠 모더레이션 Flow (Genkit)
export const contentModerationFlow = defineFlow(
  {
    name: 'contentModerationFlow',
    inputSchema: z.object({
      content: z.string(),
    }),
    outputSchema: z.object({
      isAppropriate: z.boolean(),
      reason: z.string().optional(),
    }),
  },
  async (input) => {
    // 실제 서비스에서는 Gemini 모델에게 텍스트를 검사하도록 프롬프트를 전송합니다.
    const response = await generate({
      model: geminiPro,
      prompt: `
        당신은 교사 익명 커뮤니티의 자동 모더레이터입니다.
        다음 텍스트에 심한 욕설, 타인에 대한 명백한 비방, 혐오 표현, 성적 불쾌감을 주는 내용이 포함되어 있는지 평가하세요.
        판단 기준: 교사들의 고충 토로에 등장할 수 있는 일반적인 불만(예: "힘들다", "짜증난다" 등)은 허용하되, 직접적인 인신공격이나 심한 욕설은 차단합니다.
        
        [텍스트]
        ${input.content}
        
        결과를 JSON 형식으로만 반환하세요:
        {"isAppropriate": boolean, "reason": "차단된 경우 간단한 이유 설명"}
      `,
    });
    
    try {
      const text = response.text();
      // 간단한 마크다운 코드블록 제거 후 JSON 파싱 시도
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const result = JSON.parse(cleanText);
      return result;
    } catch (e) {
      // 파싱 실패 시 기본적으로 허용 (또는 키워드 기반 폴백)
      const badWords = ['씨발', '개새끼', '미친년', '죽어'];
      const hasBadWord = badWords.some(word => input.content.includes(word));
      return { isAppropriate: !hasBadWord, reason: hasBadWord ? '금지어 포함' : undefined };
    }
  }
);

// 익명 게시글 목록 조회
app.get('/api/community/posts', authenticateJWT as any, (req: AuthenticatedRequest, res) => {
  // original_user_id를 마스킹하여 반환
  const posts = mockAnonymousPosts.map(post => {
    const isMine = post.original_user_id === req.user?.id;
    return {
      ...post,
      original_user_id: undefined, // 프론트엔드에 노출하지 않음
      author: '익명 교사',
      isMine, // 본인 글인지 여부만 플래그로 제공
    };
  });
  
  posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  res.json(posts);
});

// 익명 게시글 작성
app.post('/api/community/posts', authenticateJWT as any, async (req: AuthenticatedRequest, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) return res.status(400).json({ error: '제목과 내용을 입력해주세요.' });

    // AI 모더레이션 체크
    const modResult = await runFlow(contentModerationFlow, { content: title + ' ' + content });
    if (!modResult.isAppropriate) {
      return res.status(403).json({ error: '부적절한 내용이 포함되어 등록할 수 없습니다.', reason: modResult.reason });
    }

    const newPost = {
      id: `post-${Date.now()}`,
      original_user_id: req.user!.id,
      title,
      content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockAnonymousPosts.push(newPost);
    
    res.status(201).json({ ...newPost, original_user_id: undefined, author: '익명 교사', isMine: true });
  } catch (error: any) {
    res.status(500).json({ error: '게시글 작성 중 오류가 발생했습니다.' });
  }
});

// 익명 게시글 수정
app.put('/api/community/posts/:id', authenticateJWT as any, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    
    const postIndex = mockAnonymousPosts.findIndex(p => p.id === id);
    if (postIndex === -1) return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    if (mockAnonymousPosts[postIndex].original_user_id !== req.user!.id) {
      return res.status(403).json({ error: '수정 권한이 없습니다.' });
    }

    // AI 모더레이션 체크
    const modResult = await runFlow(contentModerationFlow, { content: title + ' ' + content });
    if (!modResult.isAppropriate) {
      return res.status(403).json({ error: '부적절한 내용이 포함되어 수정할 수 없습니다.', reason: modResult.reason });
    }

    mockAnonymousPosts[postIndex] = {
      ...mockAnonymousPosts[postIndex],
      title: title || mockAnonymousPosts[postIndex].title,
      content: content || mockAnonymousPosts[postIndex].content,
      updated_at: new Date().toISOString(),
    };

    res.json({ ...mockAnonymousPosts[postIndex], original_user_id: undefined, author: '익명 교사', isMine: true });
  } catch (error: any) {
    res.status(500).json({ error: '게시글 수정 중 오류가 발생했습니다.' });
  }
});

// 익명 게시글 삭제
app.delete('/api/community/posts/:id', authenticateJWT as any, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const postIndex = mockAnonymousPosts.findIndex(p => p.id === id);
  if (postIndex === -1) return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
  if (mockAnonymousPosts[postIndex].original_user_id !== req.user!.id) {
    return res.status(403).json({ error: '삭제 권한이 없습니다.' });
  }

  mockAnonymousPosts.splice(postIndex, 1);
  res.status(204).send();
});

// 게시글의 댓글 목록 조회
app.get('/api/community/posts/:postId/comments', authenticateJWT as any, (req: AuthenticatedRequest, res) => {
  const { postId } = req.params;
  const comments = mockAnonymousComments
    .filter(c => c.post_id === postId)
    .map(c => ({
      ...c,
      original_user_id: undefined,
      author: '익명 교사',
      isMine: c.original_user_id === req.user?.id
    }))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
  res.json(comments);
});

// 댓글 작성
app.post('/api/community/posts/:postId/comments', authenticateJWT as any, async (req: AuthenticatedRequest, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: '내용을 입력해주세요.' });

    // AI 모더레이션 체크
    const modResult = await runFlow(contentModerationFlow, { content });
    if (!modResult.isAppropriate) {
      return res.status(403).json({ error: '부적절한 내용이 포함되어 등록할 수 없습니다.', reason: modResult.reason });
    }

    const newComment = {
      id: `comment-${Date.now()}`,
      post_id: postId,
      original_user_id: req.user!.id,
      content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockAnonymousComments.push(newComment);
    
    res.status(201).json({ ...newComment, original_user_id: undefined, author: '익명 교사', isMine: true });
  } catch (error: any) {
    res.status(500).json({ error: '댓글 작성 중 오류가 발생했습니다.' });
  }
});

// 판례 매칭 API (법제처 연동)
app.post('/api/cases/match', authenticateJWT as any, async (req: AuthenticatedRequest, res) => {
  try {
    const { query, limit } = req.body;
    if (!query) return res.status(400).json({ error: '사건 내용을 입력해주세요.' });

    const matchResult = await runFlow(semanticSearchFlow, { query, limit: limit || 3 });
    return res.json(matchResult);
  } catch (error: any) {
    console.error('사건 매칭 에러:', error);
    return res.status(500).json({ error: 'AI 매칭 서버 오류', details: error.toString(), stack: error.stack });
  }
});

// 예방 및 트렌드 분석 리포트 API
app.get('/api/trend-report', authenticateJWT as any, async (req: AuthenticatedRequest, res) => {
  try {
    const period = req.query.period as string || '최근 6개월';
    const result = await runFlow(generateTrendReportFlow, { period });
    res.json(result);
  } catch (error: any) {
    console.error('Error in trend report:', error);
    res.status(500).json({ error: '트렌드 리포트 생성 중 오류가 발생했습니다.' });
  }
});

// 공공데이터 - 나이스 학교 정보 검색 API
app.get('/api/school-info', authenticateJWT as any, async (req: AuthenticatedRequest, res) => {
  try {
    const schoolName = req.query.schoolName as string;
    if (!schoolName) {
      return res.status(400).json({ error: '검색할 학교명(schoolName)을 입력해주세요.' });
    }
    const result = await runFlow(searchSchoolInfoFlow, { schoolName });
    res.json(result);
  } catch (error: any) {
    console.error('Error fetching school info:', error);
    res.status(500).json({ error: '학교 정보를 검색하는 중 오류가 발생했습니다.' });
  }
});

// 공공데이터 - 전국 긴급 연락망 및 에듀힐링센터 검색 API
app.get('/api/emergency-contacts', authenticateJWT as any, async (req: AuthenticatedRequest, res) => {
  try {
    const region = req.query.region as string;
    const category = req.query.category as string;
    const searchQuery = req.query.searchQuery as string;
    
    const result = await runFlow(getEmergencyContactsFlow, { region, category, searchQuery });
    res.json(result);
  } catch (error: any) {
    console.error('Error fetching emergency contacts:', error);
    res.status(500).json({ error: '긴급 연락망 정보를 검색하는 중 오류가 발생했습니다.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`TeachGuard AI Backend Server running on port ${PORT}`);
});
