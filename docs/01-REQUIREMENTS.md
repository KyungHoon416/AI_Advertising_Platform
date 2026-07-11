# 01. 요구사항 분석 & 핵심 사용자 시나리오

> Phase 1 산출물

## 1. 문제 정의 (Problem)
놀이의발견의 광고 사업은 현재 **소수 광고 영업 전문가의 암묵지**에 의존한다. 일반 운영 담당자는 시장조사·경쟁사 분석·광고주 발굴·적합도 판단·제안서 작성을 스스로 수행하기 어렵다.

## 2. 목표 (Goal)
내부 데이터 + 외부 시장 데이터를 활용해 **광고 영업/운영 전 과정을 AI가 지원·자동화**하여, 전문가 없이도 일반 운영 담당자가 광고 사업을 운영할 수 있게 한다.

## 3. 핵심 성공 지표 (Product KPI)
- 제안서 1건 준비 소요시간: (기존 수 시간) → **10분 이내**
- 운영자 단독 처리 가능한 영업 파이프라인 비율 상향
- AI 추천 광고주의 실제 계약 전환율 추적 가능(설명가능성 기반 신뢰)

## 4. 기능 요구사항 (FR)
| ID | 요구 | 관련 Agent/모듈 |
|---|---|---|
| FR-01 | 내부 데이터 집계·비식별화 | Aggregation Layer |
| FR-02 | 광고주/브랜드 카테고리 자동 분류 | Category Classification |
| FR-03 | 카테고리별 시장조사 | Market Research |
| FR-04 | 경쟁사 자동 탐색(하드코딩 금지) | Competitor Discovery |
| FR-05 | 경쟁사 광고·마케팅 전략 분석 | Competitor Intelligence |
| FR-06 | 잠재 광고주 발굴 | Advertiser Discovery |
| FR-07 | 광고주 적합도 100점 스코어링 | Advertiser Scoring |
| FR-08 | 광고주 우선순위/등급 추천 | Advertiser Scoring |
| FR-09 | 4대 광고상품 추천(+조합) | Ad Product Recommendation |
| FR-10 | 예상 성과(CTR/CVR/ROI) 산출 | Recommendation + 벤치마크 |
| FR-11 | 맞춤 제안서 생성 + Export(PDF/PPTX/DOCX) | Proposal |
| FR-12 | 광고 운영/성과 관리 | Campaign/Performance |
| FR-13 | 성과 분석·개선안 | Performance Analysis |
| FR-14 | ROI 리포트 | ROI |
| FR-15 | 재계약/업셀링 추천 | Renewal |
| FR-16 | 설명가능한 근거 제시(항목별 점수/출처/신뢰도) | Explainability |
| FR-17 | Prompt Library CRUD/버전/테스트/배포 | Prompt Library |
| FR-18 | 스코어링 가중치 설정·재계산 | Scoring Config |
| FR-19 | RBAC(3역할) | Auth |
| FR-20 | 감사 로그 | AuditLog |

## 5. 비기능 요구사항 (NFR)
- **보안**: PII 비식별, 외부 AI 전송 통제, RBAC, Audit, Prompt Injection 방어, Rate Limiting, Secrets Manager.
- **설명가능성**: 모든 추천은 총점/항목점수/근거/출처/가중치/scoring version/신뢰도/사실·추론 구분 제공.
- **재현성**: 저장된 scoring version으로 과거 점수 재현.
- **타입 안전성**: FE(TS+Zod) ↔ BE(Pydantic) 스키마 일치, OpenAPI로 계약.
- **반응형/다크모드**: 모든 화면.
- **관측성**: AgentExecution 로그(입력/출력/토큰/지연/모델/버전).
- **성능**: 목록 서버 페이지네이션, AI는 스트리밍 + 비동기 큐.

## 6. 핵심 사용자 시나리오 (User Scenarios)

### 시나리오 A — Operator: "지역 워터파크 신규 광고주 발굴"
1. Operator가 `카테고리 시장조사`에서 **레저 > 워터파크** 선택 → Market Research Agent 실행(스트리밍).
2. `경쟁사 분석`에서 AI가 직접 경쟁사 탐색·분석(신뢰도% 표기, 사실/추론 분리).
3. `AI 광고주 추천`에서 잠재 광고주 후보 리스트업 → 각 후보 **적합도 점수/등급** 자동 산출.
4. 특정 후보 클릭 → **Explainability Drawer**: 7개 항목별 점수·근거·사용 데이터·가중치·scoring version 확인.
5. `광고상품 추천`: 스플래쉬(94) + 카테고리 광고(89) 조합 추천 + 각 상품 역할 설명 + 예상 성과.
6. `광고 제안서`: 광고주+추천상품 선택 → Proposal Agent가 13섹션 제안서 생성 → **PPTX Export**.
> Operator 권한으로 조회·실행·제안서 생성까지 전문가 없이 완결.

### 시나리오 B — Admin: "성과 저조 캠페인 진단 & 업셀링"
1. `광고 성과`에서 진행 캠페인의 CTR/CVR/ROAS 확인.
2. Performance Analysis Agent가 저성과 원인/개선안(상품변경·예산·기간·타겟) 제시.
3. `ROI 분석`에서 ROI 퍼널·업종 평균 대비 진단.
4. `재계약·업셀링`에서 재계약 가능성(High/Med/Low)·업셀 상품 추천.

### 시나리오 C — Super Admin: "가중치 조정 후 전 광고주 재점수"
1. `Settings > Scoring Config`에서 '고객 타겟 적합도' 가중치 20→25 조정 → 새 `ScoringVersion` 발행.
2. "전체 재계산" 트리거 → 백그라운드 워커가 광고주 점수 재산출.
3. 기존 결과는 이전 version으로 보존(재현 가능), 신규 결과는 새 version으로 기록.

## 7. 역할별 권한 매트릭스 (요약)
| 기능 | Super Admin | Admin | Operator |
|---|---|---|---|
| 사용자/권한 관리 | ✅ | ❌ | ❌ |
| AI 모델·Prompt 배포 | ✅ | 조회 | 조회 |
| Scoring 가중치 변경 | ✅ | 일부 | ❌ |
| 광고주/상품 관리 | ✅ | ✅ | 조회 |
| 시장/경쟁/추천 실행 | ✅ | ✅ | ✅ |
| 제안서 생성 | ✅ | ✅ | ✅ |
| 성과 입력·운영 | ✅ | ✅ | ✅ |
| 시스템 로그/Audit | ✅ | 일부 | ❌ |
