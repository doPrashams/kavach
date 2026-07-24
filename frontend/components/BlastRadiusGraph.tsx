"use client";

import { useMemo } from "react";
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BlastRadius } from "@/lib/types";

interface BlastRadiusGraphProps {
  blastRadius: BlastRadius | null | undefined;
}

export function BlastRadiusGraph({ blastRadius }: BlastRadiusGraphProps) {
  const { nodes, edges } = useMemo(() => buildGraph(blastRadius), [blastRadius]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Blast radius</CardTitle>
      </CardHeader>
      <CardContent className="h-[360px] p-0">
        <div className="h-full w-full" data-testid="blast-radius-graph">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            proOptions={{ hideAttribution: true }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnScroll
            zoomOnScroll
          >
            <Background color="#334155" gap={16} />
            <MiniMap nodeStrokeWidth={2} pannable zoomable />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
      </CardContent>
    </Card>
  );
}

function buildGraph(blastRadius: BlastRadius | null | undefined): {
  nodes: Node[];
  edges: Edge[];
} {
  if (!blastRadius) {
    return { nodes: [], edges: [] };
  }

  const source = blastRadius.datasets[0];
  const staging = blastRadius.datasets[1] ?? blastRadius.datasets[0];
  const mart = blastRadius.datasets.at(-1) ?? staging;
  const dashboard = blastRadius.dashboards[0];
  const deployment = blastRadius.ml_deployments[0];

  const nodes: Node[] = [
    node("source", source?.name ?? "raw.order_items", 0, 120, true, source?.via_column),
    node("staging", staging?.name ?? "stg_order_items", 220, 120, true, staging?.via_column),
    node("mart", mart?.name ?? "mart_demand_features", 440, 120, true, mart?.via_column),
    node(
      "dashboard",
      dashboard?.name ?? "Demand Ops Dashboard",
      660,
      40,
      Boolean(dashboard),
    ),
    node(
      "deployment",
      deployment?.name ?? "demand-forecast-prod",
      660,
      200,
      true,
      deployment?.via_column,
      "mlModelDeployment",
    ),
  ];

  const edges: Edge[] = [
    edge("source", "staging"),
    edge("staging", "mart"),
    edge("mart", "dashboard"),
    edge("mart", "deployment"),
  ];

  return { nodes, edges };
}

function node(
  id: string,
  label: string,
  x: number,
  y: number,
  impacted: boolean,
  column?: string | null,
  entityType = "dataset",
): Node {
  const columnLabel = column ? `\n↳ ${column}` : "";
  return {
    id,
    position: { x, y },
    data: {
      label: `${label}${columnLabel}`,
      entityType,
    },
    style: {
      border: impacted ? "1px solid rgb(248 113 113)" : "1px solid rgb(51 65 85)",
      background: impacted ? "rgba(127, 29, 29, 0.55)" : "rgba(15, 23, 42, 0.85)",
      color: "#f8fafc",
      borderRadius: 12,
      padding: 10,
      width: 180,
      fontSize: 12,
      whiteSpace: "pre-wrap",
    },
    ...(entityType === "mlModelDeployment"
      ? { "data-testid": "ml-deployment-node" as const }
      : {}),
  };
}

function edge(source: string, target: string): Edge {
  return {
    id: `${source}-${target}`,
    source,
    target,
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
    style: { stroke: "#94a3b8" },
  };
}
