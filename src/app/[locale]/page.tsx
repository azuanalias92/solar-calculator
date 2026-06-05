"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { getAuthState, type AuthState } from "@/lib/auth";
import { useTranslation } from "@/lib/useTranslation";
import GoogleAuthButton from "@/components/GoogleAuthButton";
import { Coffee, Github, BarChart3, CalendarDays, Upload, Loader2, Car, Zap, Sun, BatteryCharging, Fuel, Plus } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// ── Shared Types ──

type DailyUsageItem = { date: string; peakKwh: number; offPeakKwh: number };
type DailyUsageSummaryItem = {
  month: number;
  peakKwh: number;
  offPeakKwh: number;
  totalKwh: number;
  billAmount: number | null;
};
type MonthSummary = { month: number; totalKwh: number; evKwh: number; nonEvKwh: number };
type ChargingSession = { date: string; startTime: string; endTime: string; duration: string; kwh: number; cost: number };
type MonthUsage = { month: number; evKwh: number; nonEvKwh: number };

// ── Helpers ──

function monthLabel(month: number): string {
  return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][month - 1] ?? String(month);
}
function formatKwh(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}
function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(value);
}
function parseCsvDate(dateStr: string): string {
  const months: Record<string, string> = {
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    may: "05",
    jun: "06",
    jul: "07",
    aug: "08",
    sep: "09",
    oct: "10",
    nov: "11",
    dec: "12",
  };
  const cleaned = dateStr.trim().replace(/\s+/g, " ");
  const parts = cleaned.split(" ");
  if (parts.length < 3) return "";
  const mon = parts[0].toLowerCase().slice(0, 3);
  const day = parts[1].replace(",", "").padStart(2, "0");
  const year = parts[2];
  const mm = months[mon];
  if (!mm) return "";
  return `${year}-${mm}-${day}`;
}
function formatDisplayDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

function getDay(dateStr: string): number {
  return Number.parseInt(dateStr.slice(8, 10), 10);
}
function getBarHeights(total: number, ev: number, maxTotal: number): { nonEvPct: number; evPct: number } {
  if (maxTotal <= 0) return { nonEvPct: 0, evPct: 0 };
  const totalPct = Math.max(0, Math.min(1, total / maxTotal));
  const evPct = total > 0 ? (ev / total) * totalPct : 0;
  const nonEvPct = totalPct - evPct;
  return { nonEvPct, evPct };
}
function emptyYearData(): MonthUsage[] {
  return Array.from({ length: 12 }, (_, idx) => ({ month: idx + 1, evKwh: 0, nonEvKwh: 0 }));
}
function dedupeYears(years: number[]): number[] {
  return Array.from(new Set(years.filter((y) => Number.isFinite(y)))).sort((a, b) => b - a);
}

