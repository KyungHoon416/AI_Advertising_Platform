"""Static seed data definitions (single source of truth for Seed step)."""
from __future__ import annotations

from app.domain.enums import AdProductCode, RoleCode

# --- RBAC ---------------------------------------------------------------
# (resource, action)
PERMISSIONS: list[tuple[str, str]] = [
    ("user", "manage"),
    ("role", "manage"),
    ("system_log", "read"),
    ("ai_model", "manage"),
    ("prompt", "manage"),
    ("prompt", "read"),
    ("scoring_config", "manage"),
    ("scoring_config", "read"),
    ("advertiser", "manage"),
    ("advertiser", "read"),
    ("ad_product", "manage"),
    ("ad_product", "read"),
    ("analysis", "run"),
    ("proposal", "manage"),
    ("campaign", "manage"),
    ("campaign", "read"),
    ("performance", "manage"),
    ("dashboard", "read"),
]

ROLE_PERMISSIONS: dict[str, list[tuple[str, str]] | str] = {
    RoleCode.SUPER_ADMIN.value: "*",  # all permissions
    RoleCode.ADMIN.value: [
        ("advertiser", "manage"), ("advertiser", "read"),
        ("ad_product", "manage"), ("ad_product", "read"),
        ("analysis", "run"), ("proposal", "manage"),
        ("campaign", "manage"), ("campaign", "read"),
        ("performance", "manage"), ("scoring_config", "read"),
        ("prompt", "read"), ("dashboard", "read"),
    ],
    RoleCode.OPERATOR.value: [
        ("advertiser", "read"), ("ad_product", "read"),
        ("analysis", "run"), ("proposal", "manage"),
        ("campaign", "read"), ("performance", "manage"),
        ("prompt", "read"), ("dashboard", "read"),
    ],
}

ROLES = [
    (RoleCode.SUPER_ADMIN.value, "Super Admin", "전체 설정·사용자·AI·가중치·로그 관리"),
    (RoleCode.ADMIN.value, "Admin", "광고주·상품·분석·제안서·성과 관리"),
    (RoleCode.OPERATOR.value, "Operator", "조회·분석 실행·제안서·성과 입력"),
]

# --- Category tree ------------------------------------------------------
# name -> list of (middle, [minors])
CATEGORY_TREE: dict[str, list[tuple[str, list[str]]]] = {
    "숙박": [("호텔", []), ("리조트", []), ("펜션", [])],
    "여행": [("여행", []), ("레저", ["워터파크", "테마파크", "키즈카페", "놀이시설"])],
    "교육": [("학원", []), ("교재", []), ("에듀테크", [])],
    "유아용품": [("키즈용품", [])],
    "식품": [("건강식품", []), ("간편식", [])],
    "패션": [("아동패션", [])],
    "생활용품": [("생활용품", [])],
    "가전": [("전자제품", [])],
    "자동차": [("자동차", [])],
    "금융": [("보험", [])],
    "병원": [("병원", [])],
    "뷰티": [("뷰티", [])],
    "공공기관": [("지역축제", []), ("지역관광", [])],
    "프랜차이즈": [("프랜차이즈", [])],
    "쇼핑몰": [("쇼핑몰", [])],
}

# --- Ad products --------------------------------------------------------
AD_PRODUCTS = [
    {
        "code": AdProductCode.MAIN_BANNER,
        "name": "메인배너",
        "definition": "메인 화면 핵심 영역 대표 광고상품(최고 가시성·대규모 노출).",
        "features": ["최고 가시성", "대규모 노출", "브랜드 인지도 확대", "단기 트래픽 집중"],
        "fit_purposes": ["브랜드 인지도", "대규모 프로모션", "신상품 출시", "시즌 캠페인"],
        "base_price_band": "high",
    },
    {
        "code": AdProductCode.SUB_BANNER,
        "name": "서브배너",
        "definition": "메인 하위/보조 영역 노출(합리적 가격·지속 노출).",
        "features": ["합리적 가격", "지속 노출", "특정 상품/프로모션", "중소 규모 운영"],
        "fit_purposes": ["상품 홍보", "프로모션 안내", "브랜드 인지도 유지", "상세페이지 유입"],
        "base_price_band": "mid",
    },
    {
        "code": AdProductCode.CATEGORY_AD,
        "name": "카테고리 광고",
        "definition": "특정 카테고리 페이지 노출 타겟형 상품(높은 관련성·전환).",
        "features": ["관심 고객 타겟팅", "높은 관련성", "높은 전환 가능성", "비용 효율"],
        "fit_purposes": ["구매 전환", "예약 전환", "관심 고객 타겟팅", "지역/상품 홍보"],
        "base_price_band": "mid",
    },
    {
        "code": AdProductCode.SPLASH,
        "name": "스플래쉬 광고",
        "definition": "앱 실행/주요 진입 시 전체 화면 임팩트형 상품(강한 주목도).",
        "features": ["전체 화면 노출", "강한 임팩트", "높은 주목도", "단기 캠페인 적합"],
        "fit_purposes": ["대형 이벤트", "한정 프로모션", "신규 론칭", "지역축제 홍보"],
        "base_price_band": "high",
    },
]

