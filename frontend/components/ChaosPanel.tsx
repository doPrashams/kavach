"use client";

import { AlertTriangle, Zap } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { injectChaos } from "@/lib/api";
import type { ChaosScenario } from "@/lib/types";

interface ChaosPanelProps {
  scenarios: ChaosScenario[];
  onInject: (runId: string, scenario: string) => void;
  disabled?: boolean;
}

export function ChaosPanel({ scenarios, onInject, disabled = false }: ChaosPanelProps) {
  const liveScenarios = scenarios.filter((scenario) => !scenario.simulated);
  const [selected, setSelected] = useState(liveScenarios[0]?.id ?? "schema_drift");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleInject() {
    setLoading(true);
    setError(null);
    try {
      const result = await injectChaos(selected);
      onInject(result.run_id, result.scenario);
    } catch (injectError) {
      setError(injectError instanceof Error ? injectError.message : "Injection failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="size-4 text-amber-400" aria-hidden="true" />
          Chaos panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="block space-y-2 text-sm">
          <span className="text-muted-foreground">Scenario</span>
          <select
            aria-label="Chaos scenario"
            className="w-full rounded-lg border border-border bg-background px-3 py-2"
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            disabled={disabled || loading}
          >
            {liveScenarios.map((scenario) => (
              <option key={scenario.id} value={scenario.id}>
                {scenario.label}
              </option>
            ))}
          </select>
        </label>
        <Button
          type="button"
          className="w-full"
          disabled={disabled || loading}
          onClick={handleInject}
        >
          {loading ? "Injecting…" : "Inject Chaos"}
        </Button>
        {error ? (
          <p className="flex items-center gap-2 text-sm text-destructive" role="alert">
            <AlertTriangle className="size-4" aria-hidden="true" />
            {error}
          </p>
        ) : null}
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Scenario library</p>
          <ul className="space-y-1">
            {scenarios.map((scenario) => (
              <li
                key={scenario.id}
                className="flex items-center justify-between rounded-md border border-border/40 px-2 py-1 text-sm"
              >
                <span>{scenario.label}</span>
                {scenario.simulated ? (
                  <Badge variant="secondary">simulated</Badge>
                ) : (
                  <Badge>live</Badge>
                )}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
