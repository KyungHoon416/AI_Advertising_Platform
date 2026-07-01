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
    template: '당신은 국내 최고 수준의 플랫폼 사업기획자이자 마케팅 제안서 디자이너입니다.\n\n첨부한 PDF의\n- 페이지 구성, 스토리 흐름, 디자인 컨셉, 정보 전달 방식, 문구 스타일, 광고상품 설명 방식, 가격표 구성, CTA 방식\n을 벤치마킹하여 새로운 서비스의 광고 제안서를 작성합니다.\n\n단, 절대로 문구를 그대로 복사하지 않고 구성과 흐름만 참고하여 완전히 새로운 내용으로 작성합니다.\n\n========================\n[입력]\n서비스명 : 놀이의발견\n회사소개 : 웅진컴퍼스 자회사, 179만 부모 회원 보유 가족 여가 라이프스타일 플랫폼\n서비스 소개 : 키즈 놀이, 숙박, 체험 콘텐츠 통합 큐레이션 예약 서비스\n타겟 : 3040 육아 패밀리 및 자녀 동반 가족 고객\n광고상품 : 스플래쉬, 메인배너, 카테고리 GNB, 메인 서브 배너, 카테고리 상세 배너, 메인 팝업 배너\n광고 위치 : 앱 인트로 화면, 홈 상단 메인, 카테고리 GNB 아이콘, 홈 중/하단 배너, 상세 페이지 내, 앱 진입 시 팝업\n광고 가격 : 스플래쉬(주 490만원), 메인배너(월 350만원), 카테고리 GNB(월 175만원), 메인 서브 배너(월 105만원), 카테고리 상세 배너(월 70만원), 메인 팝업(월 200만원)\n광고 노출방식 : 앱 진입 전체화면, 홈화면 롤링, 카테고리 퀵 아이콘 배치, 중단 고정 배너, 상세 정보 상단 노출, 팝업 윈도우\n광고 효과 : 3040 구매력 중심 고효율 ROAS 달성 및 타겟 도달율 98%\n예상 CTR : 2.5% ~ 25% (지면별 상이)\n예상 CVR : 2.5% ~ 25% (지면별 상이)\n광고 집행 프로세스 : 제휴 신청 -> 타겟 세그 매칭 -> 기획전/푸시 빌드 -> 캠페인 온에어 -> 성과 분석 피드백\n담당자 : 플랫폼통합기획팀 최진호 과장\n문의 : luckychoe22@wjcompass.com / 010-7166-3147\n========================\n\n출력 형식은 실제 PDF 제안서 수준으로 작성합니다.\n슬라이드별로 작성합니다.\n\nPage 1 ~ Page 13 구성을 준수하며, 각 페이지는 ① 제목, ② 핵심 문구, ③ 본문, ④ 디자인 구성, ⑤ 아이콘 추천, ⑥ 사용할 이미지 예시, ⑦ 강조 색상, ⑧ 레이아웃 형식으로 디테일하게 제안 대상을 위해 작성해 주세요.'
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
    console.warn("AI API limit/error. Fallback to mock:", error.message);
    res.json({ success: true, report: mockResponse, isFallback: true });
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
    console.warn("AI API limit/error. Fallback to mock:", error.message);
    res.json({ success: true, report: mockResponse, isFallback: true });
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
    console.warn("AI API limit/error. Fallback to mock:", error.message);
    res.json({ success: true, report: mockResponse, isFallback: true });
  }
});

