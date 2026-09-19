"""
Slowgres Rules Engine Modules.

Each rule is implemented as a pure, unit-testable function with signature:
`check_rule(root: PlanNode, config: EngineConfig = Config) -> List[Finding]`
"""

from typing import List, Callable
from core.models import PlanNode, Finding
from core.config import EngineConfig, Config

from core.rules.seq_scan_filtered import check_seq_scan_filtered
from core.rules.row_estimate_mismatch import check_row_estimate_mismatch
from core.rules.sort_spill_to_disk import check_sort_spill_to_disk
from core.rules.hash_multiple_batches import check_hash_multiple_batches
from core.rules.nested_loop_heavy import check_nested_loop_heavy
from core.rules.filter_after_index_scan import check_filter_after_index_scan

ALL_RULES: List[Callable[[PlanNode, EngineConfig], List[Finding]]] = [
    check_seq_scan_filtered,
    check_row_estimate_mismatch,
    check_sort_spill_to_disk,
    check_hash_multiple_batches,
    check_nested_loop_heavy,
    check_filter_after_index_scan,
]

__all__ = [
    "ALL_RULES",
    "check_seq_scan_filtered",
    "check_row_estimate_mismatch",
    "check_sort_spill_to_disk",
    "check_hash_multiple_batches",
    "check_nested_loop_heavy",
    "check_filter_after_index_scan",
]
