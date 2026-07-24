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
  });
});