// 6. 맞춤형 광고 제안서 생성 API
app.post('/api/ai/proposal', async (req, res) => {
  const { clientName } = req.body;
  const prompt = PROMPT_LIBRARY.proposal.template.replace('{clientName}', clientName);

  const mockResponse = `### 🤖 [놀이의발견] AI 기반 맞춤형 광고 기획 제안서 (13 Pages Full Draft)
**제안 대상:** \${clientName} 귀사
**제안사:** 웅진컴퍼스 | 놀이의발견
**작성일:** \${new Date().toISOString().split('T')[0]}

---

### 📄 Page 1: 표지 (Cover)
* **① 제목**: 놀이의발견 광고 마케팅 제안서 - \${clientName} 비즈니스 동반 성장안
* **② 핵심 문구**: 놀이의발견과 함께 비즈니스의 가치를 높여보세요
* **③ 본문**: 국내 최대 179만 육아 가정이 밀집된 '놀이의발견' 플랫폼 인프라를 활용하여 \${clientName}의 진성 타겟 도달율을 98%까지 견인하는 맞춤 마케팅 로드맵을 제안합니다.
* **④ 디자인 구성**: 웅진 브랜드 헤리티지를 상징하는 강렬한 오렌지-레드(#FF3B30) 그라디언트를 바탕으로, 중앙에 정교한 화이트 볼드 서체를 배치한 미니멀 레이아웃.
* **⑤ 아이콘 추천**: 스마트폰 연결선, 비즈니스 성장 그래프, 웅진 로고(선택)
* **⑥ 사용할 이미지 예시**: 놀이의발견 메인 홈화면이 띄워진 아이폰 15 Pro 목업 디바이스 이미지
* **⑦ 강조 색상**: Pure White (#FFFFFF), Neon Cyan (#00F2FE)
* **⑧ 레이아웃**: 좌측 비주얼 데코레이션 수직선 배치, 우측 정렬 텍스트 블록 구조

---

### 📄 Page 2: 회사 소개 (Company History)
* **① 제목**: 웅진컴퍼스 자회사, 놀이의발견 히스토리
* **② 핵심 문구**: 웅진의 교육 철학 위에 탄생한 1위 키즈 여가 인프라
* **③ 본문**: 
  - **2018.04**: 웅진씽크빅 키즈플랫폼 사업부 신설 및 구글플레이 '올해의 앱' 선정
  - **2020.05**: 웅진씽크빅 100% 자회사 분사 및 시리즈B 200억 규모 투자 유치
  - **2021.02**: 가입 유저 100만 명 달성 및 숙박 예약 서비스 공식 론칭
  - **2024.12**: 웅진컴퍼스 X 놀이의발견 합병을 통한 라이프스타일 거대 연합 플랫폼 도약
* **④ 디자인 구성**: 좌측 세로 타임라인 레이아웃 구성, 우측에 웅진 자회사 관계도 원형 차트 배치.
* **⑤ 아이콘 추천**: 달력, 트로피, 악수, 연합 빌딩
* **⑥ 사용할 이미지 예시**: 웅진 씽크빅 및 컴퍼스 사옥 전경 또는 스마트 오피스 회의 전경 이미지
* **⑦ 강조 색상**: Warm Orange (#FF9500), Crimson Red (#E50914)
* **⑧ 레이아웃**: 타임라인 분할형 레이아웃

---

### 📄 Page 3: 서비스 소개 (Service Introduce)
* **① 제목**: 대한민국 1위 가족 여가 라이프스타일 플랫폼
* **② 핵심 문구**: 키즈 놀이, 숙박, 체험학습을 한곳에 담은 큐레이션 통합 예약 채널
* **③ 본문**: 놀이의발견은 전국 3만 개의 숙박시설, 체험학습, 키즈테마파크, 아동용 브랜드를 맞춤형 알고리즘 기반으로 큐레이션해주는 대한민국 NO.1 가족 여가 플랫폼입니다. 육아 고관여 부모 유저들이 주말 가족 여가 계획을 위해 매월 정기적으로 방문하여 구매 전환을 일으킵니다.
* **④ 디자인 구성**: 중앙에 아치형 카테고리 기획전 스키마를 배치하고, 주변에 카테고리별(놀이시설, 숙박시설, 체험학습) 일러스트를 결합한 입체적 3분할 뷰.
* **⑤ 아이콘 추천**: 키즈 텐트, 호텔 베드, 연필과 자
* **⑥ 사용할 이미지 예시**: 야외 잔디밭에서 텐트를 치고 여가를 즐기며 해맑게 웃는 아이와 부모의 감성 스냅 사진
* **⑦ 강조 색상**: Deep Navy (#0B0D19), Lemon Yellow (#FFCC00)
* **⑧ 레이아웃**: 3열 카드 그리드 배치 레이아웃

---

### 📄 Page 4: 서비스 규모 인포그래픽 (Platform Scale)
* **① 제목**: 검증된 트래픽과 압도적인 누적 실적 지표
* **② 핵심 문구**: 179만 회원과 함께하는 단단한 비즈니스 파워
* **③ 본문**:
  - **회원수**: \`179만 명\` (대한민국 3040 부모 유저 절대다수 보유)
  - **월간 순 이용자 (MAU)**: \`47만 명\` (안정적인 상시 유입량 확보)
  - **누적 다운로드수**: \`241만 건\` 
  - **등록 제휴점**: \`약 3만 개\` (전국구 레저, 리조트, 식음료 인프라 완비)
* **④ 디자인 구성**: 4개의 대형 숫자 네온 폰트를 스태거(Stagger) 방식으로 나열하고 하단에 신뢰성을 보증하는 그래프 배치.
* **⑤ 아이콘 추천**: 그룹 피플, 모바일 다운로드, 입점 제휴 뱃지
* **⑥ 사용할 이미지 예시**: 대규모 가족단위 행사 또는 놀이동산에 가득 찬 인파 배경 블러 처리 이미지
* **⑦ 강조 색상**: Neon Mint Green (#39FF14), Light Gray (#F8FAFC)
* **⑧ 레이아웃**: 메인 인포그래픽 4분할 플렉스 그리드

---

### 📄 Page 5: 고객 생생 후기 (User Reviews)
* **① 제목**: 후기가 증명하는 놀이의발견 실효성
* **② 핵심 문구**: 아이 셋 키우는 집부터 워킹맘까지 극찬하는 육아 필수 앱
* **③ 본문**: 
  - *"애들과 주말에 뭐할까 고민될 때 놀발 하나면 숙소 예약부터 체험학습 신청까지 한 번에 해결되어 편리해요." (Ymhymk 회원)*
  - *"주변 키즈카페 딜이나 숙박 특가 알림 푸시가 정교해서 실제로 결제를 제일 많이 유도하는 앱입니다." (세린채린맘 회원)*
* **④ 디자인 구성**: 실제 모바일 후기 말풍선을 입체감 있는 카드 슬라이더 형태로 배치하고 우측에 캐릭터 일러스트 가미.
* **⑤ 아이콘 추천**: 평점 별 별점 5개(⭐⭐⭐⭐⭐), 말풍선 챗
* **⑥ 사용할 이미지 예시**: 아이들이 신나게 트램폴린에서 뛰노는 모습 또는 모바일 화면을 보며 결제하는 엄마의 모습
* **⑦ 강조 색상**: Amber Gold (#FFB900), Sky Blue (#00A2FF)
* **⑧ 레이아웃**: 비대칭 말풍선 카드 배치 레이아웃

---

### 📄 Page 6: 광고 기대 효과 (Expected Campaign ROI)
* **① 제목**: 놀이의발견 광고 집행을 통해 얻는 가치
* **② 핵심 문구**: 단순 노출을 넘어선 진성 액션 전환율 보장
* **③ 본문**: 
  - **브랜드 인지도 상승**: 3040 타겟 인지도 대비 180% 상승 효과
  - **클릭률 (CTR) 극대화**: 평균 대비 1.5배 높은 고효율 클릭 보장
  - **구매 전환율 (CVR)**: 맞춤 타겟 뱃지 매핑 시 전환 도달율 12% 돌파
* **④ 디자인 구성**: 비즈니스 성장 깔때기(Funnel) 모양의 다이어그램 시각화.
* **⑤ 아이콘 추천**: 확성기, 과녁 과녁판, 화살표 우상향
* **⑥ 사용할 이미지 예시**: 차트 태블릿을 들고 회의하며 광고 RoAS에 대해 만족해하는 마케팅 실무진 이미지
* **⑦ 강조 색상**: Indigo Blue (#1E3A8A), Light Emerald (#34D399)
* **⑧ 레이아웃**: 수평 깔때기 퍼널형 디자인 레이아웃

---

### 📄 Page 7: 광고상품 ① - 스플래쉬 광고 (Splash AD)
* **① 제목**: 앱 구동 첫 순간 브랜드를 독점 노출하는 스플래쉬
* **② 핵심 문구**: 앱 실행 순간 전면 강제 노출로 강력한 각인 효과 선사
* **③ 본문**: 앱이 기동되는 약 3초간 전체화면으로 단독 브랜드 이미지를 표출하는 프리미엄 스페셜 상품입니다. 시즌성 캠페인 및 대규모 런칭 기획에 최고의 주목도를 선사합니다.
* **④ 디자인 구성**: 스마트폰 전체 화면에 광고가 가득 찬 비주얼 예시 목업을 우측에 크게 배치하고, 좌측에는 가격 및 사양 요약.
* **⑤ 아이콘 추천**: 스마트폰 전면, 번개, 전구
* **⑥ 사용할 이미지 예시**: 프리미엄 스포츠 브랜드의 로고와 슬로건이 노출된 스플래쉬 모형
* **⑦ 강조 색상**: Crimson Red (#FF3B30)
* **⑧ 레이아웃**: 1:1 수평 분할형 레이아웃

---

### 📄 Page 8: 광고상품 ② - 메인 팝업 배너 (Main Popup)
* **① 제목**: 진입과 동시에 맞춤 혜택을 전달하는 메인 팝업
* **② 핵심 문구**: 타겟별 맞춤 쿠폰 팝업을 통한 즉시 구매 유도
* **③ 본문**: 앱 홈화면 접속 시 스크린 전면에 특가 쿠폰이나 프로모션을 즉각 노출합니다. 할인 프로모션 기획 및 회원가입 리드 획득에 탁월합니다.
* **④ 디자인 구성**: 다크 모드 앱화면 위로 투명도가 적용된 둥근 팝업이 오버레이되는 모습 시각화.
* **⑤ 아이콘 추천**: 선물 상자, 쿠폰 태그, 체크
* **⑥ 사용할 이미지 예시**: 패밀리 레스토랑 할인권 쿠폰 팝업 디자인 목업
* **⑦ 강조 색상**: Deep Purple (#8B5CF6)
* **⑧ 레이아웃**: 센터 오버레이 팝업 목업 레이아웃

---

### 📄 Page 9: 광고상품 ③ - 메인 배너 광고 (Main Rolling Banner)
* **① 제목**: 메인 홈 상단 노출로 모든 트래픽을 선점하는 메인배너
* **② 핵심 문구**: 주목도 최고인 최상단 메인 롤링 배너 구좌 선점
* **③ 본문**: 놀이의발견 앱 메인 화면 최상단 롤링 배너 구좌로, 트래픽 유입의 90% 이상이 즉시 목격하는 메이저 지면입니다.
* **④ 디자인 구성**: 롤링 배너 슬라이드 인디케이터(점선)가 하단에 위치한 와이드 직사각형 프레임을 상단 중앙에 배치.
* **⑤ 아이콘 추천**: 이미지 갤러리, 슬라이드, 왕관
* **⑥ 사용할 이미지 예시**: 대형 아쿠아리움 및 워터파크 패밀리 패키지 기획전 홈 배너 예시
* **⑦ 강조 색상**: Neon Blue (#00F2FE)
* **⑧ 레이아웃**: 상단 와이드 그리드 레이아웃

---

### 📄 Page 10: 광고상품 ④ - 카테고리 GNB 광고 (Category GNB)
* **① 제목**: 유저 탐색 목적에 맞는 카테고리 아이콘 광고
* **② 핵심 문구**: 특정 업종 탐색 유저만을 정밀 필터링 매칭
* **③ 본문**: 앱 메인 홈화면에 고정된 카테고리 GNB 퀵메뉴 아이콘으로 브랜드를 노출하여 관심 카테고리 유입을 자연스럽게 필터링 및 극대화시킵니다.
* **④ 디자인 구성**: 둥근 그리드 퀵 아이콘 목록 구조 속에 파트너 브랜드 로고 아이콘이 네온 효과와 함께 강조되어 있는 레이아웃.
* **⑤ 아이콘 추천**: 카테고리 격자, 돋보기, 과녁
* **⑥ 사용할 이미지 예시**: 카테고리 전용 GNB 영역 내 특정 아동 브랜드 아이콘 로고 삽입 예시
* **⑦ 강조 색상**: Light Mint (#10B981)
* **⑧ 레이아웃**: 5열 그리드 아이콘 횡배치

---

### 📄 Page 11: 광고상품 ⑤ - 메인 서브 배너 (Sub Banner)
* **① 제목**: 탐색 흐름 속에 자연스럽게 노출되는 서브 배너
* **② 핵심 문구**: 합리적인 예산으로 지속적인 브랜드 소구 보장
* **③ 본문**: 메인 화면 중간 및 하단 탐색 스크롤 영역 사이에 녹아드는 가로형 띠 배너 구좌입니다. 거부감 없이 유연하게 클릭을 연결합니다.
* **④ 디자인 구성**: 콘텐츠 피드 리스트 사이에 띠 형태로 정돈된 슬림 직사각형 프레임 배치.
* **⑤ 아이콘 추천**: 띠배너, 문서 흐름, 정밀 타겟
* **⑥ 사용할 이미지 예시**: 친환경 어린이 아동 패션 브랜드의 가을 시즌 컬렉션 하단 띠배너 이미지
* **⑦ 강조 색상**: Neutral Charcoal (#4B5563)
* **⑧ 레이아웃**: 피드 수직 리스트 중간 수평 삽입 레이아웃

---

### 📄 Page 12: 광고상품 ⑥ - 카테고리 상세 배너 (Category Detail Page Banner)
* **① 제목**: 최종 결제 직전 단계에 매칭하는 상세 페이지 배너
* **② 핵심 문구**: 구매 의사가 가장 확실한 순간에 소구하는 고관여 지면
* **③ 본문**: 특정 여가 상품이나 리조트 상세 페이지 하단/본문 중간에 보조 수단으로 노출되는 배너입니다. 실구매 결정 직전의 진성 유저를 전환시킵니다.
* **④ 디자인 구성**: 상품 설명 본문 스크롤 영역의 정밀한 그리드와 배너 영역의 분리 렌더링.
* **⑤ 아이콘 추천**: 카트 장바구니, 체크카드, 지폐
* **⑥ 사용할 이미지 예시**: 키즈 펜션 예약 상세조회 화면 하단에 렌더링된 패밀리 리조트 예약 할인 배너 모형
* **⑦ 강조 색상**: Pinkish Gold (#F43F5E)
* **⑧ 레이아웃**: 상세페이지 본문 내장형 그리드

---

### 📄 광고상품 단가 및 정책 종합 요약표 (Pricing Table)

| 광고 상품 (구좌) | 광고 위치 | 노출 방식 | 운영 방식 | 추천 업종 | 예상 CTR | 예상 CVR | 예상 전환율 | 광고 가격 (할인가) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **스플래쉬 광고** | 앱 인프라 진입 화면 | 인트로 풀스크린 | 주단위 독점 | 숙박·레저, 대형 브랜드 | 15%~25% | 12%~25% | 12%~25% | **주 490만원** (정가 700만) |
| **메인 팝업 배너** | 앱 메인 홈 화면 | 전면 팝업 오버레이 | 월단위 고정 | 뷰티·외식, 쿠폰 딜 | 10%~15% | 12%~15% | 12%~15% | **월 200만원** (정가 350만) |
| **메인 배너 광고** | 홈 상단 롤링 지면 | 롤링 배너 슬라이드 | 월단위 고정 | 패밀리 브랜드 전체 | 3.5%~5% | 10%~12% | 10%~12% | **월 350만원** (정가 500만) |
| **카테고리 GNB** | 홈 GNB 퀵 아이콘 | 메인 퀵 링크 배치 | 월단위 고정 | 체험학습, 아동교육 | 2.8%~4% | 9%~10% | 9%~10% | **월 175만원** (정가 250만) |
| **메인 서브 배너** | 홈 중/하단 영역 | 수평 띠배너 고정 | 월단위 고정 | 패션·쇼핑, 금융 | 1.8%~3% | 4%~5% | 4%~5% | **월 105만원** (정가 150만) |
| **카테고리 상세** | 카테고리 상세 본문 | 상세 하단 배너 고정 | 월단위 고정 | 숙박·교통, 아웃도어 | 1.2%~2.5% | 2.5%~3.5% | 2.5%~3.5% | **월 70만원** (정가 100만) |

---

### 📄 Page 13: 제휴 문의 및 파트너십 안내 (Ending / CTA)
* **① 제목**: 놀이의발견과 함께하실 파트너를 기다립니다.
* **② 핵심 문구**: 3040 자녀 동반 가족 유저를 가장 잘 아는 파트너십을 맺어보세요
* **③ 본문**: 
  - **제휴/광고 집행 문의**: 플랫폼통합기획팀 최진호 과장
  - **이메일 주소**: luckychoe22@wjcompass.com
  - **다이렉트 연락처**: 010-7166-3147
  - **본사 주소**: 서울특별시 서초구 강남대로39길 15-10 웅진컴퍼스 빌딩 3층
* **④ 디자인 구성**: 배경은 표지와 대칭되는 동일한 오렌지-레드(#FF3B30) 배경을 적용하고, 중앙 우측 영역에 화이트 사양으로 문의 박스를 설계.
* **⑤ 아이콘 추천**: 메일 전송, 연락 전화, 본사 오피스 건물
* **⑥ 사용할 이미지 예시**: 웅진컴퍼스 X 놀이의발견 통합 파트너십 엠블럼 로고 이미지
* **⑦ 강조 색상**: Crimson Red (#FF3B30), Pure White (#FFFFFF)
* **⑧ 레이아웃**: 좌우 분할 구조 (좌측 CTA 메세지, 우측 정형화 문의 박스)`;

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
