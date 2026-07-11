# apps/web — Frontend (Next.js)

Internal AI Advertising Platform 프론트엔드. Next.js 14 App Router · TypeScript · Tailwind.
White 기반 Minimal Enterprise 디자인(Primary #3B82F6).

## Phase 5 (진행 중) 구현 화면
- **로그인** (`/login`) — JWT 발급·저장(localStorage), 401 시 자동 리다이렉트
- **대시보드** (`/`) — 백엔드 `/dashboard/kpis` 실데이터 KPI 카드
- **AI 광고주 추천** (`/advertisers`) — 광고주 목록 + 분석 Drawer
  - **적합도 점수**: 총점·등급·신뢰도 + 7항목 **설명가능성**(점수 바 · 사실/추론 라벨 · 근거)
  - **광고상품 추천**: 4상품 적합도 · 조합 · 예상 성과(가정)
  - **제안서**: LLM(폴백) 생성 섹션 뷰 (사실/가정 라벨)

## 로컬 실행
```bash
# 1) 백엔드 (SQLite로 간편 구동)
cd apps/api
cp .env.example .env   # 또는 DATABASE_URL=sqlite+aiosqlite:///./_local.db 로 설정
DATABASE_URL_SYNC="sqlite:///./_local.db" .venv/bin/alembic upgrade head
DATABASE_URL="sqlite+aiosqlite:///./_local.db" .venv/bin/python -m app.seed.seed
.venv/bin/uvicorn app.main:app --port 8000

# 2) 프론트엔드
cd apps/web
npm install
API_TARGET=http://localhost:8000 npm run dev   # http://localhost:3000
# 로그인: admin@nolbal.com / ChangeMe!234
```

`next.config.mjs`의 rewrite가 `/api/*` → 백엔드(`API_TARGET`)로 프록시하여 CORS 없이 동작합니다.

## 구조
```
app/
  login/page.tsx            로그인
  (app)/layout.tsx          인증 가드 + 사이드바
  (app)/page.tsx            대시보드
  (app)/advertisers/page.tsx 광고주 목록 + 분석 Drawer
lib/api.ts                  타입 세이프 API 클라이언트
```

> 참고: 스펙의 shadcn/ui·React Query·Zustand·Recharts는 후속 레이어링 대상. 현재는
> 런타임 부담을 줄인 Tailwind 핸드크래프트 컴포넌트로 핵심 플로우를 우선 구현.
> 프로덕션은 보안 권고에 따라 Next 15 이상 채택 권장.
