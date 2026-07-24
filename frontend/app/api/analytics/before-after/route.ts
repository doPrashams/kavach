import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scenario = searchParams.get("scenario") ?? "schema_drift";

  return NextResponse.json({
    scenario,
    question: `What happened to ${scenario} data this week?`,
    before: {
      answer:
        "No recent incident context found for this asset. Only catalog metadata is available.",
      has_incident_context: false,
    },
    after: {
      answer: `Kavach agents resolved a ${scenario} incident, wrote a postmortem to DataHub Context Documents, tagged affected datasets, and opened a Fixer PR. Blast radius included mart_demand_features and the demand-forecast-prod ML deployment.`,
      has_incident_context: true,
    },
    delta: [
      "postmortem Context Document",
      "resolved incident entity",
      "asset tags",
      "ML deployment risk note",
    ],
  });
}
