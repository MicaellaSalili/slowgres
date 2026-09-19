"""
Rule 1: seq_scan_filtered

Detects sequential scans where a significant fraction of scanned rows is removed
by the filter condition.

DESIGN DECISION: Require both a minimum absolute count of removed rows AND a minimum removal ratio.
Tradeoff: Prevents alerting on small lookup tables (< 1,000 rows) where a sequential scan
is faster than B-tree index traversal due to sequential block read prefetching.
"""

from typing import List
from core.models import PlanNode, Finding
from core.config import EngineConfig, Config, Severity
from core.index_suggester import generate_index_suggestion


def check_seq_scan_filtered(root: PlanNode, config: EngineConfig = Config) -> List[Finding]:
    findings: List[Finding] = []

    for node in root.walk():
        if node.node_type != "Seq Scan":
            continue

        removed = node.rows_removed_by_filter or 0
        if removed < config.SEQ_SCAN_MIN_REMOVED_ROWS:
            continue

        actual_returned = node.total_actual_rows
        total_scanned = removed + actual_returned
        if total_scanned == 0:
            continue

        removal_ratio = removed / total_scanned
        if removal_ratio < config.SEQ_SCAN_FILTER_REMOVAL_RATIO:
            continue

        severity = (
            Severity.CRITICAL
            if removed >= config.SEQ_SCAN_CRITICAL_REMOVED_ROWS
            else Severity.WARNING
        )

        table_name = node.relation_name or node.alias or "table"
        pct_removed = removal_ratio * 100

        explanation = (
            f"Sequential scan on '{table_name}' scanned {total_scanned:,.0f} rows but discarded "
            f"{removed:,.0f} rows ({pct_removed:.1f}%) via filter: {node.filter or 'N/A'}. "
            f"Only {actual_returned:,.0f} rows were returned. "
            f"Scanning and filtering unindexed heap pages consumes unnecessary disk I/O and buffer cache."
        )

        suggestion_text = (
            f"Consider adding an index on the filtered column(s) of '{table_name}' to allow an Index Scan."
        )

        # Generate index statement if filter columns are parseable
        if node.filter and node.relation_name:
            index_sugg = generate_index_suggestion(
                table_name=node.relation_name,
                filter_predicate=node.filter,
                schema=node.schema,
            )
            if index_sugg:
                suggestion_text += (
                    f"\n\nSuggested DDL ({index_sugg.confidence_note}):\n"
                    f"{index_sugg.statement}"
                )

        findings.append(
            Finding(
                rule_id="seq_scan_filtered",
                severity=severity,
                node_path=node.node_path,
                title=f"Heavily filtered Seq Scan on '{table_name}' ({pct_removed:.0f}% rows discarded)",
                explanation=explanation,
                suggestion=suggestion_text,
            )
        )

    return findings
