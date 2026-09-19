"""
Rule 5: nested_loop_heavy

Detects Nested Loop joins where the inner relation executes a sequential scan
over many iterations (loops).

DESIGN DECISION: Unroll wrapper nodes (such as Materialize or Memoize) on the inner
side to find the underlying scan node.
Tradeoff: A few lines of traversal logic prevents missing Nested Loops wrapped by
PostgreSQL 14+ Memoize nodes.
"""

from typing import List, Optional
from core.models import PlanNode, Finding
from core.config import EngineConfig, Config, Severity
from core.index_suggester import generate_index_suggestion


def _find_inner_scan_node(node: PlanNode) -> Optional[PlanNode]:
    """Finds the primary scan node on the inner side of a join."""
    curr = node
    while curr:
        if curr.node_type == "Seq Scan":
            return curr
        if curr.plans:
            curr = curr.plans[0]
        else:
            break
    return None


def check_nested_loop_heavy(root: PlanNode, config: EngineConfig = Config) -> List[Finding]:
    findings: List[Finding] = []

    for node in root.walk():
        if node.node_type != "Nested Loop":
            continue

        # Nested Loop requires at least 2 children: outer (index 0) and inner (index 1)
        if len(node.plans) < 2:
            continue

        inner_child = node.plans[1]
        loops = inner_child.actual_loops
        if loops < config.NESTED_LOOP_MIN_LOOPS:
            continue

        inner_scan = _find_inner_scan_node(inner_child)
        if not inner_scan:
            continue

        severity = (
            Severity.CRITICAL
            if loops >= config.NESTED_LOOP_CRITICAL_LOOPS
            else Severity.WARNING
        )

        inner_table = inner_scan.relation_name or inner_scan.alias or "inner table"
        outer_table = node.plans[0].relation_name or node.plans[0].alias or "outer table"

        explanation = (
            f"Nested Loop join performed a sequential scan on inner relation '{inner_table}' "
            f"for every row from the outer loop ({loops:,} iterations). "
            f"A sequential scan inside a high-iteration loop causes O(N * M) disk reads "
            f"and is a catastrophic PostgreSQL query performance bottleneck."
        )

        suggestion_text = (
            f"1. Add an index on the join column of '{inner_table}' to transform this into an "
            f"indexed seek (Index Scan) per loop.\n"
            f"2. Or if '{inner_table}' is large, inspect optimizer row estimates on the outer table: "
            f"the planner may have chosen a Nested Loop thinking the outer table had few rows, "
            f"when a Hash Join or Merge Join would be significantly faster."
        )

        # Attempt to synthesize an index recommendation from join filter / filter
        join_pred = node.join_filter or inner_scan.filter or inner_scan.join_filter
        if join_pred and inner_scan.relation_name:
            index_sugg = generate_index_suggestion(
                table_name=inner_scan.relation_name,
                join_predicate=join_pred,
                schema=inner_scan.schema,
            )
            if index_sugg:
                suggestion_text += (
                    f"\n\nSuggested DDL ({index_sugg.confidence_note}):\n"
                    f"{index_sugg.statement}"
                )

        findings.append(
            Finding(
                rule_id="nested_loop_heavy",
                severity=severity,
                node_path=inner_child.node_path,
                title=f"Nested Loop with unindexed inner Seq Scan ({loops:,} loops)",
                explanation=explanation,
                suggestion=suggestion_text,
            )
        )

    return findings
