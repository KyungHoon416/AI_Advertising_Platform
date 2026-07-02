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


// ----------------------------------------------------
// 마스터 시스템 프롬프트 (모든 AI Agent 공통 페르소나)
// ----------------------------------------------------
const MASTER_SYSTEM_PROMPT = `당신은 웅진컴퍼스 플랫폼사업기획팀 소속 기획자이며, 10년 이상의 플랫폼 전략·서비스 기획 경험과 B2B/B2C 통합 플랫폼 운영 경험을 보유하고 있습니다. 담당 플랫폼은 랠리즈, 놀발, 클래스박스/클래스몰, 리딩오션스 플러스입니다. 당신은 전략 기획, 시장 분석, 서비스 정책 설계, 화면/IA 설계, 데이터 분석, 보고서 작성까지 전방위 업무를 수행합니다.

---

### 1️⃣ 시장 분석
1. **시장 규모**
   - TAM (Total Addressable Market): 전체 잠재 고객/매출 규모
   - SAM (Serviceable Available Market): 서비스 제공 가능 시장
   - SOM (Serviceable Obtainable Market): 실제 타겟 가능 시장
2. **경쟁사 분석**
   - 기능, 가격, 정책, 구독/결제 구조 비교
   - 벤치마크: 장점·단점, 시장 점유율, KPI 지표
3. **세그먼트 분석**
   - 고객 유형별: B2B(학원/기관) / B2C(학부모/사용자)
   - 역할 기반 타겟 구조 (Role-based Target)
   - 행동 데이터: MAU, DAU, 전환율, 재구매율, 취소율

---

### 2️⃣ 전략 기획
1. **단기/중장기 로드맵**
   - Q별 KPI 목표 설정
   - 신규 서비스 → MVP/풀스택 개발 → 정책 적용 → TO-BE 플로우
   - 단계별 책임자 및 예상 일정 포함
2. **B2B/B2C 제휴 및 수익 모델**
   - WIN & WIN 구조 설계, 비용·수수료 구조 명시
   - 플랫폼 중계 역할 정의 (결제·데이터·정산)
3. **구독/결제 전략**
   - 무료 → Standard → Plus 모델 설계
   - 업셀 트리거, 혜택 구성, 전환 KPI 산출
4. **시장 기반 전략**
   - TAM/SAM/SOM 기반 성장 계획
   - 경쟁사 대비 가격·기능 전략
   - 프로모션/마케팅 전략과 연계

---

### 3️⃣ 서비스 정책 설계
1. **기능 정의 및 우선순위**
   - UI/UX 영향도 → 매출 영향 → 개발 리드타임 기준
2. **결제·환불·포인트/쿠폰 정책**
   - 부분 환불, 비율 기반 포인트 회수/복원
   - OTA/커머스 하이브리드 구조 대응
   - 정책 적용 전/후 KPI 예측
3. **B2B 특화 정책**
   - 폐쇄몰, 인플루언서 공구, 구인구직 등
   - 인증, 권한, 예외 처리, 관리자/운영자 R&R 정의
4. **MVP 및 개발 단계별 정책**
   - 동의/계약, 전자서명, 업셀/CRM 연동
   - 기능 제한 → 점진적 확장(풀스택) vs 슬랙 방식

---

### 4️⃣ 화면 설계 / IA / 플로우
1. **화면 구조(Figma)**
   - 메뉴 구조, 기능별 플로우, 권한/상태별 UX 정의
   - 결제·환불·포인트·쿠폰·멤버십 플로우 포함
2. **데이터 연동**
   - PG, CMS, 외부 제휴 API 구조 반영
   - 실패/예외 케이스 처리
3. **사용자 여정**
   - 신규/기존 회원 유입 → 체험 → 결제 → 재구매 → 유지
   - KPI 관점에서 각 단계 분석 및 개선 포인트 도출

---

### 5️⃣ 데이터 기반 의사결정
1. **KPI/지표 분석**
   - DAU/MAU, 전환율, AOV, 취소율, 포인트 회수율
   - 정책 적용 전/후 비교 (as-is → to-be)
2. **공헌이익율 / 기회비용 계산**
   - 수식 포함: 공헌이익율 = (수익 – 직접비용 – 기회비용)/수익
   - 구독/결제, 이벤트/혜택, 포인트 적용 시 계산
3. **VOC/트래픽 기반 정책 검증**
   - 서비스 개선 전/후 VOC 분석
   - 데이터 기반 정책 개선 효과 검증

---

### 6️⃣ 보고서/문서 작성
1. **내부 보고**
   - 전략 보고서, KPI 표, 플로우 차트
   - 단계별 책임자/액션 아이템 포함
2. **외부 제휴 제안**
   - 제휴 구조, 수익/수수료, 플랫폼 중계 역할 명확화
   - 법률/세무 준수 표기
3. **실무 산출물**
   - Notion, PDF, 슬라이드, Figma 파일 등 즉시 배포 가능
   - 정책·UX·데이터가 일관되게 연결되도록 작성

---

### 7️⃣ 행동 지침
- 모든 산출물은 **즉시 실행 가능**
- 정책/데이터/UX 흐름 일관성 검증
- 단계별 표, 플로우, 계산식 포함
- 예시/케이스는 실제 플랫폼 구조 기반
- KPI, 정책, UX 영향 분석 포함
- TAM/SAM/SOM 분석 → 전략 기획 → 서비스 설계 → 화면 설계 → 데이터 분석 → 보고서 작성 **순서로 진행**

---

### 8️⃣ 활용 예시
1. OTA 장바구니/환불 구조 설계 → 부분 환불, 포인트 배분, 결제 실패 처리
2. 구독 서비스 upsell 전략 → 무료→Standard→Plus 전환, 혜택 구성, KPI 산출
3. B2B 폐쇄몰/인플루언서 공구 설계 → 권한/인증/정산 구조
4. 외부 제휴 제안 → 비용/수수료 구조, 플랫폼 중계 역할, 법률·세무 준수 반영
5. 이벤트/프로모션 정책 설계 → 당첨자 처리, 혜택 적용, DB 추출 프로세스
6. 시장 분석 기반 신규 서비스 전략 → TAM/SAM/SOM, 경쟁사 비교, KPI 추정`;

const PROMPT_LIBRARY = {
  master: {
    title: '마스터 시스템 프롬프트 (Agent 공통 페르소나)',
    template: MASTER_SYSTEM_PROMPT
  },
  segment: {
    title: '광고주 추천 프롬프트',
    template: '담당 플랫폼 놀이의발견(놀발)의 광고 사업 확장을 위해, 아래와 같이 초세분화(Micro-Segment)된 핵심 부모 타겟층의 행동 인덱스를 정교하게 분석한 뒤 최적의 광고주를 추천해 주세요.\n\n[초세분화 타겟 세그먼트 인덱스]\n- 성별 구성: {gender}\n- 연령대 분포: {age}\n- 거주 및 활동 지역: {location}\n- 서비스 가입 기간: {period}\n- 선호 마케팅 카테고리: {favorite}\n- 평균 찜하기 횟수: {wishCount}회\n- 평균 장바구니 적재수: {cartCount}회\n- 최근 구매 전환 횟수: {purchaseCount}회\n\n이 8가지 초세분화 지표의 타겟 소비 페르소나를 매칭하여 최상의 마케팅 효율을 낼 수 있는 다음 후보 브랜드 중 3곳을 매칭해 주세요.\n\n[추천 대상 광고주 후보군]\n{candidates}'
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
    template: '담당 플랫폼 놀이의발견(놀발)의 광고 상품을 판매하기 위한 광고주 맞춤형 제안서를 작성합니다. 시장 분석(TAM/SAM/SOM) → 전략 기획 → 서비스 설계 → 데이터 분석 → 보고서 작성 순서로 사고하되, 최종 산출물은 아래 출력 형식을 엄격히 따릅니다.\n\n[제안 대상]\n- 광고주명: {clientName}\n\n[작성 원칙]\n- 데이터 기반, 실행 가능, KPI 중심, 광고주 관점, ROI 중심\n- 유입 -> 클릭 -> 회원가입 -> 구매 -> 재구매 -> LTV 전체 퍼널 분석 전략 제안\n- 추측성 표현은 금지하고, 내부 샘플 데이터/가정 데이터는 반드시 "시뮬레이션 기준"으로 표기\n\n[출력 형식]\n1. Executive Summary\n2. 서비스 소개\n3. 시장 분석\n4. 경쟁사 분석\n5. 핵심 타겟\n6. 사용자 행동 분석\n7. 플랫폼 규모\n8. 광고 효과\n9. 광고 상품 소개 (스플래쉬, 메인 팝업, 메인 배너, 카테고리 GNB, 메인 서브, 카테고리 상세)\n10. 광고 운영 프로세스\n11. KPI\n12. 예상 성과\n13. 문의\n\n[광고 상품 작성 규칙]\n- 상품명, 노출 위치, 노출 방식, 추천 업종, 타겟, 광고 효과, 예상 CTR, 예상 CVR, 예상 전환율, 운영 프로세스, 집행 기간, 기대 효과 필수 포함\n\n[페이지 작성 규칙]\n각 슬라이드(Page 1~13)는 반드시 다음 요소를 포함해야 합니다:\n① 제목, ② 핵심 메시지, ③ 본문, ④ KPI, ⑤ 표, ⑥ 추천 차트, ⑦ 인포그래픽 설명, ⑧ Hero Image 설명, ⑨ AI 이미지 생성 Prompt (영문), ⑩ Negative Prompt, ⑪ PPT 레이아웃, ⑫ Figma 레이아웃, ⑬ 추천 아이콘, ⑭ 컬러, ⑮ 폰트, ⑯ 발표 멘트, ⑰ CTA\n\n[PPTX/PDF 이미지 삽입 규칙]\n- 모든 페이지는 PPTX/PDF에 바로 삽입 가능한 Premium Hero Image 기획을 포함해야 합니다.\n- 각 페이지는 텍스트 40%, 이미지 60% 비율을 전제로 작성합니다.\n- Hero Image는 슬라이드 우측 또는 상단 대형 영역에 들어가는 실제 삽입 이미지로 전제합니다.\n- Image Prompt는 이미지 생성 API에 그대로 전달 가능한 완성형 영문 문장으로 작성합니다.\n- 이미지 안에는 텍스트, 숫자, 브랜드 로고, 앱 로고, 실제 상표를 절대 포함하지 않습니다.\n- 이미지가 생성되지 않는 환경을 대비해 PPTX/PDF 대체 비주얼용 Image Concept, Mood, Color Palette, Composition을 반드시 구체화합니다.\n\n[AI 이미지 생성 규칙]\n- Ultra Realistic, Commercial Photography, Premium, Luxury, Corporate, Apple Keynote Style, Google Presentation Style, Minimal, White Background, Soft Lighting, High Detail, 8K\n- 브랜드 로고 및 텍스트는 제외\n- 각 페이지마다 Image Concept, Camera Angle, Lighting, Mood, Composition, Image Prompt (영문), Negative Prompt, Aspect Ratio 필수 출력\n- Aspect Ratio는 반드시 16:9로 통일'
  },
  roi: {
    title: 'AI ROI 리포트 프롬프트',
    template: '다음은 파트너사 "{partnerName}"의 최근 광고 집행 성과 데이터입니다.\n- 노출수: {impressions}회\n- 클릭수: {clicks}회 (CTR: {ctr}%)\n- 구매 전환수: {conversions}회 (전환율: {cvr}%)\n- 광고비: {spend}원\n- 광고 매출: {revenue}원 (ROAS: {roas}%)\n\n이 광고 성과를 종합적으로 평가하고, CTR 및 구매 전환율(CVR)을 개선하기 위한 AI 기반 구체적 액션 플랜 3가지를 제시해 주세요.'
  }
};

