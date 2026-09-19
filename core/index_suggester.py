"""
Index Suggestion Generator for PostgreSQL.

Extracts referenced columns from PostgreSQL filter, join, and condition strings,
classifies them into equality vs. range conditions, orders them according to
B-Tree indexing best practices (Equality First, then Range), and produces
safe `CREATE INDEX CONCURRENTLY` statements.

PARSER DOCUMENTATION & LIMITATIONS:
1. Conjunctions only: The parser splits on top-level `AND` clauses. Complex `OR`
   trees or nested disjunctions cannot be indexed with a single simple B-Tree index
   (PostgreSQL would need BitmapOr / Bitmap Index Scans or separate indexes).
2. Expressions and functions: Expressions like `lower(email) = '...'` or `date_trunc('day', created_at)`
   are detected as raw columns or skipped. Functional / expression indexes are not automatically synthesized.
3. Qualified names: Prefixes like `table.column` or `"table"."column"` have their table qualifier stripped
   when generating the index on `table`.
4. Type casts: Casts such as `'active'::text` or `col::integer` are stripped to isolate the identifier.
5. Heuristic disclaimer: These statements are rule-based recommendations and must always be
   verified against table write throughput, existing indexes, and column cardinality.

DESIGN DECISION: Order equality columns before range columns (the "Equality then Range" rule).
Tradeoff: Matches PostgreSQL B-tree traversal mechanics (inequality/range bounds stop subsequent
columns from being used for B-Tree seek operations), but does not account for pre-sorting/ORDER BY
needs unless explicitly fed sort keys.
"""

import re
from dataclasses import dataclass, field
from typing import List, Optional, Set, Tuple


@dataclass
class IndexSuggestion:
    table_name: str
    equality_columns: List[str]
    range_columns: List[str]
    statement: str
    index_name: str
    confidence_note: str = "suggested, verify before applying"

    @property
    def all_columns(self) -> List[str]:
        # Preserve order: equality first, then range
        seen: Set[str] = set()
        cols: List[str] = []
        for c in self.equality_columns + self.range_columns:
            if c not in seen:
                seen.add(c)
                cols.append(c)
        return cols


# SQL keywords and literals to avoid misidentifying as columns
RESERVED_WORDS = {
    "true", "false", "null", "now", "current_timestamp", "current_date",
    "text", "integer", "int", "bigint", "boolean", "date", "timestamp",
    "timestamptz", "varchar", "numeric", "and", "or", "not", "is", "in",
    "between", "like", "ilike", "any", "all", "case", "when", "then", "else", "end"
}


def _clean_token(token: str) -> str:
    """Strips quotes, casts, and parenthetical wrapping from an identifier."""
    token = token.strip()
    # Strip wrapping parentheses
    while token.startswith("(") and token.endswith(")"):
        token = token[1:-1].strip()
    # Strip type cast (e.g. col::text or 'val'::text)
    if "::" in token:
        token = token.split("::")[0].strip()
    # Strip table qualification (e.g., users.status -> status)
    if "." in token:
        token = token.split(".")[-1].strip()
    # Strip double quotes
    token = token.strip('"').strip("'")
    return token


def _is_valid_identifier(token: str) -> bool:
    """Checks if a string is a probable column identifier rather than a literal or number."""
    if not token:
        return False
    if token.lower() in RESERVED_WORDS:
        return False
    # Check if number (integer or float)
    if re.match(r"^-?\d+(\.\d+)?$", token):
        return False
    # Must look like an SQL identifier (starts with letter or underscore, alphanumeric)
    if re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", token):
        return True
    return False


