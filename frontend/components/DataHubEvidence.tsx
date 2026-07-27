"use client";

import { ScrollText, Waypoints } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import fixtureTranscript from "@/fixtures/datahub-transcript.json";

export interface TranscriptEntry {
  ts: string;
  method: string;
  tool: string;
  args: Record<string, unknown>;
  result_summary?: {
    type?: string;
    keys?: string[];
    urns?: string[];
    count?: number;
    preview?: string;
  } | null;
  latency_ms: number;
  headers?: Record<string, string>;
  error?: string;
}

interface TranscriptResponse {
  source: string;
  redacted: boolean;
  entries: TranscriptEntry[];
}

interface DataHubEvidenceProps {
  /** When true, fetch / show MCP receipt evidence for the active run. */
  active?: boolean;
}

function collectUrns(entries: TranscriptEntry[]): string[] {
  const seen = new Set<string>();
  const urns: string[] = [];
  for (const entry of entries) {
    const argUrn = entry.args?.urn;
    if (typeof argUrn === "string" && argUrn.startsWith("urn:") && !seen.has(argUrn)) {
      seen.add(argUrn);
      urns.push(argUrn);
    }
    for (const urn of entry.result_summary?.urns ?? []) {
      if (!seen.has(urn)) {
        seen.add(urn);
        urns.push(urn);
      }
    }
  }
  return urns;
}

export function DataHubEvidence({ active = false }: DataHubEvidenceProps) {
  const [entries, setEntries] = useState<TranscriptEntry[]>(
    fixtureTranscript as TranscriptEntry[],
  );
  const [source, setSource] = useState("fixture");

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    void fetch("/api/datahub/transcripts")
      .then(async (response) => {
        if (!response.ok) throw new Error(`transcripts ${response.status}`);
        return response.json() as Promise<TranscriptResponse>;
      })
      .then((data) => {
        if (cancelled) return;
        setEntries(data.entries ?? (fixtureTranscript as TranscriptEntry[]));
        setSource(data.source ?? "fixture");
      })
      .catch(() => {
        if (cancelled) return;
        setEntries(fixtureTranscript as TranscriptEntry[]);
        setSource("fixture");
      });
    return () => {
      cancelled = true;
    };
  }, [active]);

  const urns = useMemo(() => collectUrns(entries), [entries]);

  if (!active) return null;

  return (
    <Card data-testid="datahub-evidence" data-tour-id="tour-evidence">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScrollText className="size-4 text-cyan-400" aria-hidden="true" />
          DataHub MCP evidence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">redacted receipts</Badge>
          <span>source: {source}</span>
          <span>·</span>
          <span>{entries.length} tools invoked</span>
        </div>

        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
            Tools invoked
          </p>
          <ol className="space-y-2" aria-label="MCP tools invoked">
            {entries.map((entry, index) => (
              <li
                key={`${entry.tool}-${entry.ts}-${index}`}
                className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-sm font-medium">{entry.tool}</span>
                  <Badge variant="secondary">{entry.latency_ms.toFixed(0)} ms</Badge>
                </div>
                {typeof entry.args?.urn === "string" ? (
                  <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                    {entry.args.urn}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        </div>

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
            <Waypoints className="size-3" aria-hidden="true" />
            URNs touched
          </p>
          <ul className="max-h-40 space-y-1 overflow-auto" aria-label="DataHub URNs">
            {urns.map((urn) => (
              <li key={urn} className="truncate font-mono text-xs text-foreground/80">
                {urn}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
