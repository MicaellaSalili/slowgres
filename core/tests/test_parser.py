"""
Unit tests for the PostgreSQL EXPLAIN plan parser.
"""

import unittest
from core.parser import parse_plan_json
from core.models import PlanNode


class TestPlanParser(unittest.TestCase):
    def test_parse_standard_postgres_array(self):
        raw = """[
            {
                "Plan": {
                    "Node Type": "Seq Scan",
                    "Relation Name": "users",
                    "Startup Cost": 0.00,
                    "Total Cost": 35.50,
                    "Plan Rows": 100,
                    "Plan Width": 32,
                    "Actual Startup Time": 0.012,
                    "Actual Total Time": 1.450,
                    "Actual Rows": 120,
                    "Actual Loops": 1
                },
                "Planning Time": 0.150,
                "Execution Time": 1.620
            }
        ]"""
        analysis = parse_plan_json(raw)
        self.assertEqual(analysis.planning_time_ms, 0.150)
        self.assertEqual(analysis.execution_time_ms, 1.620)
        self.assertEqual(analysis.root.node_type, "Seq Scan")
        self.assertEqual(analysis.root.relation_name, "users")
        self.assertEqual(analysis.root.total_actual_rows, 120)
        self.assertEqual(analysis.root.total_plan_rows, 100)

    def test_parse_bare_object(self):
        raw = {
            "Plan": {
                "Node Type": "Index Scan",
                "Relation Name": "orders",
                "Startup Cost": 0.28,
                "Total Cost": 8.50,
                "Plan Rows": 5,
                "Plan Width": 16,
                "Actual Rows": 5,
                "Actual Loops": 10
            }
        }
        analysis = parse_plan_json(raw)
        self.assertEqual(analysis.root.node_type, "Index Scan")
        self.assertEqual(analysis.root.actual_loops, 10)
        # Total actual rows across 10 loops = 5 * 10 = 50
        self.assertEqual(analysis.root.total_actual_rows, 50)
        self.assertEqual(analysis.root.total_plan_rows, 50)

    def test_parse_nested_hierarchy_and_self_time(self):
        raw = {
            "Plan": {
                "Node Type": "Aggregate",
                "Actual Total Time": 10.0,
                "Actual Loops": 1,
                "Plans": [
                    {
                        "Node Type": "Seq Scan",
                        "Relation Name": "items",
                        "Actual Total Time": 7.0,
                        "Actual Loops": 1
                    }
                ]
            }
        }
        analysis = parse_plan_json(raw)
        root = analysis.root
        self.assertEqual(len(root.plans), 1)
        child = root.plans[0]
        self.assertEqual(child.parent, root)
        self.assertEqual(child.node_path, "0.0")
        self.assertEqual(root.total_actual_time, 10.0)
        self.assertEqual(child.total_actual_time, 7.0)
        # Self time of Aggregate = 10.0 - 7.0 = 3.0
        self.assertAlmostEqual(root.self_time, 3.0, places=2)
        self.assertAlmostEqual(child.self_time, 7.0, places=2)

    def test_invalid_json_raises_value_error(self):
        with self.assertRaises(ValueError) as ctx:
            parse_plan_json("{ malformed json }")
        self.assertIn("not valid JSON", str(ctx.exception))

    def test_empty_list_raises_value_error(self):
        with self.assertRaises(ValueError) as ctx:
            parse_plan_json("[]")
        self.assertIn("empty", str(ctx.exception))

    def test_missing_node_type_raises_value_error(self):
        with self.assertRaises(ValueError) as ctx:
            parse_plan_json('{"Invalid": 123}')
        self.assertIn("Could not find 'Plan' or 'Node Type'", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
