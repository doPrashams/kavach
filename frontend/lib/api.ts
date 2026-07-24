import { getDemoFixture, OFFLINE_MODE } from "@/lib/fixtures";
import type {
  ChaosScenario,
  FixResponse,
  MttrPoint,
  RunState,
} from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`API ${path} failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function isOfflineMode(): boolean {
  return OFFLINE_MODE;
}

export async function listScenarios(): Promise<ChaosScenario[]> {
  if (OFFLINE_MODE) {
    return getDemoFixture().scenarios;
  }
  try {
    const data = await fetchJson<{ scenarios: string[] }>("/chaos/scenarios");
    const fixtureScenarios = getDemoFixture().scenarios.filter((s) => s.simulated);
    return [
      ...data.scenarios.map((id) => ({
        id,
        label: id.replace(/_/g, " "),
      })),
      ...fixtureScenarios,
    ];
  } catch {
    return getDemoFixture().scenarios;
  }
}

export async function injectChaos(
  scenario: string,
  seed = 42,
): Promise<{ run_id: string; scenario: string }> {
  if (OFFLINE_MODE) {
    const fixture = getDemoFixture();
    return { run_id: fixture.recordingId, scenario };
  }
  return fetchJson("/chaos/inject", {
    method: "POST",
    body: JSON.stringify({ scenario, seed }),
  });
}

export async function getRun(runId: string): Promise<RunState> {
  if (OFFLINE_MODE) {
    return getDemoFixture().run;
  }
  try {
    return await fetchJson<RunState>(`/runs/${runId}`);
  } catch {
    return getDemoFixture().run;
  }
}

export async function getFix(runId: string): Promise<FixResponse> {
  if (OFFLINE_MODE) {
    return getDemoFixture().fix;
  }
  try {
    return await fetchJson<FixResponse>(`/fixes/${runId}`);
  } catch {
    return getDemoFixture().fix;
  }
}

export async function listRecordings(): Promise<string[]> {
  if (OFFLINE_MODE) {
    return [getDemoFixture().recordingId];
  }
  try {
    const data = await fetchJson<{ recordings: string[] }>("/recordings");
    return data.recordings;
  } catch {
    return [getDemoFixture().recordingId];
  }
}

export async function replayRecording(runId: string): Promise<{ events_replayed: number }> {
  if (OFFLINE_MODE) {
    return { events_replayed: getDemoFixture().events.length };
  }
  return fetchJson(`/replay/${runId}`, { method: "POST" });
}

export async function getMttrTrend(scenario?: string): Promise<MttrPoint[]> {
  if (OFFLINE_MODE) {
    const trend = getDemoFixture().mttrTrend;
    return scenario ? trend.filter((point) => point.scenario === scenario) : trend;
  }
  try {
    const query = scenario ? `?scenario=${encodeURIComponent(scenario)}` : "";
    return await fetchJson<MttrPoint[]>(`/flywheel/mttr${query}`);
  } catch {
    return getDemoFixture().mttrTrend;
  }
}

export function getFixtureEvents(runId?: string) {
  const fixture = getDemoFixture();
  if (!runId || runId === fixture.recordingId) {
    return fixture.events;
  }
  return fixture.events.map((event) => ({ ...event, run_id: runId }));
}

export { API_URL };
