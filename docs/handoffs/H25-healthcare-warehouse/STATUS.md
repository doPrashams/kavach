STATUS=metadata-only

# H25 — Healthcare warehouse seed

**BLOCKER:** DuckDB healthcare table seed + minimal dbt for `phi_exposure` /
`patient_null_spike` real break/heal deferred. Healthcare scenarios remain on the
datapack / metadata path (H15 / H20) rather than warehouse seed CSVs under
`data/seeds/healthcare/`.

**Reason:** Prefer not to invent fake warehouse files mid-milestone; full seed + dbt
wiring is non-trivial relative to droppable priority. Revisit when video/demo needs
live PHI-null break/heal against DuckDB.
