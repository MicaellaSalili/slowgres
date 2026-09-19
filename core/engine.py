"""
Rules Engine coordinator for Slowgres.

Runs all active performance rules against a parsed plan tree, aggregates findings,
and sorts them by severity and potential performance impact.
"""

from typing import List, Optional, Union
from core.models import PlanAnalysis, PlanNode, Finding, Severity
from core.config import EngineConfig, Config
from core.parser import parse_plan_json
from core.rules import ALL_RULES

SEVERITY_ORDER = {
    Severity.CRITICAL: 0,
    Severity.WARNING: 1,
    Severity.INFO: 2,
}


def analyze_plan(
    plan_input: Union[str, bytes, dict, list, PlanAnalysis],
    config: EngineConfig = Config,
) -> PlanAnalysis:
    """
    Parses (if necessary) and evaluates all rules against a PostgreSQL EXPLAIN plan.
    
    Returns the analyzed PlanAnalysis with populated, prioritized findings.
    """
    if isinstance(plan_input, PlanAnalysis):
        analysis = plan_input
    else:
        analysis = parse_plan_json(plan_input)

    all_findings: List[Finding] = []

    for rule_fn in ALL_RULES:
        try:
            findings = rule_fn(analysis.root, config)
            all_findings.extend(findings)
        except Exception as e:
            # Shield engine execution so a single rule issue doesn't crash the entire analysis
            all_findings.append(
                Finding(
                    rule_id=getattr(rule_fn, "__name__", "unknown_rule"),
                    severity=Severity.INFO,
                    node_path="0",
                    title="Rule execution error",
                    explanation=f"Encountered unexpected error running rule: {str(e)}",
                    suggestion="Please report this issue with the EXPLAIN JSON payload.",
                )
            )

    # Sort findings: CRITICAL -> WARNING -> INFO
    all_findings.sort(key=lambda f: SEVERITY_ORDER.get(f.severity, 99))
    analysis.findings = all_findings

    return analysis
