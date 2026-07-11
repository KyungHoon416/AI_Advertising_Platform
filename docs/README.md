# Internal AI Advertising Platform — 설계 문서 (Phase 1)

놀이의발견 내부 광고 운영 담당자를 위한 Production-Ready Internal AI Tool의 아키텍처 설계 문서셋.

| 문서 | 내용 |
|---|---|
| [00-DECISIONS](00-DECISIONS.md) | 의사결정 기록(ADR) · As-Is/To-Be 간극 · 요구사항 충돌 점검 · 리스크 |
| [01-REQUIREMENTS](01-REQUIREMENTS.md) | 요구사항 분석(FR/NFR) · 핵심 사용자 시나리오 · 권한 매트릭스 |
| [02-ARCHITECTURE](02-ARCHITECTURE.md) | 시스템/Clean 아키텍처 · AI Agent Workflow(LangGraph) · 데이터 흐름 · 보안 · 폴더구조 |
| [03-SCORING-AND-RECOMMENDATION](03-SCORING-AND-RECOMMENDATION.md) | 광고주 Scoring(100점) · 광고상품 추천(4종+조합) · 예상 성과 산출 |
| [04-DATA-API-UI](04-DATA-API-UI.md) | ERD 초안 · API 목록 · 화면 목록 |
| [05-MVP-AND-ROADMAP](05-MVP-AND-ROADMAP.md) | MVP 수직 슬라이스 · 단계별(Phase 1~7) 개발 계획 |

> 현재 위치: **Phase 1 완료**. 다음 단계: **Phase 2 — Database Schema + Seed**.
> 기존 배포 데모(`server.js`, `public/`)는 ADR-001에 따라 보존/이관 대상.
