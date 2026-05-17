FROM node:18-alpine

WORKDIR /app

# 패키지 파일 복사 및 종속성 설치
COPY package*.json ./
RUN npm install --production

# 타입스크립트 컴파일러 전역 설치 (빌드용)
RUN npm install -g typescript

# 소스 코드 복사
COPY . .

# 빌드 실행
RUN npm run build || tsc

# 환경 변수 설정
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Cloud Run에서 사용할 시작 명령어
CMD ["node", "dist/index.js"]
