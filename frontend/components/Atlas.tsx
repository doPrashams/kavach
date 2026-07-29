"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Layers, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import {
  ATLAS_CONNECTIONS,
  ATLAS_DATA_SOURCES,
  ATLAS_DATAHUB_MATRIX,
  ATLAS_DATAHUB_UPSTREAM,
  ATLAS_DOMAINS,
  ATLAS_MOTTO,
  ATLAS_REAL_VS_SIMULATED,
  ATLAS_STACK,
} from "@/lib/site-content";
import { cn } from "@/lib/utils";

type StackItem = (typeof ATLAS_STACK)[number];

/** Optical scale so brand marks read at similar visual weight inside square tiles. */
const OPTICAL_SCALE: Record<string, number> = {
  datahub: 0.88,
  gcp: 0.9,
  vercel: 0.72,
  duckdb: 0.9,
  dbt: 0.86,
  mlflow: 0.88,
  langgraph: 0.9,
  nextjs: 0.86,
  "scikit-learn": 0.9,
  python: 0.9,
  github: 0.86,
};

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export function Atlas() {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusables = panel?.querySelectorAll<HTMLElement>(FOCUSABLE);
    focusables?.[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute("disabled") && el.offsetParent !== null,
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open, close]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="fixed left-1/2 top-0 z-[70] flex -translate-x-1/2 items-center gap-1.5 rounded-b-2xl border border-t-0 border-slate-300/70 bg-white/90 px-4 py-1.5 text-xs font-semibold tracking-wide text-slate-800 shadow-md backdrop-blur transition hover:bg-sky-50 hover:text-sky-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-600/80 dark:bg-slate-900/90 dark:text-slate-100 dark:hover:bg-slate-800 dark:hover:text-sky-200"
      >
        <Layers className="size-3.5 opacity-70" aria-hidden="true" />
        How Kavach works
      </button>

      <AnimatePresence>
        {open ? (
          <>
            <motion.div
              key="atlas-backdrop"
              className="fixed inset-0 z-[80] bg-slate-950/55 backdrop-blur-[2px]"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0.01 : 0.2 }}
              onClick={close}
              aria-hidden="true"
            />
            <motion.div
              key="atlas-panel"
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="fixed inset-x-0 top-0 z-[90] max-h-[min(92vh,920px)] overflow-y-auto border-b border-slate-200 bg-[radial-gradient(ellipse_at_top,_#f8fafc_0%,_#eef2f7_55%,_#e2e8f0_100%)] shadow-2xl dark:border-slate-700 dark:bg-[radial-gradient(ellipse_at_top,_#1e293b_0%,_#0f172a_50%,_#020617_100%)]"
              initial={reduceMotion ? { opacity: 0 } : { y: "-100%", opacity: 0.85 }}
              animate={reduceMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { y: "-100%", opacity: 0.85 }}
              transition={
                reduceMotion
                  ? { duration: 0.01 }
                  : { type: "spring", stiffness: 380, damping: 34, mass: 0.85 }
              }
            >
              <div className="mx-auto max-w-5xl px-4 pb-8 pt-5 sm:px-6">
                <header className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-sky-600 dark:text-cyan-400">
                      Atlas
                    </p>
                    <h2 id={titleId} className="text-xl font-semibold sm:text-2xl">
                      How Kavach works
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Close Atlas"
                    className="rounded-lg border border-border/60 p-2 text-muted-foreground transition hover:bg-background/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                  >
                    <X className="size-4" />
                  </button>
                </header>
                <AtlasContent />
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}

