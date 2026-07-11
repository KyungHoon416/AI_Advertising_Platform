# 02. 시스템 아키텍처 · AI Agent Workflow · 데이터 흐름 · 보안 · 폴더 구조

> Phase 1 산출물

## 1. 시스템 아키텍처 (Clean Architecture)

```
┌───────────────────────────────────────────────────────────────┐
│ Client (Browser, 반응형/다크모드)                                │
│  Next.js App Router · TS · Tailwind · shadcn/ui                 │
│  React Query(server state) · Zustand(UI state) · Recharts       │
└───────────────▲───────────────────────────────┬───────────────┘
                │ HTTPS / OpenAPI 계약            │ SSE(AI 스트리밍)
┌───────────────┴───────────────────────────────▼───────────────┐
│ API Gateway (FastAPI)                                          │
│  Interface Layer:  routers / DTO(Pydantic) / auth · RBAC       │
│  Application Layer: use-cases / services (도메인 조율)          │
│  Domain Layer:     entities · value-objects · domain services  │
│                    (Scoring, Recommendation 순수 로직)          │
│  Infrastructure:   SQLAlchemy repo · Redis · LLMGateway ·      │
│                    WebSearch · S3 · Secrets                     │
└───┬────────────┬────────────┬───────────────┬────────────┬────┘
    │            │            │               │            │
┌───▼───┐   ┌────▼────┐  ┌────▼─────┐   ┌─────▼────┐  ┌────▼─────┐
│Postgres│  │ Redis   │  │ Celery   │   │LangGraph │  │ External │
│+pgvector│ │ cache/  │  │ workers  │   │ AI Agents│  │ LLM/Search│
│        │  │ queue   │  │(재계산·   │   │Orchestr. │  │ APIs     │
│        │  │         │  │ 배치 AI) │   │          │  │          │
└────────┘  └─────────┘  └──────────┘   └──────────┘  └──────────┘
```

**계층 규칙(의존성 방향)**: Interface → Application → Domain ← Infrastructure. Domain은 어떤 프레임워크/DB/LLM도 모른다(순수 파이썬). Scoring/Recommendation 로직은 Domain에 두어 단위테스트가 가능하고 벤더 교체에 불변.

## 2. AI Agent Architecture (LangGraph Orchestration)

11개 에이전트를 **독립 노드**로 구현하고 LangGraph 워크플로우로 연결한다. 각 노드는 `AgentContext`(입력)와 `Structured Output`(Pydantic 스키마)만 주고받는다.

### 2.1 메인 워크플로우 (Sales Pipeline Graph)
```
[Category Classification]
        │ (category, subcategory)
        ▼
[Market Research] ─────────────┐
        │                      │ (병렬 가능)
        ▼                      ▼
[Competitor Discovery] → [Competitor Intelligence]
        │ (competitor set + intel)
        ▼
[Advertiser Discovery]  (시장·경쟁 결과 활용)
        │ (candidate advertisers)
        ▼
[Advertiser Scoring] ── uses ScoringConfig(version)
        │ (score, grade, factor breakdown)
        ▼
[Ad Product Recommendation] (+ 예상 성과, 조합)
        │
        ▼
[Proposal]  → 제안서 draft
```
- **운영 워크플로우(별도 그래프)**: `[Performance Analysis] → [ROI] → [Renewal/Upsell]`.
- 각 에이전트는 **재시도/중단/부분 실패** 처리. 실행 단위마다 `AgentExecution` 기록(모델·토큰·지연·프롬프트 version·입력 해시·출력).
- 컨텍스트 체이닝: 선행 노드 산출물이 후행 노드 프롬프트에 **요약본**으로 주입(현 데모의 previousContext 개념을 정식화).

