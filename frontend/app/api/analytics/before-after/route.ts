import { NextResponse } from "next/server";

import { getSpec } from "@/lib/scenarios";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scenario = searchParams.get("scenario") ?? "schema_drift";
  const spec = getSpec(scenario);
  const blast = [
    ...spec.datasets.map((d) => d.name),
    ...spec.ml_deployments.map((d) => d.name),
  ].join(", ");

  return NextResponse.json({
    scenario: spec.id,
    question: `What happened to ${spec.source_name} this week?`,
    before: {
      answer:
        "No recent incident context found for this asset. Only catalog metadata is available.",
      has_incident_context: false,
    },
    after: {
      answer: `Kavach agents resolved a ${spec.id} incident (${spec.root_cause}). A postmortem was written to DataHub Context Documents, affected datasets were tagged, and a Fixer PR was opened. Blast radius: ${blast}. ML risk: ${spec.ml_risk}${spec.ml_hold ? " — deployment held" : ""}.`,
      has_incident_context: true,
    },
    delta: [
      "postmortem Context Document",
      "resolved incident entity",
      "asset tags",
      spec.ml_deployments.length ? "ML deployment risk note" : "compliance note",
    ],
  });
}