export default function Home() {
  const apiBaseUrl = useMemo(() => process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8787", []);
  const { t, locale } = useTranslation();
  const nowDate = useMemo(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }, []);
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const [auth, setAuth] = useState<AuthState | null>(null);

  // ── Auth ──
  useEffect(() => {
    const refresh = () => setAuth(getAuthState());
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("kirasolar:auth", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("kirasolar:auth", refresh);
    };
  }, []);

  // ── Global Filters ──
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(nowDate.month);
  const [availableYears, setAvailableYears] = useState<number[]>([currentYear]);

  // Collect available years from both daily-usage and ev-usage endpoints
  useEffect(() => {
    let canceled = false;
    const run = async () => {
      if (!auth?.token) {
        if (!canceled) setAvailableYears([currentYear]);
        return;
      }
      const yearsSet = new Set<number>([currentYear]);
      try {
        const usageRes = await fetch(`${apiBaseUrl}/daily-usage/years`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (usageRes.ok) {
          const p = (await usageRes.json()) as { years: number[] };
          for (const y of p.years ?? []) yearsSet.add(y);
        }
      } catch {
        /* ignore */
      }
      try {
        const evRes = await fetch(`${apiBaseUrl}/ev-usage/years`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (evRes.ok) {
          const p = (await evRes.json()) as { years: number[] };
          for (const y of p.years ?? []) yearsSet.add(y);
        }
      } catch {
        /* ignore */
      }
      const sorted = Array.from(yearsSet)
        .filter((y) => Number.isFinite(y))
        .sort((a, b) => b - a);
      if (!canceled) setAvailableYears(sorted.length ? sorted : [currentYear]);
    };
    void run();
    return () => {
      canceled = true;
    };
  }, [apiBaseUrl, auth?.token, currentYear]);

  // Sync selectedYear to available years
  useEffect(() => {
    if (!availableYears.includes(selectedYear) && availableYears.length > 0) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  // ═══════════════════════════════════════════════
  // SECTION 1: Daily Energy Usage
  // ═══════════════════════════════════════════════

  const [dailyData, setDailyData] = useState<DailyUsageItem[]>([]);
  const [summaryData, setSummaryData] = useState<DailyUsageSummaryItem[]>([]);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [usageMsg, setUsageMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!auth?.token) return;
    let canceled = false;
    const run = async () => {
      setLoadingDaily(true);
      setUsageMsg(null);
      try {
        const res = await fetch(`${apiBaseUrl}/daily-usage?year=${selectedYear}&month=${selectedMonth}`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (!res.ok) {
          if (!canceled) setDailyData([]);
          return;
        }
        const payload = (await res.json()) as { data: DailyUsageItem[] };
        if (!canceled) setDailyData(payload.data ?? []);
      } catch {
        if (!canceled) setDailyData([]);
      } finally {
        if (!canceled) setLoadingDaily(false);
      }
    };
    void run();
    return () => {
      canceled = true;
    };
  }, [apiBaseUrl, auth?.token, selectedYear, selectedMonth]);

  useEffect(() => {
    if (!auth?.token) return;
    let canceled = false;
    const run = async () => {
      setLoadingSummary(true);
      try {
        const res = await fetch(`${apiBaseUrl}/daily-usage/summary?year=${selectedYear}`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (!res.ok) {
          if (!canceled) setSummaryData([]);
          return;
        }
        const payload = (await res.json()) as { data: DailyUsageSummaryItem[] };
        if (!canceled) setSummaryData(payload.data ?? []);
      } catch {
        if (!canceled) setSummaryData([]);
      } finally {
        if (!canceled) setLoadingSummary(false);
      }
    };
    void run();
    return () => {
      canceled = true;
    };
  }, [apiBaseUrl, auth?.token, selectedYear]);

  const dailyTotals = useMemo(() => {
    const peak = dailyData.reduce((s, d) => s + d.peakKwh, 0);
    const offPeak = dailyData.reduce((s, d) => s + d.offPeakKwh, 0);
    return { peak, offPeak, total: peak + offPeak };
  }, [dailyData]);

  const maxDailyTotal = useMemo(() => dailyData.reduce((max, d) => Math.max(max, d.peakKwh + d.offPeakKwh), 0), [dailyData]);

  const barHeightPct = (value: number): number => {
    if (maxDailyTotal <= 0) return 0;
    return Math.max(0, Math.min(100, (value / maxDailyTotal) * 100));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth?.token) return;
    setUploading(true);
    setUsageMsg(null);
    try {
      const text = await file.text();
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) {
        setUsageMsg(t("dashboard.csvEmpty"));
        setUploading(false);
        return;
      }
      const rows: DailyUsageItem[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split('","').map((c) => c.replace(/^"|"$/g, "").trim());
        if (cols.length < 4) continue;
        const date = parseCsvDate(cols[0]);
        if (!date) continue;
        if (date > new Date().toISOString().slice(0, 10)) continue;
        const peakKwh = Math.max(0, Number.parseFloat(cols[1]) || 0);
        const offPeakKwh = Math.max(0, Number.parseFloat(cols[2]) || 0);
        rows.push({ date, peakKwh, offPeakKwh });
      }
      if (rows.length === 0) {
        setUsageMsg(t("dashboard.noValidRows"));
        setUploading(false);
        return;
      }
      const res = await fetch(`${apiBaseUrl}/daily-usage`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ data: rows }),
      });
      if (!res.ok) {
        setUsageMsg(t("dashboard.uploadFailed"));
        setUploading(false);
        return;
      }
      setUsageMsg(`${t("dashboard.uploaded")} ${rows.length} ${t("dashboard.days")}!`);
      const [dailyRes, summaryRes] = await Promise.all([
        fetch(`${apiBaseUrl}/daily-usage?year=${selectedYear}&month=${selectedMonth}`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        }),
        fetch(`${apiBaseUrl}/daily-usage/summary?year=${selectedYear}`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        }),
      ]);
      if (dailyRes.ok) {
        const p = (await dailyRes.json()) as { data: DailyUsageItem[] };
        setDailyData(p.data ?? []);
      }
      if (summaryRes.ok) {
        const p = (await summaryRes.json()) as { data: DailyUsageSummaryItem[] };
        setSummaryData(p.data ?? []);
      }
    } catch {
      setUsageMsg(t("dashboard.failedToParse"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ═══════════════════════════════════════════════
  // SECTION 2: EV vs Non-EV (Bill EV)
  // ═══════════════════════════════════════════════

  const [billEvData, setBillEvData] = useState<MonthSummary[]>([]);
  const [loadingBillEv, setLoadingBillEv] = useState(false);
  const [billEvError, setBillEvError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;
    const run = async () => {
      setBillEvError(null);
      setLoadingBillEv(true);
      if (!auth?.token) {
        if (!canceled) setBillEvData([]);
        setLoadingBillEv(false);
        return;
      }
      try {
        const [usageRes, evRes] = await Promise.all([
          fetch(`${apiBaseUrl}/daily-usage/summary?year=${encodeURIComponent(String(selectedYear))}`, {
            headers: { Authorization: `Bearer ${auth.token}` },
          }),
          fetch(`${apiBaseUrl}/ev-usage?year=${encodeURIComponent(String(selectedYear))}`, {
            headers: { Authorization: `Bearer ${auth.token}` },
          }),
        ]);
        if (!usageRes.ok) {
          if (!canceled) setBillEvError(t("dashboard.failedToLoadUsage"));
          setLoadingBillEv(false);
          return;
        }
        const usagePayload = (await usageRes.json()) as {
          data: Array<{ month: number; totalKwh: number }>;
        };
        let evByMonth = new Map<number, number>();
        if (evRes.ok) {
          const evPayload = (await evRes.json()) as { data: Array<{ month: number; evKwh: number }> };
          for (const d of evPayload.data) evByMonth.set(d.month, d.evKwh);
        }
        const merged: MonthSummary[] = usagePayload.data.map((m) => {
          const evKwh = evByMonth.get(m.month) ?? 0;
          return { month: m.month, totalKwh: m.totalKwh, evKwh, nonEvKwh: Math.max(0, m.totalKwh - evKwh) };
        });
        if (!canceled) setBillEvData(merged);
      } catch {
        if (!canceled) setBillEvError(t("dashboard.failedToLoadData"));
      } finally {
        if (!canceled) setLoadingBillEv(false);
      }
    };
    void run();
    return () => {
      canceled = true;
    };
  }, [apiBaseUrl, auth?.token, selectedYear]);

  const billEvTotals = useMemo(() => {
    return billEvData.reduce((acc, m) => ({ evTotal: acc.evTotal + m.evKwh, nonEvTotal: acc.nonEvTotal + m.nonEvKwh, grandTotal: acc.grandTotal + m.totalKwh }), {
      evTotal: 0,
      nonEvTotal: 0,
      grandTotal: 0,
    });
  }, [billEvData]);

  const maxTotal = useMemo(() => billEvData.reduce((max, m) => Math.max(max, m.totalKwh), 0), [billEvData]);
  const monthsWithData = useMemo(() => billEvData.filter((m) => m.totalKwh > 0).length, [billEvData]);

  // ═══════════════════════════════════════════════
  // SECTION 3: EV Charging Import
  // ═══════════════════════════════════════════════

  const [existingEvData, setExistingEvData] = useState<MonthUsage[]>(() => emptyYearData());
  const [loadingEv, setLoadingEv] = useState(false);
  const [saving, setSaving] = useState(false);
  const [evMsg, setEvMsg] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChargingSession[]>([]);
  const [rawInput, setRawInput] = useState("");

  useEffect(() => {
    if (!auth?.token) return;
    let canceled = false;
    const run = async () => {
      setLoadingEv(true);
      try {
        const res = await fetch(`${apiBaseUrl}/ev-usage?year=${selectedYear}`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (!res.ok) return;
        const p = (await res.json()) as { data: MonthUsage[] };
        if (!canceled) {
          setExistingEvData(p.data ?? emptyYearData());
        }
      } catch {
      } finally {
        if (!canceled) setLoadingEv(false);
      }
    };
    void run();
    return () => {
      canceled = true;
    };
  }, [apiBaseUrl, auth?.token, selectedYear]);

  const handleParse = () => {
    const lines = rawInput.split("\n").filter((l) => l.trim());
    const parsed: ChargingSession[] = [];
    for (const line of lines) {
      const upper = line.toUpperCase();
      if (upper.includes("CHARGING STATION") || upper.includes("TOTAL") || upper.includes("START TIME") || upper.includes("EASY CHARGING")) continue;
      if (upper.includes("USER") || upper.includes("END TIME") || upper.includes("CHARGING DURATION") || upper.includes("CHARGING AMOUNT")) continue;
      const dates = line.match(/\d{4}-\d{2}-\d{2}/g);
      if (!dates || dates.length === 0) continue;
      const times = line.match(/\d{2}:\d{2}:\d{2}/g);
      if (!times || times.length < 2) continue;
      const tokens = line.trim().split(/\s+/);
      const numbers = tokens.map((t) => Number.parseFloat(t)).filter((n) => Number.isFinite(n) && n >= 0);
      const cost = numbers.length >= 1 ? numbers[numbers.length - 1] : 0;
      const kwh = numbers.length >= 2 ? numbers[numbers.length - 2] : 0;
      const duration = tokens.find((t) => t.includes("H") && t.includes("M")) || "";
      parsed.push({ date: dates[0], startTime: times[0], endTime: times.length >= 3 ? times[2] : times[1], duration, kwh, cost });
    }
    setSessions(parsed);
    setEvMsg(parsed.length === 0 ? t("dashboard.noSessions") : `${t("dashboard.parsed")} ${parsed.length} ${t("dashboard.sessionsLabel")}!`);
    setTimeout(() => setEvMsg(null), 5000);
  };

  const monthlyEv = useMemo(() => {
    const byMonth = new Map<number, number>();
    for (const s of sessions) {
      const m = Number.parseInt(s.date.slice(5, 7), 10);
      byMonth.set(m, (byMonth.get(m) ?? 0) + s.kwh);
    }
    return byMonth;
  }, [sessions]);

  const mergedEvData = useMemo(() => existingEvData.map((m) => ({ ...m, evKwh: m.evKwh + (monthlyEv.get(m.month) ?? 0) })), [existingEvData, monthlyEv]);

  const evTotals = useMemo(() => existingEvData.reduce((s, m) => ({ evKwh: s.evKwh + m.evKwh, nonEvKwh: s.nonEvKwh + m.nonEvKwh }), { evKwh: 0, nonEvKwh: 0 }), [existingEvData]);

  const sessionTotals = useMemo(() => sessions.reduce((s, c) => ({ kwh: s.kwh + c.kwh, cost: s.cost + c.cost }), { kwh: 0, cost: 0 }), [sessions]);

  const handleSaveEv = async () => {
    if (!auth?.token) return;
    setSaving(true);
    setEvMsg(null);
    const updatedData = existingEvData.map((m) => ({
      month: m.month,
      evKwh: m.evKwh + (monthlyEv.get(m.month) ?? 0),
      nonEvKwh: m.nonEvKwh,
    }));
    try {
      const res = await fetch(`${apiBaseUrl}/ev-usage?year=${selectedYear}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ data: updatedData }),
      });
      if (!res.ok) {
        setEvMsg(t("dashboard.failedToSave"));
        return;
      }
      const result = (await res.json()) as { data: MonthUsage[] };
      setExistingEvData(result.data ?? emptyYearData());
      setSessions([]);
      setRawInput("");
      setEvMsg(t("dashboard.saved"));
      setTimeout(() => setEvMsg(null), 3000);
    } catch {
      setEvMsg(t("dashboard.failedToSave"));
    } finally {
      setSaving(false);
    }
  };

  // ═══════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════

  return (
    <div className="flex flex-col min-h-screen p-2 sm:p-6 lg:p-8 bg-background">
      <AppHeader locale={locale} title={t("common.title")} description={t("common.description")} logoAlt={t("common.logoAlt")} />

      {/* ── Global Year/Month Filter ── */}
      <div className="w-full max-w-6xl mx-auto py-4 flex items-center justify-end gap-3">
        <select
          value={String(selectedYear)}
          onChange={(e) => setSelectedYear(Number.parseInt(e.target.value, 10))}
          className="flex h-9 w-28 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm md:text-sm"
        >
          {availableYears.map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </select>
        <select
          value={String(selectedMonth)}
          onChange={(e) => setSelectedMonth(Number.parseInt(e.target.value, 10))}
          className="flex h-9 w-28 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm md:text-sm"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={String(m)}>
              {monthLabel(m)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 w-full max-w-6xl mx-auto space-y-6">
        {/* ════════════════════════ SECTION 1: Daily Energy Usage ════════════════════════ */}
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                {t("dashboard.dailyEnergyUsage")} For {monthLabel(selectedMonth)} {selectedYear}
              </CardTitle>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm text-muted-foreground">
                  {!auth?.token ? t("dashboard.loginToView") : ""}
                  {loadingDaily ? <Loader2 className="w-3 h-3 inline animate-spin ml-1" /> : null}
                  {usageMsg ? <span className="text-foreground ml-2">{usageMsg}</span> : null}
                </span>
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                <Button variant="secondary" size="sm" disabled={!auth?.token || uploading} onClick={() => fileInputRef.current?.click()}>
                  {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                  {t("dashboard.uploadCsv")}
                </Button>
              </div>
            </div>
            {auth?.token && (
              <div className="flex flex-wrap gap-4 text-sm pt-1">
                <div className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded-sm bg-amber-500" />
                  {t("dashboard.peak")}:{" "}
                  <strong>
                    {formatKwh(dailyTotals.peak)} {t("dashboard.kwh")}
                  </strong>
                </div>
                <div className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded-sm bg-emerald-600" />
                  {t("dashboard.offPeak")}:{" "}
                  <strong>
                    {formatKwh(dailyTotals.offPeak)} {t("dashboard.kwh")}
                  </strong>
                </div>
                <div>
                  {t("dashboard.total")}:{" "}
                  <strong>
                    {formatKwh(dailyTotals.total)} {t("dashboard.kwh")}
                  </strong>
                </div>
              </div>
            )}
          </CardHeader>
          {auth?.token && (
            <CardContent className="space-y-6">
              {/* ── Bar chart ── */}
              {dailyData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">{loadingDaily ? t("dashboard.loading") : t("dashboard.noDataThisMonth")}</p>
              ) : (
                <div className="w-full overflow-x-auto">
                  <div className="min-w-[600px]">
                    <div className="flex items-end gap-1 h-48">
                      {dailyData.map((d) => {
                        const total = d.peakKwh + d.offPeakKwh;
                        const peakPct = barHeightPct(d.peakKwh);
                        const offPeakPct = barHeightPct(total);
                        return (
                          <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full h-40 flex flex-col justify-end">
                              <div
                                className="w-full bg-amber-500 rounded-t-sm transition-all"
                                style={{ height: `${Math.max(peakPct, 0.5)}%` }}
                                title={`${t("dashboard.peak")}: ${formatKwh(d.peakKwh)} ${t("dashboard.kwh")}`}
                              />
                              <div
                                className="w-full bg-emerald-600 transition-all"
                                style={{ height: `${Math.max(offPeakPct - peakPct, 0.5)}%` }}
                                title={`${t("dashboard.offPeak")}: ${formatKwh(d.offPeakKwh)} ${t("dashboard.kwh")}`}
                              />
                            </div>
                            <div className="text-[10px] text-muted-foreground">{getDay(d.date)}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Daily breakdown table ── */}
              {dailyData.length > 0 && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("dashboard.date")}</TableHead>
                        <TableHead className="text-right">{t("dashboard.peakKwh")}</TableHead>
                        <TableHead className="text-right">{t("dashboard.offPeakKwh")}</TableHead>
                        <TableHead className="text-right">{t("dashboard.totalKwh")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailyData.map((d) => (
                        <TableRow key={d.date}>
                          <TableCell className="font-medium">{formatDisplayDate(d.date)}</TableCell>
                          <TableCell className="text-right">{formatKwh(d.peakKwh)}</TableCell>
                          <TableCell className="text-right">{formatKwh(d.offPeakKwh)}</TableCell>
                          <TableCell className="text-right font-medium">{formatKwh(d.peakKwh + d.offPeakKwh)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {auth?.token && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                {t("dashboard.monthlyBillSummary")} For {selectedYear}
              </CardTitle>
              {summaryData.length > 0 && (
                <div className="flex flex-wrap gap-4 text-sm">
                  <span>
                    {t("dashboard.total")}:{" "}
                    <strong>
                      {formatKwh(summaryData.reduce((s, m) => s + m.totalKwh, 0))} {t("dashboard.kwh")}
                    </strong>
                  </span>
                  <span>
                    {t("dashboard.estBill")}:{" "}
                    <strong>
                      {formatMoney(summaryData.reduce((s, m) => s + (m.billAmount ?? 0), 0))}
                    </strong>
                  </span>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {loadingSummary ? (
                <p className="text-center text-muted-foreground py-4">{t("dashboard.loading")}</p>
              ) : summaryData.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">{t("dashboard.noDataYet")}</p>
              ) : (
                <>
                  {/* ── Monthly bar chart ── */}
                  <div className="w-full overflow-x-auto">
                    <div className="min-w-[760px]">
                      <div className="flex items-end gap-2 h-64">
                        {(() => {
                          const maxTotal = Math.max(...summaryData.map((m) => m.totalKwh), 1);
                          return summaryData.map((m) => {
                            const totalPct = (m.totalKwh / maxTotal) * 100;
                            const peakPct = (m.peakKwh / maxTotal) * 100;
                            return (
                              <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                                <div className="w-full h-56 flex flex-col justify-end">
                                  <div
                                    className="w-full bg-amber-500 rounded-t-sm"
                                    style={{ height: `${Math.max(peakPct, 0.5)}%` }}
                                    title={`${t("dashboard.peak")}: ${formatKwh(m.peakKwh)} ${t("dashboard.kwh")}`}
                                  />
                                  <div
                                    className="w-full bg-emerald-600 rounded-b-sm"
                                    style={{ height: `${Math.max(totalPct - peakPct, 0.5)}%` }}
                                    title={`${t("dashboard.offPeak")}: ${formatKwh(m.offPeakKwh)} ${t("dashboard.kwh")}`}
                                  />
                                </div>
                                <div className="text-xs text-muted-foreground">{monthLabel(m.month)}</div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-sm bg-amber-500" />
                      {t("dashboard.peak")}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-sm bg-emerald-600" />
                      {t("dashboard.offPeak")}
                    </span>
                  </div>
                  {/* ── Monthly bill table ── */}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("dashboard.month")}</TableHead>
                          <TableHead className="text-right">{t("dashboard.peakKwh")}</TableHead>
                          <TableHead className="text-right">{t("dashboard.offPeakKwh")}</TableHead>
                          <TableHead className="text-right">{t("dashboard.totalKwh")}</TableHead>
                          <TableHead className="text-right">{t("dashboard.estBill")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {summaryData.map((s) => (
                          <TableRow key={s.month} className={s.month === nowDate.month && selectedYear === nowDate.year ? "bg-emerald-100/80 dark:bg-emerald-900/30" : ""}>
                            <TableCell className="font-medium">{monthLabel(s.month)}</TableCell>
                            <TableCell className="text-right">{formatKwh(s.peakKwh)}</TableCell>
                            <TableCell className="text-right">{formatKwh(s.offPeakKwh)}</TableCell>
                            <TableCell className="text-right font-medium">{formatKwh(s.totalKwh)}</TableCell>
                            <TableCell className="text-right">{s.billAmount != null ? formatMoney(s.billAmount) : "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* ════════════════════════ SECTION 2: EV vs Non-EV ════════════════════════ */}
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Fuel className="w-5 h-5 text-emerald-600" />
                {t("dashboard.evVsNonEv")} {selectedYear}
              </CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="secondary" size="sm">
                    <Upload className="w-4 h-4 mr-1" />
                    {t("dashboard.importPlus")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Car className="w-5 h-5 text-emerald-600" />
                      {t("dashboard.evChargingImport")}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <p className="text-sm text-muted-foreground">{t("dashboard.pasteInstructions")}</p>
                    <details className="text-xs text-muted-foreground bg-muted/30 rounded-md p-3">
                      <summary className="cursor-pointer font-medium text-foreground text-sm mb-1">How to extract text from PDF</summary>
                      <ol className="list-decimal list-inside space-y-1 mt-2 text-xs sm:text-sm">
                        <li>Open your Easy Charging PDF</li>
                        <li>Copy all text from the PDF (<code className="bg-muted px-1 rounded">Ctrl+A</code> → <code className="bg-muted px-1 rounded">Ctrl+C</code>)</li>
                        <li>Paste it in the text area below</li>
                      </ol>
                      <p className="mt-2 text-xs sm:text-sm">
                        <strong>Tip:</strong> If copying doesn't work, use{" "}
                        <a href="https://www.pdftotext.com" target="_blank" rel="noopener noreferrer" className="underline">pdftotext.com</a>{" "}
                        or run <code className="bg-muted px-1 rounded break-all">pdftotext -layout charging.pdf output.txt</code> on desktop.
                      </p>
                      <p className="mt-2 text-xs sm:text-sm">
                        <strong>Expected format per line:</strong>
                      </p>
                      <pre className="bg-muted p-2 rounded mt-1 text-[10px] sm:text-xs overflow-x-auto whitespace-nowrap">
254902721  Azuan Alias  2026-06-05  00:06:39  2026-06-05  10:13:03  10H06M  61.0  17.57</pre>
                    </details>
                    <Textarea placeholder={t("dashboard.pastePlaceholder")} value={rawInput} onChange={(e) => setRawInput(e.target.value)} rows={6} className="font-mono text-sm" />
                    <div className="flex gap-2">
                      <Button onClick={handleParse} disabled={!rawInput.trim()}>
                        <Upload className="w-4 h-4 mr-1" />
                        {t("dashboard.parseSessions")}
                      </Button>
                      {sessions.length > 0 && auth?.token && (
                        <Button onClick={handleSaveEv} variant="secondary" disabled={saving}>
                          {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Zap className="w-4 h-4 mr-1" />}
                          {saving ? t("dashboard.saving") : `${t("dashboard.saveTo")} ${selectedYear}`}
                        </Button>
                      )}
                    </div>
                    {evMsg && <p className="text-sm text-foreground">{evMsg}</p>}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="text-sm text-muted-foreground">
              {!auth?.token ? (
                <span>{t("dashboard.loginToView")}</span>
              ) : loadingBillEv ? (
                <span>
                  <Loader2 className="w-3 h-3 inline animate-spin mr-1" />
                  {t("dashboard.loading")}
                </span>
              ) : billEvError ? (
                <span className="text-red-600">{billEvError}</span>
              ) : monthsWithData > 0 ? null : (
                <span>
                  {t("dashboard.noDataFor")} {selectedYear}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {(() => {
              const total = billEvTotals.grandTotal;
              const evTotal = billEvTotals.evTotal;
              const nonEvTotal = billEvTotals.nonEvTotal;
              if (total <= 0) return null;
              const circ = 2 * Math.PI * 55;
              const evLen = (evTotal / total) * circ;
              const evPct = ((evTotal / total) * 100).toFixed(1);
              const nonEvPct = ((nonEvTotal / total) * 100).toFixed(1);
              return (
                <div className="flex flex-col items-center py-2">
                  <svg width="150" height="150" viewBox="0 0 150 150">
                    {/* Background ring */}
                    <circle cx="75" cy="75" r="60" fill="none" className="stroke-muted" strokeWidth="22" />
                    {/* EV arc */}
                    {evTotal > 0 && (
                      <circle cx="75" cy="75" r="60" fill="none" className="stroke-sky-500" strokeWidth="22"
                        strokeDasharray={`${evLen} ${circ}`}
                        transform="rotate(-90 75 75)"
                        strokeLinecap="round"
                      />
                    )}
                    {/* Non-EV arc */}
                    {nonEvTotal > 0 && (
                      <circle cx="75" cy="75" r="60" fill="none" className="stroke-emerald-600" strokeWidth="22"
                        strokeDasharray={`${circ - evLen} ${circ}`}
                        strokeDashoffset={-evLen}
                        transform="rotate(-90 75 75)"
                        strokeLinecap="round"
                      />
                    )}
                    {/* Center total */}
                    <text x="75" y="70" textAnchor="middle" className="fill-foreground" fontSize="22" fontWeight="bold">
                      {formatKwh(total)}
                    </text>
                    <text x="75" y="92" textAnchor="middle" className="fill-muted-foreground" fontSize="12">
                      kWh
                    </text>
                  </svg>
                  <div className="flex gap-6 mt-2">
                    <span className="flex items-center gap-1.5 text-sm">
                      <span className="inline-block w-3 h-3 rounded-sm bg-sky-500" />
                      <strong>{formatKwh(evTotal)}</strong> kWh ({evPct}%)
                    </span>
                    <span className="flex items-center gap-1.5 text-sm">
                      <span className="inline-block w-3 h-3 rounded-sm bg-emerald-600" />
                      <strong>{formatKwh(nonEvTotal)}</strong> kWh ({nonEvPct}%)
                    </span>
                  </div>
                </div>
              );
            })()}

            {monthsWithData > 0 && (
              <>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-sm bg-emerald-600" />
                    {t("dashboard.nonEv")}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-sm bg-sky-500" />
                    {t("dashboard.evCharging")}
                  </span>
                </div>
                <div className="w-full overflow-x-auto">
                  <div className="min-w-[760px]">
                    <div className="flex items-end gap-2 h-64">
                      {billEvData.map((m) => {
                        const { nonEvPct, evPct } = getBarHeights(m.totalKwh, m.evKwh, maxTotal);
                        return (
                          <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                            <div className="w-full h-56 flex flex-col justify-end">
                              <div
                                className="w-full bg-sky-500 rounded-t-sm"
                                style={{ height: `${Math.round(evPct * 100)}%` }}
                                title={`${monthLabel(m.month)} EV: ${formatKwh(m.evKwh)} ${t("dashboard.kwh")}`}
                              />
                              <div
                                className="w-full bg-emerald-600 rounded-b-sm"
                                style={{ height: `${Math.round(nonEvPct * 100)}%` }}
                                title={`${monthLabel(m.month)} Non-EV: ${formatKwh(m.nonEvKwh)} ${t("dashboard.kwh")}`}
                              />
                            </div>
                            <div className="text-xs text-muted-foreground">{monthLabel(m.month)}</div>
                            <div className="text-xs font-medium">
                              {formatKwh(m.totalKwh)} {t("dashboard.kwh")}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("dashboard.month")}</TableHead>
                    <TableHead>{t("dashboard.totalUsage")}</TableHead>
                    <TableHead>{t("dashboard.evCharging")}</TableHead>
                    <TableHead>{t("dashboard.nonEv")}</TableHead>
                    <TableHead className="text-right">{t("dashboard.evPercent")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billEvData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                        {!auth?.token ? t("dashboard.loginToView") : loadingBillEv ? t("dashboard.loading") : `${t("dashboard.noDataFor")} ${selectedYear}.`}
                      </TableCell>
                    </TableRow>
                  ) : (
                    billEvData.map((m) => {
                      const evPct = m.totalKwh > 0 ? (m.evKwh / m.totalKwh) * 100 : 0;
                      return (
                        <TableRow key={m.month} className={m.month === nowDate.month && selectedYear === nowDate.year ? "bg-emerald-100/80 dark:bg-emerald-900/30" : ""}>
                          <TableCell className="font-medium">{monthLabel(m.month)}</TableCell>
                          <TableCell>{formatKwh(m.totalKwh)}</TableCell>
                          <TableCell>
                            <span className="text-sky-600">{formatKwh(m.evKwh)}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-emerald-600">{formatKwh(m.nonEvKwh)}</span>
                          </TableCell>
                          <TableCell className="text-right">{evPct.toFixed(1)}%</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {!auth?.token && (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-2">{t("dashboard.signInToView")}</p>
                <GoogleAuthButton locale={locale} />
              </div>
            )}
          </CardContent>
        </Card>


        {sessions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Car className="w-4 h-4 text-emerald-600" />
                {t("dashboard.chargingSessions")} ({sessions.length})
              </CardTitle>
              <div className="flex gap-4 text-sm">
                <span>
                  {t("dashboard.total")}:{" "}
                  <strong>
                    {formatKwh(sessionTotals.kwh)} {t("dashboard.kwh")}
                  </strong>
                </span>
                <span>
                  {t("dashboard.cost")}: <strong>{formatMoney(sessionTotals.cost)}</strong>
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-2 sm:p-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("dashboard.date")}</TableHead>
                      <TableHead>{t("dashboard.start")}</TableHead>
                      <TableHead>{t("dashboard.end")}</TableHead>
                      <TableHead>{t("dashboard.duration")}</TableHead>
                      <TableHead className="text-right">{t("dashboard.kwh")}</TableHead>
                      <TableHead className="text-right">{t("dashboard.costRm")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{s.date}</TableCell>
                        <TableCell>{s.startTime}</TableCell>
                        <TableCell>{s.endTime}</TableCell>
                        <TableCell>{s.duration}</TableCell>
                        <TableCell className="text-right">{s.kwh.toFixed(1)}</TableCell>
                        <TableCell className="text-right">{s.cost.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
      <footer className="border-t bg-card/50 backdrop-blur-sm mt-4">
        <div className="w-full max-w-6xl mx-auto flex flex-col gap-3 sm:gap-4 mt-3 sm:mt-4 md:flex-row md:justify-between md:items-center px-2 sm:px-0">
          <div className="text-base sm:text-lg font-semibold text-primary text-center md:text-left">{t("common.title")}</div>
          <div className="text-xs sm:text-sm text-muted-foreground text-center md:text-left order-3 md:order-2">
            {t("footer.madeBy")}{" "}
            <a href="https://azuanalias.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-outline transition-colors">
              Azuan Alias
            </a>
          </div>
          <div className="flex items-center justify-center gap-3 sm:gap-4 order-2 md:order-3">
            <a
              href="https://github.com/azuanalias92"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Github className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{t("footer.github")}</span>
            </a>
            <a
              href="https://ko-fi.com/azuanalias"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Coffee className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{t("footer.buyMeCoffee")}</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
