#!/usr/bin/env python3
"""Generate deterministic seed CSVs for the Kavach retail demo platform."""

from __future__ import annotations

import argparse
import csv
import hashlib
import random
from datetime import date, timedelta
from pathlib import Path

SEED = 42
ROWS = {
    "orders": 800,
    "order_items": 1500,
    "products": 120,
    "suppliers": 25,
    "customers": 600,
}

ROOT = Path(__file__).resolve().parent
SEEDS_DIR = ROOT / "seeds"


def _rng(name: str) -> random.Random:
    digest = int(hashlib.sha256(f"{SEED}:{name}".encode()).hexdigest(), 16)
    return random.Random(digest % (2**32))


def generate_suppliers() -> list[dict[str, str | float]]:
    rng = _rng("suppliers")
    regions = ["north", "south", "east", "west", "central"]
    rows: list[dict[str, str | float]] = []
    for i in range(1, ROWS["suppliers"] + 1):
        rows.append(
            {
                "supplier_id": f"SUP{i:04d}",
                "supplier_name": f"Supplier {i}",
                "region": rng.choice(regions),
                "reliability_score": round(rng.uniform(0.55, 0.99), 4),
            }
        )
    return rows


def generate_products(suppliers: list[dict[str, str | float]]) -> list[dict[str, str | float]]:
    rng = _rng("products")
    categories = ["electronics", "apparel", "home", "grocery", "sports"]
    rows: list[dict[str, str | float]] = []
    for i in range(1, ROWS["products"] + 1):
        supplier = suppliers[(i - 1) % len(suppliers)]
        rows.append(
            {
                "product_id": f"PRD{i:05d}",
                "product_name": f"Product {i}",
                "category": rng.choice(categories),
                "unit_price": round(rng.uniform(5.0, 250.0), 2),
                "supplier_id": str(supplier["supplier_id"]),
            }
        )
    return rows


def generate_customers() -> list[dict[str, str]]:
    rng = _rng("customers")
    tiers = ["bronze", "silver", "gold", "platinum"]
    rows: list[dict[str, str]] = []
    for i in range(1, ROWS["customers"] + 1):
        rows.append(
            {
                "customer_id": f"CUST{i:05d}",
                "customer_name": f"Customer {i}",
                "email": f"customer{i}@example.com",
                "loyalty_tier": rng.choice(tiers),
            }
        )
    return rows


def generate_orders(customers: list[dict[str, str]]) -> list[dict[str, str]]:
    rng = _rng("orders")
    start = date(2024, 1, 1)
    rows: list[dict[str, str]] = []
    for i in range(1, ROWS["orders"] + 1):
        customer = customers[(i - 1) % len(customers)]
        order_date = start + timedelta(days=rng.randint(0, 364))
        rows.append(
            {
                "order_id": f"ORD{i:06d}",
                "customer_id": str(customer["customer_id"]),
                "order_date": order_date.isoformat(),
                "status": rng.choice(["completed", "completed", "completed", "cancelled", "pending"]),
            }
        )
    return rows


def generate_order_items(
    orders: list[dict[str, str]], products: list[dict[str, str | float]]
) -> list[dict[str, str | int | float]]:
    rng = _rng("order_items")
    rows: list[dict[str, str | int | float]] = []
    for i in range(1, ROWS["order_items"] + 1):
        order = orders[(i - 1) % len(orders)]
        product = products[(i * 7) % len(products)]
        qty = rng.randint(1, 5)
        unit_price = float(product["unit_price"])
        rows.append(
            {
                "order_item_id": f"OI{i:07d}",
                "order_id": str(order["order_id"]),
                "product_id": str(product["product_id"]),
                "quantity": qty,
                "line_total": round(qty * unit_price, 2),
            }
        )
    return rows


def write_csv(path: Path, rows: list[dict[str, str | int | float]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not rows:
        return
    with path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def generate_all() -> dict[str, list[dict[str, str | int | float]]]:
    suppliers = generate_suppliers()
    products = generate_products(suppliers)
    customers = generate_customers()
    orders = generate_orders(customers)
    order_items = generate_order_items(orders, products)
    return {
        "suppliers": suppliers,
        "products": products,
        "customers": customers,
        "orders": orders,
        "order_items": order_items,
    }


def write_seeds() -> None:
    data = generate_all()
    for name, rows in data.items():
        write_csv(SEEDS_DIR / f"{name}.csv", rows)


def checksums() -> dict[str, str]:
    out: dict[str, str] = {}
    for path in sorted(SEEDS_DIR.glob("*.csv")):
        out[path.name] = hashlib.sha256(path.read_bytes()).hexdigest()
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate retail seed CSVs")
    parser.add_argument("--check", action="store_true", help="Verify seeds are deterministic")
    args = parser.parse_args()

    if args.check:
        before = checksums()
        write_seeds()
        after = checksums()
        if before != after:
            raise SystemExit("Seed regeneration changed checksums — not deterministic")
        print("seeds deterministic")
        return

    write_seeds()
    print(f"Wrote seeds to {SEEDS_DIR}")


if __name__ == "__main__":
    main()
