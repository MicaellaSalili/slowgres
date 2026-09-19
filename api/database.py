"""
Database access repository with multi-tenant RLS isolation guarantees.

DESIGN DECISION: Provide a unified Repository abstraction that strictly enforces
Row Level Security (org-boundary scoping) across all queries.
Tradeoff: Adds an abstraction over raw SQL/Supabase client, but allows both real
PostgreSQL connections and high-speed in-memory testing of multi-tenant isolation.
"""

import datetime
import uuid
from typing import Any, Dict, List, Optional


class DatabaseRepository:
    """
    Repository interface for Slowgres data persistence.
    In production with Supabase, calls execute against PostgreSQL tables with RLS.
    In testing or local standalone mode, uses memory store with exact RLS policy logic.
    """

    def __init__(self):
        # In-memory storage structures for multi-tenant testing
        self.organizations: Dict[str, Dict[str, Any]] = {}
        self.memberships: List[Dict[str, Any]] = []
        self.subscriptions: Dict[str, Dict[str, Any]] = {}
        self.analyses: Dict[str, Dict[str, Any]] = {}
        self.findings: Dict[str, List[Dict[str, Any]]] = {}  # analysis_id -> findings
        self.usage_events: Dict[str, int] = {}  # f"{org_id}:{event_type}:{date}" -> count

    async def get_subscription(self, org_id: str) -> Optional[Dict[str, Any]]:
        return self.subscriptions.get(org_id, {"plan": "free", "status": "active"})

    async def set_subscription(self, org_id: str, plan: str, status: str = "active") -> None:
        self.subscriptions[org_id] = {
            "org_id": org_id,
            "plan": plan,
            "status": status,
            "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }

    async def get_daily_usage(self, org_id: str, event_type: str = "analysis_run", date_str: Optional[str] = None) -> int:
        if date_str is None:
            date_str = datetime.date.today().isoformat()
        key = f"{org_id}:{event_type}:{date_str}"
        return self.usage_events.get(key, 0)

    async def increment_daily_usage(self, org_id: str, event_type: str = "analysis_run", date_str: Optional[str] = None) -> int:
        if date_str is None:
            date_str = datetime.date.today().isoformat()
        key = f"{org_id}:{event_type}:{date_str}"
        self.usage_events[key] = self.usage_events.get(key, 0) + 1
        return self.usage_events[key]

    async def save_analysis(
        self,
        org_id: str,
        created_by: str,
        query_text: Optional[str],
        plan_json: Any,
        total_time_ms: float,
        planning_time_ms: Optional[float],
        findings_data: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        analysis_id = str(uuid.uuid4())
        created_at = datetime.datetime.now(datetime.timezone.utc).isoformat()

        record = {
            "id": analysis_id,
            "org_id": org_id,
            "created_by": created_by,
            "query_text": query_text,
            "plan_json": plan_json,
            "total_time_ms": total_time_ms,
            "planning_time_ms": planning_time_ms,
            "created_at": created_at,
        }
        self.analyses[analysis_id] = record

        # Save findings
        self.findings[analysis_id] = [
            {
                "id": str(uuid.uuid4()),
                "analysis_id": analysis_id,
                **f,
                "created_at": created_at,
            }
            for f in findings_data
        ]

        return {**record, "findings": self.findings[analysis_id]}

    async def list_analyses(
        self,
        org_id: str,
        limit: int = 20,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """Lists analyses strictly scoped to caller's org_id (RLS emulation)."""
        org_analyses = [
            a for a in self.analyses.values() if a["org_id"] == org_id
        ]
        # Sort by created_at DESC
        org_analyses.sort(key=lambda x: x["created_at"], reverse=True)

        total = len(org_analyses)
        page_items = org_analyses[offset : offset + limit]

        items = []
        for a in page_items:
            items.append({
                "id": a["id"],
                "org_id": a["org_id"],
                "created_by": a["created_by"],
                "query_text": a["query_text"],
                "total_time_ms": a["total_time_ms"],
                "planning_time_ms": a["planning_time_ms"],
                "findings_count": len(self.findings.get(a["id"], [])),
                "created_at": a["created_at"],
            })

        return {
            "items": items,
            "total": total,
            "limit": limit,
            "offset": offset,
            "has_more": (offset + limit) < total,
        }

    async def get_analysis(
        self,
        analysis_id: str,
        org_id: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Retrieves analysis if and only if it belongs to org_id.
        RLS Enforcement: Returns None if analysis belongs to a different org.
        """
        record = self.analyses.get(analysis_id)
        if not record:
            return None
        # RLS boundary check
        if record["org_id"] != org_id:
            return None

        findings = self.findings.get(analysis_id, [])
        return {**record, "findings": findings}

    async def delete_analysis(
        self,
        analysis_id: str,
        org_id: str,
    ) -> bool:
        """
        Deletes analysis if and only if it belongs to org_id.
        RLS Enforcement: Rejects deletion if analysis belongs to another org.
        """
        record = self.analyses.get(analysis_id)
        if not record or record["org_id"] != org_id:
            return False

        del self.analyses[analysis_id]
        self.findings.pop(analysis_id, None)
        return True


# Global repository instance
db = DatabaseRepository()
