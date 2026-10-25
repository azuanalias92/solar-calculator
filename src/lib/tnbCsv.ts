import type { DailyUsageItem } from "@/components/dashboard/types";

/**
 * Parser for daily usage CSVs downloaded from myTNB Smart Living.
 *
 * Columns are found by header name (date / peak / off-peak); if the headers aren't
 * recognised it falls back to the original layout: date, peak kWh, off-peak kWh.
 */

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_ROWS = 10_000;

export type ParsedCsv = {
  rows: DailyUsageItem[];
  skipped: number;
  error?: "tooLarge" | "empty" | "noValidRows";
};

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  // Malay month abbreviations
  mac: 3, mei: 5, ogo: 8, ogos: 8, okt: 10, dis: 12,
};

/** Splits CSV text into rows of cells, handling quoted cells, escaped quotes and CRLF. */
export function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const delimiter = detectDelimiter(text);

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell.trim());
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  row.push(cell.trim());
  if (row.some((c) => c !== "")) rows.push(row);
  return rows;
}

/** Comma unless the first line has more semicolons outside quotes (Excel in some locales). */
function detectDelimiter(text: string): "," | ";" {
  const firstLine = text.slice(0, text.search(/\r?\n|$/)).replace(/"[^"]*"/g, "");
  return (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
}

function toIso(year: number, month: number, day: number): string {
  if (!(year >= 2000 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31)) return "";
  const date = new Date(Date.UTC(year, month - 1, day));
  // Reject impossible dates like 31 Feb.
  if (date.getUTCMonth() !== month - 1) return "";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Parses the date formats seen in TNB exports and spreadsheets re-saved by Excel:
 * "Mar 1, 2025", "1 Mar 2025", "01-Mar-2025", "2025-03-01", "01/03/2025" (DD/MM/YYYY).
 * Returns "" when unrecognised.
 */
export function parseUsageDate(value: string): string {
  const s = value.trim().replace(/\s+/g, " ").replace(/,/g, "");
  let m: RegExpMatchArray | null;

  // 2025-03-01 or 2025/03/01 (optionally followed by a time)
  if ((m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/))) return toIso(+m[1], +m[2], +m[3]);
  // 01/03/2025 or 01-03-2025: Malaysian day-first order
  if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b/))) return toIso(+m[3], +m[2], +m[1]);
  // Mar 1 2025
  if ((m = s.match(/^([A-Za-z]{3,})\.? (\d{1,2}) (\d{4})\b/))) {
    const month = MONTHS[m[1].toLowerCase().slice(0, 4)] ?? MONTHS[m[1].toLowerCase().slice(0, 3)];
    return month ? toIso(+m[3], month, +m[2]) : "";
  }
  // 1 Mar 2025 or 01-Mar-2025
  if ((m = s.match(/^(\d{1,2})[ -]([A-Za-z]{3,})\.?[ -](\d{4})\b/))) {
    const month = MONTHS[m[2].toLowerCase().slice(0, 4)] ?? MONTHS[m[2].toLowerCase().slice(0, 3)];
    return month ? toIso(+m[3], month, +m[1]) : "";
  }
  return "";
}

function parseKwh(value: string | undefined): number {
  if (!value) return 0;
  // "7,5" is a decimal comma; "1,234.5" uses a thousands separator.
  const normalised = /^\s*\d+,\d{1,2}\s*$/.test(value) ? value.replace(",", ".") : value.replace(/,/g, "");
  const n = Number.parseFloat(normalised.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

type Columns = { date: number; peak: number; offPeak: number };

function findColumns(header: string[]): Columns | null {
  const norm = header.map((h) => h.toLowerCase().replace(/[^a-z]/g, ""));
  const date = norm.findIndex((h) => h.includes("date") || h.includes("tarikh") || h === "day");
  const offPeak = norm.findIndex((h) => h.includes("offpeak") || h.includes("luarpuncak"));
  const peak = norm.findIndex((h, i) => i !== offPeak && (h.includes("peak") || h.includes("puncak")) && !h.includes("off") && !h.includes("luar"));
  return date >= 0 && peak >= 0 && offPeak >= 0 ? { date, peak, offPeak } : null;
}

export function parseTnbCsv(text: string, today = new Date().toISOString().slice(0, 10)): ParsedCsv {
  if (text.length > MAX_FILE_BYTES) return { rows: [], skipped: 0, error: "tooLarge" };

  const table = parseCsvText(text.replace(/^﻿/, ""));
  if (table.length === 0) return { rows: [], skipped: 0, error: "empty" };

  const detected = findColumns(table[0]);
  const columns: Columns = detected ?? { date: 0, peak: 1, offPeak: 2 };
  // Without recognised headers, only skip the first row if it isn't data itself.
  const start = detected || !parseUsageDate(table[0][0] ?? "") ? 1 : 0;

  const byDate = new Map<string, DailyUsageItem>();
  let skipped = 0;
  for (let i = start; i < table.length && byDate.size < MAX_ROWS; i++) {
    const cols = table[i];
    const date = parseUsageDate(cols[columns.date] ?? "");
    if (!date || date > today) {
      skipped++;
      continue;
    }
    // A later row for the same day replaces the earlier one.
    byDate.set(date, { date, peakKwh: parseKwh(cols[columns.peak]), offPeakKwh: parseKwh(cols[columns.offPeak]) });
  }

  const rows = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  return rows.length === 0 ? { rows, skipped, error: "noValidRows" } : { rows, skipped };
}

/** Combines rows from several files; later files win for the same day. */
export function mergeUsageRows(...lists: DailyUsageItem[][]): DailyUsageItem[] {
  const byDate = new Map<string, DailyUsageItem>();
  for (const list of lists) for (const row of list) byDate.set(row.date, row);
  return Array.from(byDate.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, MAX_ROWS);
}
