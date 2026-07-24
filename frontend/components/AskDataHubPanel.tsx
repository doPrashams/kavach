"use client";

import { BrainCircuit, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBeforeAfter } from "@/lib/api";

interface PanelResult {
  question: string;
  scenario: string;
  before: { answer: string; has_incident_context: boolean };
  after: { answer: string; has_incident_context: boolean };
  delta: string[];
}

interface AskDataHubPanelProps {
  scenario?: string;
}

export function AskDataHubPanel({ scenario = "schema_drift" }: AskDataHubPanelProps) {
  const [result, setResult] = useState<PanelResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    void getBeforeAfter(scenario)
      .then(setResult)
      .catch(() => setResult(null))
      .finally(() => setLoading(false));
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
            void getBeforeAfter(scenario)
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
            <AnswerBlock
              label="Before write-back"
              answer={result.before.answer}
              hasContext={result.before.has_incident_context}
            />
            <AnswerBlock
              label="After write-back"
              answer={result.after.answer}
              hasContext={result.after.has_incident_context}
              highlight
            />
          </div>
        ) : null}
        {result?.delta?.length ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
            <p className="mb-2 text-xs uppercase tracking-wide text-emerald-300">New context</p>
            <ul className="space-y-1 text-sm">
              {result.delta.map((snippet) => (
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
  hasContext,
  highlight = false,
}: {
  label: string;
  answer: string;
  hasContext: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? "rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3"
          : "rounded-lg border border-border/40 bg-muted/20 p-3"
      }
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <Badge variant="secondary">{hasContext ? "context" : "catalog only"}</Badge>
      </div>
      <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-xs">{answer}</pre>
    </div>
  );
}