// ----------------------------------------------------
// Agent-to-Agent 프롬프트 조립기
// 모든 에이전트가 마스터 페르소나를 공유하고,
// 선행 에이전트의 산출물(previousContext)을 이어받아 일관된 파이프라인을 구성한다
// ----------------------------------------------------
function buildAgentPrompt(taskPrompt, previousContext) {
  let prompt = MASTER_SYSTEM_PROMPT + '\n\n---\n\n[현재 에이전트 태스크]\n' + taskPrompt;
  if (previousContext) {
    prompt += '\n\n---\n\n[선행 에이전트 산출물 (Agent-to-Agent Context)]\n아래는 파이프라인의 선행 에이전트가 생성한 산출물입니다. 수치·전략·용어의 일관성을 유지하고, 선행 산출물의 분석 결과를 근거로 연계하여 작성하세요.\n\n' + previousContext;
  }
  return prompt;
}

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
  
  const taskPrompt = PROMPT_LIBRARY.segment.template
    .replace('{gender}', segmentInfo.gender || '전체')
    .replace('{age}', segmentInfo.age || '전체')
    .replace('{location}', segmentInfo.location || '전체')
    .replace('{period}', segmentInfo.period || '전체')
    .replace('{favorite}', segmentInfo.favorite || '전체')
    .replace('{wishCount}', segmentInfo.avgWish || '0')
    .replace('{cartCount}', segmentInfo.avgCart || '0')
    .replace('{purchaseCount}', segmentInfo.avgPurchase || '0')
    .replace('{candidates}', candidatesText);
  const prompt = buildAgentPrompt(taskPrompt, req.body.previousContext);

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
    console.warn("AI API limit/error. Fallback to mock:", error.message);
    res.json({ success: true, report: mockResponse, isFallback: true });
  }
});

// 4. AI 시장조사 API
app.post('/api/ai/market-research', async (req, res) => {
  const { industry, previousContext } = req.body;
  const prompt = buildAgentPrompt(PROMPT_LIBRARY.research.template.replace('{industry}', industry), previousContext);

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
    console.warn("AI API limit/error. Fallback to mock:", error.message);
    res.json({ success: true, report: mockResponse, isFallback: true });
  }
});

// 5. AI 경쟁사 분석 API
app.post('/api/ai/competitor-analysis', async (req, res) => {
  const { competitors, previousContext } = req.body;
  const prompt = buildAgentPrompt(PROMPT_LIBRARY.competitor.template.replace('{competitors}', competitors), previousContext);

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
    console.warn("AI API limit/error. Fallback to mock:", error.message);
    res.json({ success: true, report: mockResponse, isFallback: true });
  }
});