def extract_conditions_from_predicate(predicate_str: str) -> List[Tuple[str, str, str]]:
    """
    Parses an EXPLAIN filter predicate into a list of (column, operator_type, raw_clause).
    operator_type is either 'EQUALITY' or 'RANGE'.
    """
    if not predicate_str:
        return []

    # Clean outer parentheses
    text = predicate_str.strip()
    # Split by top-level 'AND' (ignoring nested parens is approximated here by splitting AND keywords)
    # In Postgres JSON, filters look like: "((status = 'active'::text) AND (created_at >= '2025-01-01'::date))"
    # Or "(status = 'active'::text AND created_at >= '2025-01-01'::date)"
    clauses = re.split(r"\s+AND\s+", text, flags=re.IGNORECASE)
    results: List[Tuple[str, str, str]] = []

    for raw_clause in clauses:
        clause = raw_clause.strip()
        # Strip redundant parentheses
        while clause.startswith("(") and clause.endswith(")"):
            # Ensure it's a balanced outer pair, not (a = 1) AND (b = 2)
            if clause[1:-1].count("(") == clause[1:-1].count(")"):
                clause = clause[1:-1].strip()
            else:
                break

        # Check for Equality: =, IS NULL, IS NOT NULL, IS TRUE, IS FALSE
        eq_match = re.search(r"([a-zA-Z0-9_\.\"]+)\s*(=|IS\s+NOT\s+NULL|IS\s+NULL|IS\s+TRUE|IS\s+FALSE)", clause, re.IGNORECASE)
        # Check for Range: >=, <=, >, <, BETWEEN, !=, <>
        range_match = re.search(r"([a-zA-Z0-9_\.\"]+)\s*(>=|<=|>|<|!=|<>|BETWEEN)", clause, re.IGNORECASE)

        if eq_match:
            candidate = _clean_token(eq_match.group(1))
            if _is_valid_identifier(candidate):
                results.append((candidate, "EQUALITY", clause))
                continue

        if range_match:
            candidate = _clean_token(range_match.group(1))
            if _is_valid_identifier(candidate):
                results.append((candidate, "RANGE", clause))
                continue

    return results


def generate_index_suggestion(
    table_name: str,
    filter_predicate: Optional[str] = None,
    join_predicate: Optional[str] = None,
    sort_keys: Optional[List[str]] = None,
    schema: Optional[str] = None,
) -> Optional[IndexSuggestion]:
    """
    Generates an IndexSuggestion for a relation based on filter, join, and sort predicates.
    Follows Postgres indexing best practice: Equality columns first, then Range columns, then Sort keys.
    """
    if not table_name:
        return None

    equality_cols: List[str] = []
    range_cols: List[str] = []
    seen_cols: Set[str] = set()

    for pred in [filter_predicate, join_predicate]:
        if not pred:
            continue
        extracted = extract_conditions_from_predicate(pred)
        for col, op_type, _ in extracted:
            if col in seen_cols:
                continue
            seen_cols.add(col)
            if op_type == "EQUALITY":
                equality_cols.append(col)
            else:
                range_cols.append(col)

    # If there are sort keys and no range columns, sort keys can be appended to support index scan ordering
    if sort_keys and not range_cols:
        for sk in sort_keys:
            # Sort keys can contain direction modifiers, e.g. "created_at DESC" or "col ASC NULLS LAST"
            token_candidate = sk.strip().split()[0] if sk.strip() else ""
            cleaned_sk = _clean_token(token_candidate)
            if _is_valid_identifier(cleaned_sk) and cleaned_sk not in seen_cols:
                seen_cols.add(cleaned_sk)
                range_cols.append(cleaned_sk)

    all_cols = equality_cols + range_cols
    if not all_cols:
        return None

    # Generate a clean, descriptive index name: idx_{table}_{cols}
    col_str = "_".join(all_cols[:3])
    if len(all_cols) > 3:
        col_str += "_etc"
    # Ensure index name fits Postgres 63-byte NAMEDATALEN limit
    index_name = f"idx_{table_name}_{col_str}"
    if len(index_name) > 60:
        index_name = index_name[:60]

    cols_formatted = ", ".join(all_cols)
    schema_prefix = f"{schema}." if schema and schema != "public" else ""
    target_table = f"{schema_prefix}{table_name}"

    sql_statement = f"CREATE INDEX CONCURRENTLY {index_name} ON {target_table} ({cols_formatted});"

    return IndexSuggestion(
        table_name=table_name,
        equality_columns=equality_cols,
        range_columns=range_cols,
        statement=sql_statement,
        index_name=index_name,
        confidence_note="suggested, verify before applying",
    )
