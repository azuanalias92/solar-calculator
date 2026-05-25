"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { getAuthState, type AuthState } from "@/lib/auth";
import { useTranslation } from "@/lib/useTranslation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import GoogleAuthButton from "@/components/GoogleAuthButton";
import { Coffee, Github } from "lucide-react";

type MonthUsage = {
  month: number;
  evKwh: number;
  nonEvKwh: number;
};

function storageKey(year: number): string {
  return `kirasolar.bill-ev.v2.${year}`;
}

function dedupeYears(years: number[]): number[] {
  const unique = Array.from(new Set(years.filter((y) => Number.isFinite(y))));
  unique.sort((a, b) => b - a);
  return unique;
}

function getLocalYears(): number[] {
  if (typeof window === "undefined") return [];
  const prefix = "kirasolar.bill-ev.v2.";
  const years: number[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (!key) continue;
    if (!key.startsWith(prefix)) continue;
    const rawYear = key.slice(prefix.length);
    const parsed = Number.parseInt(rawYear, 10);
    if (!Number.isFinite(parsed)) continue;
    years.push(parsed);
  }
  return dedupeYears(years);
}

function emptyYearData(): MonthUsage[] {
  return Array.from({ length: 12 }, (_, idx) => ({ month: idx + 1, evKwh: 0, nonEvKwh: 0 }));
}

function clampNumber(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(value, 100000));
}

function parseNumberInput(value: string): number {
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) return 0;
  const parsed = Number.parseFloat(normalized);
  return clampNumber(parsed);
}

function formatKwh(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}

