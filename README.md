# 🚀 놀이의발견 AI 광고 플랫폼 대시보드 (AI Advertising Platform)

국내 최대 가족 여가 플랫폼 **놀이의발견**의 내부 회원 행동 데이터를 초세분화(Micro-Segmentation) 분석하여 최적의 업종별 대형 광고주를 매칭하고, 원클릭으로 파워포인트(PPTX) 광고 영업 제안서를 빌드 및 내보내기 할 수 있는 프리미엄 AI 광고 플랫폼 대시보드 시스템입니다.

---

## 🛠️ 기술 스택 (Technology Stack)

* **Backend**: Node.js, Express
* **Frontend**: HTML5, Vanilla CSS (Glassmorphism Dark Theme, Responsive Layout), Vanilla JavaScript
* **AI Engine**: Google Gemini API (`@google/genai`)
* **Document Engine**: `pptxgenjs` (PPTX 파워포인트 슬라이드 덱 동적 렌더링)
* **Deployment**: GCP Cloud Run, Cloud Build Docker

---

## 🌟 핵심 구현 기능

### 1. 10대 최종 AI 산출물 (AI Features)
대시보드 메인 화면(Overview)을 통해 각 기능의 처리 프로세스를 순차적으로 제어하고 일제히 모니터링할 수 있습니다.
1. **AI 광고주 추천**: 18개 핵심 업종 100여 개 대형 광고주 DB 실시간 타겟 매칭
2. **AI 시장조사**: 가족 여가 및 아동 액티비티 디지털 광고 시장 트렌드 분석
3. **AI 경쟁사 분석**: 한화리조트, 에버랜드, 네이버 플레이스 등 타 플랫폼 광고 구좌 비교 분석
4. **AI 맞춤형 광고 제안서 생성**: 제안 내용 마크다운 뷰어 및 **실물 `.pptx` 파워포인트 슬라이드 내보내기** 연동
5. **AI 광고 상품 추천**: 5대 전용 구좌 타겟팅 패키지 매칭
6. **AI 광고 성과 분석**: CTR, CVR, ROAS의 AI 효율 판정 지표 표출
7. **AI ROI 리포트**: 광고 집행 결과에 따른 구체적인 개선 액션 플랜 수립
8. **AI 재계약 및 업셀링 추천**: 성과 분석에 따른 상위 패키지 업계 처방 제안
9. **AI Prompt Library**: 안전한 API 프록시 호출을 위한 프롬프트 템플릿 제어
10. **AI Agent 기반 운영 지원**: 백엔드 상시 운영 모듈 연동

### 2. 초세분화 (Micro-Segment) 8대 타겟 분석 지표
단순 타겟 지표 분석을 넘어, 고객 데이터를 세세하게 쪼개어 AI 프롬프트에 주입(Injection)합니다.
* **성별 구성 / 연령대 분포 / 활동 및 거주 지역 / 서비스 가입 기간**
* **평균 찜하기 횟수 / 평균 장바구니 적재 수 / 최근 결제 전환 수**

### 3. 놀이의발견 5대 공식 광고 구좌 (Target Inventory Slots)
광고주 적합도 점수(fitScore) 및 업종 카테고리에 최적 매칭되는 지면을 자동 처방합니다.
* **스플래쉬 (Splash)**: 앱 구동 시 단독 노출되는 최상위 브랜드 인지도 획득용 지면
* **메인배너 (Main Banner)**: 홈 상단 롤링 배너 구좌
* **카테고리 (Category)**: 전용 업종 기획 지면
* **팝업 (Popup)**: 전면 쿠폰 및 즉시 혜택 제공 팝업
* **서브 배너 (Sub Banner)**: 보조용 기획 하단 띠배너 구좌

---

## 💻 로컬 개발 환경 실행 방법

1. **의존성 모듈 설치**:
   ```bash
   npm install
   ```
2. **환경 변수 설정**:
   `.env` 파일을 루트 디렉토리에 생성한 뒤, 본인의 Gemini API Key를 입력합니다.
   ```env
   PORT=3000
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
3. **로컬 서버 구동**:
   ```bash
   node server.js
   # 또는
   npm start
   ```
4. **브라우저 접속**:
   [http://localhost:3000](http://localhost:3000)

---

## 🚢 Google Cloud Run 배포 가이드

```bash
gcloud run deploy ai-advertising-platform \
  --project fluted-set-459918-k4 \
  --source . \
  --region asia-northeast3 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=AIzaSyB6v...
```
