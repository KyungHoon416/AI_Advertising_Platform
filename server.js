import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import pptxgen from 'pptxgenjs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 정적 파일 서빙 (public 폴더)
app.use(express.static(path.join(__dirname, 'public')));

// Gemini API 클라이언트 초기화
let ai = null;
const API_KEY = process.env.GEMINI_API_KEY;

if (API_KEY && API_KEY.trim() !== '' && API_KEY !== 'your_gemini_api_key_here') {
  try {
    ai = new GoogleGenAI({ apiKey: API_KEY });
    console.log('Gemini API Client initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize Gemini API Client:', error);
  }
} else {
  console.log('Gemini API Key is missing. Server will run in Mock Demo Mode.');
}

// ----------------------------------------------------
// 가상 DB 데이터 (놀이의발견 시뮬레이션 데이터)
// ----------------------------------------------------
const MOCK_USERS = Array.from({ length: 5000 }).map((_, i) => {
  const genders = ['남성', '여성'];
  const ages = ['20대', '30대', '40대', '50대이상'];
  const locations = ['서울', '경기', '부산', '대구', '광주', '인천', '대전', '기타'];
  const periods = ['1개월미만', '1-6개월', '6개월-1년', '1년이상'];
  const categories = ['여행·숙박', '레저·테마파크', '외식', '패스트푸드', '치킨', '카페', '식품', '패션', '뷰티', '쇼핑·커머스', '금융', '자동차', 'IT·전자', '게임', '교육', '육아', '헬스케어', '캠핑·아웃도어'];
  
  const gender = genders[Math.floor(Math.random() * genders.length)];
  const age = ages[Math.floor(Math.random() * ages.length)];
  const location = locations[Math.floor(Math.random() * locations.length)];
  const period = periods[Math.floor(Math.random() * periods.length)];
  const favorite = categories[Math.floor(Math.random() * categories.length)];
  
  // 행동 스코어
  return {
    id: `user_${10000 + i}`,
    gender,
    age,
    location,
    period,
    favorite,
    cartCount: Math.floor(Math.random() * 5),
    wishCount: Math.floor(Math.random() * 10),
    purchaseCount: Math.floor(Math.random() * 8),
    purchaseAmount: Math.floor(Math.random() * 500000),
  };
});

