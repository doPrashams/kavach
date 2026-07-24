"use client";

import { Play, Rewind, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFixtureEvents, listRecordings, replayRecording } from "@/lib/api";

interface ReplayControlsProps {
  onReplay: (runId: string, scrubIndex: number) => void;
  activeRunId: string | null;
}

export function ReplayControls({ onReplay, activeRunId }: ReplayControlsProps) {
  const [recordings, setRecordings] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [scrubIndex, setScrubIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listRecordings()
      .then((items) => {
        setRecordings(items);
        setSelected(items[0] ?? "");
      })
      .catch(() => setRecordings([]));
  }, []);

  const maxIndex = Math.max(getFixtureEvents(selected).length - 1, 0);

  async function handleReplay() {
    if (!selected) return;
    setLoading(true);
    try {
      await replayRecording(selected);
      onReplay(selected, scrubIndex);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Rewind className="size-4 text-cyan-400" aria-hidden="true" />
            Replay controls
          </span>
          <Badge className="bg-emerald-700">
            <ShieldCheck className="size-3" aria-hidden="true" />
            No API key needed
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="block space-y-2 text-sm">
          <span className="text-muted-foreground">Recording</span>
          <select
            aria-label="Replay recording"
            className="w-full rounded-lg border border-border bg-background px-3 py-2"
            value={selected}
            onChange={(event) => {
              setSelected(event.target.value);
              setScrubIndex(0);
            }}
          >
            {recordings.map((recording) => (
              <option key={recording} value={recording}>
                {recording}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2 text-sm">
          <span className="text-muted-foreground">
            Scrubber ({scrubIndex + 1}/{maxIndex + 1})
          </span>
          <input
            aria-label="Replay scrubber"
            type="range"
            min={0}
            max={maxIndex}
            value={scrubIndex}
            onChange={(event) => {
              const next = Number(event.target.value);
              setScrubIndex(next);
              if (selected) onReplay(selected, next);
            }}
            className="w-full"
          />
        </label>
        <Button type="button" className="w-full" disabled={!selected || loading} onClick={handleReplay}>
          <Play className="size-4" aria-hidden="true" />
          {loading ? "Replaying…" : activeRunId ? "Replay again" : "Start replay"}
        </Button>
      </CardContent>
    </Card>
  );
}
