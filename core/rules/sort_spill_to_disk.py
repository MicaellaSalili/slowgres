"""
Rule 3: sort_spill_to_disk

Detects Sort nodes that exceeded work_mem and spilled to disk (external merge sort).

DESIGN DECISION: Inspect both 'Sort Space Type' ('Disk') and 'Sort Space Method' ('external merge').
PostgreSQL versions and output formats sometimes express disk sorts in either field.
Tradeoff: A few additional string checks ensures cross-version compatibility (PostgreSQL 12 through 17).
"""

from typing import List
from core.models import PlanNode, Finding
from core.config import EngineConfig, Config, Severity
from core.index_suggester import generate_index_suggestion


def check_sort_spill_to_disk(root: PlanNode, config: EngineConfig = Config) -> List[Finding]:
    findings: List[Finding] = []

    for node in root.walk():
        if node.node_type != "Sort":
            continue

        is_disk = False
        if node.sort_space_type and node.sort_space_type.lower() == "disk":
            is_disk = True
        elif node.sort_space_method and "external" in node.sort_space_method.lower():
            is_disk = True

        if not is_disk:
            continue

        space_kb = node.sort_space_used or 0
        space_mb = space_kb / 1024.0

        severity = (
            Severity.CRITICAL
            if space_kb >= config.SORT_DISK_CRITICAL_KB
            else Severity.WARNING
        )

        keys_str = ", ".join(node.sort_keys) if node.sort_keys else "ORDER BY columns"

        explanation = (
            f"Sort node on keys ({keys_str}) spilled to disk ({space_mb:.2f} MB / {space_kb:,.0f} kB used). "
            f"Sort method: {node.sort_space_method or 'external merge'}. "
            f"When memory required for sorting exceeds the per-operation 'work_mem', "
            f"PostgreSQL writes sort runs to temporary disk files, adding substantial latency and disk I/O."
        )

        # Estimate target work_mem (at least double the spilled size, plus overhead)
        recommended_mem_mb = max(32, int(space_mb * 2.5) if space_mb > 0 else 64)

        suggestion = (
            f"1. Increase `work_mem` for this transaction or query:\n"
            f"   `SET work_mem = '{recommended_mem_mb}MB';`\n"
            f"   (Note: work_mem is allocated per sort/hash operation, not per query/connection).\n"
            f"2. Or add an index matching the sort expression ({keys_str}) to enable an Index Scan "
            f"that reads rows pre-sorted directly from the B-tree, eliminating the Sort step completely."
        )

        findings.append(
            Finding(
                rule_id="sort_spill_to_disk",
                severity=severity,
                node_path=node.node_path,
                title=f"Sort spilled to disk ({space_mb:.1f} MB)",
                explanation=explanation,
                suggestion=suggestion,
            )
        )

    return findings
