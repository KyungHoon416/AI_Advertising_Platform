# 00. 아키텍처 의사결정 기록 (ADR) & 요구사항 충돌 점검

> Phase 1 산출물 / 최종 갱신: 2026-07-11 / 작성: Principal Architect
> 스펙 원칙: "임의로 기능을 삭제·단순화하지 않는다. 의사결정이 필요하면 합리적 기본값을 정하고 문서화한다."

이 문서는 요구사항 스펙과 **현재 배포 상태의 간극**, 스펙 내부의 **모호/충돌 지점**을 먼저 점검하고, 각 항목에 대해 채택한 기본 결정을 남긴다. 이후 모든 구현은 이 결정을 기준으로 한다.

---

## A. 현황(As-Is) vs 목표(To-Be) 간극

| 구분 | 현재 배포본 (As-Is) | 스펙 요구 (To-Be) |
|---|---|---|
| Frontend | Vanilla HTML/CSS/JS (public/) | Next.js + TS + Tailwind + shadcn/ui |
| Backend | Node.js / Express (server.js 단일 파일 ~1.5k LOC) | FastAPI / Python |
| DB | 없음 (in-memory MOCK 배열) | PostgreSQL + pgvector + Redis |
| AI | Gemini 단일, 단발 호출 | Claude/OpenAI/Gemini + LangGraph 멀티 에이전트 |
| 데이터 | 비식별 MOCK 5,000명 | 회원/행동/구매/성과 집계 데이터 파이프라인 |
| 배포 | GCP Cloud Run | AWS ECS/RDS/ElastiCache/S3/CloudFront |
| 권한 | 없음 (단일 운영자 화면) | RBAC 3-tier (Super Admin/Admin/Operator) |

**핵심 판단**: To-Be는 As-Is의 점진적 리팩터가 아니라 **신규 스택으로의 재구축**이다. 두 스택(JS/Python)이 다르므로 server.js를 이식하는 것은 비효율적이다.

---

## B. 채택한 의사결정 (Decisions)

### ADR-001. 기존 데모 앱 보존 + 신규 모노레포로 재구축
- **결정**: 현재 배포본(`server.js`, `public/`)은 `legacy/` 참조용으로 **보존**한다. 신규 플랫폼은 모노레포 `apps/web`(Next.js) + `apps/api`(FastAPI) 구조로 새로 구축한다.
- **이유**: 배포 중인 데모를 깨지 않으면서(비파괴), 스펙의 엔터프라이즈 요구를 정공법으로 만족. 데모의 Gemini 프롬프트/PPTX 로직은 신규 Agent/Proposal 서비스로 **자산 이관**한다.

### ADR-002. ORM은 SQLAlchemy 2.0 + Alembic
- **결정**: 스펙의 "Prisma ORM 또는 SQLAlchemy" 중 **SQLAlchemy 2.0(async) + Alembic 마이그레이션** 채택.
- **이유**: 백엔드가 FastAPI/Python이므로 Prisma(JS 생태계)보다 정합성이 높다. pgvector는 `pgvector-python`으로 연동.

### ADR-003. 멀티 LLM 게이트웨이 + 에이전트별 기본 모델 지정
- **결정**: `LLMGateway` 추상화(Provider 인터페이스)로 Claude/OpenAI/Gemini를 교체 가능하게 한다. 에이전트별 기본 모델은 **Settings의 AI 모델 설정(DB)** 에서 관리하며 코드에 하드코딩하지 않는다.
- **기본값**: 추론·분석 에이전트(Scoring/Competitor/Proposal) → Claude, 요약/분류 → Gemini/OpenAI 중 비용 효율 우선. 전부 설정으로 override 가능.
- **이유**: Explainable AI·재현성 요구와 벤더 종속 회피.

### ADR-004. 클라우드 타깃은 AWS(스펙 준수), 로컬은 Docker Compose
- **결정**: 스펙대로 AWS 배포 구조(ECS/RDS/ElastiCache/S3/CloudFront/Secrets Manager)를 IaC로 준비한다. 단, 컨테이너 이미지는 클라우드 중립이라 현 GCP Cloud Run 데모와 병존 가능.
- **이유**: 스펙 우선. 단일 Docker 이미지로 이식성 확보.