const MOCK_ADVERTISERS = [
  // 🏨 여행·숙박
  { name: '한화리조트', category: '여행·숙박', region: '경기', adHistory: '있음', score: 88 },
  { name: '소노호텔앤리조트', category: '여행·숙박', region: '기타', adHistory: '없음', score: 90 },
  { name: '켄싱턴호텔앤리조트', category: '여행·숙박', region: '기타', adHistory: '없음', score: 85 },
  { name: '롯데호텔', category: '여행·숙박', region: '서울', adHistory: '있음', score: 96 },
  { name: '신라호텔', category: '여행·숙박', region: '서울', adHistory: '있음', score: 98 },
  { name: '호텔스닷컴', category: '여행·숙박', region: '서울', adHistory: '없음', score: 80 },
  { name: '아고다', category: '여행·숙박', region: '서울', adHistory: '있음', score: 82 },
  { name: '트립닷컴', category: '여행·숙박', region: '서울', adHistory: '있음', score: 84 },
  { name: '제주신화월드', category: '여행·숙박', region: '기타', adHistory: '있음', score: 91 },
  { name: '파라다이스시티', category: '여행·숙박', region: '인천', adHistory: '있음', score: 94 },
  { name: '워커힐', category: '여행·숙박', region: '서울', adHistory: '있음', score: 93 },
  { name: '글래드호텔', category: '여행·숙박', region: '서울', adHistory: '없음', score: 86 },
  { name: '라한호텔', category: '여행·숙박', region: '기타', adHistory: '없음', score: 83 },

  // 🎡 레저·테마파크
  { name: '에버랜드', category: '레저·테마파크', region: '경기', adHistory: '있음', score: 99 },
  { name: '롯데월드', category: '레저·테마파크', region: '서울', adHistory: '있음', score: 98 },
  { name: '서울랜드', category: '레저·테마파크', region: '경기', adHistory: '있음', score: 90 },
  { name: '레고랜드 코리아', category: '레저·테마파크', region: '기타', adHistory: '있음', score: 87 },
  { name: '아쿠아플라넷', category: '레저·테마파크', region: '서울', adHistory: '있음', score: 91 },
  { name: '서울스카이', category: '레저·테마파크', region: '서울', adHistory: '없음', score: 89 },
  { name: '코엑스 아쿠아리움', category: '레저·테마파크', region: '서울', adHistory: '있음', score: 92 },
  { name: '원마운트', category: '레저·테마파크', region: '경기', adHistory: '있음', score: 82 },
  { name: '웅진플레이도시', category: '레저·테마파크', region: '경기', adHistory: '있음', score: 86 },
  { name: '캐리비안베이', category: '레저·테마파크', region: '경기', adHistory: '있음', score: 95 },
  { name: '오션월드', category: '레저·테마파크', region: '기타', adHistory: '있음', score: 94 },
  { name: '키자니아', category: '레저·테마파크', region: '서울', adHistory: '있음', score: 96 },
  { name: '뽀로로파크', category: '레저·테마파크', region: '경기', adHistory: '있음', score: 93 },
  { name: '챔피언1250', category: '레저·테마파크', region: '서울', adHistory: '없음', score: 88 },
  { name: '바운스트램폴린', category: '레저·테마파크', region: '서울', adHistory: '있음', score: 85 },

  // 🍽️ 외식
  { name: '아웃백', category: '외식', region: '서울', adHistory: '있음', score: 94 },
  { name: '빕스', category: '외식', region: '서울', adHistory: '있음', score: 91 },
  { name: '애슐리', category: '외식', region: '경기', adHistory: '있음', score: 92 },
  { name: 'TGIF', category: '외식', region: '서울', adHistory: '없음', score: 80 },
  { name: '명륜진사갈비', category: '외식', region: '인천', adHistory: '있음', score: 95 },
  { name: '본죽', category: '외식', region: '서울', adHistory: '있음', score: 88 },
  { name: '본도시락', category: '외식', region: '서울', adHistory: '있음', score: 84 },
  { name: '홍콩반점', category: '외식', region: '서울', adHistory: '없음', score: 87 },
  { name: '역전우동', category: '외식', region: '서울', adHistory: '없음', score: 81 },
  { name: '새마을식당', category: '외식', region: '서울', adHistory: '있음', score: 83 },
  { name: '한솥', category: '외식', region: '서울', adHistory: '있음', score: 85 },
  { name: '서브웨이', category: '외식', region: '서울', adHistory: '있음', score: 93 },
  { name: '노브랜드버거', category: '외식', region: '경기', adHistory: '있음', score: 86 },
  { name: '맘스터치', category: '외식', region: '서울', adHistory: '있음', score: 90 },
  { name: '쉐이크쉑', category: '외식', region: '서울', adHistory: '있음', score: 89 },

  // 🍔 패스트푸드
  { name: '맥도날드', category: '패스트푸드', region: '서울', adHistory: '있음', score: 97 },
  { name: '버거킹', category: '패스트푸드', region: '서울', adHistory: '있음', score: 96 },
  { name: '롯데리아', category: '패스트푸드', region: '경기', adHistory: '있음', score: 90 },
  { name: 'KFC', category: '패스트푸드', region: '서울', adHistory: '있음', score: 88 },
  { name: '프랭크버거', category: '패스트푸드', region: '인천', adHistory: '없음', score: 85 },

  // 🍗 치킨
  { name: 'BBQ', category: '치킨', region: '서울', adHistory: '있음', score: 96 },
  { name: 'bhc', category: '치킨', region: '서울', adHistory: '있음', score: 95 },
  { name: '교촌치킨', category: '치킨', region: '대구', adHistory: '있음', score: 97 },
  { name: '굽네치킨', category: '치킨', region: '경기', adHistory: '있음', score: 92 },
  { name: '처갓집', category: '치킨', region: '서울', adHistory: '없음', score: 87 },
  { name: '네네치킨', category: '치킨', region: '서울', adHistory: '있음', score: 89 },
  { name: '자담치킨', category: '치킨', region: '인천', adHistory: '있음', score: 86 },

  // ☕ 카페
  { name: '스타벅스', category: '카페', region: '서울', adHistory: '있음', score: 99 },
  { name: '투썸플레이스', category: '카페', region: '서울', adHistory: '있음', score: 93 },
  { name: '메가커피', category: '카페', region: '서울', adHistory: '있음', score: 95 },
  { name: '빽다방', category: '카페', region: '서울', adHistory: '있음', score: 90 },
  { name: '컴포즈커피', category: '카페', region: '부산', adHistory: '있음', score: 89 },
  { name: '이디야', category: '카페', region: '서울', adHistory: '있음', score: 88 },
  { name: '할리스', category: '카페', region: '경기', adHistory: '있음', score: 85 },
  { name: '폴바셋', category: '카페', region: '서울', adHistory: '있음', score: 91 },
  { name: '커피빈', category: '카페', region: '서울', adHistory: '있음', score: 86 },
  { name: '엔제리너스', category: '카페', region: '서울', adHistory: '없음', score: 80 },

  // 🥗 식품
  { name: 'CJ제일제당', category: '식품', region: '서울', adHistory: '있음', score: 97 },
  { name: '풀무원', category: '식품', region: '경기', adHistory: '있음', score: 96 },
  { name: '오뚜기', category: '식품', region: '경기', adHistory: '있음', score: 95 },
  { name: '농심', category: '식품', region: '서울', adHistory: '있음', score: 94 },
  { name: '삼양식품', category: '식품', region: '서울', adHistory: '있음', score: 91 },
  { name: '동원F&B', category: '식품', region: '서울', adHistory: '있음', score: 90 },
  { name: '대상', category: '식품', region: '서울', adHistory: '있음', score: 89 },
  { name: '빙그레', category: '식품', region: '경기', adHistory: '있음', score: 92 },
  { name: '매일유업', category: '식품', region: '서울', adHistory: '있음', score: 93 },
  { name: '남양유업', category: '식품', region: '서울', adHistory: '없음', score: 85 },
  { name: '서울우유', category: '식품', region: '서울', adHistory: '있음', score: 94 },
  { name: '일동후디스', category: '식품', region: '서울', adHistory: '있음', score: 90 },
  { name: '하림', category: '식품', region: '기타', adHistory: '있음', score: 88 },

  // 👕 패션
  { name: '무신사', category: '패션', region: '서울', adHistory: '있음', score: 97 },
  { name: '지그재그', category: '패션', region: '서울', adHistory: '있음', score: 92 },
  { name: '에이블리', category: '패션', region: '서울', adHistory: '있음', score: 93 },
  { name: 'W컨셉', category: '패션', region: '서울', adHistory: '있음', score: 89 },
  { name: '29CM', category: '패션', region: '서울', adHistory: '있음', score: 90 },
  { name: '탑텐', category: '패션', region: '서울', adHistory: '있음', score: 88 },
  { name: '스파오', category: '패션', region: '서울', adHistory: '있음', score: 87 },
  { name: '유니클로', category: '패션', region: '서울', adHistory: '있음', score: 91 },
  { name: '폴햄', category: '패션', region: '서울', adHistory: '없음', score: 80 },
  { name: 'MLB', category: '패션', region: '서울', adHistory: '있음', score: 86 },
  { name: '디스커버리', category: '패션', region: '서울', adHistory: '있음', score: 89 },
  { name: '내셔널지오그래픽', category: '패션', region: '서울', adHistory: '있음', score: 88 },
  { name: 'K2', category: '패션', region: '서울', adHistory: '있음', score: 85 },
  { name: '코오롱스포츠', category: '패션', region: '서울', adHistory: '있음', score: 87 },
  { name: '노스페이스', category: '패션', region: '서울', adHistory: '있음', score: 92 },

  // 💄 뷰티
  { name: '올리브영', category: '뷰티', region: '서울', adHistory: '있음', score: 98 },
  { name: '아모레퍼시픽', category: '뷰티', region: '서울', adHistory: '있음', score: 96 },
  { name: 'LG생활건강', category: '뷰티', region: '서울', adHistory: '있음', score: 95 },
  { name: '이니스프리', category: '뷰티', region: '제주', adHistory: '있음', score: 89 },
  { name: '에뛰드', category: '뷰티', region: '서울', adHistory: '없음', score: 85 },
  { name: '닥터지', category: '뷰티', region: '경기', adHistory: '있음', score: 88 },
  { name: '메디힐', category: '뷰티', region: '서울', adHistory: '있음', score: 90 },
  { name: '토리든', category: '뷰티', region: '서울', adHistory: '있음', score: 87 },
  { name: '라운드랩', category: '뷰티', region: '기타', adHistory: '있음', score: 86 },
  { name: '달바', category: '뷰티', region: '서울', adHistory: '있음', score: 88 },

  // 🛒 쇼핑·커머스
  { name: '쿠팡', category: '쇼핑·커머스', region: '서울', adHistory: '있음', score: 99 },
  { name: '컬리', category: '쇼핑·커머스', region: '서울', adHistory: '있음', score: 94 },
  { name: 'SSG닷컴', category: '쇼핑·커머스', region: '서울', adHistory: '있음', score: 93 },
  { name: '롯데ON', category: '쇼핑·커머스', region: '서울', adHistory: '있음', score: 88 },
  { name: '11번가', category: '쇼핑·커머스', region: '서울', adHistory: '있음', score: 89 },
  { name: 'G마켓', category: '쇼핑·커머스', region: '서울', adHistory: '있음', score: 91 },
  { name: '옥션', category: '쇼핑·커머스', region: '서울', adHistory: '있음', score: 87 },
  { name: '오늘의집', category: '쇼핑·커머스', region: '서울', adHistory: '있음', score: 95 },
  { name: '다이소', category: '쇼핑·커머스', region: '서울', adHistory: '있음', score: 96 },

  // 💳 금융
  { name: 'KB국민카드', category: '금융', region: '서울', adHistory: '있음', score: 95 },
  { name: '신한카드', category: '금융', region: '서울', adHistory: '있음', score: 96 },
  { name: '삼성카드', category: '금융', region: '서울', adHistory: '있음', score: 94 },
  { name: '현대카드', category: '금융', region: '서울', adHistory: '있음', score: 97 },
  { name: '하나카드', category: '금융', region: '서울', adHistory: '있음', score: 89 },
  { name: '우리카드', category: '금융', region: '서울', adHistory: '있음', score: 88 },
  { name: 'NH농협카드', category: '금융', region: '서울', adHistory: '있음', score: 91 },
  { name: '카카오뱅크', category: '금융', region: '경기', adHistory: '있음', score: 98 },
  { name: '토스', category: '금융', region: '서울', adHistory: '있음', score: 97 },
  { name: '케이뱅크', category: '금융', region: '서울', adHistory: '있음', score: 90 },

  // 🚗 자동차
  { name: '현대자동차', category: '자동차', region: '서울', adHistory: '있음', score: 98 },
  { name: '기아', category: '자동차', region: '서울', adHistory: '있음', score: 97 },
  { name: '제네시스', category: '자동차', region: '서울', adHistory: '있음', score: 96 },
  { name: 'BMW 코리아', category: '자동차', region: '서울', adHistory: '있음', score: 93 },
  { name: '메르세데스-벤츠 코리아', category: '자동차', region: '서울', adHistory: '있음', score: 94 },
  { name: '볼보자동차코리아', category: '자동차', region: '서울', adHistory: '있음', score: 91 },
  { name: '렉서스코리아', category: '자동차', region: '서울', adHistory: '있음', score: 88 },
  { name: '토요타코리아', category: '자동차', region: '서울', adHistory: '있음', score: 86 },
  { name: '르노코리아', category: '자동차', region: '부산', adHistory: '있음', score: 84 },
  { name: 'KG모빌리티', category: '자동차', region: '경기', adHistory: '있음', score: 85 },

  // 📱 IT·전자
  { name: '삼성전자', category: 'IT·전자', region: '경기', adHistory: '있음', score: 99 },
  { name: 'LG전자', category: 'IT·전자', region: '서울', adHistory: '있음', score: 96 },
  { name: 'Apple', category: 'IT·전자', region: '서울', adHistory: '있음', score: 98 },
  { name: 'LG유플러스', category: 'IT·전자', region: '서울', adHistory: '있음', score: 90 },
  { name: 'SK텔레콤', category: 'IT·전자', region: '서울', adHistory: '있음', score: 94 },
  { name: 'KT', category: 'IT·전자', region: '경기', adHistory: '있음', score: 92 },
  { name: 'Dyson', category: 'IT·전자', region: '서울', adHistory: '있음', score: 91 },
  { name: '샤오미', category: 'IT·전자', region: '서울', adHistory: '없음', score: 80 },
  { name: 'ASUS', category: 'IT·전자', region: '서울', adHistory: '있음', score: 83 },
  { name: '레노버', category: 'IT·전자', region: '서울', adHistory: '있음', score: 82 },

  // 🎮 게임
  { name: '넥슨', category: '게임', region: '경기', adHistory: '있음', score: 96 },
  { name: '넷마블', category: '게임', region: '서울', adHistory: '있음', score: 91 },
  { name: '크래프톤', category: '게임', region: '서울', adHistory: '있음', score: 93 },
  { name: '엔씨소프트', category: '게임', region: '경기', adHistory: '있음', score: 90 },
  { name: '카카오게임즈', category: '게임', region: '경기', adHistory: '있음', score: 92 },
  { name: '스마일게이트', category: '게임', region: '경기', adHistory: '있음', score: 94 },
  { name: '펄어비스', category: '게임', region: '경기', adHistory: '있음', score: 88 },

  // 📚 교육
  { name: '웅진씽크빅', category: '교육', region: '경기', adHistory: '있음', score: 96 },
  { name: '대교', category: '교육', region: '서울', adHistory: '있음', score: 93 },
  { name: '아이스크림에듀', category: '교육', region: '서울', adHistory: '있음', score: 91 },
  { name: '천재교육', category: '교육', region: '서울', adHistory: '있음', score: 92 },
  { name: '비상교육', category: '교육', region: '서울', adHistory: '있음', score: 89 },
  { name: '메가스터디', category: '교육', region: '서울', adHistory: '있음', score: 95 },
  { name: '윤선생', category: '교육', region: '서울', adHistory: '있음', score: 87 },
  { name: '교원', category: '교육', region: '서울', adHistory: '있음', score: 94 },

  // 👶 육아
  { name: '하기스', category: '육아', region: '서울', adHistory: '있음', score: 98 },
  { name: '팸퍼스', category: '육아', region: '서울', adHistory: '있음', score: 95 },
  { name: '베베숲', category: '육아', region: '경기', adHistory: '있음', score: 94 },
  { name: '아가방', category: '육아', region: '서울', adHistory: '있음', score: 91 },
  { name: '압타밀', category: '육아', region: '서울', adHistory: '있음', score: 93 },
  { name: '일동후디스', category: '육아', region: '서울', adHistory: '있음', score: 89 },
  { name: '베베드피노', category: '육아', region: '서울', adHistory: '있음', score: 96 },
  { name: '블루독베이비', category: '육아', region: '서울', adHistory: '있음', score: 92 },

  // 🏥 헬스케어
  { name: 'GC녹십자', category: '헬스케어', region: '경기', adHistory: '있음', score: 93 },
  { name: '종근당', category: '헬스케어', region: '서울', adHistory: '있음', score: 92 },
  { name: '유한양행', category: '헬스케어', region: '서울', adHistory: '있음', score: 95 },
  { name: '동국제약', category: '헬스케어', region: '서울', adHistory: '있음', score: 90 },
  { name: '대웅제약', category: '헬스케어', region: '서울', adHistory: '있음', score: 91 },
  { name: '셀트리온', category: '헬스케어', region: '인천', adHistory: '있음', score: 96 },
  { name: '정관장', category: '헬스케어', region: '서울', adHistory: '있음', score: 97 },

  // 🏕️ 캠핑·아웃도어
  { name: '코베아', category: '캠핑·아웃도어', region: '경기', adHistory: '있음', score: 94 },
  { name: '스노우피크', category: '캠핑·아웃도어', region: '서울', adHistory: '있음', score: 96 },
  { name: '헬리녹스', category: '캠핑·아웃도어', region: '서울', adHistory: '있음', score: 95 },
  { name: '콜맨', category: '캠핑·아웃도어', region: '서울', adHistory: '있음', score: 90 },
  { name: '블랙야크', category: '캠핑·아웃도어', region: '서울', adHistory: '있음', score: 91 },
  { name: 'K2', category: '캠핑·아웃도어', region: '서울', adHistory: '있음', score: 92 },
  { name: '네이처하이크', category: '캠핑·아웃도어', region: '기타', adHistory: '있음', score: 88 }
];

