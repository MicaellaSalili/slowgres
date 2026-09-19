"""
Rule 2: row_estimate_mismatch

Detects significant discrepancies between the query planner's estimated row count
and the actual rows returned during execution.

DESIGN DECISION: Scale both estimated rows and actual rows by actual_loops.
PostgreSQL EXPLAIN JSON provides 'Plan Rows' as the estimated rows returned PER LOOP,
and 'Actual Rows' as the average actual rows returned PER LOOP. Multiplying both
by actual_loops provides an accurate comparison of total row volumes.
Tradeoff: If a node runs 0 loops (e.g. inner side of a nested loop where outer returned 0),
actual_loops is 0, correctly resulting in 0 total rows and avoiding false alarms.
"""

from typing import List
from core.models import PlanNode, Finding
from core.config import EngineConfig, Config, Severity


def check_row_estimate_mismatch(root: PlanNode, config: EngineConfig = Config) -> List[Finding]:
    findings: List[Finding] = []

    for node in root.walk():
        # Node must have execution data
        if node.actual_rows is None:
            continue

        actual_total = node.total_actual_rows
        plan_total = node.total_plan_rows

        abs_diff = abs(actual_total - plan_total)
        if abs_diff < config.ROW_MISMATCH_MIN_ROW_DIFF:
            continue

        # Calculate discrepancy factor
        if actual_total == 0 and plan_total == 0:
            continue
        elif actual_total == 0:
            factor = plan_total  # e.g., estimated 50,000, got 0
        elif plan_total == 0:
            factor = actual_total  # estimated 0, got 50,000
        else:
            factor = max(actual_total, plan_total) / min(actual_total, plan_total)

        if factor < config.ROW_MISMATCH_FACTOR_WARNING:
            continue

        severity = (
            Severity.CRITICAL
            if (factor >= config.ROW_MISMATCH_FACTOR_CRITICAL and abs_diff >= config.ROW_MISMATCH_MIN_ROW_DIFF * 5)
            else Severity.WARNING
        )

        direction = "underestimated" if plan_total < actual_total else "overestimated"
        target_name = node.relation_name or node.alias or node.node_type

        explanation = (
            f"Planner {direction} rows on {node.node_type} ({target_name}) by a factor of {factor:.1f}x. "
            f"Planner estimated {plan_total:,.0f} total rows ({node.plan_rows:,.0f}/loop), "
            f"but execution produced {actual_total:,.0f} total rows ({node.actual_rows:,.0f}/loop across {node.actual_loops} loops). "
            f"Large estimation errors cause the optimizer to select suboptimal join algorithms (e.g. Nested Loop instead of Hash Join) "
            f"or misallocate work_mem."
        )

        relation_hint = f" on table '{node.relation_name}'" if node.relation_name else ""
        suggestion = (
            f"1. Run `ANALYZE{relation_hint};` to refresh outdated table statistics in pg_statistic.\n"
            f"2. If values are skewed, increase the statistics target:\n"
            f"   `ALTER TABLE {node.relation_name or '<table_name>'} ALTER COLUMN <column> SET STATISTICS 500;`\n"
            f"3. If multiple columns are correlated, create extended statistics:\n"
            f"   `CREATE STATISTICS s_{node.relation_name or 'table'}_corr ON col1, col2 FROM {node.relation_name or 'table'};`\n"
            f"   Followed by `ANALYZE {node.relation_name or 'table'};`."
        )

        findings.append(
            Finding(
                rule_id="row_estimate_mismatch",
                severity=severity,
                node_path=node.node_path,
                title=f"Row estimate {direction} ({factor:.0f}x off) on {node.node_type}",
                explanation=explanation,
                suggestion=suggestion,
            )
        )

    return findings
