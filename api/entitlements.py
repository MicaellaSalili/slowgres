"""
Entitlements and Feature Gating Module.

DESIGN DECISION: All feature gates, quota limits, and ad flags must be resolved exclusively
through get_entitlements(org_id). Scattered `if plan == 'premium'` checks are strictly forbidden.
Tradeoff: Adds a centralized resolution step, but ensures changing entitlement limits or
adding tiers in the future touches exactly one place in the codebase.

DESIGN DECISION: Enforce limits on the server only.
Tradeoff: The frontend can display warnings or upgrade prompts, but the server is the sole
authority on access control, preventing client-side spoofing.
"""

from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, Optional
from api.config import settings


class PlanType(str, Enum):
    FREE = "free"
    PREMIUM = "premium"


@dataclass(frozen=True)
class Entitlements:
    plan: PlanType
    daily_analysis_limit: int
    history_retention_days: int
    can_export: bool
    show_ads: bool
    max_payload_size_kb: int

    def to_dict(self) -> Dict[str, Any]:
        return {
            "plan": self.plan.value,
            "daily_analysis_limit": self.daily_analysis_limit,
            "history_retention_days": self.history_retention_days,
            "can_export": self.can_export,
            "show_ads": self.show_ads,
            "max_payload_size_kb": self.max_payload_size_kb,
        }


def calculate_entitlements_for_plan(plan: PlanType) -> Entitlements:
    """Calculates active limits based on the organization's plan tier."""
    if plan == PlanType.PREMIUM:
        return Entitlements(
            plan=PlanType.PREMIUM,
            daily_analysis_limit=settings.PREMIUM_DAILY_ANALYSIS_LIMIT,
            history_retention_days=settings.PREMIUM_HISTORY_RETENTION_DAYS,
            can_export=settings.PREMIUM_CAN_EXPORT,
            show_ads=False,  # Premium users never see ads
            max_payload_size_kb=settings.MAX_PAYLOAD_SIZE_KB,
        )

    # Default FREE tier
    return Entitlements(
        plan=PlanType.FREE,
        daily_analysis_limit=settings.FREE_DAILY_ANALYSIS_LIMIT,
        history_retention_days=settings.FREE_HISTORY_RETENTION_DAYS,
        can_export=settings.FREE_CAN_EXPORT,
        show_ads=settings.ADS_ENABLED,  # Free users see ads only if ADS_ENABLED is true
        max_payload_size_kb=settings.MAX_PAYLOAD_SIZE_KB,
    )


async def get_entitlements(org_id: str, db: Optional[Any] = None) -> Entitlements:
    """
    Resolves entitlements for a given organization ID by checking its active subscription.
    Defaults to the FREE tier if no subscription record is found.
    """
    if not org_id:
        return calculate_entitlements_for_plan(PlanType.FREE)

    plan = PlanType.FREE
    if db is not None:
        try:
            # Query subscription from database
            subscription = await db.get_subscription(org_id)
            if subscription and subscription.get("status") in ("active", "trialing"):
                raw_plan = subscription.get("plan", "free").lower()
                if raw_plan == "premium":
                    plan = PlanType.PREMIUM
        except Exception:
            # Fallback safely to FREE on transient query failures
            plan = PlanType.FREE

    return calculate_entitlements_for_plan(plan)
