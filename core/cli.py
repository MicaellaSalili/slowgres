"""
Command-Line Interface (CLI) for Slowgres.

Usage:
    python -m core analyze <path_to_plan.json> [--json]
"""

import argparse
import json
import sys
from pathlib import Path
from typing import List
from core.engine import analyze_plan
from core.config import Severity
from core.models import PlanNode


def _format_severity_badge(severity: Severity) -> str:
    # ANSI color codes for terminal display
    if severity == Severity.CRITICAL:
        return "\033[91m[CRITICAL]\033[0m"
    elif severity == Severity.WARNING:
        return "\033[93m[WARNING]\033[0m"
    else:
        return "\033[94m[INFO]\033[0m"


def _find_slowest_nodes(root: PlanNode, limit: int = 3) -> List[PlanNode]:
    """Returns the top N nodes with the highest self execution time."""
    all_nodes = root.walk()
    sorted_nodes = sorted(all_nodes, key=lambda n: n.self_time, reverse=True)
    return sorted_nodes[:limit]


def run_analyze(file_path: str, output_json: bool = False) -> int:
    try:
        if file_path == "-":
            content = sys.stdin.read()
        else:
            path = Path(file_path)
            if not path.exists():
                sys.stderr.write(f"Error: File not found at '{file_path}'\n")
                return 1
            content = path.read_text(encoding="utf-8")

        analysis = analyze_plan(content)

        if output_json:
            print(json.dumps(analysis.to_dict(), indent=2))
            return 0

        # Formatted human-readable output
        print("=" * 72)
        print(" SLOWGRES - POSTGRES EXPLAIN PLAN ANALYSIS REPORT")
        print("=" * 72)

        plan_time_str = f"{analysis.planning_time_ms:.2f} ms" if analysis.planning_time_ms is not None else "N/A"
        exec_time_str = f"{analysis.execution_time_ms:.2f} ms" if analysis.execution_time_ms is not None else f"{analysis.root.total_actual_time:.2f} ms"

        print(f"Planning Time : {plan_time_str}")
        print(f"Execution Time: {exec_time_str}")
        print(f"Total Findings: {len(analysis.findings)}")

        criticals = sum(1 for f in analysis.findings if f.severity == Severity.CRITICAL)
        warnings = sum(1 for f in analysis.findings if f.severity == Severity.WARNING)
        infos = sum(1 for f in analysis.findings if f.severity == Severity.INFO)
        print(f"Summary       : {criticals} Critical, {warnings} Warning, {infos} Info")
        print("-" * 72)

        # Print top slowest operations
        slowest = _find_slowest_nodes(analysis.root, limit=3)
        if slowest and slowest[0].self_time > 0:
            print("SLOWEST OPERATIONS (Exclusive Self-Time):")
            for rank, node in enumerate(slowest, 1):
                rel = f" on {node.relation_name}" if node.relation_name else ""
                print(f"  {rank}. {node.node_type}{rel} (path: {node.node_path}) - {node.self_time:.2f} ms ({node.total_actual_rows:,.0f} rows)")
            print("-" * 72)

        if not analysis.findings:
            print("\033[92mNo major performance anti-patterns detected in this plan!\033[0m")
            print("=" * 72)
            return 0

        print("PERFORMANCE FINDINGS & SUGGESTIONS:")
        for idx, finding in enumerate(analysis.findings, 1):
            badge = _format_severity_badge(finding.severity)
            print(f"\n{idx}. {badge} {finding.title}")
            print(f"   Node Path   : {finding.node_path}")
            print(f"   Rule ID     : {finding.rule_id}")
            print(f"   Explanation : {finding.explanation}")
            print("   Suggestion  :")
            for line in finding.suggestion.splitlines():
                print(f"     {line}")

        print("\n" + "=" * 72)
        return 0

    except Exception as e:
        sys.stderr.write(f"Error analyzing plan: {str(e)}\n")
        return 1


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="python -m core",
        description="Slowgres: A slow-query analyzer for PostgreSQL. Find out why it's slow.",
    )
    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    analyze_parser = subparsers.add_parser("analyze", help="Analyze an EXPLAIN JSON plan")
    analyze_parser.add_argument("file", help="Path to plan JSON file (use '-' for stdin)")
    analyze_parser.add_argument(
        "--json", action="store_true", help="Output analysis report as raw JSON"
    )

    args = parser.parse_args()

    if args.command == "analyze":
        sys.exit(run_analyze(args.file, output_json=args.json))
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