const MOCK_AD_PERFORMANCE = [
  { id: 'ad1', partnerName: '한화리조트', period: '2026-05', impressions: 120000, clicks: 3600, conversions: 450, spend: 1500000, revenue: 4500000 },
  { id: 'ad2', partnerName: '에버랜드', period: '2026-05', impressions: 450000, clicks: 18000, conversions: 2200, spend: 5000000, revenue: 22000000 },
  { id: 'ad3', partnerName: '풀무원', period: '2026-06', impressions: 85000, clicks: 2125, conversions: 180, spend: 1000000, revenue: 3600000 },
  { id: 'ad4', partnerName: '올리브영', period: '2026-06', impressions: 150000, clicks: 4200, conversions: 380, spend: 2000000, revenue: 4800000 },
  { id: 'ad5', partnerName: '웅진씽크빅', period: '2026-06', impressions: 60000, clicks: 1200, conversions: 96, spend: 800000, revenue: 1440000 },
];


const PROMPT_LIBRARY = {
  segment: {
    title: '광고주 추천 프롬프트',
    template: '당신은 놀이의발견 서비스의 AI 광고 전략 컨설턴트입니다. 아래와 같이 초세분화(Micro-Segment)된 핵심 부모 타겟층의 행동 인덱스를 정교하게 분석한 뒤 최적의 광고주를 추천해 주세요.\n\n[초세분화 타겟 세그먼트 인덱스]\n- 성별 구성: {gender}\n- 연령대 분포: {age}\n- 거주 및 활동 지역: {location}\n- 서비스 가입 기간: {period}\n- 선호 마케팅 카테고리: {favorite}\n- 평균 찜하기 횟수: {wishCount}회\n- 평균 장바구니 적재수: {cartCount}회\n- 최근 구매 전환 횟수: {purchaseCount}회\n\n이 8가지 초세분화 지표의 타겟 소비 페르소나를 매칭하여 최상의 마케팅 효율을 낼 수 있는 다음 후보 브랜드 중 3곳을 매칭해 주세요.\n\n[추천 대상 광고주 후보군]\n{candidates}'
  },
  research: {
    title: '시장조사 프롬프트',
    template: '국내 {industry} 광고 시장 규모 및 성장성 전망을 분석해 주세요. 특히 코로나19 이후 가족 단위/키즈 여가 소비 트렌드가 어떻게 변화했는지 기술하고, 우리 플랫폼(놀이의발견)이 가져갈 수 있는 비즈니스 기회 요인 3가지를 정리해 주세요.'
  },
  competitor: {
    title: '경쟁사 분석 프롬프트',
    template: '국내 여가/액티비티 플랫폼({competitors})의 주요 광고 상품 종류와 대략적인 단가 체계, 마케팅 프로모션 특징을 조사하여 비교해 주세요. 이후 놀이의발견만의 차별화된 광고 상품 구성 전략(예: 타겟 맞춤형 패키지)을 제안해 주세요.'
  },
  proposal: {
    title: '맞춤형 광고 제안서 프롬프트',
    template: '가족 여가 플랫폼 "놀이의발견"의 파트너사인 "{clientName}"(을)를 설득하기 위한 맞춤형 광고 제안서를 작성해 주세요. 문서에는 다음 내용이 포함되어야 합니다:\n1. 제안 개요 및 목적\n2. 놀이의발견 핵심 타겟층 분석 (3040 부모 회원 데이터 연계)\n3. 추천 광고 지면 및 상품 구성 (앱 메인 배너, 타겟 푸시 알림 등)\n4. 기대 효과 및 광고 성과 보장 방안\n\n격식 있고 세련된 마크다운 양식으로 작성해 주세요.'
  },
  roi: {
    title: 'AI ROI 리포트 프롬프트',
    template: '다음은 파트너사 "{partnerName}"의 최근 광고 집행 성과 데이터입니다.\n- 노출수: {impressions}회\n- 클릭수: {clicks}회 (CTR: {ctr}%)\n- 구매 전환수: {conversions}회 (전환율: {cvr}%)\n- 광고비: {spend}원\n- 광고 매출: {revenue}원 (ROAS: {roas}%)\n\n이 광고 성과를 종합적으로 평가하고, CTR 및 구매 전환율(CVR)을 개선하기 위한 AI 기반 구체적 액션 플랜 3가지를 제시해 주세요.'
  }
};

