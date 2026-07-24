# Kavach Architecture

Kavach is a self-healing data platform where AI agents operate on DataHub's context graph
to detect, investigate, and remediate data incidents.

## System diagram

```mermaid
flowchart TB
    subgraph UI["Frontend (Next.js)"]
        WarRoom["War Room UI"]
        Deck["/deck demo"]
    end

    subgraph Backend["Backend (FastAPI)"]
        API["REST + SSE API"]
        Agents["LangGraph Agent Team"]
        Chaos["Chaos Engine"]
        Fixer["Fixer (PR codegen)"]
        Flywheel["Knowledge Flywheel"]
        DataHubLayer["DataHub Context Layer"]
        Events["Event Bus + Recorder"]
    end

    subgraph Platform["Data Platform"]
        DuckDB["DuckDB Warehouse"]
        dbt["dbt Models"]
        ML["ML Pipeline"]
    end

    subgraph External["External Services"]
        DH["DataHub GMS"]
        GH["GitHub (demo-pipeline)"]
        MLflow["MLflow"]
    end

    WarRoom --> API
    Deck --> API
    API --> Agents
    Agents --> DataHubLayer
    Agents --> Events
    Chaos --> DuckDB
    Agents --> Fixer
    Fixer --> GH
    Flywheel --> DataHubLayer
    DataHubLayer --> DH
    dbt --> DuckDB
    ML --> DuckDB
    ML --> MLflow
    ML --> DH
```

## Components

| Component | Role |
|-----------|------|
| **Backend** | FastAPI app exposing health, SSE streams, and agent orchestration |
| **Agents** | LangGraph team (Sentinel, Investigator, Fixer, ML Guardian, etc.) |
| **Chaos** | Injects realistic failures into the data platform for demo |
| **DataHub layer** | Typed context service over MCP + Agent Context Kit |
| **Frontend** | War room UI with React Flow graphs and `/deck` animations |