# ad product boost rules: (product_code, name, condition, boost_factor_code, points)
AD_PRODUCT_RULES = [
    (AdProductCode.MAIN_BANNER, "인지도·전국·대형", {"goal": "awareness", "reach": "national", "size": "large"}, "GOAL", 5),
    (AdProductCode.SUB_BANNER, "중간예산·지속노출", {"budget": "mid", "need": "continuous"}, "BDG", 5),
    (AdProductCode.CATEGORY_AD, "업종일치·전환목적", {"category_match": True, "goal": "conversion"}, "CAT", 6),
    (AdProductCode.SPLASH, "단기집중·이벤트", {"goal": "event", "urgency": "high"}, "TIME", 6),
]

# --- Scoring config v1 --------------------------------------------------
# (target, code, label, max_score, weight)
ADVERTISER_FACTORS = [
    ("advertiser", "MKT", "시장성", 15, 1.0),
    ("advertiser", "TGT", "고객 타겟 적합도", 20, 1.0),
    ("advertiser", "BHV", "회원 행동 데이터 적합도", 20, 1.0),
    ("advertiser", "PERF", "광고 성과 예상도", 15, 1.0),
    ("advertiser", "ACT", "광고주 활동성", 10, 1.0),
    ("advertiser", "BDG", "예산 적합도", 10, 1.0),
    ("advertiser", "CMP", "경쟁 기회", 10, 1.0),
]
AD_PRODUCT_FACTORS = [
    ("ad_product", "GOAL", "캠페인 목적 적합도", 20, 1.0),
    ("ad_product", "CAT", "카테고리 적합도", 20, 1.0),
    ("ad_product", "AUD", "타겟 고객 적합도", 20, 1.0),
    ("ad_product", "BDG", "예산 적합도", 15, 1.0),
    ("ad_product", "EXPO", "노출 방식 적합도", 10, 1.0),
    ("ad_product", "TIME", "기간·긴급성", 10, 1.0),
    ("ad_product", "HIST", "과거 성과 적합도", 5, 1.0),
]

# --- De-identified aggregates (category, view, wish, cart, search) ---
BEHAVIOR_AGG = [
    ("워터파크", 82000, 14000, 9000, 21000),
    ("키즈카페", 96000, 18000, 12000, 26000),
    ("리조트", 54000, 8000, 5200, 15000),
    ("에듀테크", 41000, 6200, 3800, 12000),
    ("건강식품", 38000, 5100, 4300, 9000),
]
# (category, purchase, reservation, avg_order_value, repurchase_rate, cancel_rate)
PURCHASE_AGG = [
    ("워터파크", 5200, 6100, 45000, 0.22, 0.08),
    ("키즈카페", 7400, 3200, 30000, 0.31, 0.06),
    ("리조트", 2100, 2600, 220000, 0.18, 0.11),
    ("에듀테크", 3300, 900, 90000, 0.27, 0.05),
    ("건강식품", 6100, 200, 52000, 0.40, 0.04),
]

# --- Sample advertisers (name, brand, primary_category, region, size, budget_band, source) ---
SAMPLE_ADVERTISERS = [
    ("지역 워터파크 A", "워터파크A", "워터파크", "경기", "large", "high", "discovery"),
    ("패밀리 리조트 B", "리조트B", "리조트", "강원", "large", "high", "manual"),
    ("키즈카페 프랜차이즈 C", "키즈카페C", "키즈카페", "서울", "mid", "mid", "discovery"),
    ("에듀테크 스타트업 D", "에듀D", "에듀테크", "전국", "mid", "mid", "discovery"),
    ("건강식품 브랜드 E", "健E", "건강식품", "전국", "large", "high", "manual"),
]
