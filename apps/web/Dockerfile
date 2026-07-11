FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Next bakes rewrites() at build time, so API_TARGET must be present during build.
# Default points at the deployed Cloud Run API; override with --build-arg locally.
ARG API_TARGET=https://ai-ad-platform-api-663513237336.asia-northeast3.run.app
ENV API_TARGET=$API_TARGET
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.mjs ./next.config.mjs
EXPOSE 3000
# Honor Cloud Run's $PORT (default 3000).
CMD ["sh", "-c", "node_modules/.bin/next start -p ${PORT:-3000}"]
