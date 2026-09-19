"""
Rule 6: filter_after_index_scan

Detects:
1. Index Scan or Index Only Scan that still discards many rows via a secondary Filter condition.
2. Index Only Scan that suffers high Heap Fetches due to unvacuumed visibility maps.

DESIGN DECISION: Group both post-index filter loss and visibility map heap fetches under this rule.
Tradeoff: Combines two related index-efficiency degradations into a single rule with distinct titles
and actionable suggestions (composite indexing vs VACUUM).
"""

from typing import List
from core.models import PlanNode, Finding
from core.config import EngineConfig, Config, Severity
from core.index_suggester import generate_index_suggestion


def check_filter_after_index_scan(root: PlanNode, config: EngineConfig = Config) -> List[Finding]:
    findings: List[Finding] = []

    for node in root.walk():
        is_index_scan = node.node_type in ("Index Scan", "Index Only Scan", "Bitmap Heap Scan")
        if not is_index_scan:
            continue

        table_name = node.relation_name or node.alias or "table"
        index_name = node.index_name or "existing index"

        # Check A: Heavy secondary filter discard
        removed = node.rows_removed_by_filter or 0
        actual = node.total_actual_rows
        total = removed + actual

        if removed >= config.FILTER_AFTER_INDEX_MIN_REMOVED_ROWS and total > 0:
            ratio = removed / total
            if ratio >= config.FILTER_AFTER_INDEX_REMOVAL_RATIO:
                pct = ratio * 100
                severity = Severity.CRITICAL if removed >= 10_000 else Severity.WARNING

                explanation = (
                    f"{node.node_type} on index '{index_name}' discarded {removed:,.0f} rows ({pct:.1f}%) "
                    f"via secondary Filter: {node.filter or 'N/A'}. Only {actual:,.0f} rows matched. "
                    f"Because the index does not include all filtered predicates, PostgreSQL had to fetch "
                    f"tuples from table heap storage and evaluate the filter in memory."
                )

                suggestion = (
                    f"1. Create a composite index on '{table_name}' that includes both the indexed condition "
                    f"and the secondary filter columns.\n"
                    f"2. Or add an `INCLUDE (...)` clause to '{index_name}' if the columns are needed only "
                    f"for index-only verification."
                )

                if node.filter and node.relation_name:
                    index_sugg = generate_index_suggestion(
                        table_name=node.relation_name,
                        filter_predicate=node.filter,
                        join_predicate=node.index_cond,
                        schema=node.schema,
                    )
                    if index_sugg:
                        suggestion += (
                            f"\n\nSuggested DDL ({index_sugg.confidence_note}):\n"
                            f"{index_sugg.statement}"
                        )

                findings.append(
                    Finding(
                        rule_id="filter_after_index_scan",
                        severity=severity,
                        node_path=node.node_path,
                        title=f"Secondary Filter discarded {pct:.0f}% rows after {node.node_type}",
                        explanation=explanation,
                        suggestion=suggestion,
                    )
                )

        # Check B: Index Only Scan with high Heap Fetches
        if node.node_type == "Index Only Scan":
            heap_fetches = node.heap_fetches or 0
            if heap_fetches >= config.INDEX_ONLY_HEAP_FETCHES_WARNING:
                severity = (
                    Severity.CRITICAL
                    if heap_fetches >= config.INDEX_ONLY_HEAP_FETCHES_CRITICAL
                    else Severity.WARNING
                )

                explanation = (
                    f"Index Only Scan on '{table_name}' had to fetch {heap_fetches:,.0f} pages directly from the heap. "
                    f"An Index Only Scan is designed to satisfy the query entirely from the B-tree without touching heap pages. "
                    f"Heap fetches occur when table pages are not marked 'all-visible' in PostgreSQL's visibility map, "
                    f"forcing the engine to read the heap tuple to confirm MVCC transaction visibility."
                )

                suggestion = (
                    f"Run `VACUUM (ANALYZE) {table_name};` to clean dead tuples and update the visibility map. "
                    f"Once pages are marked all-visible, Index Only Scans will bypass heap reads entirely."
                )

                findings.append(
                    Finding(
                        rule_id="filter_after_index_scan",
                        severity=severity,
                        node_path=node.node_path,
                        title=f"Index Only Scan had {heap_fetches:,.0f} Heap Fetches (unvacuumed pages)",
                        explanation=explanation,
                        suggestion=suggestion,
                    )
                )

    return findings