// ----------------------------------------------------
// AI 호출 래퍼 함수 (Gemini API / Fallback Mock)
// ----------------------------------------------------
async function generateAIResponse(prompt, mockResponse) {
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text;
    } catch (error) {
      console.error('Gemini API execution failed. Switched to Mock mode:', error);
      return mockResponse;
    }
  } else {
    // API Key가 없거나 클라이언트 초기화가 안 되었을 때 2초 딜레이를 주어 실제 API가 도는 느낌을 시뮬레이션
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return mockResponse;
  }
}

// ----------------------------------------------------
// Express API Endpoints
// ----------------------------------------------------

// 1. Prompt Library 조회
app.get('/api/prompts', (req, res) => {
  res.json(PROMPT_LIBRARY);
});

// 2. 가상 내부 세그먼트 규모 계산 API
app.post('/api/mock/segments', (req, res) => {
  const gender = req.body.gender ? req.body.gender.normalize('NFC') : '';
  const age = req.body.age ? req.body.age.normalize('NFC') : '';
  const location = req.body.location ? req.body.location.normalize('NFC') : '';
  const period = req.body.period ? req.body.period.normalize('NFC') : '';
  const favorite = req.body.favorite ? req.body.favorite.normalize('NFC') : '';
  
  let filtered = MOCK_USERS;
  if (gender && gender !== '전체'.normalize('NFC')) {
    filtered = filtered.filter(u => u.gender.normalize('NFC') === gender);
  }
  if (age && age !== '전체'.normalize('NFC')) {
    filtered = filtered.filter(u => u.age.normalize('NFC') === age);
  }
  if (location && location !== '전체'.normalize('NFC')) {
    filtered = filtered.filter(u => u.location.normalize('NFC') === location);
  }
  if (period && period !== '전체'.normalize('NFC')) {
    filtered = filtered.filter(u => u.period.normalize('NFC') === period);
  }
  if (favorite && favorite !== '전체'.normalize('NFC')) {
    filtered = filtered.filter(u => u.favorite.normalize('NFC') === favorite);
  }
  
  // 지표 집계
  const totalCount = filtered.length;
  const avgWish = totalCount > 0 ? (filtered.reduce((sum, u) => sum + u.wishCount, 0) / totalCount).toFixed(1) : 0;
  const avgCart = totalCount > 0 ? (filtered.reduce((sum, u) => sum + u.cartCount, 0) / totalCount).toFixed(1) : 0;
  const avgPurchase = totalCount > 0 ? (filtered.reduce((sum, u) => sum + u.purchaseCount, 0) / totalCount).toFixed(1) : 0;
  
  // 업종별 매칭 스코어 시뮬레이션
  const regionPartners = MOCK_ADVERTISERS.filter(p => {
    const pLoc = p.region.normalize('NFC');
    return location === '전체'.normalize('NFC') || pLoc === location || pLoc === '경기'.normalize('NFC') || pLoc === '서울'.normalize('NFC');
  });
  const matchedAdvertisers = regionPartners.map(p => {
    let fitScore = p.score;
    // 카테고리 매칭 시 점수 가중치
    if (favorite !== '전체'.normalize('NFC') && p.category.normalize('NFC') === favorite) {
      fitScore += 10;
    }
    // 행동 패턴 기반 가중치
    if (parseFloat(avgPurchase) > 4) fitScore += 5;
    
    // 업종별 맞춤 광고 구좌 자동 배정 (메인배너, 카테고리, 서브 배너, 팝업, 스플래쉬)
    let targetSlot = '';
    const normCat = p.category.normalize('NFC');
    const finalScore = Math.min(fitScore, 100);

    if ((normCat === '레저·테마파크'.normalize('NFC') || normCat === '여행·숙박'.normalize('NFC')) && finalScore >= 92) {
      targetSlot = '스플래쉬 (Splash)';
    } else if (normCat === '식품'.normalize('NFC') || normCat === '쇼핑·커머스'.normalize('NFC') || normCat === '금융'.normalize('NFC')) {
      targetSlot = '메인배너 (Main Banner)';
    } else if (normCat === '교육'.normalize('NFC') || normCat === '육아'.normalize('NFC') || normCat === '레저·테마파크'.normalize('NFC') || normCat === '여행·숙박'.normalize('NFC')) {
      targetSlot = '카테고리 (Category)';
    } else if (normCat === '외식'.normalize('NFC') || normCat === '패스트푸드'.normalize('NFC') || normCat === '치킨'.normalize('NFC') || normCat === '카페'.normalize('NFC')) {
      targetSlot = '팝업 (Popup)';
    } else {
      targetSlot = '서브 배너 (Sub Banner)';
    }

    return {
      ...p,
      fitScore: Math.min(fitScore, 100),
      targetSlot
    };
  }).sort((a, b) => b.fitScore - a.fitScore).slice(0, 30);

  res.json({
    segmentCount: totalCount,
    metrics: {
      avgWish,
      avgCart,
      avgPurchase
    },
    matchedAdvertisers
  });
});

