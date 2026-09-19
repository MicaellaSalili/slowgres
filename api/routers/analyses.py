"""
FastAPI router for query plan analysis, history management, and entitlement quotas.
"""

import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from api.auth import AuthenticatedUser, get_current_user
from api.database import db
from api.entitlements import get_entitlements
from api.schemas import (
    AnalysisCreateRequest,
    AnalysisResponse,
    EntitlementsResponse,
    PaginatedAnalysesResponse,
)
from core.engine import analyze_plan

router = APIRouter(prefix="/analyses", tags=["analyses"])


@router.post("", response_model=AnalysisResponse, status_code=status.HTTP_201_CREATED)
async def create_analysis(
    req: AnalysisCreateRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Parses and analyzes an EXPLAIN (ANALYZE, FORMAT JSON) query plan.
    Enforces payload size limits, verifies organization entitlement quotas,
    runs the rules engine, and persists analysis & findings under the caller's org.
    """
    # 1. Enforce payload size limit
    raw_text = json.dumps(req.plan_json) if not isinstance(req.plan_json, (str, bytes)) else str(req.plan_json)
    payload_size_kb = len(raw_text.encode("utf-8")) / 1024.0

    entitlements = await get_entitlements(user.org_id, db)
    if payload_size_kb > entitlements.max_payload_size_kb:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Plan payload ({payload_size_kb:.1f} KB) exceeds maximum allowed size ({entitlements.max_payload_size_kb} KB).",
        )

    # 2. Check daily quota via entitlements module
    today_usage = await db.get_daily_usage(user.org_id, "analysis_run")
    if today_usage >= entitlements.daily_analysis_limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Daily analysis quota reached ({today_usage}/{entitlements.daily_analysis_limit}). "
                f"Your organization is on the {entitlements.plan.value.upper()} plan. "
                "Upgrade to Premium for higher analysis limits."
            ),
        )

    # 3. Parse and run core rules engine
    try:
        analysis = analyze_plan(req.plan_json)
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid PostgreSQL plan format: {str(val_err)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to analyze plan: {str(e)}",
        )

    # 4. Save analysis and findings to database (scoped to user.org_id)
    findings_data = [f.to_dict() for f in analysis.findings]
    saved = await db.save_analysis(
        org_id=user.org_id,
        created_by=user.id,
        query_text=req.query_text,
        plan_json=req.plan_json,
        total_time_ms=analysis.total_time_ms,
        planning_time_ms=analysis.planning_time_ms,
        findings_data=findings_data,
    )

    # 5. Increment daily usage event
    await db.increment_daily_usage(user.org_id, "analysis_run")

    return saved


@router.get("", response_model=PaginatedAnalysesResponse)
async def list_analyses(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Returns paginated query analysis history strictly scoped to the caller's organization.
    """
    offset = (page - 1) * page_size
    res = await db.list_analyses(org_id=user.org_id, limit=page_size, offset=offset)

    return {
        "items": res["items"],
        "total": res["total"],
        "page": page,
        "page_size": page_size,
        "has_more": res["has_more"],
    }


@router.get("/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis_by_id(
    analysis_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Retrieves a single analysis by ID.
    Enforces RLS: Returns 404 if the record belongs to another organization.
    """
    record = await db.get_analysis(analysis_id, org_id=user.org_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found or access denied",
        )
    return record


@router.delete("/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_analysis_by_id(
    analysis_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Deletes an analysis and its cascade findings.
    Enforces RLS: Returns 404 if the record belongs to another organization.
    """
    deleted = await db.delete_analysis(analysis_id, org_id=user.org_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found or access denied",
        )
    return None
