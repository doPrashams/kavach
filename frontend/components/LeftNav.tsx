"use client";

import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Info,
  Layers,
  Play,
  User,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSiteGuide, getSiteHealth, type SiteGuide, type SiteHealth } from "@/lib/api";
import { TOUR_STEPS } from "@/lib/site-content";

type NavSection = "howto" | "about" | "stack" | "health";

interface LeftNavProps {
  onTourActiveChange?: (active: boolean) => void;
}

export function LeftNav({ onTourActiveChange }: LeftNavProps) {
  const [section, setSection] = useState<NavSection>("howto");
  const [guide, setGuide] = useState<SiteGuide | null>(null);
  const [health, setHealth] = useState<SiteHealth | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);

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
              ["about", "About me", User],
              ["stack", "Tech stack", Layers],
              ["health", "Site health", Activity],
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
                  <Button type="button" variant="secondary" size="sm" onClick={() => void refreshHealth()}>
                    Refresh health
                  </Button>
                </>
              ) : (
                <p className="text-muted-foreground">Loading /api/health…</p>
              )}
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
  const [box, setBox] = useState<DOMRect | null>(null);

  useEffect(() => {
    const el = document.querySelector(`[data-tour-id="${step.target}"]`);
    if (el) {
      setBox(el.getBoundingClientRect());
      el.classList.add("ring-2", "ring-cyan-400", "ring-offset-2", "ring-offset-slate-950");
      return () => {
        el.classList.remove("ring-2", "ring-cyan-400", "ring-offset-2", "ring-offset-slate-950");
      };
    }
    setBox(null);
  }, [step.target]);

  const cardTop = box ? Math.min(box.bottom + 12, window.innerHeight - 220) : 80;
  const cardLeft = box ? Math.min(Math.max(16, box.left), window.innerWidth - 360) : 80;

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/55" />
      <div
        className="pointer-events-auto absolute w-[340px] rounded-xl border border-cyan-400/40 bg-slate-950 p-4 shadow-2xl"
        style={{ top: cardTop, left: cardLeft }}
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
    </div>
  );
}
