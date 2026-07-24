"use client";

import { BrainCircuit, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isOfflineMode } from "@/lib/api";

interface AnalyticsAnswer {
  text: string;
  sources: string[];
  confidence: number;
}

interface BeforeAfterResponse {
  question: string;
  scenario: string;
  before: AnalyticsAnswer;
  after: AnalyticsAnswer;
  diff: string[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const OFFLINE_BEFORE_AFTER: BeforeAfterResponse = {
  question: "what happened to orders data this week?",
  scenario: "schema_drift",
  before: {
    text:
      "Orders datasets look healthy in catalog metadata. " +
      "No recent incident writebacks or resolved tags were found for this week.",
    sources: [
      "catalog:raw.order_items",
      "catalog:main_marts.mart_demand_features",
    ],
    confidence: 0.35,
  },
  after: {
    text: [
      "## Incident: schema_drift",
      "Root cause: Supplier feed renamed quantity to qty, breaking stg_order_items → mart_demand_features",
      "Blast radius: demand forecast prod deployment",
      "Fix: cast coalesce(quantity, qty) in stg_order_items + not_null assertion",
      "Scenario tag: schema_drift",
      "Applied tags — urn:li:dataset:(urn:li:dataPlatform:duckdb,main_marts.mart_demand_features,PROD): incident-resolved",
    ].join("\n"),
    sources: ["urn:li:contextDocument:demo-schema-drift-postmortem"],
    confidence: 0.92,
  },
  diff: [
    "Incident: schema_drift",
    "Root cause: Supplier feed renamed quantity to qty, breaking stg_order_items → mart_demand_features",
    "source:urn:li:contextDocument:demo-schema-drift-postmortem",
  ],
};

async function fetchBeforeAfter(scenario: string): Promise<BeforeAfterResponse> {
  if (isOfflineMode()) {
    return { ...OFFLINE_BEFORE_AFTER, scenario };
  }
  try {
    const response = await fetch(
      `${API_URL}/analytics/before-after?scenario=${encodeURIComponent(scenario)}`,
    );
    if (!response.ok) throw new Error("analytics unavailable");
    return response.json() as Promise<BeforeAfterResponse>;
  } catch {
    return { ...OFFLINE_BEFORE_AFTER, scenario };
  }
}

interface AskDataHubPanelProps {
  scenario?: string;
}

export function AskDataHubPanel({ scenario = "schema_drift" }: AskDataHubPanelProps) {
  const [result, setResult] = useState<BeforeAfterResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetchBeforeAfter(scenario).then(setResult).finally(() => setLoading(false));
  }, [scenario]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BrainCircuit className="size-4 text-indigo-400" aria-hidden="true" />
          Ask DataHub
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          DataHub Analytics Agent before vs after Scribe write-back — the closing demo beat.
        </p>
        <Button
          type="button"
          onClick={() => {
            setLoading(true);
            void fetchBeforeAfter(scenario)
              .then(setResult)
              .finally(() => setLoading(false));
          }}
          disabled={loading}
        >
          <Sparkles className="size-4" aria-hidden="true" />
          {loading ? "Querying…" : "Run before/after"}
        </Button>
        {result ? (
          <div className="grid gap-3 md:grid-cols-2">
            <AnswerBlock label="Before write-back" answer={result.before} tone="muted" />
            <AnswerBlock label="After write-back" answer={result.after} tone="highlight" />
          </div>
        ) : null}
        {result?.diff?.length ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
            <p className="mb-2 text-xs uppercase tracking-wide text-emerald-300">New context</p>
            <ul className="space-y-1 text-sm">
              {result.diff.map((snippet) => (
                <li key={snippet}>+ {snippet}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function AnswerBlock({
  label,
  answer,
  tone,
}: {
  label: string;
  answer: AnalyticsAnswer;
  tone: "muted" | "highlight";
}) {
  return (
    <div
      className={
        tone === "highlight"
          ? "rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3"
          : "rounded-lg border border-border/40 bg-muted/20 p-3"
      }
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <Badge variant="secondary">{Math.round(answer.confidence * 100)}%</Badge>
      </div>
      <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-xs">{answer.text}</pre>
    </div>
  );
}
