# H20 — Wake VM + load DataHub datapacks

**Milestone:** M6 · **Depends on:** H11 · **Priority:** normal · **Prereqs:** `gcloud` auth
to project `kavach-71704`; SSH access to `kavach-datahub`.

## Goal
Bring the DataHub GCP VM online on a cost-safe schedule, then load three public datapacks
(`fiction-retail`, `healthcare`, `nyc-taxi`) so agents have richer catalog metadata beyond
the retail demo fixtures.

## Files you need to read:
1. `deploy/README.md`
2. `knowledge/KAVACH_PROJECT_GUIDE.md`
3. `docs/handoffs/CONVENTIONS.md`
4. `data/ingestion/datahub_recipe.duckdb.yml`
5. `docs/handoffs/H11-deploy/HANDOFF.md`

## Steps
1. Start the VM:
   ```bash
   gcloud compute instances start kavach-datahub \
     --zone=us-central1-a --project=kavach-71704
   ```
2. Create (or reuse) a resource policy that stops the instance daily ~06:00 UTC:
   ```bash
   gcloud compute resource-policies create instance-schedule kavach-nightly-off \
     --project=kavach-71704 --region=us-central1 \
     --vm-stop-schedule="0 6 * * *" \
     --timezone="UTC"
   gcloud compute instances add-resource-policies kavach-datahub \
     --zone=us-central1-a --project=kavach-71704 \
     --resource-policies=kavach-nightly-off
   ```
3. SSH in and load datapacks via DataHub CLI if available on the VM
   (`datahub ingest` / datapack install — use whatever the VM has). Targets:
   - `fiction-retail`
   - `healthcare`
   - `nyc-taxi`
4. Write exact, copy-pasteable commands (start, schedule attach, SSH, datapack load,
   stop) into `docs/handoffs/H20-vm-datapacks/RUN.md`.
5. Prefer checking instance status with `gcloud compute instances describe` when
   `gcloud` is available. Do **not** fail verify solely because the VM is unreachable.

## Deliverables
- `docs/handoffs/H20-vm-datapacks/RUN.md` — operator commands only (no secrets).
- Resource policy `kavach-nightly-off` attached (live GCP; document in RUN.md).
- Datapacks loaded when CLI/network allow; otherwise RUN.md documents the intended commands
  and notes the blocker.

## Definition of done
`verify.sh` exits 0: `RUN.md` exists and contains `gcloud` start plus datapack load commands.
If `gcloud` works, prefer logging instance status; if VM unreachable, log `WARN` and still pass.
