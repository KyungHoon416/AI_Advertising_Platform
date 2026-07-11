# 04. ERD 초안 · API 목록 · 화면 목록

> Phase 1 산출물

## 1. ERD 초안 (핵심 엔티티 & 관계)

```
User ─< UserRole >─ Role ─< RolePermission >─ Permission
User ─< AuditLog

Category 1─* Advertiser
Advertiser *─* Category   (AdvertiserCategory: 다중 카테고리)
Advertiser 1─* AdvertiserScore ─* ScoreFactor
AdvertiserScore *─1 ScoringVersion
ScoringVersion 1─* ScoringConfig ─* ScoreFactorDef

Category 1─* MarketResearch
Category 1─* Competitor ─1 CompetitorAnalysis
CompetitorAnalysis *─* AIAnalysisSource

Advertiser 1─* AdProductRecommendation ─* AdProductRecItem(상품별 점수)
AdProduct 1─* AdProductCategoryRule
AdProduct 1─* AdProductRecItem

Advertiser 1─* Proposal ─* ProposalVersion
Advertiser 1─* Campaign ─* CampaignPerformance
Campaign 1─* RenewalRecommendation
Campaign 1─* UpsellRecommendation

CustomerSegment, MemberAggregate, BehaviorAggregate, PurchaseAggregate  (비식별 집계)
MemberRaw (PII, 내부 전용 · 외부 반출 금지)

Prompt 1─* PromptVersion
AgentExecution (모든 Agent 실행 로그) *─1 PromptVersion
```

### 1.1 주요 엔티티 정의(핵심 컬럼)
| 엔티티 | 핵심 컬럼 |
|---|---|
| User | id, email, password_hash, name, is_active |
| Role / Permission | code, name (Super Admin/Admin/Operator; 권한 코드) |
| Category | id, parent_id, name, level(대/중/소), is_active, attributes(jsonb: 핵심고객·계절성·경쟁강도 등) |
| Advertiser | id, name, brand, primary_category_id, region, size, budget_band, status, source(discovery/manual) |
| MarketResearch | id, category_id, market_size, growth_rate, trends(jsonb), opportunities, risks, confidence, analyzed_at |
| Competitor | id, category_id, company, brand, type(direct/indirect/media/commerce/ota/content/local) |
| CompetitorAnalysis | id, competitor_id, products, pricing, promo, channels(jsonb), strengths, weaknesses, differentiators, confidence |
| AIAnalysisSource | id, ref_type, ref_id, source_url, collected_at, confidence, is_fact(bool) |
| AdvertiserScore | id, advertiser_id, total_score, grade, scoring_version_id, computed_at |
| ScoreFactor | id, advertiser_score_id, factor_code, score, max_score, rationale, data_refs(jsonb), is_inference, confidence |
| ScoringVersion | id, version, status, effective_from, created_by |
| ScoringConfig / ScoreFactorDef | version_id, factor_code, max_score, weight, calc_method, category_scope, is_active |
| AdProduct | id, code(main/sub/category/splash), name, definition, features(jsonb), fit_purposes, base_price_band |
| AdProductCategoryRule | id, ad_product_id, condition(jsonb), boost_factor, boost_points |
| AdProductRecommendation | id, advertiser_id, purpose, budget, combo(jsonb), created_at |
| AdProductRecItem | id, recommendation_id, ad_product_id, fit_score, reason, role, est_metrics(jsonb) |
| Proposal / ProposalVersion | id, advertiser_id, status; version, content(jsonb 섹션), export_urls(jsonb) |
| Campaign | id, advertiser_id, ad_product_id, name, period, contract_amount, status, creatives(jsonb) |
| CampaignPerformance | id, campaign_id, impressions, clicks, ctr, conversions, cvr, revenue, roas, roi, period |
| RenewalRecommendation | id, campaign_id, likelihood(High/Med/Low), score, rationale |
| UpsellRecommendation | id, campaign_id, target_product_id, reason |
| MemberAggregate/Behavior/Purchase | 비식별 집계 지표(연령대·지역·카테고리별 조회/찜/구매/재구매율 등) |
| Prompt / PromptVersion | category, name; version, template, output_schema(jsonb), model, status |
| AgentExecution | id, agent, input_hash, output(jsonb), model, prompt_version_id, tokens, latency_ms, status, created_at |
| AuditLog | id, user_id, action, target, before/after(jsonb), created_at |

## 2. API 목록 (도메인별, `/api/v1`)

