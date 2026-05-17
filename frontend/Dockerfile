FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Next.js 텔레메트리 비활성화 (선택 사항)
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Cloud Run에서 사용할 포트 설정
ENV PORT 8080
EXPOSE 8080

# Next.js의 standalone 빌드 출력물 복사 (next.config.js에서 output: 'standalone' 설정 필요)
# COPY --from=builder /app/.next/standalone ./
# COPY --from=builder /app/.next/static ./.next/static
# COPY --from=builder /app/public ./public
# CMD ["node", "server.js"]

# (참고) 현재 프로젝트에 standalone 설정이 확실치 않은 경우 표준 start 명령어 사용
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public

CMD ["npm", "run", "start"]
