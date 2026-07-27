/**
 * Admin gate for Activity log. The PIN is never stored in plaintext —
 * only a SHA-256 digest of the expected code is committed.
 */
const ADMIN_PIN_DIGEST =
  "f0fccd7fc4de68f4ca4e2cc29a636b109cb868be9459249fa0fc3182b4f8c3b2";

const SESSION_FLAG = "kavach_admin_unlocked";
const SESSION_TOKEN = "kavach_admin_tok";

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyAdminCode(code: string): Promise<boolean> {
  const digest = await sha256Hex(code.trim());
  return digest === ADMIN_PIN_DIGEST;
}

export function isAdminUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(SESSION_FLAG) === "1";
}

export function unlockAdminSession(code: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_FLAG, "1");
  // Tab-only; cleared when the tab closes. Never committed.
  sessionStorage.setItem(SESSION_TOKEN, code.trim());
}

export function lockAdminSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_FLAG);
  sessionStorage.removeItem(SESSION_TOKEN);
}

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  if (!isAdminUnlocked()) return null;
  return sessionStorage.getItem(SESSION_TOKEN);
}
