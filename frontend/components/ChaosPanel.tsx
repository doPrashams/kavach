"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Zap } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { injectChaos } from "@/lib/api";
import type { ChaosScenario } from "@/lib/types";

interface ChaosPanelProps {
  scenarios: ChaosScenario[];
  selectedScenario: string;
  onSelectScenario: (scenarioId: string) => void;
  onInject: (runId: string, scenario: string) => void;
  disabled?: boolean;
}

export function ChaosPanel({
  scenarios,
  selectedScenario,
  onSelectScenario,
  onInject,
  disabled = false,
}: ChaosPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!scenarios.some((s) => s.id === selectedScenario)) {
      const first = scenarios.find((s) => !s.simulated) ?? scenarios[0];
      if (first) onSelectScenario(first.id);
    }
  }, [scenarios, selectedScenario, onSelectScenario]);

  async function handleInject() {
    setLoading(true);
    setError(null);
    try {
      const result = await injectChaos(selectedScenario);
      onInject(result.run_id, result.scenario);
    } catch (injectError) {
      setError(injectError instanceof Error ? injectError.message : "Injection failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-slate-200/80 bg-white/80 shadow-sm backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="size-4 text-amber-500" aria-hidden="true" />
          Chaos panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="block space-y-2 text-sm">
          <span className="text-muted-foreground">Scenario</span>
          <select
            aria-label="Chaos scenario"
            className="w-full rounded-lg border border-border bg-background px-3 py-2"
            value={selectedScenario}
            onChange={(event) => onSelectScenario(event.target.value)}
            disabled={disabled || loading}
          >
            {scenarios.map((scenario) => (
              <option key={scenario.id} value={scenario.id}>
                {scenario.label}
                {scenario.simulated ? " (simulated)" : ""}
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
            {scenarios.map((scenario) => {
              const active = scenario.id === selectedScenario;
              return (
                <motion.li
                  key={scenario.id}
                  layout
                  className={`flex cursor-pointer items-center justify-between rounded-md border px-2 py-1.5 text-sm transition ${
                    active
                      ? "border-sky-400/70 bg-sky-500/10 ring-1 ring-sky-400/40"
                      : "border-border/40 hover:bg-muted/40"
                  }`}
                  onClick={() => onSelectScenario(scenario.id)}
                >
                  <span className={active ? "font-medium text-sky-700 dark:text-sky-200" : ""}>
                    {scenario.label}
                  </span>
                  {scenario.simulated ? (
                    <Badge variant="secondary">simulated</Badge>
                  ) : (
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                      live
                    </Badge>
                  )}
                </motion.li>
              );
            })}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
