#!/bin/bash
# TeachGuard AI - GCP 초기 설정 및 배포 스크립트

# 변수 설정
# TODO: 본인의 실제 GCP 프로젝트 ID로 변경하세요.
# 프로젝트 ID 확인 방법: GCP 콘솔 홈 화면 좌측 상단의 프로젝트 선택기에서 확인, 
# 또는 터미널에서 `gcloud config get-value project` 명령어 실행
PROJECT_ID="your-gcp-project-id"
REGION="asia-northeast3"
REPO_NAME="teachguard-repo"

echo "=== 1. GCP 프로젝트 로그인 및 설정 ==="
gcloud auth login
gcloud config set project $PROJECT_ID

echo "=== 2. 필요한 GCP API 활성화 ==="
gcloud services enable run.googleapis.com \
    artifactregistry.googleapis.com \
    cloudbuild.googleapis.com

echo "=== 3. Artifact Registry (Docker 저장소) 생성 ==="
gcloud artifacts repositories create $REPO_NAME \
    --repository-format=docker \
    --location=$REGION \
    --description="Docker repository for TeachGuard AI" || echo "레포지토리가 이미 존재할 수 있습니다."

echo "=== 4. 백엔드(Genkit API) Cloud Run 최초 배포 ==="
# 주의: 이 스크립트를 실행하기 전 프로젝트 루트에 백엔드용 Dockerfile이 있어야 합니다.
gcloud run deploy teachguard-backend \
    --source . \
    --region $REGION \
    --allow-unauthenticated \
    --set-env-vars="GEMINI_API_KEY=your_api_key,DATABASE_URL=your_db_url"

echo "=== 5. 프론트엔드(Next.js) Cloud Run 최초 배포 ==="
# 주의: frontend 디렉토리에 Next.js용 Dockerfile이 있어야 합니다.
gcloud run deploy teachguard-frontend \
    --source ./frontend \
    --region $REGION \
    --allow-unauthenticated \
    --set-env-vars="NEXT_PUBLIC_API_URL=https://[YOUR_DEPLOYED_BACKEND_URL]"

echo "=== 배포 완료! ==="
