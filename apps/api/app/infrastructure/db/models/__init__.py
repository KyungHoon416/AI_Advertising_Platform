"""Import all models so SQLAlchemy metadata is fully populated.

Import this module (or `Base.metadata`) before create_all / Alembic autogenerate.
"""
from __future__ import annotations

from app.infrastructure.db.base import Base
from app.infrastructure.db.models.advertiser import Advertiser, advertiser_categories
from app.infrastructure.db.models.aggregate import (
    BehaviorAggregate,
    CustomerSegment,
    MemberAggregate,
    PurchaseAggregate,
)
from app.infrastructure.db.models.ai import AgentExecution, Prompt, PromptVersion
from app.infrastructure.db.models.analysis import (
    AIAnalysisSource,
    Competitor,
    CompetitorAnalysis,
    MarketResearch,
)
from app.infrastructure.db.models.audit import AuditLog
from app.infrastructure.db.models.catalog import (
    AdProduct,
    AdProductCategoryRule,
    Benchmark,
    Category,
)
from app.infrastructure.db.models.iam import (
    Permission,
    Role,
    User,
    role_permissions,
    user_roles,
)
from app.infrastructure.db.models.recommendation import (
    AdProductRecItem,
    AdProductRecommendation,
)
from app.infrastructure.db.models.sales import (
    Campaign,
    CampaignPerformance,
    Proposal,
    ProposalVersion,
    RenewalRecommendation,
    UpsellRecommendation,
)
from app.infrastructure.db.models.scoring import (
    AdvertiserScore,
    ScoreFactor,
    ScoreFactorDef,
    ScoringVersion,
)

__all__ = [
    "Base",
    "Advertiser",
    "advertiser_categories",
    "BehaviorAggregate",
    "CustomerSegment",
    "MemberAggregate",
    "PurchaseAggregate",
    "AgentExecution",
    "Prompt",
    "PromptVersion",
    "AIAnalysisSource",
    "Competitor",
    "CompetitorAnalysis",
    "MarketResearch",
    "AuditLog",
    "AdProduct",
    "AdProductCategoryRule",
    "Benchmark",
    "Category",
    "Permission",
    "Role",
    "User",
    "role_permissions",
    "user_roles",
    "AdProductRecItem",
    "AdProductRecommendation",
    "Campaign",
    "CampaignPerformance",
    "Proposal",
    "ProposalVersion",
    "RenewalRecommendation",
    "UpsellRecommendation",
    "AdvertiserScore",
    "ScoreFactor",
    "ScoreFactorDef",
    "ScoringVersion",
]