/** Inline Atlas body — used by the modal and the /deck slide. */
export function AtlasContent({ className }: { className?: string }) {
  const [activeId, setActiveId] = useState<string>(ATLAS_STACK[0]?.id ?? "datahub");
  const active = ATLAS_STACK.find((item) => item.id === activeId) ?? ATLAS_STACK[0];

  const select = useCallback((id: string) => setActiveId(id), []);

  const onTileKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, id: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      select(id);
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      <p className="whitespace-pre-line rounded-xl border border-sky-500/25 bg-sky-500/5 px-4 py-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
        {ATLAS_MOTTO}
      </p>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Two use cases
        </h3>
        <ul className="grid gap-3 sm:grid-cols-2">
          {ATLAS_DOMAINS.map((d) => (
            <li
              key={d.id}
              className="rounded-xl border border-border/50 bg-background/60 px-3 py-3 text-sm"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-600 dark:text-sky-300">
                {d.id}
              </p>
              <p className="mt-1 font-semibold">{d.label}</p>
              <p className="text-xs text-muted-foreground">{d.tagline}</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{d.body}</p>
              <a
                href={d.dataLink.url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex text-xs text-sky-600 hover:underline dark:text-sky-300"
              >
                {d.dataLink.label}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Stack
        </h3>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {ATLAS_STACK.map((item) => (
            <StackTile
              key={item.id}
              item={item}
              active={item.id === activeId}
              onReveal={() => select(item.id)}
              onKeyDown={(event) => onTileKeyDown(event, item.id)}
            />
          ))}
        </div>

        <div
          className="mt-3 min-h-[9.5rem] rounded-xl border border-border/50 bg-white/70 p-4 dark:bg-slate-950/50"
          aria-live="polite"
        >
          {active ? <StackDetail item={active} /> : null}
        </div>
      </div>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Data sources
        </h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {ATLAS_DATA_SOURCES.map((src) => (
            <li
              key={src.id}
              className="rounded-lg border border-border/40 bg-background/50 px-3 py-2.5 text-sm"
            >
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <p className="font-medium">{src.name}</p>
                <span className="text-[11px] text-muted-foreground">{src.kind}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{src.usedFor}</p>
              <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-300/90">
                {src.whySafe}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{src.license}</p>
              {"url" in src && src.url ? (
                <a
                  href={src.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex text-xs text-sky-600 hover:underline dark:text-sky-300"
                >
                  Open source
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Connections
        </h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {ATLAS_CONNECTIONS.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border border-border/40 bg-background/50 px-3 py-2.5 text-sm"
            >
              <p className="font-medium">{row.label}</p>
              <p className="mt-0.5 font-mono text-[11px] text-sky-700 dark:text-sky-300">
                {row.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{row.detail}</p>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                {row.whereConfigured}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          From datahub-project/datahub
        </h3>
        <p className="mb-2 text-xs text-muted-foreground">
          Surfaces we pull from the upstream Context Platform repo and docs — not a fork, a real
          consumer of their OSS stack.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {ATLAS_DATAHUB_UPSTREAM.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border border-border/40 bg-background/50 px-3 py-2.5 text-sm"
            >
              <p className="font-medium">{row.label}</p>
              <p className="mt-0.5 font-mono text-[11px] text-sky-700 dark:text-sky-300">
                {row.upstream}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{row.howWeUse}</p>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">{row.whereInRepo}</p>
            </li>
          ))}
        </ul>
      </section>

      <footer>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Real vs simulated
        </h3>
        <ul className="space-y-1.5">
          {ATLAS_REAL_VS_SIMULATED.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-start gap-2 rounded-lg border border-border/40 bg-background/40 px-3 py-2 text-sm"
            >
              <span
                className={cn(
                  "mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                  row.kind === "real"
                    ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                    : "bg-amber-500/15 text-amber-800 dark:text-amber-200",
                )}
              >
                {row.kind}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{row.label}</p>
                <p className="text-xs text-muted-foreground">{row.note}</p>
              </div>
            </li>
          ))}
        </ul>
      </footer>
    </div>
  );
}

/** Black/monochrome Simple Icons that stay inverted in dark mode even when “in color”. */
const DARK_KEEP_INVERT = new Set(["vercel", "nextjs", "github"]);

function StackTile({
  item,
  active,
  onReveal,
  onKeyDown,
}: {
  item: StackItem;
  active: boolean;
  onReveal: () => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => void;
}) {
  const featured = "featured" in item && item.featured;
  const scale = OPTICAL_SCALE[item.id] ?? 0.88;
  const keepInvert = DARK_KEEP_INVERT.has(item.id);

  return (
    <button
      type="button"
      onMouseEnter={onReveal}
      onFocus={onReveal}
      onClick={onReveal}
      onKeyDown={onKeyDown}
      aria-pressed={active}
      aria-label={`${item.name}: ${item.whatItIs}`}
      className={cn(
        "group flex flex-col items-center gap-1.5 rounded-xl border p-2 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
        featured ? "col-span-2" : "col-span-1",
        active
          ? "border-sky-500/50 bg-sky-500/10 shadow-sm"
          : "border-border/50 bg-white/60 hover:border-sky-500/35 dark:bg-slate-950/40",
      )}
    >
      <span
        className={cn(
          "relative flex aspect-square w-full max-w-[4.5rem] items-center justify-center rounded-lg bg-slate-100/80 dark:bg-slate-900/80",
          featured && "max-w-[5.5rem]",
        )}
      >
        <span
          className={cn(
            "relative block grayscale transition duration-200",
            "group-hover:grayscale-0 group-focus-visible:grayscale-0",
            active && "grayscale-0",
          )}
          style={{ width: `${scale * 100}%`, height: `${scale * 100}%` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- local SVG brand marks */}
          <img
            src={item.logo}
            alt=""
            className={cn(
              "size-full object-contain transition duration-200",
              keepInvert
                ? "dark:invert"
                : "dark:invert dark:group-hover:invert-0 dark:group-focus-visible:invert-0",
              !keepInvert && active && "dark:invert-0",
            )}
          />
        </span>
      </span>
      <span className="text-[11px] font-medium leading-tight text-foreground/90">{item.name}</span>
    </button>
  );
}

function StackDetail({ item }: { item: StackItem }) {
  const showMatrix = item.id === "datahub";

  return (
    <div className="space-y-3">
      <div>
        <p className="text-base font-semibold">{item.name}</p>
        <dl className="mt-2 space-y-1.5 text-sm">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              What it is
            </dt>
            <dd>{item.whatItIs}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              What we use it for
            </dt>
            <dd>{item.whatWeUseItFor}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Where in repo
            </dt>
            <dd className="font-mono text-xs text-sky-700 dark:text-sky-300">{item.whereInRepo}</dd>
          </div>
        </dl>
      </div>

      {showMatrix ? (
        <div className="overflow-x-auto rounded-lg border border-border/40">
          <table className="w-full min-w-[28rem] text-left text-xs">
            <caption className="sr-only">How Kavach uses DataHub</caption>
            <thead className="bg-slate-100/80 text-[10px] uppercase tracking-wider text-muted-foreground dark:bg-slate-900/80">
              <tr>
                <th className="px-2.5 py-1.5 font-semibold">Capability</th>
                <th className="px-2.5 py-1.5 font-semibold">Access</th>
                <th className="px-2.5 py-1.5 font-semibold">Path</th>
              </tr>
            </thead>
            <tbody>
              {ATLAS_DATAHUB_MATRIX.map((row) => (
                <tr key={row.capability} className="border-t border-border/30">
                  <td className="px-2.5 py-1.5">{row.capability}</td>
                  <td className="px-2.5 py-1.5 font-mono text-[10px]">{row.access}</td>
                  <td className="px-2.5 py-1.5 font-mono text-[10px] text-muted-foreground">
                    {row.path}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