### ADR-005. 개인정보 비식별 경계 = "Aggregation Layer"
- **결정**: 외부 LLM에는 **집계·비식별·익명화된 데이터만** 전달한다. 원본 PII는 `MemberRaw`(내부 전용)에 두고, 에이전트가 접근하는 것은 `MemberAggregate`/`BehaviorAggregate`/`PurchaseAggregate`(비식별 집계 뷰)뿐이다. LLM 프롬프트 조립 직전 **PII Masking 미들웨어**를 강제 통과시킨다.
- **이유**: Security by Design. 스펙의 "개인정보를 외부 AI에 직접 전달하지 않는다" 강제.

### ADR-006. 경쟁사 탐색은 Web Search API 필수(하드코딩 금지)
- **결정**: Competitor Discovery Agent는 특정 경쟁사 목록을 하드코딩하지 않고 **웹 검색 API + 카테고리별 검색어 자동 생성**으로 탐색한다. 검색 결과는 `AIAnalysisSource`에 출처·신뢰도와 함께 저장.
- **의존성(리스크)**: 외부 Web Search API 키 조달 필요(예: Brave/Tavily/Bing 등). MVP에서는 provider 인터페이스 + Tavily 기본, 키 미보유 시 **fallback(집계 캐시)** 로 우아하게 저하.

### ADR-007. 스코어링/추천 로직은 100% 설정 주도(Config-driven)
- **결정**: 광고주 스코어링·광고상품 추천의 항목/가중치/계산식은 `ScoringConfig`/`ScoringVersion` 테이블로 관리. 코드에 상수로 박지 않는다. 점수 산출 시 사용한 `scoring_version_id`를 결과에 저장하여 **재현 가능(reproducible)** 하게 한다.
- **이유**: 스펙 SCORING CONFIGURATION 요구 및 "가중치 변경 후 재계산" 기능.

---

## C. 스펙 내부 정합성 점검 (검증 완료)

| 점검 항목 | 결과 |
|---|---|
| 광고주 스코어링 가중치 합 | 15+20+20+15+10+10+10 = **100 ✓** |
| 광고상품 추천 가중치 합 | 20+20+20+15+10+10+5 = **100 ✓** |
| 등급 구간 연속성 (S/A/B/C/D) | 90+/80-89/70-79/60-69/<60 **경계 중복 없음 ✓** |
| 재계약 점수 스케일 | 0~100, High/Medium/Low 매핑 필요 → **기본 High≥70, Medium 40-69, Low<40 (설정화)** |
| 광고상품 4종 vs 기존 데모 "5대 구좌" | 스펙 4종(메인/서브/카테고리/스플래쉬)이 정본. 데모 문구는 legacy로 분리 |

---

## D. 누락/불명확 → 채택한 기본값 (Assumptions)

1. **실데이터 소스**: 실제 회원/구매 DB 연동 경로 미명시 → MVP는 **동일 스키마의 Seed/Mock 집계 데이터**로 구동, 실데이터 ETL은 Phase 6+ 커넥터로 분리.
2. **예상 성과(CTR/CVR/ROI) 산출 근거**: 학습 모델 미명시 → **카테고리·광고상품별 벤치마크 테이블 기반 추정 + 유사 광고주 성과 가중평균**. "실제 데이터 vs 가정"을 UI에서 라벨로 구분(스펙 요구).
3. **인증 방식**: 미명시 → **JWT(access/refresh) + RBAC**, 사내 SSO(OIDC)는 확장 지점으로 설계.
4. **다국어/통화**: 미명시 → 기본 **ko-KR / KRW**.
5. **동시 사용자 규모**: 미명시 → 내부 도구 특성상 수십~수백 명 가정, 수평 확장 여지만 확보(ECS desired count).

---

## E. 리스크 레지스터

| ID | 리스크 | 영향 | 완화책 |
|---|---|---|---|
| R1 | Web Search API 키 미조달 | 경쟁사 탐색 저하 | provider 추상화 + 캐시 fallback (ADR-006) |
| R2 | LLM 비용/레이트리밋 | 운영비·지연 | 모델 라우팅 + Redis 캐시 + 배치 큐(Celery) |
| R3 | 예상 성과 신뢰도 논란 | 영업 신뢰 | 신뢰도(%) 표기 + 사실/추론 분리(Explainable AI) |
| R4 | PII 유출 | 법적·신뢰 | Aggregation Layer + Masking 강제 + Audit Log (ADR-005) |
| R5 | 스코프 과대 | 납기 | MVP 수직 슬라이스 우선(05 문서) |
