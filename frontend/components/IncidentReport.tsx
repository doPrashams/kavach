"use client";

import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  GitPullRequest,
  ListTree,
  Workflow,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getRealPr } from "@/lib/real-data";
import { getSpec } from "@/lib/scenarios";
import type { AgentEvent, FixResponse, RunState } from "@/lib/types";

interface IncidentReportProps {
  open: boolean;
  onClose: () => void;
  scenario: string;
  runState: RunState | null;
  fix: FixResponse | null;
  events: AgentEvent[];
}

const AGENT_LABEL: Record<string, string> = {
  sentinel: "Sentinel",
  investigator: "Investigator",
  impact_analyst: "Impact Analyst",
  ml_guardian: "ML Guardian",
  fixer: "Fixer",
  scribe: "Scribe",
  comms: "Comms",
};

export function IncidentReport({
  open,
  onClose,
  scenario,
  runState,
  fix,
  events,
}: IncidentReportProps) {
  const [tab, setTab] = useState<"report" | "flow">("report");
  const spec = getSpec(scenario);
  const realPr = getRealPr();
  const isRealPr = Boolean(fix?.pr_ref && fix.pr_ref === realPr.html_url);

  return (
    <>
      <div
        className={`fixed inset-0 z-[80] bg-black/50 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed inset-y-0 right-0 z-[90] flex w-[min(640px,100vw)] flex-col border-l border-border/50 bg-slate-950 shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label="Incident report"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border/40 p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-400">Incident report</p>
            <h2 className="text-lg font-semibold">{spec.label}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge className="bg-emerald-600/25 text-emerald-200">
                <CheckCircle2 className="mr-1 size-3" /> resolved
              </Badge>
              <Badge variant="secondary">severity {spec.severity}</Badge>
              {spec.ml_hold ? (
                <Badge className="bg-amber-500/20 text-amber-200">ML deployment held</Badge>
              ) : null}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close report">
            <X className="size-5" />
          </button>
        </header>

        <div className="flex gap-1 border-b border-border/40 px-3 pt-2">
          {(
            [
              ["report", "Report", FileText],
              ["flow", "Data flow", Workflow],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm transition ${
                tab === id
                  ? "border-b-2 border-cyan-400 text-cyan-200"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {tab === "report" ? (
            <ReportTab
              spec={spec}
              runState={runState}
              fix={fix}
              events={events}
              realPr={realPr}
              isRealPr={isRealPr}
            />
          ) : (
            <FlowTab spec={spec} runState={runState} />
          )}
        </div>
      </aside>
    </>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-5">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="size-4 text-cyan-400" aria-hidden="true" />
        {title}
      </h3>
      {children}
    </section>
  );
}

function ReportTab({
  spec,
  runState,
  fix,
  events,
  realPr,
  isRealPr,
}: {
  spec: ReturnType<typeof getSpec>;
  runState: RunState | null;
  fix: FixResponse | null;
  events: AgentEvent[];
  realPr: ReturnType<typeof getRealPr>;
  isRealPr: boolean;
}) {
  const blast = runState?.blast_radius;
  const affected = [
    ...(blast?.datasets ?? []).map((d) => d.name),
    ...(blast?.dashboards ?? []).map((d) => d.name),
    ...(blast?.ml_deployments ?? []).map((d) => `${d.name} (ML)`),
  ];

  return (
    <div className="text-sm">
      <Section icon={AlertTriangle} title="What happened">
        <p className="text-red-200">{spec.symptom}</p>
        <p className="mt-1 text-muted-foreground">
          <span className="font-medium text-orange-300/80">Impact:</span> {spec.impact}
        </p>
      </Section>

      <Section icon={ListTree} title="Timeline of actions">
        <ol className="relative space-y-3 border-l border-border/50 pl-4">
          {(events.length ? events : []).map((e, i) => (
            <li key={e.id} className="relative">
              <span className="absolute -left-[21px] top-1 flex size-4 items-center justify-center rounded-full bg-cyan-500/30 text-[10px] font-bold text-cyan-200">
                {i + 1}
              </span>
              <p className="font-medium text-cyan-200">{AGENT_LABEL[e.agent] ?? e.agent}</p>
              <p className="text-muted-foreground">{e.message}</p>
            </li>
          ))}
          {events.length === 0 ? (
            <li className="text-muted-foreground">No events recorded for this run.</li>
          ) : null}
        </ol>
      </Section>

      <Section icon={AlertTriangle} title="Root cause">
        <p className="rounded-lg border border-border/40 bg-background/40 p-3 text-muted-foreground">
          {runState?.root_cause ?? spec.root_cause}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          <span className="font-medium">Detected by:</span> {spec.detects}
        </p>
      </Section>

      <Section icon={ListTree} title="Blast radius">
        <div className="flex flex-wrap gap-2">
          {affected.map((a) => (
            <Badge key={a} variant="secondary" className="font-mono text-[11px]">
              {a}
            </Badge>
          ))}
        </div>
      </Section>

      <Section icon={GitPullRequest} title="Fix applied">
        <p className="font-medium">{fix?.artifacts.pr_title ?? spec.fix.pr_title}</p>
        <ul className="mt-2 space-y-1 text-xs">
          {Object.keys(fix?.artifacts.files ?? spec.fix.files).map((f) => (
            <li key={f} className="font-mono text-muted-foreground">
              {f}
            </li>
          ))}
        </ul>
        <pre className="mt-2 max-h-28 overflow-auto rounded-lg bg-muted/30 p-3 text-xs">
          {fix?.artifacts.diff ?? spec.fix.diff}
        </pre>
      </Section>

      <Section icon={CheckCircle2} title="Tests run (all passed after fix)">
        <ul className="space-y-1.5">
          {spec.tests.map((t) => (
            <li key={t} className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="size-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
              <span className="font-mono text-muted-foreground">{t}</span>
              <span className="ml-auto text-emerald-400">PASS</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section icon={GitPullRequest} title="Pull request">
        {isRealPr ? (
          <div className="space-y-1 rounded-lg border border-purple-500/30 bg-purple-950/20 p-3 text-xs">
            <p className="font-mono">
              {realPr.repo}#{realPr.number} ·{" "}
              <span className="text-emerald-300">+{realPr.additions}</span>{" "}
              <span className="text-red-300">−{realPr.deletions}</span> · {realPr.changed_files}{" "}
              files
            </p>
            <p className="text-muted-foreground">
              merged {realPr.merged_at?.slice(0, 10)} · {realPr.merge_commit_sha.slice(0, 7)} · by @
              {realPr.author}
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{spec.fix.pr_title}</p>
        )}
        {fix?.pr_ref ? (
          <a
            href={fix.pr_ref}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-sm text-sky-400 hover:underline"
          >
            {isRealPr ? "Open merged pull request →" : "Open pull requests →"}
          </a>
        ) : null}
      </Section>

      <Section icon={FileText} title="Postmortem (written to DataHub)">
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-border/40 bg-background/40 p-3 text-xs text-muted-foreground">
          {runState?.postmortem ?? "Postmortem written to DataHub Context Documents."}
        </pre>
      </Section>
    </div>
  );
}

function FlowTab({
  spec,
  runState,
}: {
  spec: ReturnType<typeof getSpec>;
  runState: RunState | null;
}) {
  const { nodes, edges } = useMemo(
    () => buildIncidentFlow(spec, runState),
    [spec, runState],
  );
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        End-to-end flow: where the data broke → how each agent responded → the fix and resolution.
      </p>
      <div className="h-[62vh] w-full rounded-lg border border-border/40">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnScroll
          zoomOnScroll
        >
          <Background color="#334155" gap={16} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="size-2.5 rounded-sm bg-red-500/70" /> failure / impact
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2.5 rounded-sm bg-cyan-500/70" /> agent action
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2.5 rounded-sm bg-emerald-500/70" /> resolution
        </span>
      </div>
    </div>
  );
}

type Tone = "fail" | "action" | "ok" | "neutral";

function fnode(
  id: string,
  label: string,
  x: number,
  y: number,
  tone: Tone,
): Node {
  const palette: Record<Tone, { border: string; bg: string }> = {
    fail: { border: "rgb(248 113 113)", bg: "rgba(127,29,29,0.55)" },
    action: { border: "rgb(34 211 238)", bg: "rgba(8,51,68,0.7)" },
    ok: { border: "rgb(52 211 153)", bg: "rgba(6,78,59,0.55)" },
    neutral: { border: "rgb(71 85 105)", bg: "rgba(15,23,42,0.85)" },
  };
  const p = palette[tone];
  return {
    id,
    position: { x, y },
    data: { label },
    style: {
      border: `1px solid ${p.border}`,
      background: p.bg,
      color: "#f8fafc",
      borderRadius: 10,
      padding: 8,
      width: 170,
      fontSize: 11,
      whiteSpace: "pre-wrap",
    },
  };
}

function fedge(source: string, target: string, dashed = false): Edge {
  return {
    id: `${source}-${target}`,
    source,
    target,
    animated: !dashed,
    markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
    style: { stroke: "#94a3b8", strokeDasharray: dashed ? "4 4" : undefined },
  };
}

function buildIncidentFlow(
  spec: ReturnType<typeof getSpec>,
  runState: RunState | null,
): { nodes: Node[]; edges: Edge[] } {
  const blast = runState?.blast_radius;
  const src = blast?.datasets[0]?.name ?? spec.source_name;
  const mart = blast?.datasets.at(-1)?.name ?? "mart";
  const ml = blast?.ml_deployments[0]?.name ?? null;

  const holdText = spec.ml_hold ? "HOLD deployment" : `risk: ${spec.ml_risk}`;

  // Lineage lane (top)
  const nodes: Node[] = [
    fnode("l_src", `${src}\n⚠ ${spec.symptom.slice(0, 42)}…`, 0, 0, "fail"),
    fnode("l_mart", mart, 260, 0, "neutral"),
  ];
  if (ml) nodes.push(fnode("l_ml", `${ml}\n${holdText}`, 520, 0, spec.ml_hold ? "fail" : "neutral"));

  // Action lane (bottom) — the 7 agents
  const actions: Array<[string, string, Tone]> = [
    ["a1", `Sentinel\ndetected anomaly`, "action"],
    ["a2", `Investigator\nroot cause`, "action"],
    ["a3", `Impact Analyst\nblast radius`, "action"],
    ["a4", `ML Guardian\n${holdText}`, spec.ml_hold ? "fail" : "action"],
    ["a5", `Fixer\ndbt patch + PR`, "action"],
    ["a6", `Scribe\npostmortem → DataHub`, "action"],
    ["a7", `Comms\nowners notified · RESOLVED`, "ok"],
  ];
  actions.forEach(([id, label, tone], i) => {
    nodes.push(fnode(id, label, i * 200, 170, tone));
  });

  const edges: Edge[] = [
    fedge("l_src", "l_mart"),
    ...(ml ? [fedge("l_mart", "l_ml")] : []),
    fedge("a1", "a2"),
    fedge("a2", "a3"),
    fedge("a3", "a4"),
    fedge("a4", "a5"),
    fedge("a5", "a6"),
    fedge("a6", "a7"),
    // cross links: actions → the data entities they touch
    fedge("a1", "l_src", true),
    fedge("a3", "l_mart", true),
    ...(ml ? [fedge("a4", "l_ml", true)] : []),
  ];

  return { nodes, edges };
}
