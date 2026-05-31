"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { getAuthState, type AuthState } from "@/lib/auth";
import { useTranslation } from "@/lib/useTranslation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import GoogleAuthButton from "@/components/GoogleAuthButton";
import { Coffee, Github, Upload, BarChart3, CalendarDays, Loader2 } from "lucide-react";

type DailyUsageItem = {
  date: string;
  peakKwh: number;
  offPeakKwh: number;
};

type DailyUsageSummaryItem = {
  month: number;
  peakKwh: number;
  offPeakKwh: number;
  totalKwh: number;
  billAmount: number | null;
};

function monthLabel(month: number): string {
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return labels[month - 1] ?? String(month);
}

function formatKwh(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(value);
}

function getDay(dateStr: string): number {
  return Number.parseInt(dateStr.slice(8, 10), 10);
}

function getMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7); // "2026-05"
}

function parseCsvDate(dateStr: string): string {
  // "May  1, 2026" -> "2026-05-01"
  const months: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
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

function now() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export default function UsagePage() {
  const apiBaseUrl = useMemo(() => process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8787", []);
  const { t, locale } = useTranslation();
  const pathname = usePathname();

  const [auth, setAuth] = useState<AuthState | null>(null);
  const nowDate = useMemo(() => now(), []);
  const [viewYear, setViewYear] = useState(nowDate.year);
  const [viewMonth, setViewMonth] = useState(nowDate.month);
  const [dailyData, setDailyData] = useState<DailyUsageItem[]>([]);
  const [summaryData, setSummaryData] = useState<DailyUsageSummaryItem[]>([]);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Fetch daily data
  useEffect(() => {
    if (!auth?.token) return;
    let canceled = false;

    const run = async () => {
      setLoadingDaily(true);
      setMessage(null);
      try {
        const res = await fetch(
          `${apiBaseUrl}/daily-usage?year=${viewYear}&month=${viewMonth}`,
          { headers: { Authorization: `Bearer ${auth.token}` } },
        );
        if (!res.ok) {
          if (!canceled) setDailyData([]);
          return;
        }
        const payload = (await res.json()) as { year: number; month: number | null; data: DailyUsageItem[] };
        if (!canceled) setDailyData(payload.data ?? []);
      } catch {
        if (!canceled) setDailyData([]);
      } finally {
        if (!canceled) setLoadingDaily(false);
      }
    };

    void run();
    return () => { canceled = true; };
  }, [apiBaseUrl, auth?.token, viewYear, viewMonth]);

  // Fetch summary
  useEffect(() => {
    if (!auth?.token) return;
    let canceled = false;

    const run = async () => {
      setLoadingSummary(true);
      try {
        const res = await fetch(
          `${apiBaseUrl}/daily-usage/summary?year=${viewYear}`,
          { headers: { Authorization: `Bearer ${auth.token}` } },
        );
        if (!res.ok) {
          if (!canceled) setSummaryData([]);
          return;
        }
        const payload = (await res.json()) as { year: number; data: DailyUsageSummaryItem[] };
        if (!canceled) setSummaryData(payload.data ?? []);
      } catch {
        if (!canceled) setSummaryData([]);
      } finally {
        if (!canceled) setLoadingSummary(false);
      }
    };

    void run();
    return () => { canceled = true; };
  }, [apiBaseUrl, auth?.token, viewYear]);

  // Monthly summary for the viewed month
  const currentMonthSummary = useMemo(() => {
    return summaryData.find((s) => s.month === viewMonth);
  }, [summaryData, viewMonth]);

  const dailyTotals = useMemo(() => {
    const peak = dailyData.reduce((s, d) => s + d.peakKwh, 0);
    const offPeak = dailyData.reduce((s, d) => s + d.offPeakKwh, 0);
    return { peak, offPeak, total: peak + offPeak };
  }, [dailyData]);

  const maxDailyTotal = useMemo(() => {
    return dailyData.reduce((max, d) => Math.max(max, d.peakKwh + d.offPeakKwh), 0);
  }, [dailyData]);

  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth?.token) return;
    setUploading(true);
    setMessage(null);

    try {
      const text = await file.text();
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) {
        setMessage("CSV is empty");
        setUploading(false);
        return;
      }

      // Parse CSV
      const rows: DailyUsageItem[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        // Handle quoted CSV: "Date","Peak","Off-Peak","Total"
        const cols = line.split('","').map((c) => c.replace(/^"|"$/g, "").trim());
        if (cols.length < 4) continue;
        const rawDate = cols[0];
        const rawPeak = cols[1];
        const rawOffPeak = cols[2];
        const date = parseCsvDate(rawDate);
        if (!date) continue;
        // Skip future dates or dates with no data
        const today = new Date().toISOString().slice(0, 10);
        if (date > today) continue;
        const peakKwh = rawPeak ? Math.max(0, Number.parseFloat(rawPeak) || 0) : 0;
        const offPeakKwh = rawOffPeak ? Math.max(0, Number.parseFloat(rawOffPeak) || 0) : 0;
        rows.push({ date, peakKwh, offPeakKwh });
      }

      if (rows.length === 0) {
        setMessage("No valid rows found in CSV");
        setUploading(false);
        return;
      }

      // Upload to API
      const res = await fetch(`${apiBaseUrl}/daily-usage`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ data: rows }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error: string };
        setMessage(`Upload failed: ${err.error ?? "Unknown error"}`);
        setUploading(false);
        return;
      }

      setMessage(`Uploaded ${rows.length} days successfully!`);
      // Refresh data
      const [dailyRes, summaryRes] = await Promise.all([
        fetch(`${apiBaseUrl}/daily-usage?year=${viewYear}&month=${viewMonth}`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        }),
        fetch(`${apiBaseUrl}/daily-usage/summary?year=${viewYear}`, {
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
      setMessage("Failed to parse CSV file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const barHeightPct = (value: number): number => {
    if (maxDailyTotal <= 0) return 0;
    return Math.max(0, Math.min(100, (value / maxDailyTotal) * 100));
  };

  const currentSummary = summaryData.find((s) => s.month === viewMonth);

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
            <Button asChild size="sm" variant="secondary">
              <Link href={`/${locale}/usage`}>Usage</Link>
            </Button>
            <Button asChild size="sm" variant={pathname.endsWith("/ev") ? "secondary" : "outline"}>
              <Link href={`/${locale}/ev`}>EV</Link>
            </Button>
            <Button asChild size="sm" variant={pathname.includes("/ev-calculator") ? "secondary" : "outline"}>
              <Link href={`/${locale}/ev-calculator`}>EV Calc</Link>
            </Button>
            <Button asChild size="sm" variant={pathname.includes("/settings") ? "secondary" : "outline"}>
              <Link href={`/${locale}/settings`}>Settings</Link>
            </Button>
          </div>
        </div>

        <p className="text-sm sm:text-base text-emerald-600 mt-2">{t("common.description")}</p>
      </div>

      <div className="flex-1 w-full max-w-6xl mx-auto space-y-6">
        {/* Controls */}
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                Daily Energy Usage
              </CardTitle>
              <div className="flex items-center gap-3">
                {/* Year picker */}
                <select
                  value={String(viewYear)}
                  onChange={(e) => setViewYear(Number.parseInt(e.target.value, 10))}
                  className="flex h-9 w-24 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
                >
                  {Array.from({ length: 5 }, (_, i) => nowDate.year - 2 + i).map((y) => (
                    <option key={y} value={String(y)}>{y}</option>
                  ))}
                </select>
                {/* Month picker */}
                <select
                  value={String(viewMonth)}
                  onChange={(e) => setViewMonth(Number.parseInt(e.target.value, 10))}
                  className="flex h-9 w-28 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={String(m)}>{monthLabel(m)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>{auth?.token ? "Logged in" : "Login to view data"}</span>
                {loadingDaily ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                {message ? <span className="text-foreground">{message}</span> : null}
              </div>
              <div className="flex items-center gap-2">
                {/* CSV Upload */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!auth?.token || uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-1" />
                  )}
                  Upload CSV
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Daily Bar Chart */}
        {auth?.token && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="w-4 h-4 text-emerald-600" />
                {monthLabel(viewMonth)} {viewYear} — Daily Consumption
              </CardTitle>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded-sm bg-amber-500" />
                  <span>Peak: <strong>{formatKwh(dailyTotals.peak)} kWh</strong></span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded-sm bg-emerald-600" />
                  <span>Off-Peak: <strong>{formatKwh(dailyTotals.offPeak)} kWh</strong></span>
                </div>
                <div>
                  Total: <strong>{formatKwh(dailyTotals.total)} kWh</strong>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {dailyData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  {loadingDaily ? "Loading..." : "No data for this month. Upload a CSV to get started!"}
                </p>
              ) : (
                <div className="w-full overflow-x-auto">
                  <div className="min-w-[600px]">
                    <div className="flex items-end gap-1 h-48">
                      {dailyData.map((d) => {
                        const total = d.peakKwh + d.offPeakKwh;
                        const peakPct = barHeightPct(d.peakKwh);
                        const offPeakPct = barHeightPct(total);
                        const day = getDay(d.date);
                        return (
                          <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full h-40 flex flex-col justify-end">
                              <div
                                className="w-full bg-amber-500 rounded-t-sm transition-all"
                                style={{ height: `${Math.max(peakPct, 0.5)}%` }}
                                title={`Peak: ${formatKwh(d.peakKwh)} kWh`}
                              />
                              <div
                                className="w-full bg-emerald-600 transition-all"
                                style={{ height: `${Math.max(offPeakPct - peakPct, 0.5)}%` }}
                                title={`Off-Peak: ${formatKwh(d.offPeakKwh)} kWh`}
                              />
                            </div>
                            <div className="text-[10px] text-muted-foreground">{day}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Daily Data Table */}
        {auth?.token && dailyData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daily Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Peak (kWh)</TableHead>
                      <TableHead className="text-right">Off-Peak (kWh)</TableHead>
                      <TableHead className="text-right">Total (kWh)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyData.map((d) => (
                      <TableRow key={d.date}>
                        <TableCell className="font-medium">{d.date}</TableCell>
                        <TableCell className="text-right">{formatKwh(d.peakKwh)}</TableCell>
                        <TableCell className="text-right">{formatKwh(d.offPeakKwh)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatKwh(d.peakKwh + d.offPeakKwh)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Monthly Bill Summary */}
        {auth?.token && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                Monthly Bill Summary — {viewYear}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSummary ? (
                <p className="text-center text-muted-foreground py-4">Loading...</p>
              ) : summaryData.length === 0 && !loadingSummary ? (
                <p className="text-center text-muted-foreground py-4">No data yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead className="text-right">Peak (kWh)</TableHead>
                        <TableHead className="text-right">Off-Peak (kWh)</TableHead>
                        <TableHead className="text-right">Total (kWh)</TableHead>
                        <TableHead className="text-right">Est. Bill (MYR)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summaryData.map((s) => (
                        <TableRow
                          key={s.month}
                          className={s.month === viewMonth ? "bg-emerald-50/50 dark:bg-emerald-950/20" : ""}
                        >
                          <TableCell className="font-medium">{monthLabel(s.month)}</TableCell>
                          <TableCell className="text-right">{formatKwh(s.peakKwh)}</TableCell>
                          <TableCell className="text-right">{formatKwh(s.offPeakKwh)}</TableCell>
                          <TableCell className="text-right font-medium">{formatKwh(s.totalKwh)}</TableCell>
                          <TableCell className="text-right font-medium">
                            {s.billAmount !== null ? formatMoney(s.billAmount) : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Total row */}
                      {summaryData.length > 0 && (
                        <TableRow className="font-bold">
                          <TableCell>Total</TableCell>
                          <TableCell className="text-right">
                            {formatKwh(summaryData.reduce((s, m) => s + m.peakKwh, 0))}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatKwh(summaryData.reduce((s, m) => s + m.offPeakKwh, 0))}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatKwh(summaryData.reduce((s, m) => s + m.totalKwh, 0))}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatMoney(
                              summaryData.reduce((s, m) => s + (m.billAmount ?? 0), 0),
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Not logged in */}
        {!auth?.token && (
          <div className="text-center py-12 text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg">Sign in with Google to view your energy usage data</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t bg-card/50 backdrop-blur-sm mt-4">
        <div className="w-full max-w-6xl mx-auto flex flex-col gap-3 sm:gap-4 mt-3 sm:mt-4 md:flex-row md:justify-between md:items-center px-2 sm:px-0">
          <div className="text-base sm:text-lg font-semibold text-primary text-center md:text-left">{t("common.title")}</div>
          <div className="text-xs sm:text-sm text-muted-foreground text-center md:text-left order-3 md:order-2">
            {t("footer.madeBy")}{" "}
            <a href="https://azuanalias.com" target="_blank" rel="noopener noreferrer" className="text-xs sm:text-sm text-primary hover:text-outline transition-colors">
              Azuan Alias
            </a>
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
