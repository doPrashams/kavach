"""Generated backfill DAG for stale orders feed (artifact only)."""

from datetime import datetime, timedelta


def backfill_orders(start: datetime, end: datetime) -> None:
    """Backfill missing orders window — not executed in demo."""
    print(f"Would backfill orders from {start} to {end}")
