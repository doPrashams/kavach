import demoFixture from "@/fixtures/demo-recording.json";
import type { DemoFixture } from "@/lib/types";

export const OFFLINE_MODE =
  process.env.NEXT_PUBLIC_OFFLINE_MODE === "true" ||
  process.env.NEXT_PUBLIC_OFFLINE_MODE === "1";

export function getDemoFixture(): DemoFixture {
  return demoFixture as DemoFixture;
}

export function getMttrSeries(): number[] {
  return getDemoFixture().mttrTrend.map((point) => point.mttr_seconds);
}
