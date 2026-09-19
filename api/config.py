"""
API configuration and feature flags loaded from environment variables.

DESIGN DECISION: All limits and feature flags are centralized in this module
and read from environment variables. No magic numbers or hardcoded plan limits.
Tradeoff: Requires environment configuration management, but allows changing limits
or toggling billing/ads without code changes or redeployments.
"""

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    # Service settings
    ENV: str = os.getenv("ENV", "development")
    PORT: int = int(os.getenv("PORT", "8000"))
    HOST: str = os.getenv("HOST", "0.0.0.0")

    # Supabase credentials & JWT secret
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "https://xyzcompany.supabase.co")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    SUPABASE_JWT_SECRET: str = os.getenv("SUPABASE_JWT_SECRET", "change-me-in-production-supabase-jwt-secret")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")

    # Payload size constraint (in kilobytes)
    MAX_PAYLOAD_SIZE_KB: int = int(os.getenv("MAX_PAYLOAD_SIZE_KB", "2048"))  # 2MB max

    # Feature flags
    ADS_ENABLED: bool = os.getenv("ADS_ENABLED", "false").lower() == "true"
    BILLING_ENABLED: bool = os.getenv("BILLING_ENABLED", "false").lower() == "true"

    # Plan entitlement limits (groundwork for Phase 6)
    FREE_DAILY_ANALYSIS_LIMIT: int = int(os.getenv("FREE_DAILY_ANALYSIS_LIMIT", "10"))
    PREMIUM_DAILY_ANALYSIS_LIMIT: int = int(os.getenv("PREMIUM_DAILY_ANALYSIS_LIMIT", "1000"))

    FREE_HISTORY_RETENTION_DAYS: int = int(os.getenv("FREE_HISTORY_RETENTION_DAYS", "7"))
    PREMIUM_HISTORY_RETENTION_DAYS: int = int(os.getenv("PREMIUM_HISTORY_RETENTION_DAYS", "365"))

    FREE_CAN_EXPORT: bool = os.getenv("FREE_CAN_EXPORT", "false").lower() == "true"
    PREMIUM_CAN_EXPORT: bool = os.getenv("PREMIUM_CAN_EXPORT", "true").lower() == "true"


settings = Settings()
