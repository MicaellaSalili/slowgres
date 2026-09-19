"""
FastAPI application entry point for Slowgres API.
"""

from fastapi import Depends, FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.auth import AuthenticatedUser, get_current_user
from api.config import settings
from api.database import db
from api.entitlements import get_entitlements
from api.routers.analyses import router as analyses_router
from api.schemas import EntitlementsResponse

app = FastAPI(
    title="Slowgres API",
    description="PostgreSQL slow-query analyzer API with multi-tenant RLS isolation and rule engine.",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["health"])
async def health_check():
    """Public unauthenticated health check for Render / Fly.io uptime probes."""
    return {
        "status": "healthy",
        "service": "slowgres-api",
        "version": "1.0.0",
    }


@app.get("/entitlements", response_model=EntitlementsResponse, tags=["entitlements"])
async def get_current_entitlements(
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Returns the caller organization's current plan, quotas, and today's usage."""
    entitlements = await get_entitlements(user.org_id, db)
    today_usage = await db.get_daily_usage(user.org_id, "analysis_run")

    return {
        "plan": entitlements.plan.value,
        "daily_analysis_limit": entitlements.daily_analysis_limit,
        "history_retention_days": entitlements.history_retention_days,
        "can_export": entitlements.can_export,
        "show_ads": entitlements.show_ads,
        "max_payload_size_kb": entitlements.max_payload_size_kb,
        "today_usage_count": today_usage,
    }


# Mount protected analyses router
app.include_router(analyses_router)