function monthLabel(month: number): string {
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return labels[month - 1] ?? String(month);
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
  const [availableYears, setAvailableYears] = useState<number[]>(() => [new Date().getFullYear()]);
  const [data, setData] = useState<MonthUsage[]>(() => emptyYearData());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const skipNextSaveRef = useRef(true);
  const saveTimerRef = useRef<number | null>(null);

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

  useEffect(() => {
    const currentYear = new Date().getFullYear();
    let canceled = false;

    const run = async () => {
      if (!auth?.token) {
        const years = dedupeYears([currentYear, ...getLocalYears()]);
        if (!canceled) setAvailableYears(years.length ? years : [currentYear]);
        return;
      }

      try {
        const res = await fetch(`${apiBaseUrl}/ev-usage/years`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (!res.ok) {
          const years = dedupeYears([currentYear]);
          if (!canceled) setAvailableYears(years);
          return;
        }
        const payload = (await res.json()) as { years: number[] };
        const years = dedupeYears([currentYear, ...(payload.years ?? [])]);
        if (!canceled) setAvailableYears(years.length ? years : [currentYear]);
      } catch {
        const years = dedupeYears([currentYear]);
        if (!canceled) setAvailableYears(years);
      }
    };

    void run();
    return () => {
      canceled = true;
    };
  }, [apiBaseUrl, auth?.token]);

  useEffect(() => {
    if (availableYears.includes(year)) return;
    if (availableYears.length === 0) return;
    setYear(availableYears[0]);
  }, [availableYears, year]);

  const loadLocal = (targetYear: number): MonthUsage[] => {
    const raw = window.localStorage.getItem(storageKey(targetYear));
    if (!raw) return emptyYearData();
    try {
      const parsed = JSON.parse(raw) as Array<Partial<MonthUsage>>;
      const merged = emptyYearData().map((m, idx) => {
        const entry = parsed[idx] ?? {};
        return {
          month: m.month,
          evKwh: clampNumber(Number(entry.evKwh ?? m.evKwh)),
          nonEvKwh: clampNumber(Number(entry.nonEvKwh ?? m.nonEvKwh)),
        };
      });
      return merged;
    } catch {
      return emptyYearData();
    }
  };

  const saveLocal = (targetYear: number, nextData: MonthUsage[]) => {
    window.localStorage.setItem(storageKey(targetYear), JSON.stringify(nextData));
  };

  useEffect(() => {
    let canceled = false;

    const run = async () => {
      setMessage(null);
      setLoading(true);
      skipNextSaveRef.current = true;

      if (!auth?.token) {
        const local = loadLocal(year);
        if (!canceled) setData(local);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${apiBaseUrl}/ev-usage?year=${encodeURIComponent(String(year))}`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (!res.ok) {
          const local = loadLocal(year);
          if (!canceled) setData(local);
          setLoading(false);
          return;
        }
        const payload = (await res.json()) as { year: number; data: Array<{ month: number; evKwh: number; nonEvKwh: number }> };
        const normalized = emptyYearData().map((m) => {
          const found = payload.data.find((d) => d.month === m.month);
          return {
            month: m.month,
            evKwh: clampNumber(Number(found?.evKwh ?? 0)),
            nonEvKwh: clampNumber(Number(found?.nonEvKwh ?? 0)),
          };
        });
        if (!canceled) setData(normalized);
        saveLocal(year, normalized);
      } finally {
        setLoading(false);
      }
    };

    void run();
    return () => {
      canceled = true;
    };
  }, [apiBaseUrl, auth?.token, year]);

  useEffect(() => {
    saveLocal(year, data);
  }, [data, year]);

  const saveRemote = async (targetYear: number, nextData: MonthUsage[]) => {
    if (!auth?.token) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${apiBaseUrl}/ev-usage?year=${encodeURIComponent(String(targetYear))}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ data: nextData }),
      });
      if (!res.ok) {
        setMessage("Failed to save");
        return;
      }
      const payload = (await res.json()) as { year: number; data: Array<{ month: number; evKwh: number; nonEvKwh: number }> };
      const normalized = emptyYearData().map((m) => {
        const found = payload.data.find((d) => d.month === m.month);
        return {
          month: m.month,
          evKwh: clampNumber(Number(found?.evKwh ?? 0)),
          nonEvKwh: clampNumber(Number(found?.nonEvKwh ?? 0)),
        };
      });
      setData(normalized);
      saveLocal(targetYear, normalized);
      setAvailableYears((prev) => dedupeYears([targetYear, ...prev]));
      setMessage("Saved");
      window.setTimeout(() => setMessage(null), 1200);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!auth?.token) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      void saveRemote(year, data);
    }, 800);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [auth?.token, data, year]);

  const totals = useMemo(() => {
    const evTotal = data.reduce((sum, m) => sum + m.evKwh, 0);
    const nonEvTotal = data.reduce((sum, m) => sum + m.nonEvKwh, 0);
    return { evTotal, nonEvTotal, grandTotal: evTotal + nonEvTotal };
  }, [data]);

  const maxTotal = useMemo(() => {
    return data.reduce((max, m) => Math.max(max, m.evKwh + m.nonEvKwh), 0);
  }, [data]);

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
                  <span>{auth?.token ? "Logged in" : "Login to sync to backend"}</span>
                  {loading ? <span>Loading…</span> : null}
                  {saving ? <span>Saving…</span> : null}
                  {message ? <span className="text-foreground">{message}</span> : null}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    disabled={!auth?.token || saving || loading}
                    onClick={() => void saveRemote(year, data)}
                  >
                    Save
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={saving || loading}
                    onClick={() => {
                      const cleared = emptyYearData();
                      setData(cleared);
                      window.localStorage.removeItem(storageKey(year));
                      if (auth?.token) void saveRemote(year, cleared);
                    }}
                  >
                    Reset
                  </Button>
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
                      const total = m.evKwh + m.nonEvKwh;
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Input (kWh)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>EV Charging (kWh)</TableHead>
                      <TableHead>Non-EV (kWh)</TableHead>
                      <TableHead className="text-right">Total (kWh)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((m, idx) => (
                      <TableRow key={m.month}>
                        <TableCell className="font-medium">{monthLabel(m.month)}</TableCell>
                        <TableCell>
                          <Input
                            inputMode="decimal"
                            value={String(m.evKwh)}
                            onChange={(e) => {
                              const next = parseNumberInput(e.target.value);
                              setData((prev) => {
                                const copy = [...prev];
                                copy[idx] = { ...copy[idx], evKwh: next };
                                return copy;
                              });
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            inputMode="decimal"
                            value={String(m.nonEvKwh)}
                            onChange={(e) => {
                              const next = parseNumberInput(e.target.value);
                              setData((prev) => {
                                const copy = [...prev];
                                copy[idx] = { ...copy[idx], nonEvKwh: next };
                                return copy;
                              });
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-right">{formatKwh(m.evKwh + m.nonEvKwh)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
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
