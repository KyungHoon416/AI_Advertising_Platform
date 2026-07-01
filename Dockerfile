# Node.js 공식 경량 이미지를 베이스로 사용
FROM node:20-slim

# 작업 디렉토리 지정
WORKDIR /app

# package.json 및 package-lock.json 복사
COPY package*.json ./

# 프로덕션 의존성만 설치
RUN npm ci --only=production

# 소스코드 전체 복사
COPY . .

# Cloud Run은 환경변수 PORT를 주입해 줍니다 (기본값 8080 또는 3000)
ENV PORT=3000
EXPOSE 3000

# 애플리케이션 시작 명령
CMD ["node", "server.js"]
