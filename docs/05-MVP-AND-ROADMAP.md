# 05. MVP 구현 범위 & 단계별 개발 계획

> Phase 1 산출물 / 원칙: 기능을 삭제·단순화하지 않되, **가치 있는 수직 슬라이스**부터 완성한다.

## 1. MVP 정의 (Vertical Slice)
"운영자가 전문가 없이 **광고주 발굴 → 적합도 판단(설명가능) → 광고상품 추천 → 제안서 Export**까지 완결"하는 최소 경로를 실제 동작 수준으로 구현.

### 1.1 MVP 포함
- **기반**: 모노레포·Docker Compose(Postgres/Redis)·인증·RBAC(3역할)·Audit·PII Masking·OpenAPI 타입 생성.
- **데이터**: Category(관리형)·Advertiser·Aggregate(Seed)·AdProduct(4종)·ScoringConfig v1·Benchmark.
- **Agent(6/11)**: Category Classification · Market Research · Competitor Discovery+Intelligence · Advertiser Scoring · Ad Product Recommendation · Proposal (LangGraph 메인 그래프).
- **엔진**: Scoring(설명가능·config·version) · Ad Product Recommendation(단일+조합·예상성과).
- **화면**: Login · Dashboard(핵심 KPI) · 광고주 추천(+Explainability Drawer) · 시장조사 · 경쟁사 분석 · 광고상품 추천 · 제안서(Export PDF/PPTX) · Settings>Scoring Config · Prompt Library(기본).

### 1.2 MVP 제외 → 후속(Fast Follow)
운영/성과 입력·Performance Analysis·ROI·재계약/업셀 운영 그래프, DOCX/공유링크, 실데이터 ETL, AWS 프로덕션 배포, 고급 차트 9종 전부, pgvector RAG 고도화.

## 2. 단계별 개발 계획 (스펙 Phase 매핑)

| Phase | 산출물 | 상태 |
|---|---|---|
| **1. Architecture** | 요구분석·아키텍처·Agent 워크플로우·Scoring/Rec 로직·ERD·API·화면·MVP·계획 | ✅ **완료** |
| **2. Database** | 35-table SQLAlchemy 모델 · Alembic 마이그레이션 · 멱등 Seed · FastAPI 엔트리 · docker-compose | ✅ **완료** (SQLite로 end-to-end 검증) |
| 3. Backend | ✅ Auth/RBAC · Category/Advertiser/AdProduct API · 설정주도 Scoring 엔진+API · 광고상품 추천 엔진+API · **Proposal API** | ✅ **완료** |
| 4. AI Agent | ✅ LLMGateway(멀티 프로바이더+PII 마스킹+폴백) · Proposal Agent · **Category/Market/Competitor Discovery+Intelligence/Advertiser Discovery Agent(구조화 출력+폴백)** · **Sales Pipeline 오케스트레이터** · AgentExecution 로깅 → ⬜ LangGraph executor 스왑 | ✅ **MVP 완료** |
| 5. Frontend | ✅ Next.js(App Router)+TS+Tailwind · Login · Dashboard(KPI) · 광고주 추천 · **Scoring Explainability Drawer** · 상품추천 · 제안서 (백엔드 실연동 E2E 검증) → ⬜ 시장/경쟁/Settings/Prompt 화면 | ▶ **진행 중** |
| 6. Data/Test | Seed/Mock → Unit(도메인) → Integration/API → Scoring Test → AI Output Validation | 대기 |
| 7. Infra | Docker Compose → 환경변수/Secrets → AWS IaC → CI/CD(GitHub Actions) → 운영 가이드 | 대기 |

## 3. Phase 2 착수 계획 (즉시 진행)
1. `apps/api` FastAPI 스캐폴드 + `core/config`·`core/security`.
2. SQLAlchemy 2.0 base + 04문서 ERD 엔티티 모델링(우선순위: User/Role/Permission, Category, Advertiser, AdProduct, ScoringConfig/Version/FactorDef, AdvertiserScore/ScoreFactor).
3. Alembic 초기 마이그레이션.
4. Seed: 역할 3종·권한 매트릭스·기본 Category 트리·AdProduct 4종·ScoringConfig v1(가중치)·Benchmark 표·샘플 Advertiser/Aggregate.
5. `docker-compose.yml`(postgres+pgvector, redis, api) + `.env.example`.

## 4. Definition of Done (공통)
- 도메인 로직 단위테스트 통과 · OpenAPI 계약 최신 · 타입 생성물 동기화 · Lint/format · Audit·Masking 경유 · 화면은 Loading/Empty/Error 상태 구비.

## 5. 다음 실행(이번 세션 이후 제안)
> 승인 시 **Phase 2 = DB Schema + Seed**부터 실제 코드로 착수한다. (스펙: "프로젝트 기본 구조와 Database Schema부터 구현 시작")