// 3. AI 광고주 추천 API
app.post('/api/ai/recommend-advertiser', async (req, res) => {
  const { segmentInfo, matchedAdvertisers } = req.body;
  const candidatesText = matchedAdvertisers.map(a => `- ${a.name} (업종: ${a.category}, 지역: ${a.region}, 내부적합도: ${a.fitScore}점)`).join('\n');
  
  const prompt = PROMPT_LIBRARY.segment.template
    .replace('{gender}', segmentInfo.gender || '전체')
    .replace('{age}', segmentInfo.age || '전체')
    .replace('{location}', segmentInfo.location || '전체')
    .replace('{period}', segmentInfo.period || '전체')
    .replace('{favorite}', segmentInfo.favorite || '전체')
    .replace('{wishCount}', segmentInfo.avgWish || '0')
    .replace('{cartCount}', segmentInfo.avgCart || '0')
    .replace('{purchaseCount}', segmentInfo.avgPurchase || '0')
    .replace('{candidates}', candidatesText);

  let recoRows = '';
  if (matchedAdvertisers && matchedAdvertisers.length > 0) {
    matchedAdvertisers.forEach((adv, idx) => {
      const scoreStars = '🌟'.repeat(Math.max(3, 5 - idx));
      recoRows += `\n#### ${idx + 1}. **${adv.name}** (추천도: ${scoreStars})\n`;
      recoRows += `- **업종 / 활동 지역**: ${adv.category} / ${adv.region}\n`;
      recoRows += `- **추천 매칭 광고 구좌**: <strong style="color:var(--neon-teal); text-shadow: 0 0 5px rgba(0,242,254,0.3);">${adv.targetSlot || '개인화 푸시 구좌'}</strong>\n`;
      recoRows += `- **적합 분석**: 고객 선호 업종인 [${adv.category}]군 카테고리에 속하는 대형 브랜드로서, 해당 세그먼트(지역: ${segmentInfo.location || '전체'})에서 가장 선호도가 높고 예약 결제 전환(최근 결제 ${segmentInfo.avgPurchase || 0}회)을 견인할 수 있는 맞춤형 마케팅 페르소나와 매치율 98%를 보여 추천합니다.\n`;
      recoRows += `- **캠페인 제안**: ${adv.category === '식품' ? '초세분화 타겟 대상 밀키트 시식회 기획 지면 노출' : adv.category === '레저·테마파크' ? '가족 패키지 특가권 앱푸시 발송' : '선호 카테고리 롤링 배너 상시 연동 및 기획 할인전 개설'}\n`;
      recoRows += `- **적합도 분석 매칭 스코어 (그래프)**:\n`;
      recoRows += `  <div class="neon-chart-bar-container" style="background:rgba(255,255,255,0.05); border-radius:8px; height:16px; width:100%; margin:8px 0; overflow:hidden; position:relative; border:1px solid rgba(255,255,255,0.1);">\n`;
      recoRows += `    <div class="neon-chart-bar-fill" style="background:linear-gradient(90deg, var(--neon-teal), var(--neon-green)); width:${adv.fitScore}%; height:100%; box-shadow:0 0 8px var(--neon-teal); border-radius:8px; transition: width 1s ease-in-out;"></div>\n`;
      recoRows += `    <span style="position:absolute; right:8px; top:-1px; font-size:10px; color:#fff; font-weight:bold;">${adv.fitScore}% Match</span>\n`;
      recoRows += `  </div>\n`;
    });
  } else {
    recoRows = '\n*(조건에 매치되는 타겟 광고주가 없습니다.)*';
  }

  const mockResponse = `### 🤖 AI 분석 기반 초세분화(Micro-Segment) 광고주 추천 리포트

행동 데이터 분석 결과, 아래와 같이 정밀하게 쪼개진 타겟 페르소나 지표에 따라 맞춤 광고주 매칭을 처방합니다.

#### 📊 분석된 초세분화 타겟 프로필
* **성별/연령**: ${segmentInfo.gender || '전체'} / ${segmentInfo.age || '전체'}
* **활동 지역/가입**: ${segmentInfo.location || '전체'} / ${segmentInfo.period || '전체'}
* **선호 마케팅 업종**: ${segmentInfo.favorite || '전체'}
* **행동 지수**: 평균 찜하기 **${segmentInfo.avgWish}회**, 장바구니 적재 **${segmentInfo.avgCart}회**, 최근 결제 전환 **${segmentInfo.avgPurchase}회**

---
${recoRows}`;

  try {
    const aiText = await generateAIResponse(prompt, mockResponse);
    res.json({ success: true, report: aiText });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. AI 시장조사 API
app.post('/api/ai/market-research', async (req, res) => {
  const { industry } = req.body;
  const prompt = PROMPT_LIBRARY.research.template.replace('{industry}', industry);

  const mockResponse = `### 📊 ${industry} 광고 시장 분석 리포트

#### 1. 국내 ${industry} 시장 규모 및 성장 전망
- **시장 트렌드**: 국내 아동 및 가족 여가 액티비티 시장은 연 평균 약 8.5%씩 성장 중입니다. 디지털 광고 마케팅 비중은 2026년 기준 68%를 돌파하여 오프라인 매체 대비 압도적인 비중을 차지합니다.
- **가족 여가 소비 패턴의 변화**:
  1. **초개인화(Hyper-personalization) 큐레이션**: 일반적인 광고 지면보다 아동 연령이나 부모의 동선에 맞춘 정교한 추천을 선호합니다.
  2. **모바일 퍼스트**: 예약의 90% 이상이 모바일 앱 채널에서 즉각적인 결제로 연결됩니다.

#### 2. 놀이의발견 비즈니스 기회 요인 (Opportunity)
- **정밀한 3040 구매 타겟 데이터**: 일반 포털과 다르게 구매력이 확실하고 육아에 집중된 정밀 타겟(30~40대 자녀 동반 부모)을 보유하고 있습니다.
- **광고-결제 원스톱 연동**: 광고 노출에서 그치지 않고 자사 앱 내에서 즉시 예약 및 사용처 인증까지 가능하므로 광고주에게 명확한 전환 데이터(RoAS)를 입증할 수 있습니다.`;

  try {
    const aiText = await generateAIResponse(prompt, mockResponse);
    res.json({ success: true, report: aiText });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. AI 경쟁사 분석 API
app.post('/api/ai/competitor-analysis', async (req, res) => {
  const { competitors } = req.body;
  const prompt = PROMPT_LIBRARY.competitor.template.replace('{competitors}', competitors);

  const mockResponse = `### ⚔️ 경쟁 서비스 광고 상품 비교 분석

요청하신 주요 경쟁사 **[ ${competitors} ]** 의 광고 상품 비교 분석 데이터입니다.

| 플랫폼명 | 주요 광고 상품 | 가격 정책 (추정) | 장점 | 단점 / 극복 방안 (놀이의발견 차별점) |
| :--- | :--- | :--- | :--- | :--- |
| **야놀자/여기어때** | 메인 배너, 검색 상단 노출, 기획전 롤링 | 월 200~1,000만원 대 (정액/정률) | 압도적인 트래픽과 풍부한 유저 풀 | 타겟층이 전 연령대에 분산되어 있어 **가족/아동 중심 브랜드 광고 효율이 희석됨** |
| **네이버 플레이스** | 플레이스 광고 (CPC), 지역 소상공인 추천 | CPC 입찰 (클릭당 50~1,000원) | 네이버 지도와의 완벽한 연계성 | 노출 범위가 광범위하나 **진성 육아 유저만을 걸러내는 타겟 발송 불가** |
| **놀이의발견 (자사)** | **개인화 푸시 알림, 연령/지역 기반 홈 배너** | **노출당 단가(CPM) 및 전환 성과 연동** | **3040 부모 회원 100% 매칭** | 트래픽 규모는 중형급이나 **전환 단가(CPA) 면에서 경쟁사 대비 최대 3배 효율** 제공 가능 |

#### 💡 놀이의발견 광고 전략 제언
- **타겟 패키지화**: 단순 배너 노출보다, '이번주 주말 경기권 키즈카페 찜 유저 대상 앱푸시 + 홈 배너' 형태로 묶어 패키지 광고 상품군을 신설하여 판매 단가 업셀링을 유도해야 합니다.`;

  try {
    const aiText = await generateAIResponse(prompt, mockResponse);
    res.json({ success: true, report: aiText });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. 맞춤형 광고 제안서 생성 API
app.post('/api/ai/proposal', async (req, res) => {
  const { clientName } = req.body;
  const prompt = PROMPT_LIBRARY.proposal.template.replace('{clientName}', clientName);

  const mockResponse = `# 📄 [놀이의발견] 맞춤형 광고 제안서
**제안 대상:** ${clientName} 귀하
**작성일:** ${new Date().toISOString().split('T')[0]}

---

### 1. 제안 목적
- 국내 최대 자녀 동반 가족 여가 플랫폼 **놀이의발견**의 고품질 유저 세그먼트를 활용하여, **${clientName}**의 브랜드 인지도 제고 및 오프라인/온라인 예약 결제 성과를 극대화하고자 본 광고 캠페인을 제안합니다.

### 2. 놀이의발견 핵심 타겟 분석
- **부모 회원 집중도 98%**: 실구매력을 갖춘 30대~40대 육아 가정이 메인 유저층입니다.
- **경기도/서울 거주 활동층**: 주말 가족 액티비티 소비 성향이 타 플랫폼 대비 4.2배 높습니다.
- **최근 행동 분석**: 최근 30일 내 키즈카페 및 아웃도어 체험 상품을 조회/찜한 회원이 약 15만 명에 달해 구매 전환 가능성이 대단히 높습니다.

### 3. 추천 광고 상품 구성안
- **Plan A: 타겟팅 개인화 App Push 발송**
  - 최근 ${clientName}과 유관한 카테고리를 조회했거나 장바구니에 넣은 고관여 유저 20,000명 대상 정밀 푸시 발송.
- **Plan B: 앱 메인 화면 '아이와 갈만한 곳' 홈 배너 노출**
  - 대화형/노출형 홈 배너 디자인을 통해 주목도 향상 및 상세 페이지 유입 유도.
- **Plan C: 기획전 연계 할인 프로모션 구성**
  - '놀이의발견 X ${clientName} 주말 단독 특가 기획전' 런칭을 통한 직접적인 매출 유도.

### 4. 기대 효과
- **추정 노출수**: 300,000회 이상
- **예상 CTR**: 3.5% (평균 대비 1.5배 상회)
- **예상 ROAS**: 350% 이상 보장형 광고 상품 지원`;

  try {
    const aiText = await generateAIResponse(prompt, mockResponse);
    res.json({ success: true, report: aiText });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. AI ROI & Performance Report API
app.post('/api/ai/roi-report', async (req, res) => {
  const { partnerName, impressions, clicks, conversions, spend, revenue } = req.body;
  
  const imps = parseInt(impressions) || 100000;
  const clks = parseInt(clicks) || 3000;
  const convs = parseInt(conversions) || 300;
  const spnd = parseInt(spend) || 1000000;
  const rev = parseInt(revenue) || 3500000;

  const ctr = ((clks / imps) * 100).toFixed(2);
  const cvr = ((convs / clks) * 100).toFixed(2);
  const roas = ((rev / spnd) * 100).toFixed(0);

  const prompt = PROMPT_LIBRARY.roi.template
    .replace('{partnerName}', partnerName)
    .replace('{impressions}', imps.toLocaleString())
    .replace('{clicks}', clks.toLocaleString())
    .replace('{ctr}', ctr)
    .replace('{conversions}', convs.toLocaleString())
    .replace('{cvr}', cvr)
    .replace('{spend}', spnd.toLocaleString())
    .replace('{revenue}', rev.toLocaleString())
    .replace('{roas}', roas);

  const mockResponse = `### 📈 AI 성과 분석 및 ROI 진단 리포트 (파트너사: ${partnerName})

최근 캠페인에 대한 핵심 효율 지표 성적은 다음과 같습니다:
- **CTR**: **${ctr}%** (업계 평균: 2.0%) ➔ **양호**
- **CVR**: **${cvr}%** (업계 평균: 5.0%) ➔ **개선 필요**
- **ROAS**: **${roas}%** ➔ **매우 우수**

#### 🔍 종합 진단 및 분석 의견
1. **높은 유입 대비 낮은 전환**: CTR(${ctr}%)은 타 광고 대비 높은 편이나, 유입 대비 실제 구매 전환율(CVR: ${cvr}%)이 상대적으로 정체되어 있습니다. 이는 광고 이미지나 푸시 문구는 매력적이나, 막상 상세 페이지에 유입된 후 결제 허들이 존재하거나 혜택의 소구점이 약했음을 나타냅니다.
2. **효율적인 ROAS 달성**: 객단가가 높은 상품 구성 덕분에 ROAS는 ${roas}%로 훌륭한 수준을 보여주어, 마케팅 예산 대비 매출 기여도는 매우 우수합니다.

#### 💡 CVR / CTR 극대화 3대 액션 플랜
- **액션 1: 상세 페이지 전환 장치 마련 (CVR 개선)**
  - 상세 페이지 유입 시 10분 내 예약 시 사용 가능한 '즉시 할인 추가 쿠폰' 제공 등으로 구매 결정을 촉진합니다.
- **액션 2: 타겟 정밀도 재조정**
  - 단순 찜 고객뿐 아니라, 최근 7일 내 해당 상품 카테고리를 '결제 취소'했거나 '장바구니에 2일 이상 방치'한 초고관여 회원들로 모수를 좁혀 광고를 집중 송출합니다.
- **액션 3: 업셀링 기획전 제안 (재계약 유도)**
  - 현재 단일 광고 효율이 증명되었으므로, 다음 분기에는 노출 지면을 확대하는 묶음 기획전과 프리미엄 스페셜 배너를 추가한 **상위 광고 상품 패키지(업셀링안)** 제안을 권장합니다.`;

  try {
    const aiText = await generateAIResponse(prompt, mockResponse);
    res.json({ success: true, report: aiText, calculated: { ctr, cvr, roas } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8. 광고 성과 데이터 조회 API
app.get('/api/mock/performances', (req, res) => {
  res.json(MOCK_AD_PERFORMANCE);
});

// 9. 가상 입점업체 리스트 API
app.get('/api/mock/partners', (req, res) => {
  res.json(MOCK_ADVERTISERS);
});

// 10. PPTX 제안서 생성 및 다운로드 API
app.post('/api/ai/proposal/download', async (req, res) => {
  const { clientName, proposalText } = req.body;
  const pres = new pptxgen();

  pres.layout = 'LAYOUT_16x9';

  // Slide 1: Cover Slide (놀이의발견 공식 레드 테마)
  const slide1 = pres.addSlide();
  slide1.background = { color: 'FF3B30' }; // 놀이의발견 강렬한 레드 브랜딩 톤
  
  // Decorative white line
  slide1.addShape(pres.ShapeType.rect, { x: 0.5, y: 1.5, w: 0.05, h: 4.0, fill: { color: 'FFFFFF' } });

  slide1.addText('놀이의발견 광고 마케팅 제안서', { 
    x: 0.8, y: 1.8, w: 10, h: 0.8, 
    fontSize: 34, bold: true, color: 'FFFFFF', fontFace: 'Noto Sans KR' 
  });
  slide1.addText('놀이의발견과 함께 비즈니스의 가치를 높여보세요', { 
    x: 0.8, y: 2.7, w: 10, h: 0.5, 
    fontSize: 18, color: 'FFFFFF', fontFace: 'Noto Sans KR' 
  });
  slide1.addText(`제안 대상: ${clientName || '귀사'}`, { 
    x: 0.8, y: 3.4, w: 8, h: 0.6, 
    fontSize: 22, bold: true, color: 'FFFFFF', fontFace: 'Noto Sans KR' 
  });
  slide1.addText('웅진컴퍼스 | 놀이의발견 (woongjin)', { 
    x: 0.8, y: 4.8, w: 8, h: 0.4, 
    fontSize: 14, color: 'FFFFFF', fontFace: 'Noto Sans KR' 
  });
  slide1.addText(`작성일: ${new Date().toISOString().split('T')[0]}`, { 
    x: 0.8, y: 5.3, w: 8, h: 0.4, 
    fontSize: 12, color: 'E2E8F0', fontFace: 'Noto Sans KR' 
  });

  // Slide 2: Platform Overview (Introduce)
  const slide2 = pres.addSlide();
  slide2.background = { color: '0B0D19' };
  
  slide2.addText('1. 대한민국 1위 가족 여가 라이프스타일 플랫폼', { 
    x: 0.5, y: 0.4, w: 11, h: 0.6, 
    fontSize: 24, bold: true, color: 'FF3B30', fontFace: 'Noto Sans KR' 
  });
  slide2.addShape(pres.ShapeType.rect, { x: 0.5, y: 1.1, w: 11.0, h: 0.02, fill: { color: '202738' } });

  slide2.addText('놀이의발견은 키즈 놀이 콘텐츠를 한곳에 모두 모아 쉽고 빠르게 검색하고 구매할 수 있는 서비스입니다. 3040 부모 회원 중심의 결제 행동 기반 핵심 타겟팅 인프라를 지원합니다.', { 
    x: 0.6, y: 1.4, w: 11, h: 1.0, 
    fontSize: 14, color: 'CBD5E1', fontFace: 'Noto Sans KR', lineSpacing: 22 
  });

  // Platform Metrics Table (PDF 속 핵심 수치 반영)
  const metricRows = [
    [
      { text: '회원수', options: { fill: '1A1F35', color: 'FFFFFF', bold: true, align: 'center' } },
      { text: '월간 순 이용자(MAU)', options: { fill: '1A1F35', color: 'FFFFFF', bold: true, align: 'center' } },
      { text: '누적 다운로드수', options: { fill: '1A1F35', color: 'FFFFFF', bold: true, align: 'center' } },
      { text: '등록 제휴점수', options: { fill: '1A1F35', color: 'FFFFFF', bold: true, align: 'center' } }
    ],
    [
      { text: '179만 명', options: { fill: '0F1322', color: 'FF3B30', bold: true, fontSize: 18, align: 'center' } },
      { text: '47만 명', options: { fill: '0F1322', color: 'FFFFFF', bold: true, fontSize: 18, align: 'center' } },
      { text: '241만 건', options: { fill: '0F1322', color: 'FFFFFF', bold: true, fontSize: 18, align: 'center' } },
      { text: '약 3만 개', options: { fill: '0F1322', color: 'FFFFFF', bold: true, fontSize: 18, align: 'center' } }
    ]
  ];
  slide2.addTable(metricRows, { x: 0.6, y: 2.6, w: 10.8, colW: [2.7, 2.7, 2.7, 2.7], fontSize: 13, border: { pt: 1, color: '202738' } });

  slide2.addText('• 3040 부모 회원 100% 매칭으로 마케팅 효율 극대화\n• 자녀 동반 숙박, 액티비티, 체험 학습 등 즉시 예약 중심 실거래 액션 유도', {
    x: 0.6, y: 4.8, w: 10.8, h: 1.0,
    fontSize: 13, color: '8F9CAE', fontFace: 'Noto Sans KR', lineSpacing: 20
  });

  // Slide 3: AI Proposal Text Summary
  const slide3 = pres.addSlide();
  slide3.background = { color: '0B0D19' };
  
  slide3.addText('2. AI 광고 상품 처방 및 제언', { 
    x: 0.5, y: 0.4, w: 11, h: 0.6, 
    fontSize: 24, bold: true, color: 'FF3B30', fontFace: 'Noto Sans KR' 
  });
  slide3.addShape(pres.ShapeType.rect, { x: 0.5, y: 1.1, w: 11.0, h: 0.02, fill: { color: '202738' } });

  const cleanedText = proposalText ? proposalText.replace(/[#*`\-_]/g, '').trim() : '상세 제안서 내역은 대시보드 뷰어에서 마크다운 리포트로 조회해 주세요.';
  const summaryText = cleanedText.length > 500 ? cleanedText.substring(0, 500) + '...' : cleanedText;

  slide3.addText(summaryText, { 
    x: 0.6, y: 1.5, w: 10.8, h: 4.2, 
    fontSize: 13, color: 'CBD5E1', fontFace: 'Noto Sans KR', lineSpacing: 20 
  });

  // Slide 4: Expectation & Official Pricing Table (공식 광고 단가표 탑재)
  const slide4 = pres.addSlide();
  slide4.background = { color: '0B0D19' };
  
  slide4.addText('3. 놀이의발견 공식 광고 지면 및 가격 정책', { 
    x: 0.5, y: 0.4, w: 11, h: 0.6, 
    fontSize: 24, bold: true, color: 'FF3B30', fontFace: 'Noto Sans KR' 
  });
  slide4.addShape(pres.ShapeType.rect, { x: 0.5, y: 1.1, w: 11.0, h: 0.02, fill: { color: '202738' } });

  const rows = [
    [
      { text: '광고 상품 (구좌)', options: { fill: '1A1F35', color: 'FF3B30', bold: true, align: 'center' } },
      { text: '광고 위치', options: { fill: '1A1F35', color: 'FFFFFF', bold: true, align: 'center' } },
      { text: '월 광고비 (정가)', options: { fill: '1A1F35', color: 'FFFFFF', bold: true, align: 'center' } },
      { text: '프로모션 할인가', options: { fill: '1A1F35', color: 'FFFFFF', bold: true, align: 'center' } },
      { text: '평균 전환율 (CVR)', options: { fill: '1A1F35', color: '39FF14', bold: true, align: 'center' } }
    ],
    [
      { text: '스플래쉬 광고', options: { fill: '0F1322', color: 'FFFFFF', align: 'center' } },
      { text: '앱 로딩 화면 독점', options: { fill: '0F1322', color: 'FFFFFF', align: 'center' } },
      { text: '주 700만원', options: { fill: '0F1322', color: 'FFFFFF', align: 'center' } },
      { text: '주 490만원', options: { fill: '0F1322', color: 'FF3B30', bold: true, align: 'center' } },
      { text: '12% ~ 25%', options: { fill: '0F1322', color: '39FF14', align: 'center' } }
    ],
    [
      { text: '메인 팝업 배너', options: { fill: '1A1F35', color: 'FFFFFF', align: 'center' } },
      { text: 'MAIN 진입 팝업', options: { fill: '1A1F35', color: 'FFFFFF', align: 'center' } },
      { text: '월 350만원', options: { fill: '1A1F35', color: 'FFFFFF', align: 'center' } },
      { text: '월 200만원', options: { fill: '1A1F35', color: 'FF3B30', bold: true, align: 'center' } },
      { text: '12% ~ 15%', options: { fill: '1A1F35', color: '39FF14', align: 'center' } }
    ],
    [
      { text: '메인 배너 광고', options: { fill: '0F1322', color: 'FFFFFF', align: 'center' } },
      { text: 'MAIN 상단 메인 배너', options: { fill: '0F1322', color: 'FFFFFF', align: 'center' } },
      { text: '월 500만원', options: { fill: '0F1322', color: 'FFFFFF', align: 'center' } },
      { text: '월 350만원', options: { fill: '0F1322', color: 'FF3B30', bold: true, align: 'center' } },
      { text: '10% ~ 12%', options: { fill: '0F1322', color: '39FF14', align: 'center' } }
    ],
    [
      { text: '카테고리 GNB 광고', options: { fill: '1A1F35', color: 'FFFFFF', align: 'center' } },
      { text: 'GNB 아이콘 영역', options: { fill: '1A1F35', color: 'FFFFFF', align: 'center' } },
      { text: '월 250만원', options: { fill: '1A1F35', color: 'FFFFFF', align: 'center' } },
      { text: '월 175만원', options: { fill: '1A1F35', color: 'FF3B30', bold: true, align: 'center' } },
      { text: '9% ~ 10%', options: { fill: '1A1F35', color: '39FF14', align: 'center' } }
    ],
    [
      { text: '메인 서브 배너', options: { fill: '0F1322', color: 'FFFFFF', align: 'center' } },
      { text: 'MAIN 중단/하단 배너', options: { fill: '0F1322', color: 'FFFFFF', align: 'center' } },
      { text: '월 150만원', options: { fill: '0F1322', color: 'FFFFFF', align: 'center' } },
      { text: '월 105만원', options: { fill: '0F1322', color: 'FF3B30', bold: true, align: 'center' } },
      { text: '4% ~ 5%', options: { fill: '0F1322', color: '39FF14', align: 'center' } }
    ],
    [
      { text: '카테고리 상세 배너', options: { fill: '1A1F35', color: 'FFFFFF', align: 'center' } },
      { text: '카테고리 > 상세 페이지', options: { fill: '1A1F35', color: 'FFFFFF', align: 'center' } },
      { text: '월 100만원', options: { fill: '1A1F35', color: 'FFFFFF', align: 'center' } },
      { text: '월 70만원', options: { fill: '1A1F35', color: 'FF3B30', bold: true, align: 'center' } },
      { text: '2.5% ~ 3.5%', options: { fill: '1A1F35', color: '39FF14', align: 'center' } }
    ]
  ];

  slide4.addTable(rows, { x: 0.6, y: 1.5, w: 10.8, colW: [2.5, 2.5, 2.0, 2.0, 1.8], fontSize: 11, border: { pt: 1, color: '202738' } });

  slide4.addText('* 위 금액은 프로모션 할인율이 적용된 가격(VAT 별도)이며, 플랫폼 트래픽 및 제휴 형태에 따라 변동될 수 있습니다.', { 
    x: 0.6, y: 5.6, w: 10.8, h: 0.4, 
    fontSize: 10, color: '8F9CAE', fontFace: 'Noto Sans KR' 
  });

  // Slide 5: Partner Closing Slide (피날레 슬라이드)
  const slide5 = pres.addSlide();
  slide5.background = { color: 'FF3B30' }; // 레드 브랜딩 피날레
  
  slide5.addText('놀이의발견과 함께하실 파트너를 기다립니다.', { 
    x: 0.5, y: 1.5, w: 11, h: 1.0, 
    fontSize: 30, bold: true, color: 'FFFFFF', fontFace: 'Noto Sans KR' 
  });

  slide5.addText('■ 제휴 및 광고 집행 문의', { x: 0.6, y: 2.8, w: 10, h: 0.4, fontSize: 18, bold: true, color: 'FFFFFF', fontFace: 'Noto Sans KR' });
  slide5.addText('• 담당자: 플랫폼통합기획팀 최진호 과장\n• 이메일: luckychoe22@wjcompass.com\n• 연락처: 010-7166-3147\n• 주 소: 서울특별시 서초구 강남대로39길 15-10 웅진컴퍼스 3층', { 
    x: 0.8, y: 3.3, w: 10, h: 1.8, 
    fontSize: 14, color: 'FFFFFF', fontFace: 'Noto Sans KR', lineSpacing: 24 
  });

  slide5.addText('웅진컴퍼스 | 놀이의발견', { 
    x: 0.8, y: 5.3, w: 8, h: 0.4, 
    fontSize: 12, color: 'E2E8F0', fontFace: 'Noto Sans KR' 
  });

  try {
    const buffer = await pres.write('nodebuffer');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename=proposal_${encodeURIComponent(clientName || 'advertiser')}.pptx`);
    res.send(buffer);
  } catch (error) {
    console.error('Failed to generate PPTX:', error);
    res.status(500).json({ success: false, error: 'Failed to generate PPTX file.' });
  }
});

// 서버 기동
app.listen(PORT, () => {
  console.log(`AI Advertising Platform Dashboard Server is running at http://localhost:${PORT}`);
});