**Auth**: `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me`
**Users/RBAC**: `GET/POST/PATCH /users`, `GET /roles`, `PATCH /users/{id}/roles`
**Categories**: `GET/POST/PATCH /categories`, `PATCH /categories/{id}/deactivate`
**Advertisers**: `GET/POST/PATCH /advertisers`, `GET /advertisers/{id}`, `GET /advertisers/{id}/score`
**Market Research**: `POST /market-research/run` (SSE stream), `GET /market-research?category=`
**Competitor**: `POST /competitors/discover` (SSE), `POST /competitors/{id}/analyze`, `GET /competitors?category=`
**Advertiser Discovery**: `POST /discovery/advertisers` (SSE)
**Scoring**: `POST /scoring/advertisers/{id}` , `POST /scoring/recalculate` (version), `GET /scoring/config`, `PUT /scoring/config` (Super Admin), `GET /scoring/versions`
**Ad Products**: `GET/POST/PATCH /ad-products`, `GET /ad-products/rules`
**Recommendation**: `POST /recommendations/ad-products` (advertiser 기반, SSE), `GET /recommendations/{id}`
**Proposal**: `POST /proposals/generate` (SSE), `GET /proposals/{id}`, `POST /proposals/{id}/export?format=pdf|pptx|docx`, `POST /proposals/{id}/share`
**Campaign/Performance**: `GET/POST/PATCH /campaigns`, `POST /campaigns/{id}/performance`, `POST /performance/{id}/analyze`
**ROI**: `POST /roi/analyze`
**Renewal/Upsell**: `POST /renewal/{campaignId}`, `GET /renewal?status=`
**Prompt Library**: `GET/POST/PATCH /prompts`, `GET /prompts/{id}/versions`, `POST /prompts/{id}/test`, `POST /prompts/{id}/publish`
**Agent/Executions**: `GET /agent-executions`, `GET /agent-executions/{id}`
**Dashboard**: `GET /dashboard/kpis`, `GET /dashboard/charts`
**Common**: 모든 목록 API = `?q&filters&sort&page&size`, `GET .../export?format=csv|xlsx`

> AI 실행 API는 **SSE 스트리밍** + `POST .../async`(큐잉) 병행. 실행 상태는 `AgentExecution`로 폴링/구독.

## 3. 화면 목록 (사이드바 = 라우트)

| # | 화면 | 핵심 컴포넌트 |
|---|---|---|
| 1 | Dashboard | KPI 카드(13종) · 차트(9종) · 종료예정/재계약/업셀 위젯 |
| 2 | AI 광고주 추천 | 후보 테이블(점수/등급) · **Explainability Drawer** · 실행 스트리밍 |
| 3 | 카테고리 시장조사 | 카테고리 선택 · Market Research 스트리밍 리포트 · 이력 비교 |
| 4 | 경쟁사 분석 | 경쟁사 카드(유형별) · 신뢰도·사실/추론 분리 · 출처 목록 |
| 5 | 광고상품 추천 | 4상품 점수 레이더/바 · 조합 추천 · 예상 성과 · 역할 설명 |
| 6 | 광고 제안서 | 섹션 에디터 · 미리보기 · Export(PDF/PPTX/DOCX)/공유 |
| 7 | 광고주 관리 | 목록(검색/필터/정렬/컬럼설정/Export) · 상세 |
| 8 | 광고상품 관리 | 상품·규칙 CRUD |
| 9 | 광고 운영 | 캠페인 목록/상태 · 소재·기간·계약금 |
| 10 | 광고 성과 | 성과 입력 · Performance Analysis 결과 · 개선안 |
| 11 | ROI 분석 | ROI 퍼널 · 업종 평균 대비 |
| 12 | 재계약·업셀링 | 가능성(High/Med/Low) · 업셀 상품 추천 |
| 13 | Prompt Library | Prompt CRUD/버전/테스트/배포/비교 |
| 14 | AI Agent | 워크플로우 실행 현황 · AgentExecution 로그 |
| 15 | Data Management | 집계 데이터·Seed·카테고리 데이터 |
| 16 | Settings | 사용자/권한 · AI 모델 · **Scoring 가중치** · 시스템 로그 |

### 3.1 공통 UI 상태
Loading Skeleton · Empty State · Error State/Boundary · Success Toast · Confirmation Dialog. AI 화면: Agent별 진행 상태 · 스트리밍 · 오류/재시도 · 중단 · 이력 비교.
