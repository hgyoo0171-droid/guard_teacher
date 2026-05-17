-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgvector extension for AI similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. 사용자(교사) 정보 테이블 (users)
-- Supabase Auth의 auth.users 테이블과 연동되거나, Firebase Auth UID를 PK로 사용할 수 있습니다.
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    school_name VARCHAR(100),
    role VARCHAR(50), -- 예: 담임, 교과, 부장, 특수교사 등
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. 교권 침해 사건 기록 테이블 (incident_records)
CREATE TABLE public.incident_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    incident_date DATE NOT NULL,
    category VARCHAR(100) NOT NULL, -- 침해 유형 (예: 폭언, 폭행, 협박, 수업방해, 성희롱 등)
    description TEXT NOT NULL, -- 사건 내용
    evidence_summary TEXT, -- 증거 자료 목록/설명
    status VARCHAR(50) NOT NULL DEFAULT '작성중', -- 상태 (작성중, 대응중, 종결)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. 관련 법령 및 공공 대응 가이드라인 테이블 (public_guidelines)
-- 교권 침해 관련 공공데이터 및 매뉴얼을 저장하여 AI RAG(검색 증강 생성) 또는 검색에 활용합니다.
CREATE TABLE public.public_guidelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    source VARCHAR(255) NOT NULL, -- 출처 (예: 교육부, 서울시교육청 등)
    category VARCHAR(100) NOT NULL, -- 유형 분류
    content TEXT NOT NULL, -- 가이드라인 본문
    tags TEXT[] DEFAULT '{}', -- 검색 태그
    embedding vector(768), -- AI 시맨틱 검색용 임베딩 벡터
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3.5 공공 교권침해 사례 통합 테이블 (public_incident_cases) - 파이썬 스크립트 수집 데이터 연동
CREATE TABLE public.public_incident_cases (
    "사건ID" VARCHAR(50) PRIMARY KEY,
    "발생일자" DATE,
    "학교명" VARCHAR(100),
    "관련자명" VARCHAR(100),
    "사건개요" TEXT NOT NULL,
    "조치결과" VARCHAR(255),
    "추출된_침해유형" VARCHAR(255),
    embedding vector(768), -- AI 시맨틱 검색용 임베딩 벡터
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. 긴급 지원 디렉토리 테이블 (emergency_support_contacts)
CREATE TABLE public.emergency_support_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region VARCHAR(50) NOT NULL, -- 지역 (예: 서울, 경기, 부산 등)
    category VARCHAR(100) NOT NULL, -- 유형 (예: 교원치유센터, 교육청, 심리상담소, 법률지원)
    name VARCHAR(255) NOT NULL, -- 기관명
    phone VARCHAR(50) NOT NULL, -- 연락처
    address VARCHAR(255), -- 상세 주소 (선택)
    description TEXT, -- 설명 및 비고 (선택)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- emergency_support_contacts 테이블에 트리거 적용
CREATE TRIGGER update_emergency_contacts_modtime
    BEFORE UPDATE ON public.emergency_support_contacts
    FOR EACH ROW
    EXECUTE PROCEDURE update_modified_column();

-- 4. AI 상담 및 가이드 제공 로그 테이블 (consultation_logs)
CREATE TABLE public.consultation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    incident_id UUID REFERENCES public.incident_records(id) ON DELETE SET NULL,
    query TEXT NOT NULL, -- 교사의 질문 또는 상황 입력
    response TEXT NOT NULL, -- AI가 생성한 가이드 및 답변
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 자동 updated_at 변경을 위한 트리거 함수
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- users 테이블에 트리거 적용
CREATE TRIGGER update_users_modtime
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE PROCEDURE update_modified_column();

-- incident_records 테이블에 트리거 적용
CREATE TRIGGER update_incidents_modtime
    BEFORE UPDATE ON public.incident_records
    FOR EACH ROW
    EXECUTE PROCEDURE update_modified_column();

-- 5. 사건 진행 이력 기록 테이블 (case_progress_logs)
CREATE TABLE public.case_progress_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    incident_id UUID REFERENCES public.incident_records(id) ON DELETE CASCADE,
    step INT NOT NULL, -- 1 ~ 5 단계
    step_title VARCHAR(255) NOT NULL,
    log_date DATE NOT NULL,
    location VARCHAR(255),
    content TEXT NOT NULL,
    required_documents TEXT,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- case_progress_logs 테이블에 트리거 적용
CREATE TRIGGER update_case_progress_logs_modtime
    BEFORE UPDATE ON public.case_progress_logs
    FOR EACH ROW
    EXECUTE PROCEDURE update_modified_column();

-- 7. 익명 커뮤니티 게시글 테이블 (anonymous_posts)
CREATE TABLE public.anonymous_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- anonymous_posts 테이블에 트리거 적용
CREATE TRIGGER update_anonymous_posts_modtime
    BEFORE UPDATE ON public.anonymous_posts
    FOR EACH ROW
    EXECUTE PROCEDURE update_modified_column();

-- 8. 익명 커뮤니티 댓글 테이블 (anonymous_comments)
CREATE TABLE public.anonymous_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.anonymous_posts(id) ON DELETE CASCADE,
    original_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- anonymous_comments 테이블에 트리거 적용
CREATE TRIGGER update_anonymous_comments_modtime
    BEFORE UPDATE ON public.anonymous_comments
    FOR EACH ROW
    EXECUTE PROCEDURE update_modified_column();
