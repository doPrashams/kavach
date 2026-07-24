"use client";

import { Activity, Bot } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AgentEvent, AgentName } from "@/lib/types";
import { cn } from "@/lib/utils";

const AGENT_ORDER: AgentName[] = [
  "sentinel",
  "investigator",
  "impact_analyst",
  "ml_guardian",
  "fixer",
  "scribe",
  "comms",
];

const AGENT_LABELS: Record<AgentName, string> = {
  sentinel: "Sentinel",
  investigator: "Investigator",
  impact_analyst: "Impact Analyst",
  ml_guardian: "ML Guardian",
  fixer: "Fixer",
  scribe: "Scribe",
  comms: "Comms",
};

interface AgentFeedProps {
  events: AgentEvent[];
}

export function AgentFeed({ events }: AgentFeedProps) {
  const activeAgents = new Set(events.map((event) => event.agent));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="size-4" aria-hidden="true" />
          Live agent feed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="grid gap-2" aria-label="Agent activation sequence">
          {AGENT_ORDER.map((agent) => {
            const agentEvents = events.filter((event) => event.agent === agent);
            const isActive = activeAgents.has(agent);
            const latest = agentEvents.at(-1);
            return (
              <li
                key={agent}
                data-testid={`agent-${agent}`}
                data-active={isActive ? "true" : "false"}
                className={cn(
                  "rounded-lg border px-3 py-2 transition-colors",
                  isActive
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : "border-border/40 bg-muted/20 opacity-60",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{AGENT_LABELS[agent]}</span>
                  {isActive ? (
                    <Badge variant="default" className="bg-emerald-600">
                      <Activity className="size-3" aria-hidden="true" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Waiting</Badge>
                  )}
                </div>
                {latest ? (
                  <p className="mt-1 text-sm text-muted-foreground">{latest.message}</p>
                ) : null}
              </li>
            );
          })}
        </ol>
        <div data-testid="agent-feed-order" className="sr-only">
          {events.map((event) => event.agent).join(",")}
        </div>
      </CardContent>
    </Card>
  );
}
