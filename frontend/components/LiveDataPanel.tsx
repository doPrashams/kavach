"use client";

import { Database, ExternalLink, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDataPreview } from "@/lib/api";
import type { DataProbe } from "@/lib/real-data";

const COLUMN_LABELS: Record<string, string> = {
  tpep_pickup_datetime: "pickup_ts",
  passenger_count: "passengers",
  trip_distance: "distance",
  fare_amount: "fare",
  total_amount: "total",
  payment_type: "pay",
  patient_id: "patient_id",
  ssn: "ssn",
  dob: "dob",
  state: "state",
  plan: "plan",
};

const TONE: Record<string, string> = {
  bad: "text-red-300",
  warn: "text-amber-300",
  ok: "text-emerald-300",
};

function fmtCell(col: string, value: string): string {
  if (col === "tpep_pickup_datetime") return value.slice(0, 16).replace("T", " ");
  if (col === "fare_amount" || col === "total_amount") {
    const n = Number(value);
    return Number.isFinite(n) ? `$${n}` : value;
  }
  return value;
}

export function LiveDataPanel({ scenario }: { scenario: string }) {
  const [probe, setProbe] = useState<DataProbe | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getDataPreview(scenario)
      .then((data) => active && setProbe(data))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [scenario]);

  return (
    <Card className="border-border/60 bg-slate-950/60">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="size-4 text-cyan-400" aria-hidden="true" />
            Live data probe
            {loading ? (
              <RefreshCw className="size-3 animate-spin text-muted-foreground" aria-hidden="true" />
            ) : null}
          </CardTitle>
          {probe ? (
            probe.simulated ? (
              <Badge variant="secondary">simulated data</Badge>
            ) : (
              <Badge className="bg-emerald-600/25 text-emerald-200">real data</Badge>
            )
          ) : null}
        </div>
        {probe ? (
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/80">{probe.source.dataset}</span>
            <span>·</span>
            <span>{probe.source.rows_scanned.toLocaleString("en-US")} rows scanned</span>
            <span>·</span>
            <a
              href={probe.source.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sky-400 hover:underline"
            >
              {probe.source.provider}
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {probe ? (
          <>
            <p className="text-sm text-red-200">{probe.headline}</p>

            <div className="grid grid-cols-3 gap-2">
              {probe.metrics.map((m) => (
                <div
                  key={m.label}
                  className="rounded-lg border border-border/40 bg-background/40 px-2 py-1.5"
                >
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {m.label}
                  </p>
                  <p className={`text-sm font-semibold ${TONE[m.tone]}`}>{m.value}</p>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto rounded-lg border border-border/40">
              <table className="w-full min-w-[520px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border/40 bg-background/40">
                    {probe.columns.map((col) => (
                      <th
                        key={col}
                        className={`px-2 py-1.5 font-medium ${
                          col === probe.highlight_column
                            ? "text-amber-300"
                            : "text-muted-foreground"
                        }`}
                      >
                        {COLUMN_LABELS[col] ?? col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {probe.rows.map((row, i) => (
                    <tr
                      key={i}
                      className={`border-b border-border/20 ${
                        row.anomaly ? "bg-red-950/40" : ""
                      }`}
                      title={row.reason}
                    >
                      {probe.columns.map((col) => {
                        const isHot = row.anomaly && col === probe.highlight_column;
                        return (
                          <td
                            key={col}
                            className={`px-2 py-1 ${
                              isHot ? "font-bold text-red-300" : "text-foreground/80"
                            }`}
                          >
                            {fmtCell(col, row.cells[col] ?? "")}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-block size-2 rounded-sm bg-red-500/60" />
              anomalous rows detected by Kavach
            </p>

            {probe.note ? (
              <p className="rounded-lg border border-border/40 bg-background/40 p-2 text-xs text-muted-foreground">
                {probe.note}
              </p>
            ) : null}

            <p className="font-mono text-[11px] text-muted-foreground/70">$ {probe.query}</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Loading real data probe…</p>
        )}
      </CardContent>
    </Card>
  );
}
