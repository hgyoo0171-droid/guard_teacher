/**
 * caseProgressApi.ts
 * ──────────────────────────────────────────────────
 * Case Progress Logger 전용 백엔드 API 연동 클라이언트
 *
 * 보안 설계:
 *  - 모든 요청에 Authorization: Bearer <token> 헤더 첨부
 *  - 서버는 JWT/토큰 검증 후 본인 데이터만 필터링하여 반환
 *  - 실제 서비스에서는 토큰을 HttpOnly 쿠키 또는 Secure Storage에서 읽어야 함
 *  - 백엔드 미연결 시 로컬 폴백(mock) 데이터로 자동 대체하여 UI 데모 유지
 */

export interface ProgressLog {
  id: string;
  /** 교보위 진행 5단계 (1 ~ 5) */
  step: number;
  stepTitle: string;
  logDate: string;
  location?: string;
  content: string;
  requiredDocuments?: string;
  remarks?: string;
  /** 서버에서 생성되는 타임스탬프 (ISO 8601) */
  createdAt?: string;
}

/** 새 로그 생성 시 사용하는 입력 타입 (id, createdAt 제외) */
export type CreateProgressLogInput = Omit<ProgressLog, 'id' | 'createdAt'>;

/** 로그 수정 시 사용하는 입력 타입 (일부 필드 선택 가능) */
export type UpdateProgressLogInput = Partial<CreateProgressLogInput>;

// ──────────────────────────────────────────────────
// API 클라이언트 설정
// ──────────────────────────────────────────────────
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://teachguard-backend-84878824642.asia-northeast3.run.app';

/**
 * 인증 토큰을 포함한 공통 fetch 헬퍼
 * @param endpoint - /api/progress-logs 등 경로
 * @param options  - fetch RequestInit
 * @param token    - 사용자 인증 토큰 (Bearer)
 */
async function secureRequest<T>(
  endpoint: string,
  options: RequestInit,
  token: string
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      // 🔐 모든 요청에 인증 토큰 첨부 — 서버에서 소유자 검증 후 개인 데이터만 반환
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (response.status === 401) {
    throw new ApiError(401, '인증이 만료되었습니다. 다시 로그인해 주세요.');
  }
  if (response.status === 403) {
    throw new ApiError(403, '해당 데이터에 접근할 권한이 없습니다.');
  }
  if (response.status === 404) {
    throw new ApiError(404, '요청한 리소스를 찾을 수 없습니다.');
  }
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new ApiError(response.status, errorBody?.message ?? '서버 오류가 발생했습니다.');
  }

  // 204 No Content (DELETE 성공 등)
  if (response.status === 204) return undefined as unknown as T;

  return response.json() as Promise<T>;
}

/** API 에러 클래스 — HTTP 상태코드 포함 */
export class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// ──────────────────────────────────────────────────
// CRUD API 함수
// ──────────────────────────────────────────────────

/**
 * [GET] /api/progress-logs
 * 인증 사용자의 전체 사건 진행 로그 목록 조회
 * 서버에서 user_id 기준으로 소유자 본인 데이터만 필터링하여 반환
 */
export async function fetchProgressLogs(token: string): Promise<ProgressLog[]> {
  return secureRequest<ProgressLog[]>('/api/progress-logs', { method: 'GET' }, token);
}

/**
 * [POST] /api/progress-logs
 * 새 진행 로그 생성 — 서버에서 user_id를 JWT에서 추출하여 자동 주입
 */
export async function createProgressLog(
  input: CreateProgressLogInput,
  token: string
): Promise<ProgressLog> {
  return secureRequest<ProgressLog>(
    '/api/progress-logs',
    { method: 'POST', body: JSON.stringify(input) },
    token
  );
}

/**
 * [PUT] /api/progress-logs/:id
 * 기존 로그 수정 — 서버에서 user_id 일치 여부를 검증하여 타인 수정 방지
 */
export async function updateProgressLog(
  id: string,
  input: UpdateProgressLogInput,
  token: string
): Promise<ProgressLog> {
  return secureRequest<ProgressLog>(
    `/api/progress-logs/${id}`,
    { method: 'PUT', body: JSON.stringify(input) },
    token
  );
}

/**
 * [DELETE] /api/progress-logs/:id
 * 로그 삭제 — 서버에서 user_id 일치 여부를 검증하여 타인 삭제 방지
 */
export async function deleteProgressLog(id: string, token: string): Promise<void> {
  return secureRequest<void>(
    `/api/progress-logs/${id}`,
    { method: 'DELETE' },
    token
  );
}

// ──────────────────────────────────────────────────
// 오프라인 폴백 목업 데이터 (백엔드 미연결 시 사용)
// ──────────────────────────────────────────────────
export const MOCK_PROGRESS_LOGS: ProgressLog[] = [
  {
    id: 'mock-1',
    step: 1,
    stepTitle: '📥 교권 침해 공식 접수',
    logDate: '2026-05-10',
    location: '서울한국초등학교 교무실',
    content:
      '학교 교장 및 관리자에게 서면 교권 침해 피해서 제출 및 접수 완료. 교권 침해 사안조사 대응 준비. 접수번호 발급.',
    requiredDocuments: '교권 침해 피해 신고서 1부, 피해 경위 진술서',
    remarks: '접수증 원본 별도 보관 필수',
    createdAt: '2026-05-10T09:00:00Z',
  },
  {
    id: 'mock-2',
    step: 2,
    stepTitle: '🔍 교육청 이관 및 예비 조사',
    logDate: '2026-05-13',
    location: '서울특별시 성동광진교육지원청',
    content:
      '교육청 교권 보좌관 배정 완료 및 사건 사실관계 예비 조사 시작 고지. 목격 동료 교사 진술 확보 진행 중.',
    requiredDocuments: '목격 동료 교사 2인 인적사항 및 동의 확약서, 녹음 속기록',
    createdAt: '2026-05-13T14:30:00Z',
  },
  {
    id: 'mock-3',
    step: 3,
    stepTitle: '📁 소명자료 및 추가 제출',
    logDate: '2026-05-16',
    location: '서울특별시 성동광진교육지원청',
    content:
      '소명서, 목격 교사 확인서 2부, 심리 치료 진단서를 추가 제출하였음. 교보위 심의 일정 조율 요청.',
    requiredDocuments: '소명서 1부, 목격 확인서 2부, 심리치료 진단서 1부',
    remarks: '교보위 위원장에게 서면 심의 요청 별도 발송',
    createdAt: '2026-05-16T10:00:00Z',
  },
];
