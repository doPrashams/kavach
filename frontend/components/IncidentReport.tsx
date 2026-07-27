"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowDown,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  GitPullRequest,
  ListTree,
  Workflow,
  X,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
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
        className={`fixed inset-0 z-[80] bg-slate-900/40 backdrop-blur-[2px] transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed inset-y-0 right-0 z-[90] flex w-[min(640px,100vw)] flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 dark:border-slate-700 dark:bg-slate-950 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label="Incident report"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border/40 p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-sky-600 dark:text-cyan-400">
              Incident report
            </p>
            <h2 className="text-lg font-semibold">{spec.label}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge className="bg-emerald-600/15 text-emerald-700 dark:bg-emerald-600/25 dark:text-emerald-200">
                <CheckCircle2 className="mr-1 size-3" /> resolved
              </Badge>
              <Badge variant="secondary">severity {spec.severity}</Badge>
              {spec.ml_hold ? (
                <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-200">
                  ML deployment held
                </Badge>
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
                  ? "border-b-2 border-sky-500 text-sky-700 dark:border-cyan-400 dark:text-cyan-200"
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
            <FlowTab spec={spec} runState={runState} events={events} fix={fix} />
          )}
        </div>
      </aside>
    </>
  );
}

function Collapsible({
  title,
  icon: Icon,
  defaultOpen = false,
  summary,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultOpen?: boolean;
  summary?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="mb-3 overflow-hidden rounded-xl border border-border/50 bg-slate-50/80 dark:bg-slate-900/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold"
      >
        <Icon className="size-4 shrink-0 text-sky-600 dark:text-cyan-400" aria-hidden="true" />
        <span className="flex-1">{title}</span>
        {summary && !open ? (
          <span className="mr-2 max-w-[45%] truncate text-xs font-normal text-muted-foreground">
            {summary}
          </span>
        ) : null}
        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/40 px-3 py-3 text-sm">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
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
      <Collapsible
        icon={AlertTriangle}
        title="What happened"
        defaultOpen
        summary={spec.symptom.slice(0, 60)}
      >
        <p className="text-red-700 dark:text-red-200">{spec.symptom}</p>
        <p className="mt-1 text-muted-foreground">
          <span className="font-medium text-orange-700 dark:text-orange-300">Impact:</span>{" "}
          {spec.impact}
        </p>
      </Collapsible>

      <Collapsible
        icon={ListTree}
        title="Timeline of actions"
        summary={`${events.length || 7} agent steps`}
      >
        <ol className="relative space-y-3 border-l border-border/50 pl-4">
          {(events.length ? events : []).map((e, i) => (
            <li key={e.id} className="relative">
              <span className="absolute -left-[21px] top-1 flex size-4 items-center justify-center rounded-full bg-sky-500/20 text-[10px] font-bold text-sky-700 dark:text-cyan-200">
                {i + 1}
              </span>
              <p className="font-medium text-sky-800 dark:text-cyan-200">
                {AGENT_LABEL[e.agent] ?? e.agent}
              </p>
              <p className="text-muted-foreground">{e.message}</p>
            </li>
          ))}
          {events.length === 0 ? (
            <li className="text-muted-foreground">No events recorded for this run.</li>
          ) : null}
        </ol>
      </Collapsible>

      <Collapsible
        icon={AlertTriangle}
        title="Root cause"
        defaultOpen
        summary={(runState?.root_cause ?? spec.root_cause).slice(0, 50)}
      >
        <p className="rounded-lg border border-border/40 bg-white/70 p-3 text-muted-foreground dark:bg-background/40">
          {runState?.root_cause ?? spec.root_cause}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          <span className="font-medium">Detected by:</span> {spec.detects}
        </p>
      </Collapsible>

      <Collapsible icon={ListTree} title="Blast radius" summary={`${affected.length} assets`}>
        <div className="flex flex-wrap gap-2">
          {affected.map((a) => (
            <Badge key={a} variant="secondary" className="font-mono text-[11px]">
              {a}
            </Badge>
          ))}
        </div>
      </Collapsible>

      <Collapsible
        icon={GitPullRequest}
        title="Fix applied"
        summary={fix?.artifacts.pr_title ?? spec.fix.pr_title}
      >
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
      </Collapsible>

      <Collapsible
        icon={CheckCircle2}
        title="Tests run"
        defaultOpen
        summary={`${spec.tests.length} passed`}
      >
        <ul className="space-y-1.5">
          {spec.tests.map((t) => (
            <li key={t} className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
              <span className="font-mono text-muted-foreground">{t}</span>
              <span className="ml-auto text-emerald-600 dark:text-emerald-400">PASS</span>
            </li>
          ))}
        </ul>
      </Collapsible>

      <Collapsible
        icon={GitPullRequest}
        title="Pull request"
        summary={isRealPr ? `#${realPr.number} merged` : "artifact"}
      >
        {isRealPr ? (
          <div className="space-y-1 rounded-lg border border-violet-300/50 bg-violet-50 p-3 text-xs dark:border-purple-500/30 dark:bg-purple-950/20">
            <p className="font-mono">
              {realPr.repo}#{realPr.number} ·{" "}
              <span className="text-emerald-600 dark:text-emerald-300">+{realPr.additions}</span>{" "}
              <span className="text-red-600 dark:text-red-300">−{realPr.deletions}</span> ·{" "}
              {realPr.changed_files} files
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
            className="mt-2 inline-block text-sm text-sky-600 hover:underline dark:text-sky-400"
          >
            {isRealPr ? "Open merged pull request →" : "Open pull requests →"}
          </a>
        ) : null}
      </Collapsible>

      <Collapsible icon={FileText} title="Postmortem" summary="written to DataHub">
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-border/40 bg-white/70 p-3 text-xs text-muted-foreground dark:bg-background/40">
          {runState?.postmortem ?? "Postmortem written to DataHub Context Documents."}
        </pre>
      </Collapsible>
    </div>
  );
}

