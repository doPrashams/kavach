"use client";

import { FileText } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AgentFeed } from "@/components/AgentFeed";
import { AskDataHubPanel } from "@/components/AskDataHubPanel";
import { BlastRadiusGraph } from "@/components/BlastRadiusGraph";
import { ChaosPanel } from "@/components/ChaosPanel";
import { IncidentReport } from "@/components/IncidentReport";
import { LeftNav } from "@/components/LeftNav";
import { LiveDataPanel } from "@/components/LiveDataPanel";
import { MlGuardianCard } from "@/components/MlGuardianCard";
import { MttrChart } from "@/components/MttrChart";
import { PostmortemCard } from "@/components/PostmortemCard";
import { PrCard } from "@/components/PrCard";
import { ReplayControls } from "@/components/ReplayControls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getFix,
  getFixtureEvents,
  getMttrTrend,
  getRun,
  isDemoApi,
  listScenarios,
} from "@/lib/api";
import { getDemoFixture } from "@/lib/fixtures";
import {
  clearRunHistory,
  loadRunHistory,
  pushRunHistory,
  type RunHistoryEntry,
} from "@/lib/run-history";
import { getSpec } from "@/lib/scenarios";
import { useAgentEventStream } from "@/lib/sse";
import type { FixResponse, MttrPoint, RunState } from "@/lib/types";

