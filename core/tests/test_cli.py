"""
Unit tests for the Slowgres CLI command.
"""

import io
import sys
import unittest
from contextlib import redirect_stdout, redirect_stderr
from pathlib import Path
from core.cli import run_analyze

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "fixtures"


class TestCLI(unittest.TestCase):
    def test_cli_analyze_success(self):
        fixture_path = str(FIXTURES_DIR / "01_seq_scan_filtered_bad.json")
        out_buf = io.StringIO()
        with redirect_stdout(out_buf):
            exit_code = run_analyze(fixture_path, output_json=False)

        self.assertEqual(exit_code, 0)
        output = out_buf.getvalue()
        self.assertIn("SLOWGRES - POSTGRES EXPLAIN PLAN ANALYSIS REPORT", output)
        self.assertIn("seq_scan_filtered", output)
        self.assertIn("CREATE INDEX CONCURRENTLY", output)

    def test_cli_analyze_json_flag(self):
        fixture_path = str(FIXTURES_DIR / "01_seq_scan_filtered_good.json")
        out_buf = io.StringIO()
        with redirect_stdout(out_buf):
            exit_code = run_analyze(fixture_path, output_json=True)

        self.assertEqual(exit_code, 0)
        output = out_buf.getvalue()
        self.assertIn('"findings": []', output)
        self.assertIn('"plan_tree"', output)

    def test_cli_nonexistent_file(self):
        err_buf = io.StringIO()
        with redirect_stderr(err_buf):
            exit_code = run_analyze("nonexistent_path_123.json")

        self.assertEqual(exit_code, 1)
        self.assertIn("File not found", err_buf.getvalue())


if __name__ == "__main__":
    unittest.main()
