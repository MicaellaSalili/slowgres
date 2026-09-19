"""
Core data models for parsed Postgres EXPLAIN plan trees, findings, and analysis reports.

DESIGN DECISION: Use dataclasses instead of Pydantic in /core to keep the core analyzer
strictly standard-library Python without external dependencies. Pydantic validation
is deferred to the FastAPI layer (/api).
Tradeoff: No automatic runtime schema validation or coercion in core, but ensures zero
external dependencies, fast imports, and portable testing.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from core.config import Severity


@dataclass
class Finding:
    rule_id: str
    severity: Severity
    node_path: str
    title: str
    explanation: str
    suggestion: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "rule_id": self.rule_id,
            "severity": self.severity.value if isinstance(self.severity, Severity) else str(self.severity),
            "node_path": self.node_path,
            "title": self.title,
            "explanation": self.explanation,
            "suggestion": self.suggestion,
        }


@dataclass
class PlanNode:
    """
    Represents a single execution step in a PostgreSQL EXPLAIN tree.
    
    Fields mirror PostgreSQL's EXPLAIN (ANALYZE, FORMAT JSON) output keys
    converted to snake_case.
    """
    node_id: str
    node_path: str
    node_type: str
    
    # Cost and timing
    startup_cost: float = 0.0
    total_cost: float = 0.0
    plan_rows: float = 0.0  # Estimated rows per single loop
    plan_width: int = 0
    actual_startup_time: Optional[float] = None  # ms average per loop
    actual_total_time: Optional[float] = None    # ms average per loop
    actual_rows: Optional[float] = None          # rows returned per loop average
    actual_loops: int = 1

    # Relations and indexes
    relation_name: Optional[str] = None
    schema: Optional[str] = None
    alias: Optional[str] = None
    index_name: Optional[str] = None
    scan_direction: Optional[str] = None

    # Filtering and conditions
    filter: Optional[str] = None
    rows_removed_by_filter: Optional[int] = None
    rows_removed_by_join_filter: Optional[int] = None
    rows_removed_by_index_recheck: Optional[int] = None
    index_cond: Optional[str] = None
    recheck_cond: Optional[str] = None
    join_filter: Optional[str] = None
    hash_cond: Optional[str] = None

    # Index Only Scan specifics
    heap_fetches: Optional[int] = None

    # Sort specifics
    sort_space_used: Optional[int] = None  # in kB
    sort_space_type: Optional[str] = None  # e.g., 'Disk' or 'Memory'
    sort_space_method: Optional[str] = None  # e.g., 'external merge', 'quicksort'
    sort_keys: List[str] = field(default_factory=list)

    # Hash specifics
    hash_batches: Optional[int] = None
    hash_buckets: Optional[int] = None
    original_batches: Optional[int] = None
    peak_memory_usage: Optional[int] = None  # in kB

    # Children
    plans: List[PlanNode] = field(default_factory=list)

    # Raw unmodeled fields
    raw: Dict[str, Any] = field(default_factory=dict)

    # Parent reference (optional, set during hierarchy building)
    parent: Optional[PlanNode] = field(default=None, repr=False)

    @property
    def total_actual_rows(self) -> float:
        """
        Total rows returned across all execution loops.
        Postgres Actual Rows in JSON is the average per loop.
        """
        if self.actual_rows is None:
            return 0.0
        return self.actual_rows * self.actual_loops

    @property
    def total_plan_rows(self) -> float:
        """
        Total estimated rows scaled across all actual loops.
        Postgres Plan Rows is the planner's estimate for a single loop.
        """
        return self.plan_rows * self.actual_loops

    @property
    def total_actual_time(self) -> float:
        """
        Total time spent across all execution loops in milliseconds.
        Postgres Actual Total Time is the average duration per loop.
        """
        if self.actual_total_time is None:
            return 0.0
        return self.actual_total_time * self.actual_loops

    @property
    def children_total_time(self) -> float:
        """Sum of direct children total execution times."""
        return sum(child.total_actual_time for child in self.plans)

    @property
    def self_time(self) -> float:
        """
        Exclusive time spent solely in this node (total time minus children time).
        Clamped at 0.0 to handle minor measurement jitter in parallel/nested workers.
        """
        return max(0.0, self.total_actual_time - self.children_total_time)

    def walk(self) -> List[PlanNode]:
        """Flatten the node tree using pre-order traversal."""
        nodes = [self]
        for child in self.plans:
            nodes.extend(child.walk())
        return nodes

    def to_dict(self) -> Dict[str, Any]:
        """Serialize into dictionary for API and frontend JSON consumption."""
        return {
            "node_id": self.node_id,
            "node_path": self.node_path,
            "node_type": self.node_type,
            "relation_name": self.relation_name,
            "schema": self.schema,
            "alias": self.alias,
            "index_name": self.index_name,
            "startup_cost": self.startup_cost,
            "total_cost": self.total_cost,
            "plan_rows": self.plan_rows,
            "plan_width": self.plan_width,
            "actual_startup_time": self.actual_startup_time,
            "actual_total_time": self.actual_total_time,
            "actual_rows": self.actual_rows,
            "actual_loops": self.actual_loops,
            "total_actual_rows": self.total_actual_rows,
            "total_plan_rows": self.total_plan_rows,
            "total_actual_time": self.total_actual_time,
            "self_time": self.self_time,
            "filter": self.filter,
            "rows_removed_by_filter": self.rows_removed_by_filter,
            "rows_removed_by_join_filter": self.rows_removed_by_join_filter,
            "rows_removed_by_index_recheck": self.rows_removed_by_index_recheck,
            "index_cond": self.index_cond,
            "recheck_cond": self.recheck_cond,
            "join_filter": self.join_filter,
            "hash_cond": self.hash_cond,
            "heap_fetches": self.heap_fetches,
            "sort_space_used": self.sort_space_used,
            "sort_space_type": self.sort_space_type,
            "sort_space_method": self.sort_space_method,
            "sort_keys": self.sort_keys,
            "hash_batches": self.hash_batches,
            "hash_buckets": self.hash_buckets,
            "plans": [child.to_dict() for child in self.plans],
        }


@dataclass
class PlanAnalysis:
    """Complete analysis result of a query plan."""
    root: PlanNode
    planning_time_ms: Optional[float] = None
    execution_time_ms: Optional[float] = None
    triggers: List[Dict[str, Any]] = field(default_factory=list)
    findings: List[Finding] = field(default_factory=list)

    @property
    def total_time_ms(self) -> float:
        if self.execution_time_ms is not None:
            return self.execution_time_ms
        return self.root.total_actual_time

    def to_dict(self) -> Dict[str, Any]:
        return {
            "planning_time_ms": self.planning_time_ms,
            "execution_time_ms": self.execution_time_ms,
            "total_time_ms": self.total_time_ms,
            "findings": [f.to_dict() for f in self.findings],
            "plan_tree": self.root.to_dict(),
        }
