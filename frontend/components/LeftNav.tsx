"use client";

import {
  Activity,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  History,
  Info,
  Layers,
  Play,
  ScrollText,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  clearAuditLog,
  getAuditLog,
  getSiteGuide,
  getSiteHealth,
  type AuditLog,
  type SiteGuide,
  type SiteHealth,
} from "@/lib/api";
import type { RunHistoryEntry } from "@/lib/run-history";
import { TOUR_STEPS } from "@/lib/site-content";

type NavSection =
  | "howto"
  | "scenarios"
  | "history"
  | "about"
  | "stack"
  | "health"
  | "activity";

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-red-500/20 text-red-200",
  high: "bg-orange-500/20 text-orange-200",
  medium: "bg-amber-500/20 text-amber-200",
};

interface LeftNavProps {
  onTourActiveChange?: (active: boolean) => void;
  runHistory?: RunHistoryEntry[];
  activeRunId?: string | null;
  onSelectRun?: (runId: string) => void;
  onClearHistory?: () => void;
}

export function LeftNav({
  onTourActiveChange,
  runHistory = [],
  activeRunId = null,
  onSelectRun,
  onClearHistory,
}: LeftNavProps) {
  const [section, setSection] = useState<NavSection>("howto");
  const [guide, setGuide] = useState<SiteGuide | null>(null);
  const [health, setHealth] = useState<SiteHealth | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [audit, setAudit] = useState<AuditLog | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);
  const [clearing, setClearing] = useState(false);

  const refreshHealth = useCallback(async () => {
    try {
      setHealthError(null);
      const data = await getSiteHealth();
      setHealth(data);
    } catch (error) {
      setHealthError(error instanceof Error ? error.message : "Health check failed");
    }
  }, []);

  useEffect(() => {
    getSiteGuide().then(setGuide).catch(() => setGuide(null));
    void refreshHealth();
    const timer = setInterval(() => void refreshHealth(), 30_000);
    return () => clearInterval(timer);
  }, [refreshHealth]);

  const refreshAudit = useCallback(async () => {
    try {
      setAuditError(null);
      setAudit(await getAuditLog(100));
    } catch (error) {
      setAuditError(error instanceof Error ? error.message : "Failed to load audit log");
    }
  }, []);

  useEffect(() => {
    if (section === "activity") void refreshAudit();
  }, [section, refreshAudit]);

  useEffect(() => {
    onTourActiveChange?.(tourOpen);
  }, [onTourActiveChange, tourOpen]);

  useEffect(() => {
    if (!tourOpen) return;
    const step = TOUR_STEPS[tourIndex];
    const el = document.querySelector(`[data-tour-id="${step.target}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [tourIndex, tourOpen]);

  async function handleClearAll() {
    if (
      !window.confirm(
        "Clear all incident run history and admin audit logs? This cannot be undone.",
      )
    ) {
      return;
    }
    setClearing(true);
    try {
      onClearHistory?.();
      await clearAuditLog().catch(() => null);
      await refreshAudit();
    } finally {
      setClearing(false);
    }
  }

  const healthBadge =
    health?.status === "ok" ? (
      <Badge className="bg-emerald-600/30 text-emerald-300">Healthy</Badge>
    ) : health ? (
      <Badge variant="destructive">Degraded</Badge>
    ) : (
      <Badge variant="secondary">Checking…</Badge>
    );

  return (
    <>
      <aside
        data-tour-id="tour-health"
        className="flex h-full flex-col border-r border-border/40 bg-background/50 backdrop-blur"
      >
        <div className="border-b border-border/40 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-400">Kavach</p>
          <h2 className="text-lg font-semibold">Guide</h2>
          <div className="mt-2 flex items-center gap-2">{healthBadge}</div>
        </div>

        <nav className="flex flex-col gap-1 p-2">
          {(
            [
              ["howto", "How to use", Info],
              ["scenarios", "Scenarios", AlertTriangle],
              ["history", "Run history", History],
              ["about", "About me", User],
              ["stack", "Tech stack", Layers],
              ["health", "Site health", Activity],
              ["activity", "Activity log", ScrollText],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                section === id
                  ? "bg-cyan-500/15 text-cyan-200"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              }`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
              {id === "history" && runHistory.length > 0 ? (
                <Badge variant="secondary" className="ml-auto text-[10px]">
                  {runHistory.length}
                </Badge>
              ) : null}
            </button>
          ))}
          <Button
            type="button"
            variant="secondary"
            className="mt-2 justify-start gap-2"
            onClick={() => {
              setTourIndex(0);
              setTourOpen(true);
            }}
          >
            <Play className="size-4" aria-hidden="true" />
            Play site tour
          </Button>
        </nav>

        <div className="flex-1 overflow-y-auto px-4 pb-6 pt-2 text-sm">
          {section === "howto" ? (
            <ol className="space-y-3">
              {(guide?.instructions ?? []).map((item) => (
                <li key={item.step} className="rounded-lg border border-border/40 p-3">
                  <p className="font-medium text-cyan-200">
                    {item.step}. {item.title}
                  </p>
                  <p className="mt-1 text-muted-foreground">{item.body}</p>
                </li>
              ))}
            </ol>
          ) : null}

          {section === "scenarios" ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Six real failure modes. Pick one in the Chaos panel and inject it — the war room
                shows it crash, then heal.
              </p>
              {(guide?.scenarios ?? []).map((s) => (
                <div key={s.id} className="rounded-lg border border-border/40 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-cyan-200">{s.label}</p>
                    <Badge className={SEVERITY_STYLES[s.severity] ?? "bg-muted/40"}>
                      {s.severity}
                    </Badge>
                    {s.simulated ? <Badge variant="secondary">simulated</Badge> : null}
                    {s.ml_hold ? (
                      <Badge className="bg-amber-500/20 text-amber-200">ML hold</Badge>
                    ) : null}
                  </div>
                  <dl className="mt-2 space-y-1.5 text-xs">
                    <div>
                      <dt className="font-semibold text-red-300">What breaks</dt>
                      <dd className="text-muted-foreground">{s.symptom}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-orange-300">Impact</dt>
                      <dd className="text-muted-foreground">{s.impact}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-sky-300">How Kavach detects</dt>
                      <dd className="text-muted-foreground">{s.detects}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-emerald-300">Auto-fix</dt>
                      <dd className="text-muted-foreground">{s.fix}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-muted-foreground">Blast radius</dt>
                      <dd className="font-mono text-[11px] text-muted-foreground">
                        {s.affected.join(" → ")}
                      </dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          ) : null}

          {section === "history" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Click a run to open its incident report.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={clearing || (runHistory.length === 0 && !(audit?.count))}
                  onClick={() => void handleClearAll()}
                >
                  <Trash2 className="mr-1 size-3.5" aria-hidden="true" />
                  Clear all
                </Button>
              </div>
              {runHistory.length === 0 ? (
                <p className="text-muted-foreground">
                  No runs yet — inject chaos to create an incident report.
                </p>
              ) : (
                <ul className="space-y-2">
                  {runHistory.map((entry) => {
                    const selected = entry.run_id === activeRunId;
                    return (
                      <li key={entry.run_id}>
                        <button
                          type="button"
                          onClick={() => onSelectRun?.(entry.run_id)}
                          className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                            selected
                              ? "border-cyan-400/50 bg-cyan-500/10"
                              : "border-border/40 hover:border-cyan-400/30 hover:bg-muted/30"
                          }`}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-cyan-200">{entry.label}</span>
                            <Badge
                              className={SEVERITY_STYLES[entry.severity] ?? "bg-muted/40"}
                            >
                              {entry.severity}
                            </Badge>
                            <Badge
                              className={
                                entry.status === "resolved"
                                  ? "bg-emerald-600/25 text-emerald-200"
                                  : "bg-red-500/20 text-red-200"
                              }
                            >
                              {entry.status}
                            </Badge>
                          </div>
                          <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                            {entry.run_id}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(entry.ts).toLocaleString()}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : null}

          {section === "about" && guide ? (
            <div className="space-y-3 rounded-lg border border-border/40 p-3">
              <p className="text-lg font-semibold">{guide.about.name}</p>
              <p className="text-muted-foreground">{guide.about.blurb}</p>
              <a className="block text-sky-400 hover:underline" href={guide.about.github}>
                GitHub
              </a>
              <a className="block text-sky-400 hover:underline" href={guide.about.repo}>
                Kavach repo
              </a>
              <a className="block text-sky-400 hover:underline" href={guide.about.demoPipeline}>
                Demo pipeline
              </a>
              <p className="text-xs text-muted-foreground">{guide.about.email}</p>
            </div>
          ) : null}

          {section === "stack" && guide ? (
            <ul className="space-y-3">
              {guide.tech_stack.map((row) => (
                <li key={row.layer} className="rounded-lg border border-border/40 p-3">
                  <p className="font-medium text-cyan-200">{row.layer}</p>
                  <p className="mt-1 text-muted-foreground">{row.items.join(" · ")}</p>
                </li>
              ))}
            </ul>
          ) : null}

          {section === "health" ? (
            <div className="space-y-3">
              {healthError ? <p className="text-destructive">{healthError}</p> : null}
              {health ? (
                <>
                  <div className="rounded-lg border border-border/40 p-3">
                    <p className="font-medium">Deployment</p>
                    <a
                      className="mt-1 block text-sky-400 hover:underline"
                      href={health.deployment.frontend.url}
                    >
                      {health.deployment.frontend.name}: {health.deployment.frontend.url}
                    </a>
                    <p className="mt-2 text-xs text-muted-foreground">
                      DataHub VM: {health.datahub.ok ? "reachable" : "optional / offline"} (
                      {health.deployment.backend_optional.url})
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      APIs healthy: {health.summary.healthy}/{health.summary.total}
                    </p>
                  </div>
                  <ul className="space-y-2">
                    {health.apis.map((api) => (
                      <li
                        key={`${api.method}-${api.path}`}
                        className="flex items-start justify-between gap-2 rounded-md border border-border/30 px-2 py-1.5 text-xs"
                      >
                        <span>
                          <span className="font-mono text-cyan-300">
                            {api.method} {api.path}
                          </span>
                          <span className="mt-0.5 block text-muted-foreground">{api.widget}</span>
                        </span>
                        <Badge variant={api.ok ? "secondary" : "destructive"}>
                          {api.ok ? `${api.status} · ${api.latency_ms}ms` : "down"}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => void refreshHealth()}
                  >
                    Refresh health
                  </Button>
                </>
              ) : (
                <p className="text-muted-foreground">Loading /api/health…</p>
              )}
            </div>
          ) : null}

          {section === "activity" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Admin audit — who ran what, when & from where
                </p>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => void refreshAudit()}
                  >
                    Refresh
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={clearing}
                    onClick={() => void handleClearAll()}
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </div>
              {audit ? (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant={audit.durable ? "secondary" : "destructive"}>
                    {audit.durable ? "durable (Redis)" : "in-memory"}
                  </Badge>
                  <Badge variant="secondary">{audit.count} events</Badge>
                  {audit.protected ? <Badge variant="secondary">token-protected</Badge> : null}
                </div>
              ) : null}
              {auditError ? <p className="text-destructive">{auditError}</p> : null}
              {audit && audit.entries.length === 0 ? (
                <p className="text-muted-foreground">
                  No activity yet — inject a scenario, then refresh.
                </p>
              ) : null}
              <ul className="space-y-2">
                {(audit?.entries ?? []).map((e) => (
                  <li
                    key={e.id}
                    className="rounded-md border border-border/30 px-2 py-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-cyan-300">{e.action}</span>
                      <span className="text-muted-foreground">
                        {new Date(e.ts).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-0.5 text-muted-foreground">
                      {e.scenario ? (
                        <span className="text-foreground/80">{e.scenario}</span>
                      ) : null}
                      {e.ip ? <span> · {e.ip}</span> : null}
                      {e.city || e.country ? (
                        <span>
                          {" "}
                          · {[e.city, e.region, e.country].filter(Boolean).join(", ")}
                        </span>
                      ) : null}
                    </div>
                    {e.user_agent ? (
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground/70">
                        {e.user_agent}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </aside>

      {tourOpen ? (
        <ProductTour
          index={tourIndex}
          onClose={() => setTourOpen(false)}
          onBack={() => setTourIndex((i) => Math.max(0, i - 1))}
          onNext={() =>
            setTourIndex((i) => {
              if (i >= TOUR_STEPS.length - 1) {
                setTourOpen(false);
                return i;
              }
              return i + 1;
            })
          }
        />
      ) : null}
    </>
  );
}

function ProductTour({
  index,
  onClose,
  onBack,
  onNext,
}: {
  index: number;
  onClose: () => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const step = TOUR_STEPS[index];
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const el = document.querySelector(`[data-tour-id="${step.target}"]`);
    if (el) {
      el.classList.add(
        "relative",
        "z-[9998]",
        "ring-2",
        "ring-cyan-400",
        "ring-offset-4",
        "ring-offset-slate-950",
        "rounded-xl",
        "transition-all",
      );
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      return () => {
        el.classList.remove(
          "relative",
          "z-[9998]",
          "ring-2",
          "ring-cyan-400",
          "ring-offset-4",
          "ring-offset-slate-950",
          "rounded-xl",
          "transition-all",
        );
      };
    }
  }, [step.target]);

  if (!mounted) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[9999]">
      <div
        className="pointer-events-auto fixed bottom-6 left-1/2 z-[9999] w-[min(92vw,440px)] -translate-x-1/2 rounded-xl border border-cyan-400/50 bg-slate-950 p-4 shadow-[0_0_40px_rgba(34,211,238,0.35)]"
        role="dialog"
        aria-label="Site tour"
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-cyan-400">
              Step {index + 1} / {TOUR_STEPS.length}
            </p>
            <h3 className="text-lg font-semibold">{step.title}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close tour">
            <X className="size-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">{step.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <Button type="button" variant="secondary" size="sm" onClick={onBack} disabled={index === 0}>
            <ChevronLeft className="size-4" /> Back
          </Button>
          <Button type="button" size="sm" onClick={onNext}>
            {index >= TOUR_STEPS.length - 1 ? "Done" : "Next"}
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
