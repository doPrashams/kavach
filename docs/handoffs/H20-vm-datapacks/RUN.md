# H20 — VM + datapack operator commands

Project: `kavach-71704` · Zone: `us-central1-a` · Instance: `kavach-datahub` · IP: `34.60.67.85`

## Start

```bash
gcloud compute instances start kavach-datahub \
  --zone=us-central1-a --project=kavach-71704
```

Wait for GMS: `curl -sf http://34.60.67.85:8080/health`

## Nightly auto-stop (cost backstop)

```bash
gcloud compute resource-policies create instance-schedule kavach-nightly-off \
  --project=kavach-71704 --region=us-central1 \
  --vm-stop-schedule="0 6 * * *" \
  --timezone="UTC"

gcloud compute instances add-resource-policies kavach-datahub \
  --zone=us-central1-a --project=kavach-71704 \
  --resource-policies=kavach-nightly-off
```

Detach before 24/7 judging (Aug 16 if using GCP; prefer DataHub Cloud trial instead):

```bash
gcloud compute instances remove-resource-policies kavach-datahub \
  --zone=us-central1-a --project=kavach-71704 \
  --resource-policies=kavach-nightly-off
```

## Load official datapacks (on VM)

Hackathon resources list `fiction-retail`, `healthcare`, `nyc-taxi`. On DataHub CLI
v1.5.x quickstart the available packs may only be `bootstrap` and `showcase-ecommerce`
(`datahub datapack load --help`). Load what the installed CLI supports:

```bash
gcloud compute ssh kavach-datahub --zone=us-central1-a --project=kavach-71704 -- \
  'bash -lc "source ~/dh/bin/activate; datahub datapack load showcase-ecommerce; datahub datapack load bootstrap"'
```

For healthcare/nyc-taxi metadata during judging, prefer the DataHub Cloud 21-day trial
(started Aug 10–11) which ships sample data, or upgrade the CLI / use Cloud datapacks.

## Stop (end of session)

```bash
gcloud compute instances stop kavach-datahub \
  --zone=us-central1-a --project=kavach-71704
```

## Status check

```bash
gcloud compute instances describe kavach-datahub \
  --zone=us-central1-a --project=kavach-71704 \
  --format='get(status,networkInterfaces[0].accessConfigs[0].natIP)'
```
