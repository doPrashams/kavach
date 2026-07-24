"use client";

import { TrendingDown } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MttrPoint } from "@/lib/types";

interface MttrChartProps {
  trend: MttrPoint[];
}

export function MttrChart({ trend }: MttrChartProps) {
  const values = trend.map((point) => point.mttr_seconds);
  const max = Math.max(...values, 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="size-4 text-sky-400" aria-hidden="true" />
          MTTR flywheel
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="flex h-40 items-end gap-3"
          role="img"
          aria-label="Mean time to recovery trend chart"
          data-testid="mttr-chart"
        >
          {trend.map((point, index) => {
            const height = `${Math.max((point.mttr_seconds / max) * 100, 8)}%`;
            return (
              <div key={point.run_id} className="flex flex-1 flex-col items-center gap-2">
                <div
                  data-testid={`mttr-bar-${index}`}
                  data-value={point.mttr_seconds}
                  className="w-full rounded-t-md bg-gradient-to-t from-sky-600 to-emerald-400 transition-all"
                  style={{ height }}
                  title={`${point.mttr_seconds}s`}
                />
                <span className="text-[10px] text-muted-foreground">
                  {point.cited_prior ? "cited" : "baseline"}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Latest MTTR: {values.at(-1)?.toFixed(1)}s — postmortem writebacks accelerate recovery.
        </p>
      </CardContent>
    </Card>
  );
}
