"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { getAuthState, type AuthState } from "@/lib/auth";
import { useTranslation } from "@/lib/useTranslation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import GoogleAuthButton from "@/components/GoogleAuthButton";
import { Coffee, Github, Upload, Car, Loader2, Zap } from "lucide-react";

type MonthUsage = {
  month: number;
  evKwh: number;
  nonEvKwh: number;
};

type ChargingSession = {
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  kwh: number;
  cost: number;
};

function monthLabel(month: number): string {
  const labels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return labels[month - 1] ?? String(month);
}

function formatKwh(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(value);
}

function emptyYearData(): MonthUsage[] {
  return Array.from({ length: 12 }, (_, idx) => ({ month: idx + 1, evKwh: 0, nonEvKwh: 0 }));
}

function dedupeYears(years: number[]): number[] {
  return Array.from(new Set(years.filter((y) => Number.isFinite(y)))).sort((a, b) => b - a);
}

export default function EvPage() {
  const apiBaseUrl = useMemo(() => process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8787", []);
  const { t, locale } = useTranslation();
  const pathname = usePathname();

  const [auth, setAuth] = useState<AuthState | null>(null);
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const [year, setYear] = useState(currentYear);
  const [availableYears, setAvailableYears] = useState<number[]>([currentYear]);
  const [existingData, setExistingData] = useState<MonthUsage[]>(() => emptyYearData());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Charging sessions from PDF
  const [sessions, setSessions] = useState<ChargingSession[]>([]);
  const [rawInput, setRawInput] = useState("");

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

  // Fetch available years
  useEffect(() => {
    if (!auth?.token) return;
    let canceled = false;
    const run = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/ev-usage/years`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (!res.ok) return;
        const payload = (await res.json()) as { years: number[] };
        if (!canceled) setAvailableYears(dedupeYears([currentYear, ...(payload.years ?? [])]));
      } catch {}
    };
    void run();
    return () => { canceled = true; };
  }, [apiBaseUrl, auth?.token, currentYear]);

  // Fetch existing data
  useEffect(() => {
    if (!auth?.token) return;
    let canceled = false;
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${apiBaseUrl}/ev-usage?year=${year}`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (!res.ok) return;
        const payload = (await res.json()) as { year: number; data: MonthUsage[] };
        if (!canceled) setExistingData(payload.data ?? emptyYearData());
      } catch {}
      finally { if (!canceled) setLoading(false); }
    };
    void run();
    return () => { canceled = true; };
  }, [apiBaseUrl, auth?.token, year]);

  // Parse charging session text
  const handleParse = () => {
    const lines = rawInput.split("\n").filter((l) => l.trim());
    const parsed: ChargingSession[] = [];
    let isHeaderSkipped = false;

    for (const line of lines) {
      // Skip header lines
      if (!isHeaderSkipped) {
        if (line.includes("Start time") || line.includes("End time") || line.includes("Charging duration")) {
          isHeaderSkipped = true;
          continue;
        }
        if (line.includes("Charging station") || line.includes("User") || line.includes("Total")) continue;
        if (!line.match(/\d{4}-\d{2}-\d{2}/)) continue;
      }
      if (line.includes("Total")) continue;

      // Extract data - format: station, user, date, startTime, date, endTime, duration, kWh, cost
      const parts = line.trim().split(/\s+/);
      // Find date patterns
      const dates = line.match(/\d{4}-\d{2}-\d{2}/g);
      const times = line.match(/\d{2}:\d{2}:\d{2}/g);
      const kwhMatch = line.match(/(\d+\.?\d*)\s*kWh/i) || line.match(/(\d+\.?\d*)\s*$/);
      const costMatch = line.match(/(\d+\.?\d{2})\s*$/);

      if (dates && times && times.length >= 4) {
        // Determine kWh and cost
        const nums = line.split(/\s+/).filter(s => /^\d+\.?\d*$/.test(s)).map(Number);
        const kwh = nums.length >= 2 ? nums[nums.length - 2] : 0;
        const cost = nums.length >= 1 ? nums[nums.length - 1] : 0;

        parsed.push({
          date: dates[0],
          startTime: times[0],
          endTime: times[2] || times[1],
          duration: parts.find(p => p.includes("H") && p.includes("M")) || "",
          kwh,
          cost,
        });
      }
    }

    setSessions(parsed);
    if (parsed.length === 0) setMessage("No sessions parsed. Try pasting the raw PDF text.");
    else setMessage(`Parsed ${parsed.length} charging sessions!`);
    setTimeout(() => setMessage(null), 3000);
  };

  // Aggregate sessions by month
  const monthlyEv = useMemo(() => {
    const byMonth = new Map<number, number>();
    for (const s of sessions) {
      const m = Number.parseInt(s.date.slice(5, 7), 10);
      byMonth.set(m, (byMonth.get(m) ?? 0) + s.kwh);
    }
    return byMonth;
  }, [sessions]);

  const mergedData = useMemo(() => {
    return existingData.map((m) => ({
      ...m,
      evKwh: m.evKwh + (monthlyEv.get(m.month) ?? 0),
    }));
  }, [existingData, monthlyEv]);

  const totals = useMemo(() => {
    const s = { evKwh: 0, nonEvKwh: 0 };
    for (const m of existingData) {
      s.evKwh += m.evKwh;
      s.nonEvKwh += m.nonEvKwh;
    }
    return s;
  }, [existingData]);

  const sessionTotals = useMemo(() => {
    let kwh = 0, cost = 0;
    for (const s of sessions) { kwh += s.kwh; cost += s.cost; }
    return { kwh, cost };
  }, [sessions]);

  // Save sessions to API
  const handleSave = async () => {
    if (!auth?.token) return;
    setSaving(true);
    setMessage(null);

    // Merge session data into existing data
    const updatedData = existingData.map((m) => ({
      month: m.month,
      evKwh: m.evKwh + (monthlyEv.get(m.month) ?? 0),
      nonEvKwh: m.nonEvKwh,
    }));

    try {
      const res = await fetch(`${apiBaseUrl}/ev-usage?year=${year}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ data: updatedData }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error: string };
        setMessage(`Error: ${err.error ?? "Failed"}`);
        return;
      }

      const result = (await res.json()) as { year: number; data: MonthUsage[] };
      setExistingData(result.data ?? emptyYearData());
      setSessions([]);
      setRawInput("");
      setAvailableYears((prev) => dedupeYears([year, ...prev]));
      setMessage("EV data saved successfully!");
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen p-4 sm:p-6 lg:p-8 bg-background">
      <div className="w-full max-w-6xl mx-auto text-center mb-6 sm:mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-4">
          <div className="hidden sm:block" />
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <img src="/logo.svg" alt={t("common.logoAlt")} className="w-8 h-8 sm:w-10 sm:h-10" />
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-emerald-800">{t("common.title")}</h1>
          </div>
          <div className="flex justify-center sm:justify-end items-center gap-3">
            <GoogleAuthButton locale={locale} />
            <LanguageSwitcher />
          </div>
        </div>

        <div className="flex justify-center mt-4">
          <div className="inline-flex gap-2 rounded-lg border border-input bg-background p-1">
            <Button asChild size="sm" variant="outline">
              <Link href={`/${locale}`}>Calculator</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/${locale}/bill-ev`}>Bill EV</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/${locale}/rates`}>Rates</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/${locale}/usage`}>Usage</Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link href={`/${locale}/ev`}>EV</Link>
            </Button>
          </div>
        </div>
        <p className="text-sm sm:text-base text-emerald-600 mt-2">{t("common.description")}</p>
      </div>

      <div className="flex-1 w-full max-w-6xl mx-auto space-y-6">
        {/* Import Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="w-5 h-5 text-emerald-600" />
              EV Charging Import
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Paste your Easy Charging PDF text below, or type/paste charging session data.
              The parser will extract dates, kWh, and costs.
            </p>
            <Textarea
              placeholder={`Paste Easy Charging data here...\n\nExample:\n254902721  Azuan Alias  2026-05-24  00:06:39  2026-05-24  10:13:03  10H06M  61.0  17.57`}
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
            <div className="flex gap-2">
              <Button onClick={handleParse} disabled={!rawInput.trim()}>
                <Upload className="w-4 h-4 mr-1" />
                Parse Sessions
              </Button>
              {sessions.length > 0 && auth?.token && (
                <Button onClick={handleSave} variant="secondary" disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Zap className="w-4 h-4 mr-1" />}
                  {saving ? "Saving..." : `Save ${year} Data to API`}
                </Button>
              )}
            </div>
            {message && <p className="text-sm text-foreground">{message}</p>}
          </CardContent>
        </Card>

        {/* Parsed Sessions */}
        {sessions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Car className="w-4 h-4 text-emerald-600" />
                Charging Sessions ({sessions.length})
              </CardTitle>
              <div className="flex gap-4 text-sm">
                <span>Total: <strong>{formatKwh(sessionTotals.kwh)} kWh</strong></span>
                <span>Cost: <strong>{formatMoney(sessionTotals.cost)}</strong></span>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>End</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead className="text-right">kWh</TableHead>
                      <TableHead className="text-right">Cost (RM)</TableHead>
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

        {/* Monthly EV Breakdown */}
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="w-4 h-4 text-emerald-600" />
                EV Monthly Breakdown
              </CardTitle>
              <select
                value={String(year)}
                onChange={(e) => setYear(Number.parseInt(e.target.value, 10))}
                className="flex h-9 w-28 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm md:text-sm"
              >
                {availableYears.map((y) => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              <span>Existing EV: <strong>{formatKwh(totals.evKwh)} kWh</strong></span>
              <span>Non-EV: <strong>{formatKwh(totals.nonEvKwh)} kWh</strong></span>
              {sessions.length > 0 && (
                <span className="text-emerald-600">
                  + {formatKwh(sessionTotals.kwh)} kWh from import
                </span>
              )}
              {loading && <Loader2 className="w-3 h-3 animate-spin" />}
            </div>
          </CardHeader>
          <CardContent>
            {!auth?.token ? (
              <p className="text-center text-muted-foreground py-4">Sign in to view EV data</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">EV (kWh)</TableHead>
                      <TableHead className="text-right">Non-EV (kWh)</TableHead>
                      <TableHead className="text-right">Total (kWh)</TableHead>
                      {sessions.length > 0 && <TableHead className="text-right text-emerald-600">Import +</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(sessions.length > 0 ? mergedData : existingData).map((m) => {
                      const importKwh = monthlyEv.get(m.month) ?? 0;
                      return (
                        <TableRow key={m.month}>
                          <TableCell className="font-medium">{monthLabel(m.month)}</TableCell>
                          <TableCell className="text-right">{formatKwh(m.evKwh)}</TableCell>
                          <TableCell className="text-right">{formatKwh(m.nonEvKwh)}</TableCell>
                          <TableCell className="text-right font-medium">{formatKwh(m.evKwh + m.nonEvKwh)}</TableCell>
                          {sessions.length > 0 && (
                            <TableCell className="text-right text-emerald-600">
                              {importKwh > 0 ? `+${formatKwh(importKwh)}` : "—"}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                    {/* Total row */}
                    <TableRow className="font-bold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">{formatKwh(totals.evKwh + sessionTotals.kwh)}</TableCell>
                      <TableCell className="text-right">{formatKwh(totals.nonEvKwh)}</TableCell>
                      <TableCell className="text-right">{formatKwh(totals.evKwh + totals.nonEvKwh + sessionTotals.kwh)}</TableCell>
                      {sessions.length > 0 && <TableCell />}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <footer className="border-t bg-card/50 backdrop-blur-sm mt-4">
        <div className="w-full max-w-6xl mx-auto flex flex-col gap-3 sm:gap-4 mt-3 sm:mt-4 md:flex-row md:justify-between md:items-center px-2 sm:px-0">
          <div className="text-base sm:text-lg font-semibold text-primary text-center md:text-left">{t("common.title")}</div>
          <div className="text-xs sm:text-sm text-muted-foreground text-center md:text-left order-3 md:order-2">
            {t("footer.madeBy")}{" "}
            <a href="https://azuanalias.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-outline transition-colors">Azuan Alias</a>
          </div>
          <div className="flex items-center justify-center gap-3 sm:gap-4 order-2 md:order-3">
            <a href="https://github.com/azuanalias92" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors">
              <Github className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{t("footer.github")}</span>
            </a>
            <a href="https://ko-fi.com/azuanalias" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors">
              <Coffee className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{t("footer.buyMeCoffee")}</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