export function WarRoom() {
  const fixture = useMemo(() => getDemoFixture(), []);
  const [scenarios, setScenarios] = useState(fixture.scenarios);
  const [runId, setRunId] = useState<string | null>(null);
  const [scrubIndex, setScrubIndex] = useState<number | undefined>(undefined);
  const [playing, setPlaying] = useState(false);
  const [runState, setRunState] = useState<RunState | null>(null);
  const [fix, setFix] = useState<FixResponse | null>(null);
  const [mttrTrend, setMttrTrend] = useState<MttrPoint[]>(fixture.mttrTrend);
  const [statusLine, setStatusLine] = useState("Ready — pick a scenario and inject chaos");
  const [reportOpen, setReportOpen] = useState(false);
  const [runHistory, setRunHistory] = useState<RunHistoryEntry[]>([]);
  const [selectedScenario, setSelectedScenario] = useState("schema_drift");
  const [domain, setDomain] = useState<"systems" | "humans">("systems");

  const filteredScenarios = useMemo(() => {
    return scenarios.filter((s) => {
      const specDomain = s.domain ?? getSpec(s.id).domain;
      return specDomain === domain;
    });
  }, [scenarios, domain]);

  const { events } = useAgentEventStream({
    runId,
    enabled: Boolean(runId),
    replayIndex: scrubIndex,
  });

  useEffect(() => {
    setRunHistory(loadRunHistory());
  }, []);

  const refreshRun = useCallback(
    async (nextRunId: string) => {
      const run = await getRun(nextRunId);
      const [fixResponse, trend] = await Promise.all([
        getFix(nextRunId),
        getMttrTrend(run.trigger?.scenario as string | undefined),
      ]);
      setRunState(run);
      setFix(fixResponse);
      setMttrTrend(trend.length ? trend : fixture.mttrTrend);
      return run;
    },
    [fixture.mttrTrend],
  );

  useEffect(() => {
    listScenarios().then(setScenarios).catch(() => setScenarios(fixture.scenarios));
  }, [fixture.scenarios]);

  // Animate agent feed after inject / replay start
  useEffect(() => {
    if (!playing || !runId || typeof scrubIndex !== "number") return;
    const total = getFixtureEvents(runId).length;
    if (scrubIndex >= total - 1) {
      setPlaying(false);
      setStatusLine("Incident resolved — explore the cards or inject again");
      void refreshRun(runId).then((run) => {
        const scenario = String(run.trigger?.scenario ?? "schema_drift");
        const spec = getSpec(scenario);
        setRunHistory(
          pushRunHistory({
            run_id: runId,
            scenario,
            label: spec.label,
            severity: run.severity ?? spec.severity,
            status: "resolved",
          }),
        );
      });
      return;
    }
    const timer = setTimeout(() => setScrubIndex((value) => (value ?? 0) + 1), 450);
    return () => clearTimeout(timer);
  }, [playing, refreshRun, runId, scrubIndex]);

  const displayEvents =
    events.length > 0
      ? events
      : runId
        ? getFixtureEvents(runId).slice(
            0,
            typeof scrubIndex === "number" ? scrubIndex + 1 : undefined,
          )
        : [];

  const activeRun = runState ?? fixture.run;
  const incidentPhase: "idle" | "active" | "resolved" = !runId
    ? "idle"
    : playing
      ? "active"
      : "resolved";
  /** Declared demo mode — judges must never confuse fixtures with live DataHub. */
  const runMode: "LIVE" | "REPLAY" | "DEMO" = playing
    ? isDemoApi()
      ? "REPLAY"
      : "LIVE"
    : isDemoApi()
      ? "DEMO"
      : "LIVE";
  const mlRecommendation =
    activeRun.findings.find((finding) => finding.toLowerCase().includes("ml guardian")) ??
    (activeRun.ml_hold_recommended ? "hold deployment" : "monitor");

  function startAnimatedRun(nextRunId: string, scenario: string) {
    const spec = getSpec(scenario);
    setRunId(nextRunId);
    setScrubIndex(0);
    setPlaying(true);
    setReportOpen(false);
    setStatusLine(`Injected ${scenario} — agents responding…`);
    setRunHistory(
      pushRunHistory({
        run_id: nextRunId,
        scenario,
        label: spec.label,
        severity: spec.severity,
        status: "active",
      }),
    );
    void refreshRun(nextRunId);
  }

  async function openHistoryRun(nextRunId: string) {
    setRunId(nextRunId);
    setPlaying(false);
    const eventsForRun = getFixtureEvents(nextRunId);
    setScrubIndex(Math.max(0, eventsForRun.length - 1));
    setStatusLine(`Loaded past run ${nextRunId}`);
    await refreshRun(nextRunId);
    setReportOpen(true);
  }

  function handleClearHistory() {
    clearRunHistory();
    setRunHistory([]);
    setRunId(null);
    setRunState(null);
    setFix(null);
    setPlaying(false);
    setScrubIndex(undefined);
    setReportOpen(false);
    setStatusLine("History cleared — ready for a clean retest");
  }

  return (
    <div className="flex min-h-screen bg-[radial-gradient(ellipse_at_top,_#e8eef7_0%,_#f4f7fb_42%,_#eef2f7_100%)] text-foreground dark:bg-[radial-gradient(ellipse_at_top,_#1e293b_0%,_#0f172a_45%,_#020617_100%)]">
      <div className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-slate-200/80 bg-white/70 backdrop-blur dark:border-slate-800 dark:bg-slate-950/50 lg:block">
        <LeftNav
          runHistory={runHistory}
          activeRunId={runId}
          selectedScenarioId={selectedScenario}
          onSelectRun={(id) => void openHistoryRun(id)}
          onClearHistory={handleClearHistory}
        />
      </div>

      <div className="min-w-0 flex-1">
        <header className="border-b border-border/40 bg-background/40 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-4 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-400">Kavach war room</p>
              <h1 className="text-2xl font-semibold">Self-healing data platform control room</h1>
              <p className="mt-1 text-sm text-muted-foreground">{statusLine}</p>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="flex items-center rounded-lg border border-border/60 bg-background/60 p-0.5 text-xs"
                role="group"
                aria-label="Domain filter"
              >
                <button
                  type="button"
                  className={`rounded-md px-2.5 py-1 font-medium transition ${
                    domain === "systems"
                      ? "bg-sky-500/20 text-sky-800 dark:text-sky-200"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-pressed={domain === "systems"}
                  onClick={() => setDomain("systems")}
                >
                  Systems
                </button>
                <button
                  type="button"
                  className={`rounded-md px-2.5 py-1 font-medium transition ${
                    domain === "humans"
                      ? "bg-sky-500/20 text-sky-800 dark:text-sky-200"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-pressed={domain === "humans"}
                  onClick={() => setDomain("humans")}
                >
                  Humans
                </button>
              </div>
              <Badge
                aria-label={`Run mode ${runMode}`}
                className={
                  runMode === "LIVE"
                    ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200"
                    : runMode === "REPLAY"
                      ? "bg-amber-500/20 text-amber-800 dark:text-amber-200"
                      : "bg-slate-500/20 text-slate-700 dark:text-slate-200"
                }
              >
                {runMode}
              </Badge>
              {runId && !playing ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setReportOpen(true)}
                >
                  <FileText className="mr-1 size-4" aria-hidden="true" /> Incident report
                </Button>
              ) : null}
              <Link href="/deck" className="text-sm text-sky-400 hover:underline">
                Open /deck
              </Link>
            </div>
          </div>
        </header>

        {incidentPhase !== "idle" ? (
          <div
            data-tour-id="tour-incident"
            className={`border-b px-4 py-3 ${
              incidentPhase === "active"
                ? "border-red-500/40 bg-red-950/40"
                : "border-emerald-500/40 bg-emerald-950/30"
            }`}
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                  incidentPhase === "active"
                    ? "bg-red-500/20 text-red-200"
                    : "bg-emerald-500/20 text-emerald-200"
                }`}
              >
                <span
                  className={`size-2 rounded-full ${
                    incidentPhase === "active" ? "animate-pulse bg-red-400" : "bg-emerald-400"
                  }`}
                />
                {incidentPhase === "active" ? "INCIDENT ACTIVE" : "RESOLVED"}
              </span>
              <span className="text-sm font-medium">
                {String(activeRun.trigger?.scenario ?? "incident")} · severity {activeRun.severity}
              </span>
              {activeRun.ml_hold_recommended ? (
                <Badge className="bg-amber-500/20 text-amber-200">ML deployment held</Badge>
              ) : null}
            </div>
            {incidentPhase === "active" ? (
              <div className="mt-2 space-y-1 text-sm">
                <p className="text-red-200">
                  <span className="font-semibold">Crashing:</span> {activeRun.symptom}
                </p>
                <p className="text-muted-foreground">
                  <span className="font-semibold text-red-300/80">Impact:</span> {activeRun.impact}
                </p>
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-emerald-100">
                  <span className="font-semibold">Fixed:</span>{" "}
                  {activeRun.fix_plan?.summary ?? "Agents remediated the incident"} · postmortem
                  written to DataHub · MTTR trending down.
                </p>
                <Button
                  type="button"
                  size="sm"
                  className="bg-emerald-600 text-white hover:bg-emerald-500"
                  onClick={() => setReportOpen(true)}
                >
                  <FileText className="mr-1 size-4" aria-hidden="true" /> View incident report
                </Button>
              </div>
            )}
          </div>
        ) : null}

        <div className="border-b border-border/30 px-4 py-2 lg:hidden">
          <p className="text-xs text-muted-foreground">
            Tip: on desktop, use the left guide for instructions, tour, history, and site health.
          </p>
        </div>

        <main className="grid gap-4 px-4 py-6 lg:grid-cols-12">
          <section className="space-y-4 lg:col-span-3">
            <div data-tour-id="tour-chaos">
              <ChaosPanel
                scenarios={filteredScenarios}
                selectedScenario={selectedScenario}
                onSelectScenario={setSelectedScenario}
                disabled={playing}
                onInject={(nextRunId, scenario) => startAnimatedRun(nextRunId, scenario)}
              />
            </div>
            <div data-tour-id="tour-replay">
              <ReplayControls
                activeRunId={runId}
                onReplay={(nextRunId, index) => {
                  setRunId(nextRunId);
                  setScrubIndex(index);
                  setPlaying(index === 0);
                  setStatusLine(
                    index === 0
                      ? "Replaying recorded incident…"
                      : `Scrubbed to event ${index + 1}`,
                  );
                  void refreshRun(nextRunId);
                }}
              />
            </div>
          </section>

          <section className="space-y-4 lg:col-span-5">
            <div data-tour-id="tour-data">
              <LiveDataPanel
                scenario={
                  runId
                    ? String(activeRun.trigger?.scenario ?? selectedScenario)
                    : selectedScenario
                }
              />
            </div>
            <div data-tour-id="tour-feed">
              <AgentFeed events={displayEvents} />
            </div>
            <div data-tour-id="tour-blast">
              <BlastRadiusGraph blastRadius={activeRun.blast_radius} />
            </div>
            <div data-testid="ml-deployment-node" className="sr-only">
              {activeRun.blast_radius?.ml_deployments[0]?.name ?? "demand-forecast-prod"}
            </div>
          </section>

          <section className="space-y-4 lg:col-span-4">
            <div data-tour-id="tour-ml">
              <MlGuardianCard
                risk={activeRun.ml_risk}
                holdRecommended={activeRun.ml_hold_recommended}
                recommendation={mlRecommendation.replace(/^ML Guardian:\s*/i, "")}
              />
            </div>
            <div data-tour-id="tour-pr">
              <PrCard fix={fix} />
            </div>
            <div data-tour-id="tour-postmortem">
              <PostmortemCard postmortem={activeRun.postmortem} />
            </div>
            <div data-tour-id="tour-analytics">
              <AskDataHubPanel scenario={String(activeRun.trigger?.scenario ?? "schema_drift")} />
            </div>
            <div data-tour-id="tour-mttr">
              <MttrChart trend={mttrTrend} />
            </div>
          </section>
        </main>
      </div>

      <IncidentReport
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        scenario={String(activeRun.trigger?.scenario ?? "schema_drift")}
        runState={activeRun}
        fix={fix}
        events={runId ? getFixtureEvents(runId) : displayEvents}
      />
    </div>
  );
}