function FlowStep({
  step,
  tone,
  title,
  body,
  delay,
}: {
  step: number;
  tone: "fail" | "action" | "ok";
  title: string;
  body: string;
  delay: number;
}) {
  const toneCls =
    tone === "fail"
      ? "border-red-300 bg-red-50 dark:border-red-500/40 dark:bg-red-950/40"
      : tone === "ok"
        ? "border-emerald-300 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-950/30"
        : "border-sky-300 bg-sky-50 dark:border-cyan-500/40 dark:bg-cyan-950/30";
  const badgeCls =
    tone === "fail"
      ? "bg-red-500/15 text-red-700 dark:text-red-200"
      : tone === "ok"
        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200"
        : "bg-sky-500/15 text-sky-800 dark:text-cyan-200";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.28 }}
      className={`rounded-xl border px-3 py-3 ${toneCls}`}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${badgeCls}`}>
          Step {step}
        </span>
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <p className="text-sm text-muted-foreground">{body}</p>
    </motion.div>
  );
}

function FlowTab({
  spec,
  runState,
  events,
  fix,
}: {
  spec: ReturnType<typeof getSpec>;
  runState: RunState | null;
  events: AgentEvent[];
  fix: FixResponse | null;
}) {
  const blast = runState?.blast_radius;
  const chain = [
    ...(blast?.datasets ?? []).map((d) => d.name),
    ...(blast?.dashboards ?? []).map((d) => d.name),
    ...(blast?.ml_deployments ?? []).map((d) => d.name),
  ];
  if (chain.length === 0) {
    chain.push(...spec.datasets.map((d) => d.name), ...spec.ml_deployments.map((d) => d.name));
  }

  const steps: Array<{ tone: "fail" | "action" | "ok"; title: string; body: string }> = [
    {
      tone: "fail",
      title: "1. Data breaks",
      body: `${spec.source_name} — ${spec.symptom}`,
    },
    {
      tone: "action",
      title: "2. Detect",
      body: events[0]?.message ?? spec.detects,
    },
    {
      tone: "action",
      title: "3. Root cause",
      body: runState?.root_cause ?? spec.root_cause,
    },
    {
      tone: "fail",
      title: "4. Blast radius (data flow)",
      body: chain.join("  →  "),
    },
    {
      tone: spec.ml_hold ? "fail" : "action",
      title: "5. ML Guardian",
      body: spec.ml_hold
        ? `HOLD production deployment (risk: ${spec.ml_risk})`
        : `Monitor only (risk: ${spec.ml_risk})`,
    },
    {
      tone: "action",
      title: "6. Fix + PR",
      body: fix?.artifacts.pr_title ?? spec.fix.pr_title,
    },
    {
      tone: "ok",
      title: "7. Tests pass",
      body: spec.tests.map((t) => `✓ ${t}`).join(" · "),
    },
    {
      tone: "ok",
      title: "8. Resolve",
      body: "Postmortem written to DataHub · owners notified · incident closed",
    },
  ];

  return (
    <div className="space-y-2">
      <p className="mb-3 text-xs text-muted-foreground">
        Read top → bottom: failure → detection → impact → fix → resolve. No graph — just the story.
      </p>
      {steps.map((s, i) => (
        <div key={s.title}>
          <FlowStep step={i + 1} tone={s.tone} title={s.title} body={s.body} delay={i * 0.06} />
          {i < steps.length - 1 ? (
            <div className="flex justify-center py-1 text-muted-foreground">
              <ArrowDown className="size-4" aria-hidden="true" />
            </div>
          ) : null}
        </div>
      ))}
      <p className="mt-4 rounded-lg border border-border/40 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        Tip: switch to the <span className="font-medium">Report</span> tab for diffs, PR details, and
        the full postmortem.
      </p>
    </div>
  );
}
