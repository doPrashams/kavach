"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AgentFeed } from "@/components/AgentFeed";
import { BlastRadiusGraph } from "@/components/BlastRadiusGraph";
import { ChaosPanel } from "@/components/ChaosPanel";
import { MlGuardianCard } from "@/components/MlGuardianCard";
import { MttrChart } from "@/components/MttrChart";
import { PostmortemCard } from "@/components/PostmortemCard";
import { PrCard } from "@/components/PrCard";
import { ReplayControls } from "@/components/ReplayControls";
import { Badge } from "@/components/ui/badge";
import {
  getFixtureEvents,
  getFix,
  getMttrTrend,
  getRun,
  isOfflineMode,
  listScenarios,
} from "@/lib/api";
import { getDemoFixture } from "@/lib/fixtures";
import { useAgentEventStream } from "@/lib/sse";
import type { FixResponse, MttrPoint, RunState } from "@/lib/types";

export function WarRoom() {
  const fixture = useMemo(() => getDemoFixture(), []);
  const [scenarios, setScenarios] = useState(fixture.scenarios);
  const [runId, setRunId] = useState<string | null>(fixture.recordingId);
  const [scrubIndex, setScrubIndex] = useState<number | undefined>(undefined);
  const [runState, setRunState] = useState<RunState>(fixture.run);
  const [fix, setFix] = useState<FixResponse | null>(fixture.fix);
  const [mttrTrend, setMttrTrend] = useState<MttrPoint[]>(fixture.mttrTrend);

  const { events } = useAgentEventStream({
    runId,
    enabled: Boolean(runId),
    replayIndex: scrubIndex,
  });

  const refreshRun = useCallback(async (nextRunId: string) => {
    const run = await getRun(nextRunId);
    const [fixResponse, trend] = await Promise.all([
      getFix(nextRunId),
      getMttrTrend(run.trigger?.scenario as string | undefined),
    ]);
    setRunState(run);
    setFix(fixResponse);
    setMttrTrend(trend);
  }, []);

  useEffect(() => {
    listScenarios().then(setScenarios).catch(() => setScenarios(fixture.scenarios));
    if (isOfflineMode()) {
      setRunId(fixture.recordingId);
      setScrubIndex(fixture.events.length - 1);
    }
  }, [fixture]);

  useEffect(() => {
    if (runId && scrubIndex === undefined) {
      void refreshRun(runId);
    }
  }, [refreshRun, runId, scrubIndex]);

  const displayEvents =
    events.length > 0 ? events : runId ? getFixtureEvents(runId) : fixture.events;

  const mlRecommendation =
    runState.findings.find((finding) => finding.toLowerCase().includes("ml guardian")) ??
    (runState.ml_hold_recommended ? "hold deployment" : "monitor");

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#0f172a,_#020617)] text-foreground">
      <header className="border-b border-border/40 bg-background/40 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-400">Kavach war room</p>
            <h1 className="text-2xl font-semibold">Self-healing data platform control room</h1>
          </div>
          <div className="flex items-center gap-2">
            {isOfflineMode() ? <Badge variant="secondary">Replay / offline mode</Badge> : null}
            <Link href="/deck" className="text-sm text-sky-400 hover:underline">
              Open /deck
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-6 lg:grid-cols-12">
        <section className="space-y-4 lg:col-span-3">
          <ChaosPanel
            scenarios={scenarios}
            onInject={(nextRunId) => {
              setRunId(nextRunId);
              setScrubIndex(undefined);
              void refreshRun(nextRunId);
            }}
          />
          <ReplayControls
            activeRunId={runId}
            onReplay={(nextRunId, index) => {
              setRunId(nextRunId);
              setScrubIndex(index);
            }}
          />
        </section>

        <section className="space-y-4 lg:col-span-5">
          <AgentFeed events={displayEvents} />
          <BlastRadiusGraph blastRadius={runState.blast_radius} />
          <div data-testid="ml-deployment-node" className="sr-only">
            {runState.blast_radius?.ml_deployments[0]?.name ?? "demand-forecast-prod"}
          </div>
        </section>

        <section className="space-y-4 lg:col-span-4">
          <MlGuardianCard
            risk={runState.ml_risk}
            holdRecommended={runState.ml_hold_recommended}
            recommendation={mlRecommendation.replace(/^ML Guardian:\s*/i, "")}
          />
          <PrCard fix={fix} />
          <PostmortemCard postmortem={runState.postmortem} />
          <MttrChart trend={mttrTrend} />
        </section>
      </main>
    </div>
  );
}
