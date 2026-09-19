"""
Abstract Billing Provider Interface.

DESIGN DECISION: Keep all payment and subscription management behind this abstract
interface without importing any provider-specific SDKs.
Tradeoff: Adds an abstraction boundary, but ensures the core API is completely vendor-agnostic
and makes switching between Paddle, Lemon Squeezy, or PayMongo a single adapter swap.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Dict, Optional


@dataclass
class CheckoutSessionResult:
    checkout_url: str
    session_id: str


@dataclass
class CustomerPortalResult:
    portal_url: str


@dataclass
class WebhookEventResult:
    event_type: str
    org_id: Optional[str]
    plan: Optional[str]
    status: Optional[str]
    provider_customer_id: Optional[str]
    provider_subscription_id: Optional[str]
    current_period_end: Optional[str]
    cancel_at_period_end: bool = False
    raw_payload: Optional[Dict[str, Any]] = None


class BillingProvider(ABC):
    """
    Vendor-neutral billing contract.
    Concrete implementations (e.g. PaddleAdapter, LemonSqueezyAdapter) will reside in api/billing/adapters/.
    """

    @abstractmethod
    async def create_checkout_session(
        self,
        org_id: str,
        user_id: str,
        user_email: str,
        plan_id: str,
        success_url: str,
        cancel_url: str,
    ) -> CheckoutSessionResult:
        """Initializes a hosted checkout session for a new premium subscription."""
        pass

    @abstractmethod
    async def create_customer_portal_session(
        self,
        provider_customer_id: str,
        return_url: str,
    ) -> CustomerPortalResult:
        """Generates a self-serve portal link for users to update billing or cancel."""
        pass

    @abstractmethod
    async def handle_webhook(
        self,
        payload: bytes,
        headers: Dict[str, str],
    ) -> WebhookEventResult:
        """
        Validates webhook signatures and translates provider events
        (subscription.created, subscription.updated, subscription.cancelled)
        into a standardized WebhookEventResult.
        """
        pass
