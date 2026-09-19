"""
Configuration constants and thresholds for the Slowgres rules engine.

DESIGN DECISION: Keep all numerical detection thresholds in this single file
as named constants instead of scattering them across rule implementations.
Tradeoff: Centralizes tuning and makes tests easily configurable at the cost of
separating thresholds from individual rule logic.
"""

from dataclasses import dataclass
from enum import Enum


class Severity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


@dataclass(frozen=True)
class EngineConfig:
    # Rule 1: seq_scan_filtered
    # Minimum rows removed by a filter on a Seq Scan before flagging.
    # Avoids alerting on tiny utility tables or negligible row counts.
    SEQ_SCAN_MIN_REMOVED_ROWS: int = 1_000
    # Minimum ratio of (removed rows) / (removed rows + actual rows).
    # 0.5 means at least 50% of the scanned rows were discarded by the filter.
    SEQ_SCAN_FILTER_REMOVAL_RATIO: float = 0.5
    # High threshold for escalating Seq Scan from WARNING to CRITICAL.
    SEQ_SCAN_CRITICAL_REMOVED_ROWS: int = 50_000

    # Rule 2: row_estimate_mismatch
    # Factor difference between estimated rows and actual rows (per node across all loops).
    # Example: 10 means actual is >= 10x estimated OR estimated is >= 10x actual.
    ROW_MISMATCH_FACTOR_WARNING: float = 10.0
    ROW_MISMATCH_FACTOR_CRITICAL: float = 100.0
    # Minimum absolute row difference to prevent alerting on small counts (e.g., 1 row estimated vs 10 actual).
    ROW_MISMATCH_MIN_ROW_DIFF: int = 1_000

    # Rule 3: sort_spill_to_disk
    # Any disk spill indicates work_mem exhaustion.
    # Flag as CRITICAL if disk space exceeds this threshold (in kB).
    SORT_DISK_CRITICAL_KB: int = 10_240  # 10 MB

    # Rule 4: hash_multiple_batches
    # Hash batches > 1 implies hash table exceeded work_mem and partitioned to disk.
    HASH_BATCHES_WARNING: int = 2
    HASH_BATCHES_CRITICAL: int = 8

    # Rule 5: nested_loop_heavy
    # Inner child of a Nested Loop executing without an index over many iterations.
    NESTED_LOOP_MIN_LOOPS: int = 50
    NESTED_LOOP_CRITICAL_LOOPS: int = 500

    # Rule 6: filter_after_index_scan
    # Rows removed by filter after an Index Scan or Bitmap Index Scan.
    FILTER_AFTER_INDEX_MIN_REMOVED_ROWS: int = 500
    FILTER_AFTER_INDEX_REMOVAL_RATIO: float = 0.2
    # For Index Only Scan: Heap Fetches threshold (indicates unvacuumed pages).
    INDEX_ONLY_HEAP_FETCHES_WARNING: int = 100
    INDEX_ONLY_HEAP_FETCHES_CRITICAL: int = 5_000


Config = EngineConfig()
