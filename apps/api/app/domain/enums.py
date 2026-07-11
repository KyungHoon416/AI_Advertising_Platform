"""Domain enumerations (str-based for portability & type safety)."""
from __future__ import annotations

import enum


class RoleCode(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    OPERATOR = "operator"


class CategoryLevel(str, enum.Enum):
    MAJOR = "major"   # 대분류
    MIDDLE = "middle"  # 중분류
    MINOR = "minor"   # 소분류


class AdvertiserStatus(str, enum.Enum):
    CANDIDATE = "candidate"      # 발굴된 후보
    IN_REVIEW = "in_review"      # 검토 중
    PROPOSED = "proposed"        # 제안 진행
    CONTRACTED = "contracted"    # 계약 완료
    ARCHIVED = "archived"


class AdvertiserSource(str, enum.Enum):
    DISCOVERY = "discovery"  # AI 발굴
    MANUAL = "manual"        # 수동 등록


class Grade(str, enum.Enum):
    S = "S"
    A = "A"
    B = "B"
    C = "C"
    D = "D"


class AdProductCode(str, enum.Enum):
    MAIN_BANNER = "main_banner"
    SUB_BANNER = "sub_banner"
    CATEGORY_AD = "category_ad"
    SPLASH = "splash"


class CompetitorType(str, enum.Enum):
    DIRECT = "direct"
    INDIRECT = "indirect"
    LEADER = "leader"
    MEDIA = "media"
    COMMERCE = "commerce"
    OTA = "ota"
    CONTENT = "content"
    LOCAL = "local"


class CalcMethod(str, enum.Enum):
    LINEAR = "linear"
    THRESHOLD = "threshold"
    LOOKUP = "lookup"
    AGG_RATIO = "agg_ratio"


class ScoringVersionStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class ProposalStatus(str, enum.Enum):
    DRAFT = "draft"
    REVIEW = "review"
    SENT = "sent"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class CampaignStatus(str, enum.Enum):
    PLANNED = "planned"
    RUNNING = "running"
    PAUSED = "paused"
    ENDED = "ended"


class RenewalLikelihood(str, enum.Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class PromptStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class AgentName(str, enum.Enum):
    CATEGORY_CLASSIFICATION = "category_classification"
    MARKET_RESEARCH = "market_research"
    COMPETITOR_DISCOVERY = "competitor_discovery"
    COMPETITOR_INTELLIGENCE = "competitor_intelligence"
    ADVERTISER_DISCOVERY = "advertiser_discovery"
    ADVERTISER_SCORING = "advertiser_scoring"
    AD_PRODUCT_RECOMMENDATION = "ad_product_recommendation"
    PROPOSAL = "proposal"
    PERFORMANCE_ANALYSIS = "performance_analysis"
    ROI = "roi"
    RENEWAL = "renewal"


class ExecutionStatus(str, enum.Enum):
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"
