"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { API_URL, getFixtureEvents, isDemoApi } from "@/lib/api";
import type { AgentEvent } from "@/lib/types";

interface UseAgentEventStreamOptions {
  runId: string | null;
  enabled?: boolean;
  replayIndex?: number;
}

interface UseAgentEventStreamResult {
  events: AgentEvent[];
  connected: boolean;
  error: string | null;
  reset: () => void;
}

export function useAgentEventStream({
  runId,
  enabled = true,
  replayIndex,
}: UseAgentEventStreamOptions): UseAgentEventStreamResult {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sourceRef = useRef<EventSource | null>(null);

  const reset = useCallback(() => {
    setEvents([]);
    setConnected(false);
    setError(null);
  }, []);

  useEffect(() => {
    if (!enabled || !runId) {
      reset();
      return;
    }

    // Demo /api mode: progressive fixture events driven by scrubIndex from WarRoom
    if (isDemoApi()) {
      const fixtureEvents = getFixtureEvents(runId);
      const limit =
        typeof replayIndex === "number"
          ? Math.min(replayIndex + 1, fixtureEvents.length)
          : fixtureEvents.length;
      setEvents(fixtureEvents.slice(0, limit));
      setConnected(true);
      setError(null);
      return;
    }

    const source = new EventSource(`${API_URL}/runs/${runId}/stream`);
    sourceRef.current = source;

    source.onopen = () => {
      setConnected(true);
    };

    source.onmessage = (message) => {
      try {
        const payload = JSON.parse(message.data) as AgentEvent | { event_type: string };
        if ("event_type" in payload && payload.event_type === "complete") {
          source.close();
          setConnected(false);
          return;
        }
        setEvents((current) => [...current, payload as AgentEvent]);
      } catch (streamError) {
        setError(streamError instanceof Error ? streamError.message : "Stream parse error");
      }
    };

    source.onerror = () => {
      setEvents(getFixtureEvents(runId));
      setConnected(false);
      setError(null);
      source.close();
    };

    return () => {
      source.close();
      sourceRef.current = null;
    };
  }, [enabled, replayIndex, reset, runId]);

  return { events, connected, error, reset };
}
