"""
Rule 4: hash_multiple_batches

Detects Hash nodes where Batches > 1, indicating that the hash table exceeded work_mem
and spilled partitioned batches to temporary disk storage.

DESIGN DECISION: Alert whenever Batches > 1, because a single-batch in-memory hash table
is the optimal execution target for Hash Joins.
Tradeoff: On massive data warehousing queries, multi-batch hash joins may be inevitable,
so we flag as WARNING for moderate batch counts and CRITICAL only for high batch counts (>= 8).
"""

from typing import List
from core.models import PlanNode, Finding
from core.config import EngineConfig, Config, Severity


def check_hash_multiple_batches(root: PlanNode, config: EngineConfig = Config) -> List[Finding]:
    findings: List[Finding] = []

    for node in root.walk():
        if node.node_type not in ("Hash", "Hash Join"):
            continue

        batches = node.hash_batches
        if batches is None or batches <= 1:
            continue

        severity = (
            Severity.CRITICAL
            if batches >= config.HASH_BATCHES_CRITICAL
            else Severity.WARNING
        )

        orig_batches_info = (
            f" (originally planned as {node.original_batches} batches)"
            if node.original_batches and node.original_batches != batches
            else ""
        )

        mem_info = (
            f" Peak memory used: {node.peak_memory_usage:,.0f} kB."
            if node.peak_memory_usage
            else ""
        )

        explanation = (
            f"Hash node required {batches} batches{orig_batches_info}.{mem_info} "
            f"When the build side of a hash join exceeds 'work_mem', PostgreSQL cannot maintain the "
            f"entire hash table in RAM. It partitions the build and probe rows into {batches} batches, "
            f"spilling all batches beyond the first to temporary disk files."
        )

        suggestion = (
            f"1. Increase `work_mem` so the hash table fits into 1 batch:\n"
            f"   Try multiplying current work_mem by ~{batches}x for the query session:\n"
            f"   `SET work_mem = '64MB';`\n"
            f"2. Ensure the smaller table is used as the build side (inner child of Hash Join).\n"
            f"3. Filter unnecessary rows from the build table earlier in the query."
        )

        findings.append(
            Finding(
                rule_id="hash_multiple_batches",
                severity=severity,
                node_path=node.node_path,
                title=f"Hash table partitioned into {batches} batches (spilled to disk)",
                explanation=explanation,
                suggestion=suggestion,
            )
        )

    return findings
