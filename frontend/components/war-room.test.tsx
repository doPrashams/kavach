import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AgentFeed } from "@/components/AgentFeed";
import { BlastRadiusGraph } from "@/components/BlastRadiusGraph";
import { MttrChart } from "@/components/MttrChart";
import demoFixture from "@/fixtures/demo-recording.json";
import type { AgentEvent, MttrPoint } from "@/lib/types";

describe("AgentFeed", () => {
  it("renders events in agent order", () => {
    const events = demoFixture.events as AgentEvent[];
    render(<AgentFeed events={events} />);

    const order = screen.getByTestId("agent-feed-order").textContent ?? "";
    expect(order).toBe(
      "sentinel,investigator,impact_analyst,ml_guardian,fixer,scribe,comms",
    );

    expect(screen.getByTestId("agent-sentinel")).toHaveAttribute("data-active", "true");
    expect(screen.getByTestId("agent-comms")).toHaveAttribute("data-active", "true");
  });
});

describe("BlastRadiusGraph", () => {
  it("renders ML deployment node", () => {
    render(<BlastRadiusGraph blastRadius={demoFixture.run.blast_radius} />);
    expect(screen.getByTestId("blast-radius-graph")).toBeInTheDocument();
    expect(
      screen.getByText(/demand-forecast-prod/i),
    ).toBeInTheDocument();
  });
});

describe("MttrChart", () => {
  it("renders decreasing series", () => {
    const trend = demoFixture.mttrTrend as MttrPoint[];
    render(<MttrChart trend={trend} />);

    const values = trend.map((_, index) =>
      Number(screen.getByTestId(`mttr-bar-${index}`).getAttribute("data-value")),
    );
    for (let i = 1; i < values.length; i += 1) {
      expect(values[i]).toBeLessThan(values[i - 1]);
    }
  });
});
