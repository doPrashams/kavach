/** Audit log for who ran what, when, and from where.
 *  Durable when UPSTASH_REDIS_REST_URL/TOKEN (or KV_REST_API_URL/TOKEN) are set;
 *  falls back to an in-memory ring buffer per serverless instance otherwise.
 *  Server-only — import from API routes.
 */

export interface AuditEntry {
  id: string;
  ts: string;
  action: string;
  scenario: string | null;
  run_id: string | null;
  ip: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  user_agent: string | null;
}

const KEY = "kavach:audit";
const MAX = 200;

const REST_URL =
  process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? "";
const REST_TOKEN =
  process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "";

function hasRedis(): boolean {
  return Boolean(REST_URL && REST_TOKEN);
}

async function redis(command: unknown[]): Promise<unknown> {
  const res = await fetch(REST_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REST_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  const data = (await res.json()) as { result?: unknown };
  return data.result;
}

function memStore(): AuditEntry[] {
  const g = globalThis as typeof globalThis & { __kavachAudit?: AuditEntry[] };
  if (!g.__kavachAudit) g.__kavachAudit = [];
  return g.__kavachAudit;
}

function decode(value: string | null): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function extractMeta(request: Request): {
  ip: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  user_agent: string | null;
} {
  const h = request.headers;
  const fwd = h.get("x-forwarded-for");
  return {
    ip: fwd ? fwd.split(",")[0].trim() : h.get("x-real-ip"),
    city: decode(h.get("x-vercel-ip-city")),
    region: decode(h.get("x-vercel-ip-country-region")),
    country: h.get("x-vercel-ip-country"),
    user_agent: h.get("user-agent"),
  };
}

export async function recordAudit(
  request: Request,
  fields: { action: string; scenario?: string | null; run_id?: string | null },
): Promise<void> {
  const meta = extractMeta(request);
  const entry: AuditEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: new Date().toISOString(),
    action: fields.action,
    scenario: fields.scenario ?? null,
    run_id: fields.run_id ?? null,
    ...meta,
  };

  try {
    if (hasRedis()) {
      await redis(["LPUSH", KEY, JSON.stringify(entry)]);
      await redis(["LTRIM", KEY, 0, MAX - 1]);
      return;
    }
  } catch {
    // fall through to memory on any redis error
  }
  const store = memStore();
  store.unshift(entry);
  if (store.length > MAX) store.length = MAX;
}

export async function listAudit(limit = 100): Promise<{
  durable: boolean;
  entries: AuditEntry[];
}> {
  try {
    if (hasRedis()) {
      const raw = (await redis(["LRANGE", KEY, 0, limit - 1])) as string[];
      const entries = (raw ?? [])
        .map((r) => {
          try {
            return JSON.parse(r) as AuditEntry;
          } catch {
            return null;
          }
        })
        .filter((x): x is AuditEntry => Boolean(x));
      return { durable: true, entries };
    }
  } catch {
    // fall through
  }
  return { durable: false, entries: memStore().slice(0, limit) };
}

export async function clearAudit(): Promise<{ durable: boolean; cleared: number }> {
  try {
    if (hasRedis()) {
      const before = (await redis(["LLEN", KEY])) as number;
      await redis(["DEL", KEY]);
      return { durable: true, cleared: Number(before) || 0 };
    }
  } catch {
    // fall through
  }
  const store = memStore();
  const cleared = store.length;
  store.length = 0;
  return { durable: false, cleared };
}
