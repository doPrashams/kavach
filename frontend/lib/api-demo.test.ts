import { describe, expect, it } from "vitest";

import { API_ROUTE_CATALOG } from "@/lib/api-demo";
import { ABOUT_ME, TECH_STACK, TOUR_STEPS } from "@/lib/site-content";

describe("demo API catalog", () => {
  it("covers every war-room widget endpoint", () => {
    const paths = API_ROUTE_CATALOG.map((route) => route.path);
    expect(paths).toContain("/api/health");
    expect(paths).toContain("/api/chaos/inject");
    expect(paths).toContain("/api/chaos/scenarios");
    expect(paths).toContain("/api/runs/:id");
    expect(paths).toContain("/api/fixes/:id");
    expect(paths).toContain("/api/recordings");
    expect(paths).toContain("/api/replay/:id");
    expect(paths).toContain("/api/flywheel/mttr");
    expect(paths).toContain("/api/analytics/before-after");
    expect(paths).toContain("/api/site/guide");
  });
});

describe("site content", () => {
  it("has about, stack, and tour steps", () => {
    expect(ABOUT_ME.name).toMatch(/Prashams/i);
    expect(TECH_STACK.length).toBeGreaterThan(3);
    expect(TOUR_STEPS.length).toBeGreaterThanOrEqual(8);
    expect(TOUR_STEPS.every((step) => step.target.startsWith("tour-"))).toBe(true);
    expect(TOUR_STEPS.some((step) => step.id === "domains")).toBe(true);
  });
});

describe("data probe domain links", () => {
  it("points Systems probes at NYC TLC and Humans at Synthea", async () => {
    const { getScenarioProbe } = await import("@/lib/real-data");
    const systems = getScenarioProbe("value_corruption");
    const humans = getScenarioProbe("healthcare_pii");
    const phi = getScenarioProbe("phi_exposure");
    const meds = getScenarioProbe("patient_null_spike");

    expect(systems.source.url).toContain("cityofnewyork.us");
    expect(humans.source.url).toContain("synthea");
    expect(phi.source.url).toContain("synthea");
    expect(meds.source.url).toContain("synthea");
    expect(humans.source.url).not.toContain("cityofnewyork");
  });
});