// 6. 맞춤형 광고 제안서 생성 API
app.post('/api/ai/proposal', async (req, res) => {
  const { clientName, previousContext } = req.body;
  const prompt = buildAgentPrompt(PROMPT_LIBRARY.proposal.template.replace('{clientName}', clientName), previousContext);

  const mockResponse = `### 🤖 [웅진컴퍼스 놀이의발견] AI 기반 맞춤형 광고 기획 제안서 (13 Pages Full Draft)
**제안 대상:** \${clientName} 귀사
**제안사:** 웅진컴퍼스 | 플랫폼사업기획팀
**작성일:** \${new Date().toISOString().split('T')[0]}

---

### 📄 Page 1: Executive Summary
* **① 제목**: 179만 가정이 움직이는 순간, 놀이의발견 비즈니스 제안
* **② 핵심 메시지**: 대한민국 NO.1 가족 여가 플랫폼 놀이의발견이 귀사의 매출을 도약시킵니다.
* **③ 본문**: 놀이의발견은 실구매력이 검증된 3040 부모 유저들이 밀집된 대한민국 1위 여가 큐레이션 예약 앱입니다. 본 제안서는 귀사 브랜드를 최우선 매칭하여 유입부터 결제 완료까지 풀퍼널(Full-Funnel) 마케팅 성과를 견인하는 맞춤 마케팅 로드맵을 제안합니다.
* **④ KPI**: 신규 고객 유입량 150% 증대, 브랜드 인지도 80% 상승
* **⑤ 표**: [타겟 도달 비교] 놀이의발견 (98% 도달) vs 일반 포털 매체 (23% 도달)
* **⑥ 추천 차트**: 타겟 집중도 대비 도달률 비교 막대형 차트
* **⑦ 인포그래픽 설명**: 3040 부모 유저가 98% 도달되는 타겟 집중 깔때기 도식
* **⑧ Hero Image 설명**: 모던한 화이트 배경에서 스마트 기기를 보며 기뻐하는 부모와 행복한 한국 아이의 프리미엄 이미지
* **⑨ AI 이미지 생성 Prompt (영문)**: A premium commercial photograph of a happy Korean child laughing in a sunny green garden, parents next to the child holding a modern smartphone showing a lifestyle app, minimal white background, soft natural lighting, volumetric rays, Apple Keynote presentation style, high detail, ultra-realistic, 8k resolution, shot on 85mm lens.
* **⑩ Negative Prompt**: text, logo, watermark, signature, frames, bad hands, cartoon, illustration, low contrast, dark background, low quality.
* **⑪ PPT 레이아웃**: 좌측 텍스트 40%, 우측 카드형 이미지 및 핵심 수치 블록 60%
* **⑫ Figma 레이아웃**: Auto-layout Frame, 2-column grid, margins 80px, corner radius 24px
* **⑬ 추천 아이콘**: 📈 (성장), 🎯 (타겟)
* **⑭ 컬러**: Primary Crimson (#FF3B30), Neutral Dark (#0A0C16), Point Gold (#FFB900)
* **⑮ 폰트**: Outfit & Noto Sans KR (Bold 36px, Medium 16px)
* **⑯ 발표 멘트**: "안녕하십니까. 웅진컴퍼스 플랫폼사업기획팀입니다. 오늘 저희가 준비한 광고 제안서는..."
* **⑰ CTA**: [놀이의발견 입점 파트너 제휴 신청하기]
* **Image Concept**: Premium Family Lifestyle
* **Camera Angle**: Eye Level, Medium Close-up
* **Lighting**: Soft Golden Hour Natural Lighting
* **Mood**: Warm, Joyful, Luxurious, Minimalist
* **Composition**: Rule of thirds, centered child with parents blurred in background
* **Aspect Ratio**: 16:9

---

### 📄 Page 2: 회사 소개 (Company History)
* **① 제목**: 웅진의 교육 철학 위에 탄생한 1위 키즈 여가 인프라
* **② 핵심 메시지**: 교육 및 여가 비즈니스를 선도하는 웅진컴퍼스의 검증된 전문성
* **③ 본문**:
  - **2018.04**: 웅진씽크빅 키즈플랫폼 사업부 신설 및 구글플레이 '올해의 앱' 선정
  - **2020.05**: 웅진씽크빅 100% 자회사 분사 및 시리즈B 200억 규모 투자 유치
  - **2021.02**: 가입 유저 100만 명 달성 및 숙박 예약 서비스 공식 론칭
  - **2024.12**: 웅진컴퍼스 X 놀이의발견 합병을 통한 라이프스타일 거대 연합 플랫폼 도약
* **④ KPI**: 계열사 통합 누적 거래액 성장률 220% 달성
* **⑤ 표**: [주요 연혁 성장 지표] 연도별 가입자 수 추이 및 누적 제휴점 규모 데이터
* **⑥ 추천 차트**: 연도별 누적 가입자 및 거래액 스택 라인 차트
* **⑦ 인포그래픽 설명**: 연도별 이정표를 나타내는 수평형 메트로 타임라인 도식
* **⑧ Hero Image 설명**: 모던하고 깨끗한 기업 사무실 공간에서 밝은 조명 아래 협업하는 전문 마케팅 기획팀의 역동적인 모습
* **⑨ AI 이미지 생성 Prompt (영문)**: A premium corporate photography of professional Korean marketing team working together around a clean modern wooden desk in a bright office, minimal white wall background, natural soft lighting, commercial photography, Apple Keynote style, high detail, 8k.
* **⑩ Negative Prompt**: text, logo, bad hands, deformed faces, dark office, messy desk.
* **⑪ PPT 레이아웃**: 좌측 30% 타임라인 리스트, 우측 70% 타임라인 그래픽 카드 배치
* **⑫ Figma 레이아웃**: Vertical Auto-layout, Padding 64px, Column spacing 24px
* **⑬ 추천 아이콘**: 🏛️ (본사), 🗓️ (히스토리)
* **⑭ 컬러**: Slate Gray (#475569), Brand Orange (#FF9500)
* **⑮ 폰트**: Inter & Noto Sans KR (Bold 32px, Regular 14px)
* **⑯ 발표 멘트**: "놀이의발견은 웅진씽크빅에서 분사하여 시리즈 B 투자를 이끌어냈고, 현재는 웅진컴퍼스와의 전략적 연합을 마쳤습니다."
* **⑰ CTA**: [웅진컴퍼스 파트너십 제안서 전체 보기]
* **Image Concept**: Professional Corporate Working Style
* **Camera Angle**: Medium Wide Shot, Slightly High Angle
* **Lighting**: Clean Studio White Fluorescent Lighting with Natural Side Light
* **Mood**: Professional, Trustworthy, Modern, Sophisticated
* **Composition**: Dynamic leading lines focusing on the team collaboration
* **Aspect Ratio**: 16:9

---

### 📄 Page 3: 서비스 소개 (Service Introduce)
* **① 제목**: 키즈 놀이, 숙박, 체험학습 통합 라이프스타일 큐레이션
* **② 핵심 메시지**: 국내 유일, 부모의 예약 번거로움을 해결해주는 360도 패밀리 예약 앱
* **③ 본문**: 놀이의발견은 전국의 풀빌라 숙소, 레저 티켓, 키즈카페, 에듀케이션 체험클래스를 실시간 예약할 수 있는 유일무이한 가족 여가 플랫폼입니다. 단순 탐색을 넘어 실제 결제 행동으로 이어지는 고관여 유저 중심의 전환 인프라를 제공합니다.
* **④ KPI**: 예약 전환 리드 도달율 92% 보장
* **⑤ 표**: [콘텐츠 카테고리 구성] 놀이/체험/숙박 별 입점 비율 및 주 이용 분포표
* **⑥ 추천 차트**: 카테고리별 매출 및 방문자 분포를 보여주는 3D 도넛 차트
* **⑦ 인포그래픽 설명**: 콘텐츠-숙박-체험의 3요소가 부모와 아이를 중심으로 연결되는 순환 고리 도식
* **⑧ Hero Image 설명**: 잔디밭 위에 예쁘게 피칭된 캠핑 텐트와 고급스러운 여가 아웃도어 기어들
* **⑨ AI 이미지 생성 Prompt (영문)**: A luxury family camping site with a beautiful white canvas tent on a green grass field, premium wooden camping chairs, warm fairy lights lit during twilight, soft sunset glow, commercial luxury lifestyle, minimal sky background, 8k, ultra-realistic.
* **⑩ Negative Prompt**: people, text, logo, low contrast, messy campsite, ugly shadows.
* **⑪ PPT 레이아웃**: 3열 카드 그리드 레이아웃 (놀이 / 숙박 / 체험 각 구좌별 설명)
* **⑫ Figma 레이아웃**: Horizontal Flex Layout, Gap 32px, Margins 100px
* **⑬ 추천 아이콘**: 🏕️ (여가 캠핑), 🏨 (숙소 예약)
* **⑭ 컬러**: Forest Green (#10B981), Amber Yellow (#F59E0B)
* **⑮ 폰트**: Outfit & Noto Sans KR (Bold 30px, Regular 15px)
* **⑯ 발표 멘트**: "단순히 갈 만한 곳을 보여주는 것에 그치지 않고, 그곳의 입장권과 주변 키즈 펜션까지 한 번에 묶음 예약하게 만드는 구조를 가집니다."
* **⑰ CTA**: [놀이의발견 서비스 이용권 체험 신청]
* **Image Concept**: Premium Family Outdoor Leisure
* **Camera Angle**: Eye Level, Establishing Shot
* **Lighting**: Warm Sunset Glow with Soft Ambience
* **Mood**: Peaceful, Luxurious, Aspirational, Warm
* **Composition**: Perfectly balanced rule of thirds with canvas tent on the right
* **Aspect Ratio**: 16:9

---

### 📄 Page 4: 시장 분석 (Market Analysis)
* **① 제목**: 가족 여가 및 웰니스 시장의 구조적 성장세
* **② 핵심 메시지**: 소수 자녀에게 집중 투자하는 '골드키즈' 시장 선도 기회
* **③ 본문**: 저출생 시대 속에서도 자녀 1인당 평균 여가 및 교육 지출액은 연평균 14.8%의 역성장 없는 탄탄한 확장세를 유지하고 있습니다. 양질의 패밀리 아웃도어 여가 및 프리미엄 체험형 클래스 시장은 매년 공급이 수요를 따라가지 못하는 품귀 현상을 겪고 있습니다.
* **④ KPI**: 자녀 여가 시장 연간 도달 가치 2.4조 원
* **⑤ 표**: [자녀 지출 항목 변화] 아동 의류, 여가/레저, 체험형 교육 부문 연간 소비액 표
* **⑥ 추천 차트**: 연도별 아동 여가/레저 지출비 성장률 비교 꺾은선 차트
* **⑦ 인포그래픽 설명**: 일반 아동 시장의 감소세와 달리, 인당 지출액(Premium Spend)은 급증하는 역설적 구조 그래프
* **⑧ Hero Image 설명**: 모던하고 화사한 아동 놀이방 공간에 정돈된 고급 친환경 목재 장난감과 감각적인 인테리어 소품들
* **⑨ AI 이미지 생성 Prompt (영문)**: A minimalist Scandinavian styled kids playroom filled with high-end wooden creative toys, soft natural sunlight streaming through a large window, white clean walls, pastel-toned rug, commercial photography, premium Apple Keynote interior style, 8k.
* **⑩ Negative Prompt**: dirty room, plastic toys, cluttered floor, people, text.
* **⑪ PPT 레이아웃**: 2단 레이아웃 (좌측 통계적 요약, 우측 프리미엄 장난감 룸 이미지 카드)
* **⑫ Figma 레이아웃**: 12-column grid system, 48px margins
* **⑬ 추천 아이콘**: 📊 (차트), 🧸 (키즈 장난감)
* **⑭ 컬러**: Warm Sand (#F5F5F4), Soft Sage (#86EFAC)
* **⑮ 폰트**: Outfit & Noto Sans KR (Bold 30px, Medium 15px)
* **⑯ 발표 멘트**: "자녀 수는 줄고 있지만 한 아이를 위해 8명의 지갑이 열리는 에이트 포켓 트렌드는 가속화되고 있습니다."
* **⑰ CTA**: [가족 여가 트렌드 트래픽 리포트 받기]
* **Image Concept**: Luxury Kids Environment Lifestyle
* **Camera Angle**: Low Angle, Wide Shot
* **Lighting**: Diffused Soft Sunlight through Sheer Curtains
* **Mood**: Peaceful, Clean, Premium, Minimalist
* **Composition**: Balanced interior perspective emphasizing space and premium materials
* **Aspect Ratio**: 16:9

---

### 📄 Page 5: 경쟁사 분석 (Competitor Analysis)
* **① 제목**: 일반 여가 매체 대비 키즈 타겟 충성도 격차
* **② 핵심 메시지**: 종합 숙박 앱의 노이즈 가득한 지면보다 10배 높은 전환 밀도
* **③ 본문**: 야놀자, 여기어때 등 일반 숙박/레저 플랫폼은 2030 데이팅/커플 타겟에 마케팅 리소스가 집중되어 있는 반면, 놀이의발견은 3040 실구매층 부모 회원 집중도가 98%에 육박합니다. 따라서 낭비되는 광고비 없이 100% 진성 가정이 매칭되어 고효율 ROI를 뿜어냅니다.
* **④ KPI**: 타겟 도달 효율성 4.3배 우수 (CPC 단가 대비 고전환)
* **⑤ 표**: [경쟁사 매체 비교] 가입자 속성, 주력 카테고리, 광고 노이즈 수준, 타겟 정밀도 비교표
* **⑥ 추천 차트**: 매체별 타겟 집중 밀도 및 낭비 비용(Wasted Spend) 비교 100% 누적 막대 차트
* **⑦ 인포그래픽 설명**: 불필요한 연령대 노출로 새어 나가는 일반 매체 광고비와 놀이의발견의 핀포인트 집중도 대비 레이더 차트
* **⑧ Hero Image 설명**: 세련된 블루와 골드 빛이 감도는 다크 네이비 톤의 미니멀 스마트폰 목업 스크린 이미지
* **⑨ AI 이미지 생성 Prompt (영문)**: A clean minimalist mock-up of a modern frameless smartphone floating in a dark navy blue studio room, glossy glass texture reflection, soft neon red and white neon backlight, luxury, Apple style presentation element, 8k.
* **⑩ Negative Prompt**: hand holding phone, low quality, complex UI, text, letters, icons.
* **⑪ PPT 레이아웃**: 좌우 2열 대치형 카드 UI 구성 (타 매체 vs 놀이의발견)
* **⑫ Figma 레이아웃**: Two-column layout grid, gap 40px, rounded corners 16px
* **⑬ 추천 아이콘**: ⚔️ (비교), 🛡️ (정밀 타겟)
* **⑭ 컬러**: Charcoal Navy (#1E293B), Lime Yellow (#FACC15)
* **⑮ 폰트**: Outfit & Noto Sans KR (Bold 30px, Regular 14px)
* **⑯ 발표 멘트**: "일반 포털에 광고비를 태우시면 80%는 아이가 없는 20대 유저에게 낭비됩니다. 놀이의발견은 그 낭비를 ZERO로 줄여줍니다."
* **⑰ CTA**: [타사 매체 대비 광고 단가표 내려받기]
* **Image Concept**: Aesthetically Pleasing Tech Element
* **Camera Angle**: Three-quarter Angle, Macro Shot
* **Lighting**: Dynamic High-Contrast Studio Spotlight
* **Mood**: Technical, Futuristic, Sleek, Luxury
* **Composition**: Centered smartphone mock-up with subtle depth of field
* **Aspect Ratio**: 16:9

---

### 📄 Page 6: 핵심 타겟 (Core Target Segment)
* **① 제목**: 실구매 의사결정권자, 3040 고관여 '밀레니얼 페어런츠'
* **② 핵심 메시지**: 가치 있는 가족 여가에 아낌없이 소비하는 핵심 타겟층 핀포인트 매칭
* **③ 본문**: 놀이의발견 유저의 98%는 자녀를 둔 30대 후반에서 40대 중반의 부모 회원입니다. 특히 이들은 고도화된 소비력과 트렌디한 가족 레저 문화를 지향하며, 자녀 동반 숙박 및 프리미엄 체험형 학습을 선별하고 결정하는 실구매 의사결정권자입니다.
* **④ KPI**: 타겟 부모 회원 비율 98%, 연평균 패밀리 여가 결제 8.4회
* **⑤ 표**: [주요 세그먼트 데이터] 연령별, 지역별, 선호 카테고리별 유저 볼륨 분포표
* **⑥ 추천 차트**: 가입 회원 연령대 및 성비 분포를 시각화한 반원형 파이 차트
* **⑦ 인포그래픽 설명**: 회원 가입 후 첫 구매, 재구매로 이어지는 자녀 생애주기별 마케팅 타겟 매트릭스
* **⑧ Hero Image 설명**: 모던하고 깨끗한 화이트 실내 공간에서 스마트 패드를 함께 보며 웃음꽃을 피우고 있는 다정한 엄마와 딸의 모습
* **⑨ AI 이미지 생성 Prompt (영문)**: A premium commercial photo of a warm Korean mother and her young daughter laughing joyfully together while looking at a tablet in a bright minimal white living room, soft natural morning light, organic linen shirts, corporate lifestyle style, high detail, 8k.
* **⑩ Negative Prompt**: text, logo, bad hands, dark room, cluttered furniture.
* **⑪ PPT 레이아웃**: 우측 60% 따뜻한 감성 패밀리 이미지 배치, 좌측 40% 타겟 페르소나 카드 요약
* **⑫ Figma 레이아웃**: Rounded card component layout, inner padding 32px
* **⑬ 추천 아이콘**: 👩‍👧 (부모 자녀), 🎯 (정밀 세그먼트)
* **⑭ 컬러**: Crimson Red (#FF3B30), Soft Beige (#F5F5F4)
* **⑮ 폰트**: Outfit & Noto Sans KR (Bold 30px, Regular 14px)
* **⑯ 발표 멘트**: "이들은 구매 능력이 충분하며, 자녀를 위한 일이라면 기꺼이 프리미엄 비용을 지불할 준비가 된 타겟군입니다."
* **⑰ CTA**: [타겟 오디언스 세그먼트 데이터 신청]
* **Image Concept**: Warm Emotional Family Connection
* **Camera Angle**: Close-up, Side Profile Angle
* **Lighting**: Bright and Warm Morning Sun rays
* **Mood**: Warm, Emotional, Joyful, Premium
* **Composition**: Close connection between mother and child in focus, minimal background
* **Aspect Ratio**: 16:9

---

### 📄 Page 7: 사용자 행동 분석 (User Behavioral Funnel)
* **① 제목**: 데이터로 읽는 유저 결제 행동과 퍼널(Funnel) 지표
* **② 핵심 메시지**: 알림 수신부터 실제 예약 결제까지 이어지는 원스톱 행동 인덱스
* **③ 본문**: 놀이의발견 앱 유저들은 평균 주 2.3회 접속하여 이번 주말에 갈 키즈 펜션을 검색하거나, 기획전 혜택 알림을 받은 즉시 앱에 진입합니다. 평균 클릭 대비 구매 전환율(CVR)은 12%를 상회하며, 장바구니에 상품을 담아둔 유저의 리타겟팅 푸시 응답률은 타사 평균 대비 3배 이상 높습니다.
* **④ KPI**: 상세 정보 조회 대비 결제 전환 비율 (CVR) 12% 보장
* **⑤ 표**: [행동 단계별 잔존율] 홈 진입 -> 카테고리 상세 -> 예약 진행 -> 최종 결제 완료율 테이블
* **⑥ 추천 차트**: 유입부터 최종 구매 완료까지의 이탈률을 가시화한 단계별 퍼널(Funnel) 차트
* **⑦ 인포그래픽 설명**: 푸시 알림 수신부터 터치, 장바구니, 결제까지 막힘없이 이어지는 유저 익스피어리언스 흐름
* **⑧ Hero Image 설명**: 모던하고 깨끗한 투명 유리를 투과하는 빛 속에서 모바일 화면을 손가락으로 가리키는 손목과 스마트폰 스크린
* **⑨ AI 이미지 생성 Prompt (영문)**: A minimal close-up shot of a clean Korean female finger touching a glowing smartphone screen displaying a bright abstract application layout, background is glassmorphic workspace, soft studio lighting, ultra-realistic, 8k.
* **⑩ Negative Prompt**: text, logo, blurry UI, multiple fingers, dirty skin.
* **⑪ PPT 레이아웃**: 좌측 50% 결제 퍼널 그래프, 우측 50% 스마트폰 터치 비주얼 및 데이터 주석
* **⑫ Figma 레이아웃**: Auto-layout horizontally aligned elements, Gap 48px
* **⑬ 추천 아이콘**: 🛒 (장바구니), 📲 (터치 클릭)
* **⑭ 컬러**: Deep Slate Blue (#0F172A), Electric Blue (#00F2FE)
* **⑮ 폰트**: Outfit & Noto Sans KR (Bold 32px, Regular 14px)
* **⑯ 발표 멘트**: "장바구니 단계에서 이탈한 유저에게 즉시 리타겟팅 쿠폰 푸시를 발송하여 회수하는 결제 복구 구조를 가집니다."
* **⑰ CTA**: [유저 행동 리포트 다운로드]
* **Image Concept**: Modern Clean Mobile Tech Interaction
* **Camera Angle**: Macro Close-up, Depth of Field
* **Lighting**: Futuristic soft neon glow with key spotlight
* **Mood**: Futuristic, Clean, Focused, High-end
* **Composition**: Diagonal alignment of the smartphone and hand
* **Aspect Ratio**: 16:9

---

### 📄 Page 8: 플랫폼 규모 (Platform Scale Metrics)
* **① 제목**: 179만 회원, 47만 MAU가 만들어내는 강력한 낙수 효과
* **② 핵심 메시지**: 대한민국 3040 가정의 표준 플랫폼으로서 확고한 규모 입증
* **③ 본문**:
  - **누적 다운로드**: 241만 건 돌파
  - **월평균 활성 유저 (MAU)**: 47만 명 (시즌별 피크타임 최대 68만 돌파)
  - **입점 제휴점 수**: 30,000개 사 (가정용 숙박, 체험공간 전국 네트워킹 구축)
  - **누적 회원수**: 179만 명 (매주 평균 8,500명 이상의 신규 회원이 유입)
* **④ KPI**: 매달 새롭게 영입되는 육아 부모 리드 3.4만 명 확보
* **⑤ 표**: [플랫폼 규모 데이터 시트] 연도별 가입 건수, MAU 변동치, 거래량 추이표
* **⑥ 추천 차트**: MAU 및 다운로드 증가 추이를 동시에 투영한 이중 축 혼합 차트
* **⑦ 인포그래픽 설명**: 대한민국 지도 위에 지역별 제휴점 수와 트래픽 가중치가 밀집되는 양상 시각화
* **⑧ Hero Image 설명**: 정교하게 설계된 데이터 대시보드 그래프가 투명하게 중첩된 글래스모피즘 차트 렌더링
* **⑨ AI 이미지 생성 Prompt (영문)**: A high-end minimalist graphic representation of clean rising line charts and bar graphs, glassmorphic card ui overlay, soft blue and red glow backdrop, minimal white setting, commercial product design style, 8k.
* **⑩ Negative Prompt**: chaotic charts, dark setting, messy text, multiple colors.
* **⑪ PPT 레이아웃**: 대형 수치 블록 4개 격자형 카드 배치
* **⑫ Figma 레이아웃**: Auto-layout Grid, columns 2, rows 2, corner radius 20px
* **⑬ 추천 아이콘**: 🗺️ (지도 지표), 👥 (회원수)
* **⑭ 컬러**: Navy (#0F172A), Vivid Coral (#FF3B30)
* **⑮ 폰트**: Outfit & Noto Sans KR (Bold 36px, Light 14px)
* **⑯ 발표 멘트**: "이 트래픽 규모는 대한민국 3040 부모 세대 가구 수의 거의 과반에 육박하는 강력한 모수입니다."
* **⑰ CTA**: [놀이의발견 트래픽 데이터 대시보드 바로가기]
* **Image Concept**: Abstract Financial/Metric Growth Chart
* **Camera Angle**: Isometric View
* **Lighting**: Volumetric Lighting with Soft Backdrop Neon
* **Mood**: Professional, Upward, Modern, Luxury
* **Composition**: Ascending diagonal graphic lines leading from bottom-left to top-right
* **Aspect Ratio**: 16:9

---

### 📄 Page 9: 광고 효과 (Campaign ROI & Case Study)
* **① 제목**: 집행 즉시 매출로 직결되는 고효율 광고 전환 케이스
* **② 핵심 메시지**: 광고비 투입 대비 확실한 매출 견인과 평균 ROAS 450% 입증
* **③ 본문**: 아동 전문 완구 브랜드 A사 및 패밀리 리조트 B사의 실제 광고 집행 데이터에 따르면, 놀이의발견 맞춤 배너 매칭 시 클릭 전환율이 일반 타 배너 대비 3.8배 상승했으며, 광고 기기 노출 당 결제 매출(ROAS)은 평균 450%를 기록하여 단기 프로모션 완판을 달성했습니다.
* **④ KPI**: 광고 집행 평균 ROAS 450% 보장형 처방
* **⑤ 표**: [브랜드별 ROI 집행 결과] 집행 기간, 노출 수, 클릭 수, 결제 매출, ROAS 지표 비교표
* **⑥ 추천 차트**: 일반 포털 배너 광고 대비 놀이의발견 배너 집행 시 ROAS 성장 격차를 보여주는 대비 바 차트
* **⑦ 인포그래픽 설명**: 광고비 100만 원 투자 시 타 매체 대비 4배 이상의 유효 결제액을 복구하는 깔끔한 금액 퍼널 흐름
* **⑧ Hero Image 설명**: 성공적인 매출 상승을 상징하는 황금빛 코인들과 반투명한 우상향 유리 화살표의 고급 렌더링
* **⑨ AI 이미지 생성 Prompt (영문)**: A luxury abstract rendering of warm golden spheres and transparent glass arrow pointing upwards, clean warm lighting, minimal white background, elegant studio style, Apple Keynote presentation graphics, 8k.
* **⑩ Negative Prompt**: text, dirty shadows, cartoon, bad details.
* **⑪ PPT 레이아웃**: 좌측 40% 성공 사례 요약 데이터, 우측 60% ROI 성장 추이 도식 카드
* **⑫ Figma 레이아웃**: Corner radius 32px Cards with dropshadow blur 20px
* **⑬ 추천 아이콘**: 💸 (매출 회수), 🏆 (성공 케이스)
* **⑭ 컬러**: Gold (#D97706), Teal Blue (#14B8A6)
* **⑮ 폰트**: Outfit & Noto Sans KR (Bold 32px, Regular 14px)
* **⑯ 발표 멘트**: "단순 노출이 아닙니다. 실제 작년 패밀리 숙박 브랜드 B사는 광고비 대비 4.5배의 예약을 현장에서 끌어냈습니다."
* **⑰ CTA**: [업종별 맞춤형 성공사례 백서 다운로드]
* **Image Concept**: Symbolic Financial and ROI Growth
* **Camera Angle**: Close-up, Isometric perspective
* **Lighting**: Diffused Warm Light with Glass Caustics Reflections
* **Mood**: Success, Premium, Clean
* **Composition**: Diagonal golden flow of elements leading eyes upwards
* **Aspect Ratio**: 16:9

---

### 📄 Page 10: 광고 상품 소개 (Advertising Inventory Specs)
* **① 제목**: 6대 핵심 인벤토리와 전략적 맞춤 패키지 설계
* **② 핵심 메시지**: 앱 진입부터 상세 결제 완료까지 퍼널의 모든 단계에 침투
* **③ 본문**:
  - **스플래쉬 광고**: 앱 인트로 전체 화면 독점 노출 (인트로 구좌, 주 490만 원)
  - **메인 팝업 배너**: 홈 진입 즉시 전면 오버레이 팝업 (가시성 최고, 월 200만 원)
  - **메인 배너 광고**: 홈 화면 최상단 메인 롤링 (클릭 극대화, 월 350만 원)
  - **카테고리 GNB**: 관심사 매칭 퀵 아이콘 배치 (관심 타겟 필터링, 월 175만 원)
  - **메인 서브 배너**: 스크롤 피드 사이 중간 띠배너 (네이티브 노출, 월 105만 원)
  - **카테고리 상세**: 상품 정보 상세 페이지 하단 연동 (최종 결제 유도, 월 70만 원)
* **④ KPI**: 인벤토리 통합 총 2,800만 임프레션 보장
* **⑤ 표**: [인벤토리 단가 및 효율성 사양표] 구좌명, 노출 지면, 예상 CTR, 가격 일목요연 정리
* **⑥ 추천 차트**: 각 상품별 예상 전환율과 가격 대비 가치(Cost-Value)를 비교한 버블 차트
* **⑦ 인포그래픽 설명**: 놀이의발견 앱 메인 화면 Mockup 상에 각 6대 광고 구좌가 매핑된 구조도
* **⑧ Hero Image 설명**: 여러 층의 투명한 아크릴 레이어들이 정교하게 정렬되어 층을 이루고 있는 프리미엄 테크니컬 구조물
* **⑨ AI 이미지 생성 Prompt (영문)**: A conceptual premium 3d structure of clean rectangular white and glass layers stack, warm lighting glowing between sheets, minimal layout,Apple slides graphic style, 8k resolution.
* **⑩ Negative Prompt**: text, messy layout, people, chaotic colors.
* **⑪ PPT 레이아웃**: 2x3 카드 격자 UI 배열 (6개 상품 스펙 수록)
* **⑫ Figma 레이아웃**: Grid container, Gap 16px, Margin 60px
* **⑬ 추천 아이콘**: 📑 (상품 리스트), 🛍️ (구좌 인벤토리)
* **⑭ 컬러**: Red (#FF3B30), Indigo (#4F46E5)
* **⑮ 폰트**: Outfit & Noto Sans KR (Bold 28px, Medium 13px)
* **⑯ 발표 멘트**: "유저의 앱 여정에 맞춰, 인트로 실행 단계부터 최종 결제 상세 페이지까지 빈틈없는 노출 지면을 설계했습니다."
* **⑰ CTA**: [원하시는 지면 맞춤 견적 받아보기]
* **Image Concept**: Technical Multilayer Structure (Inventory Concept)
* **Camera Angle**: Eye Level, Macro Perspective
* **Lighting**: Soft backlighting from below layers
* **Mood**: Precise, Futuristic, Structured, Sophisticated
* **Composition**: Center aligned layered steps
* **Aspect Ratio**: 16:9

---

### 📄 Page 11: 광고 운영 프로세스 (Operational Workflow)
* **① 제목**: 제휴 신청부터 리포트 제공까지 체계적인 원스톱 케어
* **② 핵심 메시지**: 광고주의 리소스를 최소화하는 신속하고 정확한 마케팅 운영 프로세스
* **③ 본문**:
  1. **광고 제휴 신청**: 온라인 접수 및 담당자 배정 (1~2일 소요)
  2. **세그먼트 타겟 매칭**: 광고주 상품군에 최적화된 부모 유저 필터링 세팅 (3일 이내)
  3. **소재 빌드 및 셋업**: 배너 가이드 전달 및 최종 소재 심의 완료 (2일 소요)
  4. **캠페인 온에어**: 실시간 모니터링 및 트래픽 유입 안정화 (캠페인 런칭)
  5. **성과 분석 및 피드백**: 주간 단위 클릭 데이터 및 월간 최종 결제 ROI 리포트 제공
* **④ KPI**: 제휴 신청 후 캠페인 런칭까지 소요 기간 평균 7일 이내 완료
* **⑤ 표**: [운영 프로세스별 타임라인 및 담당 요건 정보] 단계명, 소요 기간, 필요 제출 서류표
* **⑥ 추천 차트**: 각 태스크의 선후 관계와 기간을 보여주는 깔끔한 갠트(Gantt) 차트
* **⑦ 인포그래픽 설명**: 1단계부터 5단계까지 우측으로 부드럽게 전개되는 원형 루프 화살표 프로세스 도식
* **⑧ Hero Image 설명**: 깨끗한 화이트 배경 위에 여러 개의 흰색 도미노 블록들이 정교하고 부드러운 곡선으로 연결되어 서 있는 모습
* **⑨ AI 이미지 생성 Prompt (영문)**: A clean minimalist composition of white stone domino blocks curves on a pure white surface, soft shadows, warm spotlight from side, high detail, high-end Apple presentation style, 8k.
* **⑩ Negative Prompt**: colorful dominos, messy placement, text, brand logos.
* **⑪ PPT 레이아웃**: 5열 수평 프로세스 플로우 카드 배치
* **⑫ Figma 레이아웃**: Horizontal stack with arrow connectors, padding 48px
* **⑬ 추천 아이콘**: ⚙️ (프로세스), ⏱️ (신속 처리)
* **⑭ 컬러**: Slate Gray (#64748B), Soft Mint (#A7F3D0)
* **⑮ 폰트**: Outfit & Noto Sans KR (Bold 28px, Regular 14px)
* **⑯ 발표 멘트**: "소재 제작 가이드만 주시면, 정밀 오디언스 매칭부터 타겟 오버레이 세팅까지 원스톱으로 신속 처리해 드립니다."
* **⑰ CTA**: [지금 광고 신청서 접수하고 상담받기]
* **Image Concept**: Interconnected Process Flow
* **Camera Angle**: Close-up, Low angle
* **Lighting**: Cinematic Soft side lighting
* **Mood**: Sequential, Organized, Smooth, Reliable
* **Composition**: Winding clean S-curve flow of elements
* **Aspect Ratio**: 16:9

---

### 📄 Page 12: 예상 성과 및 시뮬레이션 (Performance Simulation)
* **① 제목**: 광고 집행 규모별 정밀 성과 시뮬레이션
* **② 핵심 메시지**: 시뮬레이션 결과로 입증되는 확실한 유입 및 매출 도달율
* **③ 본문**:
  - **실버 패키지 (월 300만원)**: 예상 도달 80만 명 | 예상 클릭 24,000회 | 예상 매출 1,350만 원 (ROI 450%)
  - **골드 패키지 (월 700만원)**: 예상 도달 200만 명 | 예상 클릭 70,000회 | 예상 매출 3,500만 원 (ROI 500%)
  - **플래티넘 패키지 (월 1,500만원)**: 예상 도달 500만 명 | 예상 클릭 180,000회 | 예상 매출 8,250만 원 (ROI 550%)
* **④ KPI**: 집행 비용 대비 평균 클릭률(CTR) 3.5% 이상 보장
* **⑤ 표**: [광고 예산 등급별 기대 성과표] 패키지명, 비용, 예상 클릭, CVR 기준, 예상 매출 요약
* **⑥ 추천 차트**: 비용 투입 증가에 따른 매출 및 ROI 임계점 상승 추이를 나타내는 곡선 차트
* **⑦ 인포그래픽 설명**: 등급별 혜택 및 노출 지면 가중치를 깔끔한 3개 기둥(Card UI)으로 대비
* **⑧ Hero Image 설명**: 모던하고 깨끗한 유리 실린더 안에 은은하게 가득 차 올라 있는 황금색 입자들
* **⑨ AI 이미지 생성 Prompt (영문)**: A luxurious minimalist rendering of gold glowing sand rising inside three clean glass cylinder tubes of different heights, pure white background, commercial Apple slide style, 8k.
* **⑩ Negative Prompt**: text, dark shadows, cheap plastics.
* **⑪ PPT 레이아웃**: 3열 세로 카드 배치 (실버 / 골드 / 플래티넘 상세 대비)
* **⑫ Figma 레이아웃**: Autolayout vertical columns, corner radius 24px, inner shadow
* **⑬ 추천 아이콘**: 💎 (예산 등급), 📊 (시뮬레이션)
* **⑭ 컬러**: Gold Bronze (#CD7F32), Platinum Silver (#E2E8F0), Gold Yellow (#FBBF24)
* **⑮ 폰트**: Outfit & Noto Sans KR (Bold 32px, Regular 14px)
* **⑯ 발표 멘트**: "예산 규모에 맞춰 타겟 노출 지면을 최적 조합해 드립니다. 가장 추천해 드리는 안은 ROAS 효율이 극대화되는 골드 안입니다."
* **⑰ CTA**: [맞춤형 성과 시뮬레이션 메일로 받아보기]
* **Image Concept**: Stepwise Volume Growth (Simulation Concept)
* **Camera Angle**: Front View
* **Lighting**: Brilliant Underlighting illuminating the gold dust
* **Mood**: High-performing, Clear, Reliable, Scientific
* **Composition**: Three steps vertical bars arrangement
* **Aspect Ratio**: 16:9

---

### 📄 Page 13: 문의 및 제휴 신청 (Contact & Closing)
* **① 제목**: 3040 육아 가정으로의 관문, 놀이의발견 제휴
* **② 핵심 메시지**: 플랫폼통합기획팀의 전담 매니저가 귀사의 성장을 끝까지 지원합니다.
* **③ 본문**:
  - **담당 부서**: 웅진컴퍼스 플랫폼통합기획팀 최진호 과장
  - **이메일**: luckychoe22@wjcompass.com
  - **연락처**: 010-7166-3147
  - **본사 주소**: 서울특별시 서초구 강남대로39길 15-10 웅진컴퍼스 빌딩 3층
* **④ KPI**: 문의 접수 후 영업일 기준 24시간 이내 맞춤 광고 기획안 및 견적 회신
* **⑤ 표**: [주요 채널 문의처 안내] 광고 제휴, 입점 문의, 기술 지원 연락망 일목요연 정리
* **⑥ 추천 차트**: 문의 유형별 처리 속도와 만족도 지표를 보여주는 간단한 수평 막대 그래프
* **⑦ 인포그래픽 설명**: 본사 지도 약도 및 제휴 문의 메일 QR코드 박스
* **⑧ Hero Image 설명**: 오렌지-레드 톤의 깨끗한 그라데이션 바탕 중앙에 깔끔하게 인쇄된 봉투 형태의 화이트 3D 아이콘
* **⑨ AI 이미지 생성 Prompt (영문)**: A clean minimalist 3D rendering of white mail envelope icon floating in a pure red background, volumetric soft shadow, studio lighting, Apple design style, high resolution, 8k.
* **⑩ Negative Prompt**: text, handwriting, real hand holding envelope, dark shadows.
* **⑪ PPT 레이아웃**: 좌측 50% 담당자 정보 및 지도, 우측 50% 오렌지-레드 메일 문의 카드
* **⑫ Figma 레이아웃**: Fixed width right card component, flexible left info grid
* **⑬ 추천 아이콘**: ✉️ (메일 전송), 📞 (다이렉트 콜)
* **⑭ 컬러**: Primary Crimson (#FF3B30), Pure White (#FFFFFF)
* **⑮ 폰트**: Outfit & Noto Sans KR (Bold 34px, Regular 14px)
* **⑯ 발표 멘트**: "이것으로 제안을 마치겠습니다. 24시간 언제든 편하게 연락 주시면 귀사에 특화된 광고 패키지를 제안 드리겠습니다. 감사합니다."
* **⑰ CTA**: [이메일로 빠른 단가표 문의하기]
* **Image Concept**: Abstract Direct Communication/Call to Action
* **Camera Angle**: Center Front View
* **Lighting**: Diffused Top-down Warm Studio Light
* **Mood**: Vibrant, Inviting, Professional, Minimalist
* **Composition**: Dynamic floating element in center space
* **Aspect Ratio**: 16:9`;

  try {
    const aiText = await generateAIResponse(prompt, mockResponse);
    res.json({ success: true, report: aiText });
  } catch (error) {
    console.warn("AI API limit/error. Fallback to mock:", error.message);
    res.json({ success: true, report: mockResponse, isFallback: true });
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

  const taskPrompt = PROMPT_LIBRARY.roi.template
    .replace('{partnerName}', partnerName)
    .replace('{impressions}', imps.toLocaleString())
    .replace('{clicks}', clks.toLocaleString())
    .replace('{ctr}', ctr)
    .replace('{conversions}', convs.toLocaleString())
    .replace('{cvr}', cvr)
    .replace('{spend}', spnd.toLocaleString())
    .replace('{revenue}', rev.toLocaleString())
    .replace('{roas}', roas);
  const prompt = buildAgentPrompt(taskPrompt, req.body.previousContext);

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
    console.warn("AI API limit/error. Fallback to mock:", error.message);
    res.json({ success: true, report: mockResponse, calculated: { ctr, cvr, roas }, isFallback: true });
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

const HERO_VISUALS = [
  { title: 'Premium Family Lifestyle', accent: 'FF3B30', sub: 'Full-funnel growth proposal' },
  { title: 'Corporate Growth System', accent: 'FF9500', sub: 'Trusted platform partnership' },
  { title: 'Family Leisure Curation', accent: '10B981', sub: 'Discovery to reservation' },
  { title: 'Premium Kids Market', accent: '86EFAC', sub: 'Structural market growth' },
  { title: 'Target Media Advantage', accent: 'FACC15', sub: 'High-density audience match' },
  { title: 'Millennial Parents', accent: 'FF3B30', sub: 'Core decision makers' },
  { title: 'Behavioral Funnel', accent: '00F2FE', sub: 'Click to purchase journey' },
  { title: 'Platform Scale', accent: '4F46E5', sub: 'Traffic and network effect' },
  { title: 'ROI Growth', accent: 'D97706', sub: 'Revenue performance proof' },
  { title: 'Ad Inventory Layers', accent: '6366F1', sub: 'Six premium placements' },
  { title: 'Operation Workflow', accent: 'A7F3D0', sub: 'Launch to reporting' },
  { title: 'Performance Simulation', accent: 'FBBF24', sub: 'Budget to revenue forecast' },
  { title: 'Partnership CTA', accent: 'FF3B30', sub: 'Start campaign consultation' }
];

function svgToDataUri(svg) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function createHeroSvg({ title, sub, accent }) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
      <defs>
        <radialGradient id="glow" cx="72%" cy="28%" r="62%">
          <stop offset="0%" stop-color="#${accent}" stop-opacity="0.5"/>
          <stop offset="46%" stop-color="#ffffff" stop-opacity="0.16"/>
          <stop offset="100%" stop-color="#0B0D19" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="glass" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.58"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0.12"/>
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="28" stdDeviation="34" flood-color="#000000" flood-opacity="0.26"/>
        </filter>
        <filter id="blur">
          <feGaussianBlur stdDeviation="18"/>
        </filter>
      </defs>
      <rect width="1600" height="900" rx="64" fill="#101422"/>
      <rect width="1600" height="900" rx="64" fill="url(#glow)"/>
      <circle cx="1180" cy="210" r="180" fill="#${accent}" opacity="0.28" filter="url(#blur)"/>
      <circle cx="1310" cy="650" r="260" fill="#ffffff" opacity="0.10" filter="url(#blur)"/>
      <g filter="url(#shadow)">
        <rect x="205" y="154" width="970" height="560" rx="54" fill="url(#glass)" stroke="#ffffff" stroke-opacity="0.38" stroke-width="2"/>
        <rect x="280" y="230" width="410" height="52" rx="26" fill="#ffffff" opacity="0.28"/>
        <rect x="280" y="322" width="660" height="34" rx="17" fill="#ffffff" opacity="0.18"/>
        <rect x="280" y="380" width="520" height="34" rx="17" fill="#ffffff" opacity="0.13"/>
        <path d="M296 590 C 440 500, 555 612, 704 500 S 995 418, 1098 312" fill="none" stroke="#${accent}" stroke-width="18" stroke-linecap="round" opacity="0.88"/>
        <circle cx="296" cy="590" r="24" fill="#ffffff"/>
        <circle cx="704" cy="500" r="24" fill="#ffffff"/>
        <circle cx="1098" cy="312" r="24" fill="#ffffff"/>
      </g>
      <g opacity="0.86">
        <rect x="1056" y="480" width="260" height="260" rx="50" fill="#ffffff" opacity="0.18"/>
        <rect x="1160" y="322" width="260" height="260" rx="50" fill="#${accent}" opacity="0.5"/>
        <rect x="1222" y="404" width="172" height="172" rx="40" fill="#ffffff" opacity="0.24"/>
      </g>
    </svg>`;
}

function addHeroImage(slide, pageIndex, opts = {}) {
  const visual = HERO_VISUALS[pageIndex - 1] || HERO_VISUALS[0];
  const x = opts.x ?? 6.9;
  const y = opts.y ?? 1.38;
  const w = opts.w ?? 5.25;
  const h = opts.h ?? 4.75;
  slide.addImage({
    data: svgToDataUri(createHeroSvg(visual)),
    x,
    y,
    w,
    h
  });
}

const PPT_THEME = {
  bg: '080C18',
  panel: '111827',
  panel2: '1B2234',
  line: '263143',
  red: 'FF3B30',
  white: 'FFFFFF',
  gray: '9AA4B2',
  muted: '6B7280'
};

const deckSlides = [
  {
    no: 1,
    title: '놀이의발견 광고 마케팅 제안서',
    type: 'cover',
    subtitle: '놀이의발견과 함께 비즈니스의 가치를 높여보세요'
  },
  {
    no: 2,
    title: '1. 웅진컴퍼스 자회사, 놀이의발견 히스토리',
    bullets: [
      '2018.04: 웅진씽크빅 키즈플랫폼 사업부 신설 및 구글플레이 올해의 앱 선정',
      '2020.05: 웅진씽크빅 100% 자회사 분사 및 시리즈B 200억 규모 투자 유치',
      '2021.02: 가입 유저 100만 명 달성 및 숙박 예약 서비스 공식 론칭',
      '2024.12: 웅진컴퍼스 X 놀이의발견 합병을 통한 라이프스타일 연합 플랫폼 도약'
    ],
    chips: ['교육 헤리티지', '플랫폼 투자', '회원 성장', '통합 확장']
  },
  {
    no: 3,
    title: '2. 대한민국 1위 가족 여가 라이프스타일 플랫폼',
    bullets: [
      '키즈 놀이 콘텐츠, 숙박시설, 체험학습을 한곳에 담은 큐레이션 예약 앱',
      '실구매력이 검증된 3040 부모 세대가 밀집된 핵심 마케팅 지면',
      '탐색, 예약, 결제, 현장 이용까지 이어지는 전환 중심 사용자 동선'
    ],
    table: [
      ['구분', '제공 가치', '광고주 의미'],
      ['놀이/체험', '주말 가족 여가 수요 확보', '즉시 방문형 캠페인 적합'],
      ['숙박/레저', '객단가 높은 예약 행동', 'ROAS 중심 집행 가능'],
      ['교육/클래스', '고관여 부모 타겟', '반복 구매와 LTV 확장']
    ]
  },
  {
    no: 4,
    title: '3. 놀이의발견 플랫폼 트래픽 규모',
    metricTable: [
      ['회원수', '월간 순 이용자(MAU)', '누적 다운로드수', '등록 제휴점수'],
      ['179만 명', '47만 명', '241만 건', '약 3만 개']
    ],
    bullets: [
      '3040 육아 패밀리 유저 중심의 타겟 도달율 98% 보장',
      '자녀 동반 레저, 숙박 예약 거래액 연간 최고 성장세 기록'
    ]
  },
  {
    no: 5,
    title: '4. 고객 만족도가 증명하는 육아 필수 앱',
    bullets: [
      '주말 계획, 키즈카페, 숙박 특가를 한 번에 비교하고 예약하는 반복 이용 습관 형성',
      '알림, 기획전, 쿠폰 반응이 실제 클릭과 구매 전환으로 이어지는 구조',
      '후기 기반 탐색 비중이 높아 광고 소재의 신뢰도와 구매 설득력이 함께 상승'
    ],
    chips: ['반복 접속', '후기 신뢰', '쿠폰 반응', '예약 전환']
  },
  {
    no: 6,
    title: '5. 놀이의발견 광고 제휴 기대 효과',
    table: [
      ['퍼널', '기대 효과', '관리 KPI'],
      ['유입', '3040 부모 타겟 집중 도달', 'Impression / Reach'],
      ['클릭', '기획전, 쿠폰, 시즌 혜택 반응 극대화', 'CTR / CPC'],
      ['구매', '예약 결제 동선으로 즉시 전환 유도', 'CVR / ROAS'],
      ['재구매', '찜/장바구니 기반 리타겟팅', 'Repeat / LTV']
    ],
    bullets: ['인지, 클릭, 결제, 재방문까지 한 캠페인 안에서 관리 가능한 풀퍼널 광고 구조']
  },
  {
    no: 7,
    title: '6. 광고상품 ①: 스플래쉬 광고 (Splash AD)',
    product: ['앱 구동 인트로 화면 전체', '앱 실행 시 3초간 풀스크린 단독 노출', '대형 숙박·레저, 신규 캠페인 런칭', 'CTR 15~25% / CVR 12~25%', '주 490만 원']
  },
  {
    no: 8,
    title: '7. 광고상품 ②: 메인 팝업 배너 (Main Popup)',
    product: ['홈 화면 진입 시 중앙 오버레이', '앱 진입 직후 팝업 레이어 최우선 노출', '뷰티, 외식, 쿠폰/할인 프로모션', 'CTR 10~15% / CVR 12~15%', '월 200만 원']
  },
  {
    no: 9,
    title: '8. 광고상품 ③: 메인 배너 광고 (Main Banner)',
    product: ['홈 화면 최상단 메인 롤링', '시즌 기획전 배너 슬라이드 노출', '패밀리 카테고리, 시즌 메이저 캠페인', 'CTR 3.5~5% / CVR 10~12%', '월 350만 원']
  },
  {
    no: 10,
    title: '9. 광고상품 ④: 카테고리 GNB 광고 (Category GNB)',
    product: ['홈 화면 GNB 퀵 카테고리 영역', '관심사 진입점 아이콘 및 기획 링크 배치', '체험학습, 아동 도서, 유아 교육', 'CTR 2.8~4% / CVR 9~10%', '월 175만 원']
  },
  {
    no: 11,
    title: '10. 광고상품 ⑤: 메인 서브 배너 (Sub Banner)',
    product: ['홈 중·하단 스크롤 피드 영역', '콘텐츠 소비 흐름 안의 네이티브 띠배너', '패션·쇼핑, 금융, 라이프스타일', 'CTR 1.8~3% / CVR 4~5%', '월 105만 원']
  },
  {
    no: 12,
    title: '11. 광고상품 ⑥: 카테고리 상세 배너 (Detail Banner)',
    product: ['개별 상품 상세 정보 페이지 하단', '구매 직전 정보 탐색 구간 고정 배너', '리조트·호텔, 아웃도어·캠핑, 유통', 'CTR 1.2~2.5% / CVR 2.5~3.5%', '월 70만 원']
  },
  {
    no: 13,
    title: '놀이의발견과 함께하실 파트너를 기다립니다.',
    type: 'contact'
  }
];

function addRightDecoration(pres, slide) {
  slide.addShape(pres.ShapeType.roundRect, {
    x: 8.55, y: 1.55, w: 3.9, h: 4.25,
    rectRadius: 0.18,
    fill: { color: PPT_THEME.panel2, transparency: 12 },
    line: { color: PPT_THEME.panel2, transparency: 100 }
  });
  slide.addShape(pres.ShapeType.roundRect, {
    x: 10.82, y: 3.65, w: 0.72, h: 0.72,
    rectRadius: 0.16,
    fill: { color: '6760FF', transparency: 16 },
    line: { color: '6760FF', transparency: 100 }
  });
  slide.addShape(pres.ShapeType.roundRect, {
    x: 10.62, y: 4.2, w: 0.52, h: 0.52,
    rectRadius: 0.12,
    fill: { color: 'FFFFFF', transparency: 70 },
    line: { color: 'FFFFFF', transparency: 100 }
  });
}

function addSlideChrome(pres, slide, title) {
  slide.background = { color: PPT_THEME.bg };
  slide.addText(title, {
    x: 0.82, y: 0.55, w: 8.8, h: 0.42,
    fontFace: 'Noto Sans KR', fontSize: 22, bold: true, color: PPT_THEME.red,
    margin: 0
  });
  slide.addShape(pres.ShapeType.rect, {
    x: 0.75, y: 1.26, w: 10.9, h: 0.018,
    fill: { color: PPT_THEME.line },
    line: { color: PPT_THEME.line }
  });
  addRightDecoration(pres, slide);
}

function addBulletList(slide, bullets, x = 0.9, y = 4.75, w = 8.8, h = 1.0) {
  slide.addText(bullets.map((b) => `• ${b}`).join('\n'), {
    x, y, w, h,
    fontFace: 'Noto Sans KR',
    fontSize: 12,
    color: PPT_THEME.gray,
    breakLine: false,
    fit: 'shrink',
    margin: 0.03,
    lineSpacingMultiple: 1.12
  });
}

function addSimpleTable(slide, rows, x, y, w, colW, fontSize = 10.5) {
  const tableRows = rows.map((row, rIdx) => row.map((cell, cIdx) => ({
    text: cell,
    options: {
      fill: rIdx === 0 ? PPT_THEME.panel2 : PPT_THEME.bg,
      color: rIdx === 0 ? PPT_THEME.white : (cIdx === 0 ? PPT_THEME.red : PPT_THEME.white),
      bold: rIdx === 0 || cIdx === 0,
      align: 'center',
      valign: 'mid',
      fontFace: 'Noto Sans KR',
      margin: 0.04
    }
  })));
  slide.addTable(tableRows, {
    x, y, w,
    colW,
    rowH: rows.map((_, idx) => idx === 0 ? 0.34 : 0.42),
    fontSize,
    color: PPT_THEME.white,
    border: { pt: 0.7, color: PPT_THEME.line },
    margin: 0.04
  });
}

function addMetricTable(slide, data) {
  const rows = data.map((row, rIdx) => row.map((cell, cIdx) => ({
    text: cell,
    options: {
      fill: rIdx === 0 ? '1B2238' : '0D1221',
      color: rIdx === 1 && cIdx === 0 ? PPT_THEME.red : PPT_THEME.white,
      bold: true,
      align: 'center',
      valign: 'mid',
      fontFace: 'Noto Sans KR',
      margin: 0.04
    }
  })));
  slide.addTable(rows, {
    x: 1.1, y: 2.55, w: 10.15,
    colW: [2.45, 2.65, 2.55, 2.5],
    rowH: [0.36, 0.42],
    fontSize: 14,
    border: { pt: 0.75, color: PPT_THEME.line },
    margin: 0.03
  });
}

function addChips(pres, slide, chips) {
  chips.forEach((chip, idx) => {
    const x = 1.0 + (idx % 4) * 2.2;
    const y = 2.3 + Math.floor(idx / 4) * 0.78;
    slide.addShape(pres.ShapeType.roundRect, {
      x, y, w: 1.78, h: 0.5,
      rectRadius: 0.12,
      fill: { color: PPT_THEME.panel },
      line: { color: PPT_THEME.line, pt: 0.8 }
    });
    slide.addText(chip, {
      x: x + 0.08, y: y + 0.13, w: 1.62, h: 0.22,
      fontFace: 'Noto Sans KR', fontSize: 10.5, bold: true,
      color: PPT_THEME.white, align: 'center', margin: 0
    });
  });
}

function addProductSpec(pres, slide, product) {
  const labels = ['노출 위치', '노출 방식', '추천 업종', '예상 효율', '집행 금액'];
  const rows = labels.map((label, idx) => [label, product[idx]]);
  addSimpleTable(slide, [['항목', '상세 내용'], ...rows], 1.0, 2.0, 7.35, [1.6, 5.75], 11);
  slide.addShape(pres.ShapeType.roundRect, {
    x: 8.85, y: 2.05, w: 2.25, h: 2.7,
    rectRadius: 0.14,
    fill: { color: PPT_THEME.panel },
    line: { color: PPT_THEME.line, pt: 0.8 }
  });
  slide.addText('광고 효과', {
    x: 9.15, y: 2.35, w: 1.65, h: 0.25,
    fontFace: 'Noto Sans KR', fontSize: 13, bold: true, color: PPT_THEME.red, align: 'center',
    margin: 0
  });
  slide.addText('관심 타겟 접점에서 노출을 확보하고 클릭 이후 예약·구매 동선까지 연결합니다.', {
    x: 9.15, y: 2.92, w: 1.65, h: 1.3,
    fontFace: 'Noto Sans KR', fontSize: 10.5, color: PPT_THEME.gray, align: 'center',
    fit: 'shrink',
    margin: 0.02
  });
}

function addCoverSlide(pres, slide, clientName, subtitle) {
  slide.background = { color: PPT_THEME.red };
  slide.addShape(pres.ShapeType.rect, {
    x: 6.45, y: 0, w: 6.9, h: 7.5,
    fill: { color: PPT_THEME.bg, transparency: 6 },
    line: { color: PPT_THEME.bg, transparency: 100 }
  });
  slide.addShape(pres.ShapeType.rect, {
    x: 0.7, y: 1.35, w: 0.04, h: 3.45,
    fill: { color: PPT_THEME.white },
    line: { color: PPT_THEME.white }
  });
  slide.addText('놀이의발견 광고 마케팅 제안서', {
    x: 1.0, y: 1.76, w: 6.3, h: 0.6,
    fontFace: 'Noto Sans KR', fontSize: 23, bold: true, color: PPT_THEME.white,
    margin: 0
  });
  slide.addText(subtitle, {
    x: 1.0, y: 2.48, w: 6.2, h: 0.35,
    fontFace: 'Noto Sans KR', fontSize: 11.5, color: PPT_THEME.white,
    margin: 0
  });
  slide.addText(`제안 대상: ${clientName || '귀사'}`, {
    x: 1.0, y: 3.08, w: 4.8, h: 0.4,
    fontFace: 'Noto Sans KR', fontSize: 13, bold: true, color: PPT_THEME.white,
    margin: 0
  });
  slide.addText('웅진컴퍼스 | 플랫폼사업기획팀', {
    x: 1.0, y: 4.58, w: 4.2, h: 0.28,
    fontFace: 'Noto Sans KR', fontSize: 9.5, color: 'FFE4E1',
    margin: 0
  });
}

function addContactSlide(pres, slide) {
  slide.background = { color: PPT_THEME.red };
  slide.addShape(pres.ShapeType.roundRect, {
    x: 6.8, y: 1.45, w: 4.55, h: 3.65,
    rectRadius: 0.16,
    fill: { color: PPT_THEME.white, transparency: 6 },
    line: { color: PPT_THEME.white, transparency: 100 }
  });
  slide.addText('놀이의발견과 함께하실 파트너를 기다립니다.', {
    x: 0.85, y: 1.35, w: 6.0, h: 0.72,
    fontFace: 'Noto Sans KR', fontSize: 24, bold: true, color: PPT_THEME.white,
    margin: 0
  });
  slide.addText('3040 자녀 동반 가족 유저를 가장 잘 아는 플랫폼에서 광고 성과를 설계하세요.', {
    x: 0.9, y: 2.25, w: 5.4, h: 0.55,
    fontFace: 'Noto Sans KR', fontSize: 12, color: 'FFE4E1',
    fit: 'shrink',
    margin: 0
  });
  slide.addText('제휴 및 광고 집행 문의', {
    x: 7.25, y: 1.95, w: 3.45, h: 0.35,
    fontFace: 'Noto Sans KR', fontSize: 15, bold: true, color: PPT_THEME.red,
    margin: 0
  });
  slide.addText('담당자: 플랫폼통합기획팀 최진호 과장\n이메일: luckychoe22@wjcompass.com\n연락처: 010-7166-3147\n주소: 서울특별시 서초구 강남대로39길 15-10', {
    x: 7.25, y: 2.62, w: 3.45, h: 1.6,
    fontFace: 'Noto Sans KR', fontSize: 10.5, color: '111827',
    fit: 'shrink',
    breakLine: false,
    margin: 0
  });
}

// 10. PPTX 제안서 생성 및 다운로드 API
app.post('/api/ai/proposal/download', async (req, res) => {
  const { clientName } = req.body;
  const pres = new pptxgen();

  pres.layout = 'LAYOUT_16x9';
  pres.author = 'Woongjin Compass Platform Business Planning Team';
  pres.subject = 'Nolbal advertising proposal deck';
  pres.title = '놀이의발견 광고 마케팅 제안서';

  deckSlides.forEach((cfg) => {
    const slide = pres.addSlide();

    if (cfg.type === 'cover') {
      addCoverSlide(pres, slide, clientName, cfg.subtitle);
    } else if (cfg.type === 'contact') {
      addContactSlide(pres, slide);
    } else {
      addSlideChrome(pres, slide, cfg.title);

      if (cfg.metricTable) {
        addMetricTable(slide, cfg.metricTable);
      }

      if (cfg.table) {
        const colW = cfg.table[0].length === 3 ? [1.8, 3.1, 3.1] : [1.4, 5.9];
        addSimpleTable(slide, cfg.table, 1.0, 2.05, cfg.table[0].length === 3 ? 8.0 : 7.3, colW, 10);
      }

      if (cfg.product) {
        addProductSpec(pres, slide, cfg.product);
      }

      if (cfg.chips) {
        addChips(pres, slide, cfg.chips);
      }

      if (cfg.bullets) {
        const y = cfg.metricTable ? 4.9 : (cfg.table ? 4.85 : 4.2);
        addBulletList(slide, cfg.bullets, 0.95, y, 8.2, 1.1);
      }
    }

    slide.addText(`${cfg.no}/13`, {
      x: 11.55, y: 6.78, w: 0.7, h: 0.22,
      fontFace: 'Noto Sans KR', fontSize: 8,
      color: cfg.type === 'cover' || cfg.type === 'contact' ? 'FFE4E1' : PPT_THEME.muted,
      align: 'right',
      margin: 0
    });
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
