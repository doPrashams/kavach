# H05 — Chaos engine + scenarios

**Milestone:** M3 · **Depends on:** H01–H04 · **Prereqs env:** none to pass verify.

## Goal
Build the chaos engine — controlled, deterministic failure injection into the H01 data
platform — that triggers the agent team (H04). Four seeded scenarios, each producing a real,
detectable defect the agents must resolve. This is the "Inject Chaos" demo button.

## Context recap
H01's DuckDB warehouse + dbt marts are real; H04's agent graph runs incidents. Chaos injects a
fault upstream, re-runs the affected part of the pipeline (or mutates the warehouse), which
Sentinel detects → full agent loop → Fixer PR (H06) → merge heals it. Everything deterministic
via seeds so demos and replay are reproducible.

## The four scenarios (`backend/app/chaos/scenarios/`)
1. **freshness_lag** — stop/lag the `orders` feed so `mart_daily_revenue` goes stale; detect
   via freshness assertion.
2. **schema_drift** — a supplier feed renames/retypes a column (e.g. `qty`→`quantity`, int→str)
   breaking `stg_order_items` → `mart_demand_features`; detect via schema assertion.
3. **null_spike** — inject a burst of NULLs into `orders.customer_id`; detect via null-rate
   assertion; propagates to revenue mart.
4. **value_corruption** — corrupt `order_items.unit_price` (e.g. negative / 100x) skewing
   `mart_demand_features` → threatens the **ML model** (this is the ML Guardian showcase).

## Deliverables (`backend/app/chaos/`)
- `engine.py` — `ChaosEngine`: `inject(scenario, seed)`, `heal(scenario)` (revert),
  `status()`. Snapshots affected tables before injecting so heal is exact. Records a
  `ChaosEvent`.
- `scenarios/base.py` — `Scenario` protocol: `inject(warehouse)`, `expected_signal()`
  (what assertion should fire), `expected_blast_radius()` (used to score agent correctness),
  `heal(warehouse)`.
- `scenarios/*.py` — the four scenarios above.
- `app/main.py` — `POST /chaos/inject` `{scenario, seed}` → triggers injection then kicks off
  an agent run (H04) → returns `run_id`; `POST /chaos/heal`; `GET /chaos/scenarios`.
- Determinism: same `(scenario, seed)` → identical mutation (assert via checksum).
- Tests: `test_chaos.py` — each scenario injects a detectable defect, `expected_signal`
  matches what Sentinel would catch, heal restores the pre-injection checksum, and
  `value_corruption`'s `expected_blast_radius` includes the ML deployment.

## Integration requirement
`POST /chaos/inject` must produce a complete downstream agent run whose `IncidentState`
(from H04) correctly identifies the injected scenario's root cause and blast radius. verify.sh
runs this end-to-end with `StubLLM` over fixtures.

## Definition of done
`verify.sh` exits 0: four scenarios registered; each injects a deterministic, detectable
defect and heals exactly (checksum match); the value_corruption scenario's blast radius
includes the ML deployment; an inject→agent-run cycle completes with the correct root cause
identified using StubLLM; ruff+mypy+pytest green.
