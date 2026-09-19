"""
Pydantic schemas for FastAPI request validation and response serialization.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class AnalysisCreateRequest(BaseModel):
    plan_json: Any = Field(
        ...,
        description="The PostgreSQL EXPLAIN (ANALYZE, FORMAT JSON) output (raw string, array, or object).",
    )
    query_text: Optional[str] = Field(
        default=None,
        description="Optional original SQL query text.",
    )


class FindingResponse(BaseModel):
    rule_id: str
    severity: str
    node_path: str
    title: str
    explanation: str
    suggestion: str


class PlanNodeSummary(BaseModel):
    node_id: str
    node_path: str
    node_type: str
    relation_name: Optional[str] = None
    total_actual_time: float = 0.0
    total_actual_rows: float = 0.0
    self_time: float = 0.0


class AnalysisResponse(BaseModel):
    id: str
    org_id: str
    created_by: str
    query_text: Optional[str]
    plan_json: Any
    total_time_ms: float
    planning_time_ms: Optional[float]
    created_at: str
    findings: List[FindingResponse]


class AnalysisSummaryResponse(BaseModel):
    id: str
    org_id: str
    created_by: str
    query_text: Optional[str]
    total_time_ms: float
    planning_time_ms: Optional[float]
    findings_count: int
    created_at: str


class PaginatedAnalysesResponse(BaseModel):
    items: List[AnalysisSummaryResponse]
    total: int
    page: int
    page_size: int
    has_more: bool


class EntitlementsResponse(BaseModel):
    plan: str
    daily_analysis_limit: int
    history_retention_days: int
    can_export: bool
    show_ads: bool
    max_payload_size_kb: int
    today_usage_count: int
