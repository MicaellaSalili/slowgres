"""
Unit tests for all 6 performance rules using positive and negative plan fixtures.
"""

import json
import unittest
from pathlib import Path

from core.parser import parse_plan_json
from core.config import Config, EngineConfig, Severity
from core.rules.seq_scan_filtered import check_seq_scan_filtered
from core.rules.row_estimate_mismatch import check_row_estimate_mismatch
from core.rules.sort_spill_to_disk import check_sort_spill_to_disk
from core.rules.hash_multiple_batches import check_hash_multiple_batches
from core.rules.nested_loop_heavy import check_nested_loop_heavy
from core.rules.filter_after_index_scan import check_filter_after_index_scan
from core.engine import analyze_plan

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "fixtures"


def load_fixture(filename: str) -> str:
    path = FIXTURES_DIR / filename
    return path.read_text(encoding="utf-8")


class TestPlanRules(unittest.TestCase):
    # -------------------------------------------------------------------------
    # Rule 1: seq_scan_filtered
    # -------------------------------------------------------------------------
    def test_seq_scan_filtered_triggers_on_bad_fixture(self):
        plan_text = load_fixture("01_seq_scan_filtered_bad.json")
        analysis = parse_plan_json(plan_text)
        findings = check_seq_scan_filtered(analysis.root)

        self.assertEqual(len(findings), 1)
        f = findings[0]
        self.assertEqual(f.rule_id, "seq_scan_filtered")
        self.assertEqual(f.severity, Severity.CRITICAL)
        self.assertIn("orders", f.title)
        self.assertIn("CREATE INDEX CONCURRENTLY", f.suggestion)
        self.assertIn("suggested, verify before applying", f.suggestion)

    def test_seq_scan_filtered_does_not_trigger_on_good_fixture(self):
        plan_text = load_fixture("01_seq_scan_filtered_good.json")
        analysis = parse_plan_json(plan_text)
        findings = check_seq_scan_filtered(analysis.root)
        self.assertEqual(len(findings), 0)

    # -------------------------------------------------------------------------
    # Rule 2: row_estimate_mismatch
    # -------------------------------------------------------------------------
    def test_row_estimate_mismatch_triggers_on_bad_fixture(self):
        plan_text = load_fixture("02_row_estimate_mismatch_bad.json")
        analysis = parse_plan_json(plan_text)
        findings = check_row_estimate_mismatch(analysis.root)

        self.assertGreaterEqual(len(findings), 1)
        f = findings[0]
        self.assertEqual(f.rule_id, "row_estimate_mismatch")
        self.assertEqual(f.severity, Severity.CRITICAL)
        self.assertIn("underestimated", f.title)
        self.assertIn("ANALYZE", f.suggestion)

    def test_row_estimate_mismatch_does_not_trigger_on_good_fixture(self):
        plan_text = load_fixture("02_row_estimate_mismatch_good.json")
        analysis = parse_plan_json(plan_text)
        findings = check_row_estimate_mismatch(analysis.root)
        self.assertEqual(len(findings), 0)

    # -------------------------------------------------------------------------
    # Rule 3: sort_spill_to_disk
    # -------------------------------------------------------------------------
    def test_sort_spill_to_disk_triggers_on_bad_fixture(self):
        plan_text = load_fixture("03_sort_spill_to_disk_bad.json")
        analysis = parse_plan_json(plan_text)
        findings = check_sort_spill_to_disk(analysis.root)

        self.assertEqual(len(findings), 1)
        f = findings[0]
        self.assertEqual(f.rule_id, "sort_spill_to_disk")
        self.assertEqual(f.severity, Severity.CRITICAL)
        self.assertIn("spilled to disk", f.title)
        self.assertIn("work_mem", f.suggestion)

    def test_sort_spill_to_disk_does_not_trigger_on_good_fixture(self):
        plan_text = load_fixture("03_sort_spill_to_disk_good.json")
        analysis = parse_plan_json(plan_text)
        findings = check_sort_spill_to_disk(analysis.root)
        self.assertEqual(len(findings), 0)

    # -------------------------------------------------------------------------
    # Rule 4: hash_multiple_batches
    # -------------------------------------------------------------------------
    def test_hash_multiple_batches_triggers_on_bad_fixture(self):
        plan_text = load_fixture("04_hash_multiple_batches_bad.json")
        analysis = parse_plan_json(plan_text)
        findings = check_hash_multiple_batches(analysis.root)

        self.assertEqual(len(findings), 1)
        f = findings[0]
        self.assertEqual(f.rule_id, "hash_multiple_batches")
        self.assertIn("4 batches", f.title)
        self.assertIn("work_mem", f.suggestion)

    def test_hash_multiple_batches_does_not_trigger_on_good_fixture(self):
        plan_text = load_fixture("04_hash_multiple_batches_good.json")
        analysis = parse_plan_json(plan_text)
        findings = check_hash_multiple_batches(analysis.root)
        self.assertEqual(len(findings), 0)

    # -------------------------------------------------------------------------
    # Rule 5: nested_loop_heavy
    # -------------------------------------------------------------------------
    def test_nested_loop_heavy_triggers_on_bad_fixture(self):
        plan_text = load_fixture("05_nested_loop_heavy_bad.json")
        analysis = parse_plan_json(plan_text)
        findings = check_nested_loop_heavy(analysis.root)

        self.assertEqual(len(findings), 1)
        f = findings[0]
        self.assertEqual(f.rule_id, "nested_loop_heavy")
        self.assertEqual(f.severity, Severity.CRITICAL)
        self.assertIn("2,500 loops", f.title)
        self.assertIn("children", f.suggestion)

    def test_nested_loop_heavy_does_not_trigger_on_good_fixture(self):
        plan_text = load_fixture("05_nested_loop_heavy_good.json")
        analysis = parse_plan_json(plan_text)
        findings = check_nested_loop_heavy(analysis.root)
        self.assertEqual(len(findings), 0)

    # -------------------------------------------------------------------------
    # Rule 6: filter_after_index_scan
    # -------------------------------------------------------------------------
    def test_filter_after_index_scan_triggers_on_bad_fixture(self):
        plan_text = load_fixture("06_filter_after_index_scan_bad.json")
        analysis = parse_plan_json(plan_text)
        findings = check_filter_after_index_scan(analysis.root)

        # Triggers both filter discard and high heap fetches
        self.assertGreaterEqual(len(findings), 2)
        rule_ids = [f.rule_id for f in findings]
        self.assertTrue(all(r == "filter_after_index_scan" for r in rule_ids))
        titles = [f.title for f in findings]
        self.assertTrue(any("Heap Fetches" in t for t in titles))
        self.assertTrue(any("Secondary Filter discarded" in t for t in titles))

    def test_filter_after_index_scan_does_not_trigger_on_good_fixture(self):
        plan_text = load_fixture("06_filter_after_index_scan_good.json")
        analysis = parse_plan_json(plan_text)
        findings = check_filter_after_index_scan(analysis.root)
        self.assertEqual(len(findings), 0)

    # -------------------------------------------------------------------------
    # Engine integration & priority ordering
    # -------------------------------------------------------------------------
    def test_engine_aggregates_and_sorts_by_severity(self):
        plan_text = load_fixture("06_filter_after_index_scan_bad.json")
        analysis = analyze_plan(plan_text)
        self.assertGreater(len(analysis.findings), 0)
        # Verify order: CRITICAL before WARNING
        severities = [f.severity for f in analysis.findings]
        seen_warning = False
        for s in severities:
            if s == Severity.WARNING:
                seen_warning = True
            elif s == Severity.CRITICAL and seen_warning:
                self.fail("Found CRITICAL finding after WARNING; ordering invariant broken")


if __name__ == "__main__":
    unittest.main()
