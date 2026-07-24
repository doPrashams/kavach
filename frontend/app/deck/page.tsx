"use client";

import { motion } from "framer-motion";
import Link from "next/link";

import { getDemoFixture } from "@/lib/fixtures";

const slides = [
  {
    id: "hook",
    title: "Your data platform breaks at 2am.",
    body: "Kavach is the war room that detects, investigates, fixes, and learns — before the dashboard turns red.",
  },
  {
    id: "problem",
    title: "Incidents are slow because context is scattered.",
    body: "Lineage, ML deployments, ownership, and postmortems live in different tabs. Agents need one surface.",
  },
  {
    id: "loop",
    title: "The self-healing loop",
    body: "Inject chaos → Sentinel detects → Investigator roots cause → Fixer ships a PR → Scribe writes back → MTTR drops.",
  },
  {
    id: "datahub",
    title: "DataHub is the memory",
    body: "Lineage traversal, incidents, assertions, ML entities, and Context Documents power every agent decision.",
  },
  {
    id: "oss",
    title: "OSS contribution",
    body: "We contribute a datahub-incident-response skill so every team can adopt the same playbook.",
  },
  {
    id: "results",
    title: "Results: measurable MTTR flywheel",
    body: "Repeated schema_drift incidents resolve faster after postmortem writebacks — reproducible in replay mode.",
  },
];

export default function DeckPage() {
  const fixture = getDemoFixture();
  const mttr = fixture.mttrTrend.map((point) => point.mttr_seconds);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#0f172a,_#020617)] text-foreground">
      <header className="flex items-center justify-between border-b border-border/40 px-6 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-400">Kavach /deck</p>
          <h1 className="text-xl font-semibold">Presentation mode</h1>
        </div>
        <Link href="/" className="text-sm text-sky-400 hover:underline">
          Back to war room
        </Link>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-10">
        {slides.map((slide, index) => (
          <motion.section
            key={slide.id}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5, delay: index * 0.05 }}
            className="rounded-2xl border border-border/50 bg-card/60 p-8 backdrop-blur"
          >
            <h2 className="text-3xl font-semibold">{slide.title}</h2>
            <p className="mt-4 max-w-3xl text-lg text-muted-foreground">{slide.body}</p>
            {slide.id === "loop" ? <LoopDiagram /> : null}
            {slide.id === "results" ? <MttrStrip values={mttr} /> : null}
          </motion.section>
        ))}
      </main>
    </div>
  );
}

function LoopDiagram() {
  const steps = [
    "Chaos",
    "Sentinel",
    "Investigator",
    "Fixer",
    "Scribe",
    "Flywheel",
  ];

  return (
    <div className="mt-8 overflow-x-auto">
      <div className="flex min-w-max items-center gap-3">
        {steps.map((step, index) => (
          <motion.div
            key={step}
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.08 }}
            className="flex items-center gap-3"
          >
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm font-medium">
              {step}
            </div>
            {index < steps.length - 1 ? (
              <motion.span
                aria-hidden="true"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.6 }}
                className="text-cyan-400"
              >
                →
              </motion.span>
            ) : null}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function MttrStrip({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="mt-8 flex h-32 items-end gap-4">
      {values.map((value, index) => (
        <motion.div
          key={`${value}-${index}`}
          initial={{ height: 0 }}
          whileInView={{ height: `${(value / max) * 100}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: index * 0.1 }}
          className="flex-1 rounded-t-lg bg-gradient-to-t from-emerald-500 to-sky-400"
          title={`${value}s`}
        />
      ))}
    </div>
  );
}
