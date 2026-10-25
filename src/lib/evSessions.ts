import type { ChargingSession } from "@/components/dashboard/types";

/**
 * Easy Charging statements and the record of which sessions were already imported.
 *
 * The API only stores monthly EV kWh totals, so imported session keys are kept in the
 * user's notes (one note per year) to stop the same session being counted twice.
 */

// A session: start date + time, end date + time, duration, kWh, cost. Whitespace may be
// spaces or line breaks, because copying from the PDF puts each cell on its own line.
const SESSION_PATTERN =
  /(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2}(?::\d{2})?)\s+(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2}(?::\d{2})?)\s+(\d{1,3}H\d{1,2}M)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/gi;

/** Identifies a session; a charger can't start two sessions at the same second. */
export function sessionKey(s: Pick<ChargingSession, "date" | "startTime">): string {
  return `${s.date} ${s.startTime}`;
}

export function parseEasyCharging(text: string): ChargingSession[] {
  const byKey = new Map<string, ChargingSession>();
  for (const m of text.matchAll(SESSION_PATTERN)) {
    const session: ChargingSession = {
      date: m[1],
      startTime: m[2],
      endTime: m[4],
      duration: m[5].toUpperCase(),
      kwh: Number.parseFloat(m[6]),
      cost: Number.parseFloat(m[7]),
    };
    byKey.set(sessionKey(session), session);
  }
  return Array.from(byKey.values()).sort((a, b) => sessionKey(a).localeCompare(sessionKey(b)));
}

// ── Imported-session record (stored in /notes) ──

const NOTE_PREFIX = "kirasolar:ev-sessions:";

type Note = { id: string; title: string; content: string };
export type ImportedLedger = Map<number, { noteId: string | null; keys: Set<string> }>;

function parseNoteKeys(content: string): string[] {
  try {
    const parsed = JSON.parse(content) as { keys?: unknown };
    return Array.isArray(parsed.keys) ? parsed.keys.filter((k): k is string => typeof k === "string") : [];
  } catch {
    return [];
  }
}

/** Loads every year's record. Throws if the notes can't be read, so callers don't save blind. */
export async function loadImportedLedger(apiBaseUrl: string, token: string): Promise<ImportedLedger> {
  const res = await fetch(`${apiBaseUrl}/notes?limit=500`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw Object.assign(new Error(`notes ${res.status}`), { response: res });
  const { data } = (await res.json()) as { data: Note[] };
  const ledger: ImportedLedger = new Map();
  for (const note of data ?? []) {
    if (!note.title.startsWith(NOTE_PREFIX)) continue;
    const year = Number.parseInt(note.title.slice(NOTE_PREFIX.length), 10);
    if (!Number.isFinite(year)) continue;
    const entry = ledger.get(year) ?? { noteId: note.id, keys: new Set<string>() };
    for (const key of parseNoteKeys(note.content)) entry.keys.add(key);
    ledger.set(year, entry);
  }
  return ledger;
}

export function isImported(ledger: ImportedLedger, s: ChargingSession): boolean {
  return ledger.get(Number.parseInt(s.date.slice(0, 4), 10))?.keys.has(sessionKey(s)) ?? false;
}

/** Adds keys to a year's record, creating its note the first time. Returns false on failure. */
export async function recordImported(apiBaseUrl: string, token: string, ledger: ImportedLedger, year: number, keys: string[]): Promise<boolean> {
  const entry = ledger.get(year) ?? { noteId: null, keys: new Set<string>() };
  const merged = new Set([...entry.keys, ...keys]);
  const body = JSON.stringify({ title: `${NOTE_PREFIX}${year}`, content: JSON.stringify({ v: 1, keys: Array.from(merged).sort() }) });
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  try {
    const res = entry.noteId
      ? await fetch(`${apiBaseUrl}/notes/${encodeURIComponent(entry.noteId)}`, { method: "PUT", headers, body })
      : await fetch(`${apiBaseUrl}/notes`, { method: "POST", headers, body });
    if (!res.ok) return false;
    let noteId = entry.noteId;
    if (!noteId) {
      const created = (await res.json().catch(() => null)) as { id?: string; data?: { id?: string } } | null;
      noteId = created?.id ?? created?.data?.id ?? null;
    }
    ledger.set(year, { noteId, keys: merged });
    return true;
  } catch {
    return false;
  }
}
