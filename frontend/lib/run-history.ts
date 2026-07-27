/** Client-side incident run history (localStorage). */

export interface RunHistoryEntry {
  run_id: string;
  scenario: string;
  label: string;
  severity: string;
  status: "resolved" | "active";
  ts: string;
}

const KEY = "kavach:run-history";
const MAX = 50;

export function loadRunHistory(): RunHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RunHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRunHistory(entries: RunHistoryEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX)));
}

export function pushRunHistory(
  entry: Omit<RunHistoryEntry, "ts"> & { ts?: string },
): RunHistoryEntry[] {
  const next: RunHistoryEntry = {
    ...entry,
    ts: entry.ts ?? new Date().toISOString(),
  };
  const existing = loadRunHistory().filter((e) => e.run_id !== next.run_id);
  const list = [next, ...existing].slice(0, MAX);
  saveRunHistory(list);
  return list;
}

export function clearRunHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
