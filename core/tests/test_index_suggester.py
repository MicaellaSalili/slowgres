"""
Unit tests for index extraction, ordering (Equality first, then Range), and DDL generation.
"""

import unittest
from core.index_suggester import (
    extract_conditions_from_predicate,
    generate_index_suggestion,
)


class TestIndexSuggester(unittest.TestCase):
    def test_extract_equality_and_range_conditions(self):
        predicate = "((status = 'active'::text) AND (created_at >= '2024-01-01'::date))"
        conditions = extract_conditions_from_predicate(predicate)
        self.assertEqual(len(conditions), 2)
        self.assertEqual(conditions[0][0], "status")
        self.assertEqual(conditions[0][1], "EQUALITY")
        self.assertEqual(conditions[1][0], "created_at")
        self.assertEqual(conditions[1][1], "RANGE")

    def test_equality_before_range_ordering(self):
        # Range first in the predicate string, but equality must appear first in index columns
        predicate = "(created_at >= '2024-01-01'::date AND org_id = 42)"
        suggestion = generate_index_suggestion("logs", filter_predicate=predicate)
        self.assertIsNotNone(suggestion)
        self.assertEqual(suggestion.equality_columns, ["org_id"])
        self.assertEqual(suggestion.range_columns, ["created_at"])
        # Columns in statement must be: org_id, created_at
        self.assertIn("(org_id, created_at)", suggestion.statement)
        self.assertTrue(suggestion.statement.startswith("CREATE INDEX CONCURRENTLY idx_logs_org_id_created_at ON logs"))

    def test_table_alias_and_quoted_names_cleaning(self):
        predicate = '("users"."tenant_id" = 10 AND "users"."role" = \'admin\'::text AND "users"."score" > 50)'
        suggestion = generate_index_suggestion("users", filter_predicate=predicate)
        self.assertIsNotNone(suggestion)
        self.assertEqual(suggestion.equality_columns, ["tenant_id", "role"])
        self.assertEqual(suggestion.range_columns, ["score"])
        self.assertIn("(tenant_id, role, score)", suggestion.statement)

    def test_sort_keys_appended_after_equality_when_no_range(self):
        predicate = "(status = 'pending'::text)"
        suggestion = generate_index_suggestion(
            "orders",
            filter_predicate=predicate,
            sort_keys=["created_at DESC", "id"],
        )
        self.assertIsNotNone(suggestion)
        self.assertEqual(suggestion.equality_columns, ["status"])
        self.assertEqual(suggestion.range_columns, ["created_at", "id"])
        self.assertIn("(status, created_at, id)", suggestion.statement)

    def test_reserved_words_and_numbers_excluded(self):
        predicate = "(is_active IS TRUE AND 42 = 42 AND NULL IS NULL)"
        suggestion = generate_index_suggestion("users", filter_predicate=predicate)
        self.assertIsNotNone(suggestion)
        self.assertEqual(suggestion.equality_columns, ["is_active"])

    def test_schema_qualification(self):
        predicate = "(org_id = 1)"
        suggestion = generate_index_suggestion("projects", filter_predicate=predicate, schema="tenant_app")
        self.assertIsNotNone(suggestion)
        self.assertIn("ON tenant_app.projects (org_id)", suggestion.statement)


if __name__ == "__main__":
    unittest.main()
