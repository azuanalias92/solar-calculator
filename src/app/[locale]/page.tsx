"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { getAuthState, handleAuthFailure, type AuthState } from "@/lib/auth";
import { useTranslation } from "@/lib/useTranslation";
import { toast } from "sonner";
import { BarChart3, Fuel, Car, Sun, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import GoogleAuthButton from "@/components/GoogleAuthButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AppHeader from "@/components/AppHeader";
import Footer from "@/components/Footer";
import DailyUsageSection from "@/components/dashboard/DailyUsageSection";
import EvUsageSection from "@/components/dashboard/EvUsageSection";
import ChargingSessionsSection from "@/components/dashboard/ChargingSessionsSection";
import type { DailyUsageItem, DailyUsageSummaryItem, MonthSummary, ChargingSession, MonthUsage } from "@/components/dashboard/types";
import { monthLabel, parseCsvDate, emptyYearData } from "@/components/dashboard/utils";

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

  // ── Tab State ──
  const [activeTab, setActiveTab] = useState<"daily" | "ev" | "sessions">("daily");

  // ── Global Filters ──
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(nowDate.month);
  const [availableYears, setAvailableYears] = useState<number[]>([currentYear]);
  const [barTooltip, setBarTooltip] = useState<string | null>(null);

  // Dismiss bar tooltip on outside pointer
  const tooltipDismissed = useRef(false);
  useEffect(() => {
    if (!barTooltip) return;
    tooltipDismissed.current = false;
    const handler = () => {
      if (!tooltipDismissed.current) setBarTooltip(null);
      tooltipDismissed.current = true;
    };
    const id = setTimeout(() => document.addEventListener("pointerdown", handler), 50);
    return () => {
      clearTimeout(id);
      document.removeEventListener("pointerdown", handler);
    };
  }, [barTooltip]);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth?.token) return;
    setUploading(true);
    setUsageMsg(null);
    try {
      const text = await file.text();
      // Bound ingestion: reject oversized payloads early to protect the backend.
      const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
      if (text.length > MAX_BYTES) {
        setUsageMsg(t("dashboard.csvTooLarge"));
        setUploading(false);
        return;
      }
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) {
        setUsageMsg(t("dashboard.csvEmpty"));
        setUploading(false);
        return;
      }
      const rows: DailyUsageItem[] = [];
      const MAX_ROWS = 10000;
      for (let i = 1; i < lines.length && rows.length < MAX_ROWS; i++) {
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
      if (handleAuthFailure(res)) {
        setUploading(false);
        return;
      }
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
      if (handleAuthFailure(dailyRes) || handleAuthFailure(summaryRes)) {
        setUploading(false);
        return;
      }
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

  const tabs = [
    { id: "daily" as const, label: t("dashboard.dailyEnergyUsage"), icon: BarChart3 },
    { id: "ev" as const, label: t("dashboard.evVsNonEv"), icon: Fuel },
    { id: "sessions" as const, label: t("dashboard.chargingSessions"), icon: Car },
  ];

  // ── Not logged in → show login wall ──
  if (!auth?.token) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <AppHeader locale={locale} title={t("common.title")} description={t("common.description")} logoAlt={t("common.logoAlt")} />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-emerald-200 dark:border-emerald-800 shadow-lg">
            <CardContent className="pt-8 pb-8 space-y-6 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                <Sun className="w-8 h-8 text-emerald-600" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold tracking-tight">{t("common.title")}</h2>
                <p className="text-sm text-muted-foreground">{t("common.description")}</p>
              </div>
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Zap className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{t("dashboard.trackEnergy") ?? "Track your energy usage"}</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <BarChart3 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{t("dashboard.monitorSolar") ?? "Monitor your solar savings"}</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Fuel className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{t("dashboard.evCharging") ?? "Manage EV charging costs"}</span>
                </div>
              </div>
              <div className="pt-2">
                <GoogleAuthButton locale={locale} />
              </div>
              <p className="text-[11px] text-muted-foreground/60">
                {t("auth.signInPrompt") ?? "Sign in to access your dashboard"}
              </p>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen p-2 sm:p-6 lg:p-8 bg-background">
      <AppHeader locale={locale} title={t("common.title")} description={t("common.description")} logoAlt={t("common.logoAlt")} />

      {/* ── Global Year/Month Filter ── */}
      <div className="w-full max-w-6xl mx-auto py-4 flex items-center justify-end gap-3">
        <Select
          value={String(selectedYear)}
          onValueChange={(v) => setSelectedYear(Number.parseInt(v, 10))}
        >
          <SelectTrigger className="w-28" aria-label="Select year">
            <SelectValue placeholder={String(selectedYear)} />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={String(selectedMonth)}
          onValueChange={(v) => setSelectedMonth(Number.parseInt(v, 10))}
        >
          <SelectTrigger className="w-28" aria-label="Select month">
            <SelectValue placeholder={monthLabel(selectedMonth)} />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <SelectItem key={m} value={String(m)}>
                {monthLabel(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="w-full max-w-6xl mx-auto pb-4">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 w-full max-w-6xl mx-auto space-y-6">
        {/* ════════════════════════ Daily Usage Tab ════════════════════════ */}
        {activeTab === "daily" && (
          <DailyUsageSection
            auth={auth}
            t={t}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            loadingDaily={loadingDaily}
            loadingSummary={loadingSummary}
            uploading={uploading}
            usageMsg={usageMsg}
            dailyData={dailyData}
            summaryData={summaryData}
            dailyTotals={dailyTotals}
            fileInputRef={fileInputRef}
            handleFileUpload={handleFileUpload}
          />
        )}

        {/* ════════════════════════ EV vs Non-EV Tab ════════════════════════ */}
        {activeTab === "ev" && (
          <EvUsageSection
            auth={auth}
            t={t}
            locale={locale}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            billEvData={billEvData}
            loadingBillEv={loadingBillEv}
            billEvError={billEvError}
            billEvTotals={billEvTotals}
            monthsWithData={monthsWithData}
            rawInput={rawInput}
            setRawInput={setRawInput}
            sessions={sessions}
            evMsg={evMsg}
            handleParse={handleParse}
            handleSaveEv={handleSaveEv}
            saving={saving}
          />
        )}

        {/* ════════════════════════ Charging Sessions Tab ════════════════════════ */}
        {activeTab === "sessions" && sessions.length > 0 && (
          <ChargingSessionsSection
            t={t}
            sessions={sessions}
            sessionTotals={sessionTotals}
          />
        )}
        {activeTab === "sessions" && sessions.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Car className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-sm font-medium">{t("dashboard.noSessions")}</p>
            <p className="text-xs mt-2 max-w-xs mx-auto">{t("dashboard.noSessionsHint")}</p>
          </div>
        )}
      </div>

      <Footer />

      {barTooltip && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-md border bg-popover px-4 py-2.5 text-sm shadow-md text-center font-medium">
          {barTooltip}
        </div>
      )}
    </div>
  );
}