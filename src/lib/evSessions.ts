import type { ChargingSession } from "@/components/dashboard/types";

/**
 * Easy Charging statements and saved charging sessions.
 *
 * Sessions are stored by the API (`/ev-sessions`), which skips ones it already has and
 * adds only new sessions to the monthly EV totals.
 */

// A session: start date + time, end date + time, duration, kWh, cost. Whitespace may be
// spaces or line breaks, because copying from the PDF puts each cell on its own line.
const SESSION_PATTERN =
  /(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2}(?::\d{2})?)\s+(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2}(?::\d{2})?)\s+(\d{1,3}H\d{1,2}M)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/gi;

/** "8:05" or "08:05:09" → "08:05:09", the form the API stores. */
function normaliseTime(time: string): string {
  const [h, m, s = "00"] = time.split(":");
  return `${h.padStart(2, "0")}:${m}:${s}`;
}

/** Identifies a session; a charger can't start two sessions at the same second. */
export function sessionKey(s: Pick<ChargingSession, "date" | "startTime">): string {
  return `${s.date} ${s.startTime}`;
}

export function parseEasyCharging(text: string): ChargingSession[] {
  const byKey = new Map<string, ChargingSession>();
  for (const m of text.matchAll(SESSION_PATTERN)) {
    const session: ChargingSession = {
      date: m[1],
      startTime: normaliseTime(m[2]),
      endTime: normaliseTime(m[4]),
      duration: m[5].toUpperCase(),
      kwh: Number.parseFloat(m[6]),
      cost: Number.parseFloat(m[7]),
    };
    byKey.set(sessionKey(session), session);
  }
  return Array.from(byKey.values()).sort((a, b) => sessionKey(a).localeCompare(sessionKey(b)));
}

/** Error carrying the failed response, so callers can pass it to handleAuthFailure. */
export class ApiError extends Error {
  readonly response: Response;

  constructor(response: Response) {
    super(`API responded ${response.status}`);
    this.response = response;
  }
}

export async function fetchSavedSessions(apiBaseUrl: string, token: string, year: number): Promise<ChargingSession[]> {
  const res = await fetch(`${apiBaseUrl}/ev-sessions?year=${year}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new ApiError(res);
  return ((await res.json()) as { data: ChargingSession[] }).data ?? [];
}

/** Keys of parsed sessions that are already saved, checked year by year. */
export async function fetchSavedKeys(apiBaseUrl: string, token: string, sessions: ChargingSession[]): Promise<Set<string>> {
  const years = Array.from(new Set(sessions.map((s) => Number.parseInt(s.date.slice(0, 4), 10))));
  const saved = await Promise.all(years.map((year) => fetchSavedSessions(apiBaseUrl, token, year)));
  return new Set(saved.flat().map(sessionKey));
}

export type SaveSessionsResult = { saved: number; skipped: number; countedKwh: number; years: number[] };

const SESSIONS_PER_REQUEST = 100; // the API accepts up to 200

/**
 * Saves sessions in chunks. `alreadyCounted` keys are stored without adding their kWh to
 * the monthly totals again. Re-sending is safe: the API skips sessions it already has.
 */
export async function saveSessions(
  apiBaseUrl: string,
  token: string,
  sessions: ChargingSession[],
  alreadyCounted: Set<string>,
): Promise<SaveSessionsResult> {
  const total: SaveSessionsResult = { saved: 0, skipped: 0, countedKwh: 0, years: [] };
  for (let i = 0; i < sessions.length; i += SESSIONS_PER_REQUEST) {
    const chunk = sessions.slice(i, i + SESSIONS_PER_REQUEST);
    const res = await fetch(`${apiBaseUrl}/ev-sessions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ sessions: chunk, alreadyCounted: chunk.map(sessionKey).filter((k) => alreadyCounted.has(k)) }),
    });
    if (!res.ok) throw new ApiError(res);
    const r = (await res.json()) as SaveSessionsResult;
    total.saved += r.saved;
    total.skipped += r.skipped;
    total.countedKwh += r.countedKwh;
    total.years = Array.from(new Set([...total.years, ...r.years])).sort((a, b) => a - b);
  }
  return total;
}

// ── Legacy import record ──
// Before sessions were stored, saving only added kWh to the monthly totals and kept each
// session's start time in a hidden note per year ("kirasolar:ev-sessions:<year>"). Those
// sessions' kWh is already counted, so re-importing them must store details only.

const LEGACY_NOTE_PREFIX = "kirasolar:ev-sessions:";

/** Start times recorded by the old flow. Throws if notes can't be read, so callers don't save blind. */
export async function loadLegacyCountedKeys(apiBaseUrl: string, token: string): Promise<Set<string>> {
  const res = await fetch(`${apiBaseUrl}/notes?limit=200`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new ApiError(res);
  const { data } = (await res.json()) as { data: Array<{ title: string; content: string }> };
  const keys = new Set<string>();
  for (const note of data ?? []) {
    if (!note.title.startsWith(LEGACY_NOTE_PREFIX)) continue;
    try {
      const parsed = JSON.parse(note.content) as { keys?: unknown };
      if (Array.isArray(parsed.keys)) for (const k of parsed.keys) if (typeof k === "string") keys.add(k);
    } catch {
      /* ignore a malformed note */
    }
  }
  return keys;
}
