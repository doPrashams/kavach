# DataHub Context Layer — Capability Matrix

This module is the **only** way Kavach agents interact with DataHub. It wraps the
DataHub MCP Server (tool calls) and Agent Context Kit for read/write operations.

| Service method | DataHub capability |
|----------------|-------------------|
| `get_dataset` | Dataset metadata |
| `get_schema` | Schema / column metadata |
| `get_upstreams` / `get_downstreams` | Table + **column-level lineage** traversal |
| `get_blast_radius` | Downstream impact (tables, dashboards, **mlModel**, **mlModelDeployment**) |
| `get_dataset_queries` | **Query history** |
| `get_ml_model` | **ML entity** lineage (features → model) |
| `get_owners` | **Ownership** |
| `search` | Discovery across datasets and **tags** |
| `save_context_document` | **Context Documents** (Agent Context Kit write) |
| `retrieve_context` | **Context Documents** (Agent Context Kit read) |
| `add_tags` | **Tag** management |
| `update_description` | **Description** updates |
| `create_incident` / `update_incident` / `resolve_incident` | **Incidents** (OSS GraphQL) |
| `emit_assertion` | **Assertion** entity emission |
| `add_glossary_term` | **Glossary** term attachment |

## Modes

- **Live**: `DATAHUB_GMS_URL` + `DATAHUB_TOKEN` set → MCP + SDK + GraphQL.
- **Fixture**: env unset → loads `data/fixtures/` + `ml/fixtures/`; writes append to
  `data/fixtures/writeback.jsonl`.

## Demo anchor

`get_blast_radius_demo()` traces `main_marts.mart_demand_features.next_day_qty` through
column-level feature lineage to the `mlModelDeployment` registered in H02.
