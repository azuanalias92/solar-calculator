"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { getAuthState, type AuthState } from "@/lib/auth";
import { useTranslation } from "@/lib/useTranslation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import GoogleAuthButton from "@/components/GoogleAuthButton";
import { Coffee, Github } from "lucide-react";

type MonthSummary = {
  month: number;
  totalKwh: number;
  evKwh: number;
  nonEvKwh: number;
};

function monthLabel(month: number): string {
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return labels[month - 1] ?? String(month);
}

function formatKwh(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}

function getBarHeights(total: number, ev: number, maxTotal: number): { nonEvPct: number; evPct: number } {
  if (maxTotal <= 0) return { nonEvPct: 0, evPct: 0 };
  const totalPct = Math.max(0, Math.min(1, total / maxTotal));
  const evPct = total > 0 ? (ev / total) * totalPct : 0;
  const nonEvPct = totalPct - evPct;
  return { nonEvPct, evPct };
}

export default function BillEvPage() {
  const apiBaseUrl = useMemo(() => process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8787", []);
  const { t, locale } = useTranslation();
  const pathname = usePathname();

  const [auth, setAuth] = useState<AuthState | null>(null);
  const [year, setYear] = useState<number>(() => new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([new Date().getFullYear()]);
  const [data, setData] = useState<MonthSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Discover available years from years endpoints
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    let canceled = false;

    const run = async () => {
      if (!auth?.token) {
        if (!canceled) setAvailableYears([currentYear]);
        return;
      }

      const yearsSet = new Set<number>([currentYear]);

      // Fetch from usage years
      try {
        const usageRes = await fetch(`${apiBaseUrl}/daily-usage/years`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (usageRes.ok) {
          const usagePayload = (await usageRes.json()) as { years: number[] };
          for (const y of usagePayload.years ?? []) yearsSet.add(y);
        }
      } catch { /* ignore */ }

      // Fetch from ev-usage years
      try {
        const evRes = await fetch(`${apiBaseUrl}/ev-usage/years`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (evRes.ok) {
          const evPayload = (await evRes.json()) as { years: number[] };
          for (const y of evPayload.years ?? []) yearsSet.add(y);
        }
      } catch { /* ignore */ }

      const sorted = Array.from(yearsSet).filter((y) => Number.isFinite(y)).sort((a, b) => b - a);
      if (!canceled) setAvailableYears(sorted.length ? sorted : [currentYear]);
    };

    void run();
    return () => { canceled = true; };
  }, [apiBaseUrl, auth?.token]);

  // When available years change, ensure selected year is valid
  useEffect(() => {
    if (availableYears.includes(year)) return;
    if (availableYears.length === 0) return;
    setYear(availableYears[0]);
  }, [availableYears, year]);

  // Fetch data from both APIs
  useEffect(() => {
    let canceled = false;

    const run = async () => {
      setError(null);
      setLoading(true);

      if (!auth?.token) {
        if (!canceled) setData([]);
        setLoading(false);
        return;
      }

      try {
        // Fetch usage summary and EV data in parallel
        const [usageRes, evRes] = await Promise.all([
          fetch(`${apiBaseUrl}/daily-usage/summary?year=${encodeURIComponent(String(year))}`, {
            headers: { Authorization: `Bearer ${auth.token}` },
          }),
          fetch(`${apiBaseUrl}/ev-usage?year=${encodeURIComponent(String(year))}`, {
            headers: { Authorization: `Bearer ${auth.token}` },
          }),
        ]);

        if (!usageRes.ok) {
          if (!canceled) setError("Failed to load usage data");
          setLoading(false);
          return;
        }

        const usagePayload = (await usageRes.json()) as {
          year: number;
          data: Array<{ month: number; totalKwh: number }>;
        };

        let evByMonth = new Map<number, number>();
        if (evRes.ok) {
          const evPayload = (await evRes.json()) as {
            year: number;
            data: Array<{ month: number; evKwh: number }>;
          };
          for (const d of evPayload.data) {
            evByMonth.set(d.month, d.evKwh);
          }
        }

        const merged: MonthSummary[] = usagePayload.data.map((m) => {
          const evKwh = evByMonth.get(m.month) ?? 0;
          const totalKwh = m.totalKwh;
          const nonEvKwh = Math.max(0, totalKwh - evKwh);
          return { month: m.month, totalKwh, evKwh, nonEvKwh };
        });

        if (!canceled) setData(merged);
      } catch {
        if (!canceled) setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    void run();
    return () => { canceled = true; };
  }, [apiBaseUrl, auth?.token, year]);

  const totals = useMemo(() => {
    const evTotal = data.reduce((sum, m) => sum + m.evKwh, 0);
    const nonEvTotal = data.reduce((sum, m) => sum + m.nonEvKwh, 0);
    const grandTotal = data.reduce((sum, m) => sum + m.totalKwh, 0);
    return { evTotal, nonEvTotal, grandTotal };
  }, [data]);

  const maxTotal = useMemo(() => {
    return data.reduce((max, m) => Math.max(max, m.totalKwh), 0);
  }, [data]);

  const monthsWithData = useMemo(() => data.filter((m) => m.totalKwh > 0).length, [data]);

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
            <Button asChild size="sm" variant={pathname.includes("/bill-ev") || pathname.includes("/rates") ? "outline" : "secondary"}>
              <Link href={`/${locale}`}>Calculator</Link>
            </Button>
            <Button asChild size="sm" variant={pathname.includes("/bill-ev") ? "secondary" : "outline"}>
              <Link href={`/${locale}/bill-ev`}>Bill EV</Link>
            </Button>
            <Button asChild size="sm" variant={pathname.includes("/rates") ? "secondary" : "outline"}>
              <Link href={`/${locale}/rates`}>Rates</Link>
            </Button>
            <Button asChild size="sm" variant={pathname.includes("/usage") ? "secondary" : "outline"}>
              <Link href={`/${locale}/usage`}>Usage</Link>
            </Button>
            <Button asChild size="sm" variant={pathname.includes("/ev") ? "secondary" : "outline"}>
              <Link href={`/${locale}/ev`}>EV</Link>
            </Button>
          </div>
        </div>

        <p className="text-sm sm:text-base text-emerald-600 mt-2">{t("common.description")}</p>
      </div>

      <div className="flex-1 w-full max-w-6xl mx-auto">
        <div className="w-full space-y-6">
          <Card>
            <CardHeader className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle>EV vs Non-EV Monthly Usage</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-muted-foreground">Year</div>
                  <select
                    value={String(year)}
                    onChange={(e) => {
                      const next = Number.parseInt(e.target.value, 10);
                      if (!Number.isFinite(next)) return;
                      setYear(next);
                    }}
                    className="flex h-9 w-28 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={String(y)}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  {!auth?.token ? (
                    <span>Login to view data</span>
                  ) : loading ? (
                    <span>Loading…</span>
                  ) : error ? (
                    <span className="text-red-600">{error}</span>
                  ) : monthsWithData > 0 ? (
                    <span className="text-emerald-600">Data from Usage &amp; EV tabs ✓</span>
                  ) : (
                    <span className="text-muted-foreground">No data for {year}</span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-muted-foreground">
                <div>
                  Total EV: <span className="font-medium text-foreground">{formatKwh(totals.evTotal)} kWh</span>
                </div>
                <div>
                  Total Non-EV: <span className="font-medium text-foreground">{formatKwh(totals.nonEvTotal)} kWh</span>
                </div>
                <div>
                  Total: <span className="font-medium text-foreground">{formatKwh(totals.grandTotal)} kWh</span>
                </div>
              </div>

              {monthsWithData > 0 && (
                <>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-sm bg-emerald-600" />
                      <span>Non-EV</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-sm bg-sky-500" />
                      <span>EV Charging</span>
                    </div>
                  </div>

                  <div className="w-full overflow-x-auto">
                    <div className="min-w-[760px]">
                      <div className="flex items-end gap-2 h-64">
                        {data.map((m) => {
                          const total = m.totalKwh;
                          const { nonEvPct, evPct } = getBarHeights(total, m.evKwh, maxTotal);
                          const nonEvHeight = Math.round(nonEvPct * 100);
                          const evHeight = Math.round(evPct * 100);
                          const label = monthLabel(m.month);
                          return (
                            <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                              <div className="w-full h-56 flex flex-col justify-end">
                                <div
                                  className="w-full bg-sky-500 rounded-t-sm"
                                  style={{ height: `${evHeight}%` }}
                                  aria-label={`${label} EV charging ${formatKwh(m.evKwh)} kWh`}
                                />
                                <div
                                  className="w-full bg-emerald-600 rounded-b-sm"
                                  style={{ height: `${nonEvHeight}%` }}
                                  aria-label={`${label} non-EV ${formatKwh(m.nonEvKwh)} kWh`}
                                />
                              </div>
                              <div className="text-xs text-muted-foreground">{label}</div>
                              <div className="text-xs font-medium">{formatKwh(total)} kWh</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Breakdown (kWh)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Total Usage</TableHead>
                      <TableHead>EV Charging</TableHead>
                      <TableHead>Non-EV</TableHead>
                      <TableHead className="text-right">EV %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                          {!auth?.token
                            ? "Login to view data"
                            : loading
                              ? "Loading…"
                              : "No data for " + year + ". Upload CSV in Usage tab and add EV sessions in EV tab first."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.map((m) => {
                        const evPct = m.totalKwh > 0 ? ((m.evKwh / m.totalKwh) * 100) : 0;
                        return (
                          <TableRow key={m.month}>
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
                  <p className="text-sm text-muted-foreground mb-2">Sign in to fetch data from the server</p>
                  <GoogleAuthButton locale={locale} />
                </div>
              )}

              {auth?.token && monthsWithData === 0 && !loading && (
                <div className="text-center py-4 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    No data found for {year}. Start by uploading your myTNB CSV in the{" "}
                    <Link href={`/${locale}/usage`} className="text-primary underline">Usage</Link> tab
                    and adding EV sessions in the{" "}
                    <Link href={`/${locale}/ev`} className="text-primary underline">EV</Link> tab.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

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
