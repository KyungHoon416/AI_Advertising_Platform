# Internal AI Advertising Platform (놀이의발견)

놀이의발견 내부 광고 운영 담당자를 위한 **Production-Ready Internal AI Tool**.
회원 행동·구매·성과 데이터와 외부 시장 데이터를 활용해 광고 영업/운영 전 과정을
AI가 지원·자동화한다: 시장조사 → 경쟁사 분석 → 잠재 광고주 발굴 → 적합도 스코어링(설명가능)
→ 광고상품 추천 → 제안서 생성 → 성과/ROI/재계약.

> 초기 Gemini 데모(루트 `server.js` / `public/`, GCP Cloud Run 배포)는 참조용 legacy이며,
> 본 플랫폼은 `apps/`의 신규 스택으로 재구축되었다. (배경: [docs/00-DECISIONS.md](docs/00-DECISIONS.md))

## 모노레포 구조
```
apps/
  api/      FastAPI · SQLAlchemy 2.0 · Alembic · LLM Gateway · 11 AI Agents  (Python 3.11)
  web/      Next.js 14 App Router · TypeScript · Tailwind                     (Node 20)
infra/      docker-compose (postgres+pgvector · redis · api · web)
docs/       Phase 1 설계 문서 (아키텍처 · ERD · 스코어링/추천 로직 · 로드맵)
.github/    CI (backend pytest · frontend build)
```

## 빠른 시작 (Docker Compose)
```bash
docker compose -f infra/docker-compose.yml up --build
# web:  http://localhost:3000   (로그인 admin@nolbal.com / ChangeMe!234)
# api:  http://localhost:8000/docs
```

## 로컬 개발 (SQLite, Docker 없이)
- 백엔드: [apps/api/README.md](apps/api/README.md)
- 프론트: [apps/web/README.md](apps/web/README.md)

## 현재 진행 (스펙 Phase)
| Phase | 상태 |
|---|---|
| 1 Architecture · 2 Database · 3 Backend | ✅ |
| 4 AI Agent (11 agents + pipeline, LLM 폴백) | ✅ MVP |
| 5 Frontend (로그인·대시보드·추천·설명가능성·제안서·시장/경쟁·Settings·Prompt) | ▶ 핵심 완료 |
| 7 Infra (docker-compose · GitHub Actions CI) | ▶ 착수 |

## 핵심 원칙
Clean Architecture · DDD · 설정주도 스코어링(재현 가능) · Explainable AI(사실/추론 구분)
· PII 비식별 경계(외부 LLM엔 집계 데이터만) · RBAC · 멀티 LLM 게이트웨이(+폴백).

## 테스트
```bash
cd apps/api && pytest -q     # 46 passing
cd apps/web && npm run build # 타입체크 + 빌드
```