### 2.2 에이전트 명세 (I/O 요약)
| # | Agent | 입력 | Structured Output(핵심) |
|---|---|---|---|
| 1 | Category Classification | 광고주/브랜드 텍스트 | 대/중/소분류·주요상품·핵심고객·지역·계절성·광고목적 |
| 2 | Market Research | category | 시장규모·성장률·트렌드·소비자특성·브랜드·기회·위험 |
| 3 | Competitor Discovery | category + 검색어 | competitor 후보[] + 유형(직접/간접/매체/커머스/OTA/콘텐츠/지역) |
| 4 | Competitor Intelligence | competitor 후보 | 상품/가격/프로모션/채널별 광고전략/강약점/차별점 + 신뢰도 |
| 5 | Advertiser Discovery | 시장·경쟁 결과 | 잠재광고주[]: 업종·상품·고객·지역·추천이유·우선순위 |
| 6 | Advertiser Scoring | advertiser + aggregates + config | 총점·등급·7항목 breakdown·근거·사용데이터·version |
| 7 | Ad Product Rec. | advertiser·목적·예산·경쟁 | 4상품 점수·1/2순위·조합·역할·예상성과·리스크 |
| 8 | Proposal | advertiser + 추천상품 | 섹션별 제안서 구조체(사실/가정 라벨 포함) |
| 9 | Performance Analysis | campaign perf | 요약·달성률·고저 원인·개선안 |
| 10 | ROI | 광고비/노출/클릭/전환/거래액 | ROI·ROAS·효율·업종평균 대비 |
| 11 | Renewal/Upsell | 성과+계약이력 | 재계약 가능성·점수·업셀 상품 |

## 3. 데이터 흐름 & 개인정보 경계

```
[내부 원본 DB]  ──ETL(사내)──▶  MemberRaw (PII, 내부 전용, 외부 반출 금지)
                                      │  (집계·비식별·익명화)
                                      ▼
                    MemberAggregate / BehaviorAggregate / PurchaseAggregate
                                      │
                          Domain Services (Scoring 등)
                                      │  ── PII Masking 미들웨어(강제) ──
                                      ▼
                              LLMGateway → 외부 LLM
```
- 외부 LLM/검색으로 나가는 payload는 **Masking 미들웨어**를 반드시 통과(정규식+필드 화이트리스트). 위반 시 요청 차단 + Audit 기록.
- 외부에서 수집한 사실은 `AIAnalysisSource`(출처 URL·수집일·신뢰도)로 근거 추적.

## 4. 보안 구조 (Security by Design)
- **인증/인가**: JWT(access 15m/refresh) + RBAC 미들웨어(역할→권한 매핑).
- **PII**: Aggregation Layer 분리(ADR-005), 응답 PII Masking, 컬럼 암호화(민감 필드).
- **Secrets**: AWS Secrets Manager(로컬은 .env), API Key 저장 시 암호화.
- **AI 안전**: Prompt Injection 필터(입력 sanitization + 시스템/사용자 프롬프트 분리 + 도구 화이트리스트), AI 응답 스키마 검증(Structured Output 강제, 실패 시 재시도/거부).
- **네트워크**: Rate Limiting(Redis 토큰버킷), Input Validation(Pydantic/Zod), CORS 화이트리스트.
- **감사**: 모든 변경·AI 실행·권한 행위 AuditLog 적재.

## 5. 폴더 구조 (모노레포)
```
/
├─ apps/
│  ├─ web/                      # Next.js (App Router)
│  │  ├─ app/(dashboard)/...    # 라우트 그룹 = 사이드바 메뉴
│  │  ├─ components/ui/         # shadcn/ui
│  │  ├─ features/              # 도메인별 UI (advertiser, scoring, proposal ...)
│  │  ├─ lib/api/               # 생성된 OpenAPI client, React Query hooks
│  │  ├─ lib/schemas/           # Zod 스키마 (BE Pydantic과 동기화)
│  │  └─ stores/                # Zustand
│  └─ api/                      # FastAPI
│     ├─ app/interface/         # routers, DTO, deps(auth/rbac)
│     ├─ app/application/       # use-cases, services
│     ├─ app/domain/            # entities, value objects, scoring/recommendation (순수)
│     │  ├─ scoring/            # ScoringEngine, factors, grade
│     │  └─ recommendation/     # AdProductRecommender, combos
│     ├─ app/infrastructure/    # db(sqlalchemy), repositories, redis, llm/, websearch/, s3
│     ├─ app/agents/            # LangGraph nodes + graph 정의
│     ├─ app/core/              # config, security, masking, logging
│     ├─ alembic/               # migrations
│     └─ tests/
├─ packages/shared/             # OpenAPI 스펙 · 공통 타입 생성물
├─ infra/                       # docker-compose, Dockerfiles, AWS IaC, github actions
├─ legacy/                      # 기존 데모(server.js, public/) 보존 (ADR-001)
└─ docs/                        # 본 설계 문서
```

## 6. 타입 안전성 파이프라인
FastAPI가 OpenAPI 3.1 스펙 발행 → `openapi-typescript` + `orval`로 **web의 API 클라이언트/타입/React Query 훅 자동 생성** → Zod 스키마와 대조. 백엔드 Pydantic이 단일 진실원(SSOT).
