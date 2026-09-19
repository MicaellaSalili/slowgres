"""
Parser for PostgreSQL EXPLAIN (ANALYZE, FORMAT JSON) outputs.

Handles top-level arrays, single objects, and nested plan trees.
Validates the presence of expected PostgreSQL plan keys and builds a typed PlanNode hierarchy.

DESIGN DECISION: Support both the official top-level array output `[{"Plan": {...}}]`
and unwrapped objects `{"Plan": {...}}` or `{"Node Type": ...}`.
Tradeoff: Adds minor normalization logic, but prevents frustrating errors when users copy
from different database clients (DBeaver, pgAdmin, DataGrip, psql).
"""

import json
from typing import Any, Dict, List, Optional, Union
from core.models import PlanAnalysis, PlanNode


def _parse_node(raw_node: Dict[str, Any], path: str = "0", parent: Optional[PlanNode] = None) -> PlanNode:
    """Recursively parses a raw dictionary into a typed PlanNode tree."""
    if not isinstance(raw_node, dict):
        raise ValueError(f"Invalid plan node at path '{path}': expected object, got {type(raw_node).__name__}")

    node_type = raw_node.get("Node Type")
    if not node_type:
        raise ValueError(f"Invalid plan node at path '{path}': missing required 'Node Type' property")

    # Extract sort keys if present (can be string or list of strings in Postgres JSON)
    raw_sort_key = raw_node.get("Sort Key")
    sort_keys: List[str] = []
    if isinstance(raw_sort_key, list):
        sort_keys = [str(k) for k in raw_sort_key]
    elif isinstance(raw_sort_key, str):
        sort_keys = [raw_sort_key]

    node = PlanNode(
        node_id=f"node-{path.replace('.', '-')}",
        node_path=path,
        node_type=str(node_type),
        startup_cost=float(raw_node.get("Startup Cost", 0.0) or 0.0),
        total_cost=float(raw_node.get("Total Cost", 0.0) or 0.0),
        plan_rows=float(raw_node.get("Plan Rows", 0.0) or 0.0),
        plan_width=int(raw_node.get("Plan Width", 0) or 0),
        actual_startup_time=(
            float(raw_node["Actual Startup Time"])
            if raw_node.get("Actual Startup Time") is not None
            else None
        ),
        actual_total_time=(
            float(raw_node["Actual Total Time"])
            if raw_node.get("Actual Total Time") is not None
            else None
        ),
        actual_rows=(
            float(raw_node["Actual Rows"])
            if raw_node.get("Actual Rows") is not None
            else None
        ),
        actual_loops=int(raw_node.get("Actual Loops", 1) or 1),
        relation_name=raw_node.get("Relation Name"),
        schema=raw_node.get("Schema"),
        alias=raw_node.get("Alias"),
        index_name=raw_node.get("Index Name"),
        scan_direction=raw_node.get("Scan Direction"),
        filter=raw_node.get("Filter"),
        rows_removed_by_filter=(
            int(raw_node["Rows Removed by Filter"])
            if raw_node.get("Rows Removed by Filter") is not None
            else None
        ),
        rows_removed_by_join_filter=(
            int(raw_node["Rows Removed by Join Filter"])
            if raw_node.get("Rows Removed by Join Filter") is not None
            else None
        ),
        rows_removed_by_index_recheck=(
            int(raw_node["Rows Removed by Index Recheck"])
            if raw_node.get("Rows Removed by Index Recheck") is not None
            else None
        ),
        index_cond=raw_node.get("Index Cond"),
        recheck_cond=raw_node.get("Recheck Cond"),
        join_filter=raw_node.get("Join Filter"),
        hash_cond=raw_node.get("Hash Cond"),
        heap_fetches=(
            int(raw_node["Heap Fetches"])
            if raw_node.get("Heap Fetches") is not None
            else None
        ),
        sort_space_used=(
            int(raw_node["Sort Space Used"])
            if raw_node.get("Sort Space Used") is not None
            else None
        ),
        sort_space_type=raw_node.get("Sort Space Type"),
        sort_space_method=raw_node.get("Sort Space Method"),
        sort_keys=sort_keys,
        hash_batches=(
            int(raw_node["Hash Batches"])
            if raw_node.get("Hash Batches") is not None
            else (int(raw_node["Batches"]) if raw_node.get("Batches") is not None else None)
        ),
        hash_buckets=(
            int(raw_node["Hash Buckets"])
            if raw_node.get("Hash Buckets") is not None
            else (int(raw_node["Buckets"]) if raw_node.get("Buckets") is not None else None)
        ),
        original_batches=(
            int(raw_node["Original Hash Batches"])
            if raw_node.get("Original Hash Batches") is not None
            else (int(raw_node["Original Batches"]) if raw_node.get("Original Batches") is not None else None)
        ),
        peak_memory_usage=(
            int(raw_node["Peak Memory Usage"])
            if raw_node.get("Peak Memory Usage") is not None
            else None
        ),
        raw=raw_node,
        parent=parent,
    )

    # Recursively parse child plans
    children_raw = raw_node.get("Plans", [])
    if isinstance(children_raw, list):
        for idx, child_raw in enumerate(children_raw):
            child_path = f"{path}.{idx}"
            node.plans.append(_parse_node(child_raw, path=child_path, parent=node))

    return node


def parse_plan_json(input_data: Union[str, bytes, Dict[str, Any], List[Any]]) -> PlanAnalysis:
    """
    Parses Postgres EXPLAIN (ANALYZE, FORMAT JSON) into a PlanAnalysis.

    Accepts raw JSON string, bytes, or parsed Python dict/list.
    Raises ValueError with explanatory messages if the JSON is malformed
    or missing PostgreSQL plan semantics.
    """
    if isinstance(input_data, (str, bytes)):
        try:
            parsed = json.loads(input_data)
        except Exception as e:
            raise ValueError(f"Input is not valid JSON: {str(e)}")
    else:
        parsed = input_data

    # PostgreSQL EXPLAIN (FORMAT JSON) outputs a list containing one object
    if isinstance(parsed, list):
        if not parsed:
            raise ValueError("Plan JSON list is empty")
        top_obj = parsed[0]
    elif isinstance(parsed, dict):
        top_obj = parsed
    else:
        raise ValueError(f"Expected JSON object or list, got {type(parsed).__name__}")

    if not isinstance(top_obj, dict):
        raise ValueError("Root plan element is not an object")

    # Extract Plan root node
    if "Plan" in top_obj and isinstance(top_obj["Plan"], dict):
        plan_dict = top_obj["Plan"]
        planning_time = (
            float(top_obj["Planning Time"])
            if top_obj.get("Planning Time") is not None
            else None
        )
        execution_time = (
            float(top_obj["Execution Time"])
            if top_obj.get("Execution Time") is not None
            else None
        )
        triggers = top_obj.get("Triggers", [])
        if not isinstance(triggers, list):
            triggers = []
    elif "Node Type" in top_obj:
        # User directly pasted the Plan node without the wrapper
        plan_dict = top_obj
        planning_time = None
        execution_time = None
        triggers = []
    else:
        raise ValueError(
            "Invalid PostgreSQL plan format. Could not find 'Plan' or 'Node Type' in JSON object."
        )

    root_node = _parse_node(plan_dict, path="0", parent=None)

    return PlanAnalysis(
        root=root_node,
        planning_time_ms=planning_time,
        execution_time_ms=execution_time,
        triggers=triggers,
    )
