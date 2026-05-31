"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAuthState, clearAuthState, type AuthState } from "@/lib/auth";
import { useTranslation } from "@/lib/useTranslation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import GoogleAuthButton from "@/components/GoogleAuthButton";
import { Coffee, Github, LogOut, Sun, Zap, Info } from "lucide-react";

interface SolarConfig {
  peakSunHours: number;
  panelWatts: number;
  systemEfficiency: number;
}

const TARIFF_TYPES = [
  { value: "TNB_DOMESTIC_TOU", label: "TNB Domestic TOU", desc: "Peak & Off-Peak rates" },
  { value: "TNB_DOMESTIC_AM", label: "TNB Domestic AM", desc: "Flat rate" },
] as const;

function loadTariff(): string {
  if (typeof window === "undefined") return "TNB_DOMESTIC_TOU";
  return window.localStorage.getItem("kirasolar.tariff") ?? "TNB_DOMESTIC_TOU";
}

function saveTariff(value: string) {
  try {
    window.localStorage.setItem("kirasolar.tariff", value);
    window.dispatchEvent(new CustomEvent("kirasolar:tariff", { detail: value }));
  } catch { /* ignore */ }
}

const DEFAULT_SOLAR: SolarConfig = {
  peakSunHours: 5,
  panelWatts: 300,
  systemEfficiency: 85,
};

type TariffRate = {
  id: string;
  tariff_type: string;
  effective_date: string;
  peak_energy: number;
  off_peak_energy: number;
  capacity_rate: number;
  network_rate: number;
  retail_charge_rm: number;
  afa_rate: number;
  efficiency_incentive_rate: number;
  service_tax_rate: number;
  kwtbb_rate: number;
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(value);
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(value);
}

function RateTable({ rate }: { rate: TariffRate }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Field</TableHead>
          <TableHead className="text-right">Value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>ID</TableCell>
          <TableCell className="text-right">{rate.id}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Tariff Type</TableCell>
          <TableCell className="text-right">{rate.tariff_type}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Effective Date</TableCell>
          <TableCell className="text-right">{rate.effective_date}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Peak Energy (RM/kWh)</TableCell>
          <TableCell className="text-right">{formatNumber(rate.peak_energy)}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Off-Peak Energy (RM/kWh)</TableCell>
          <TableCell className="text-right">{formatNumber(rate.off_peak_energy)}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Capacity Charge (RM/kWh)</TableCell>
          <TableCell className="text-right">{formatNumber(rate.capacity_rate)}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Network Charge (RM/kWh)</TableCell>
          <TableCell className="text-right">{formatNumber(rate.network_rate)}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Retail Charge</TableCell>
          <TableCell className="text-right">{formatMoney(rate.retail_charge_rm)}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>AFA Rate (RM/kWh)</TableCell>
          <TableCell className="text-right">{formatNumber(rate.afa_rate)}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Energy Efficiency Incentive (RM/kWh)</TableCell>
          <TableCell className="text-right">{formatNumber(rate.efficiency_incentive_rate)}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Service Tax Rate</TableCell>
          <TableCell className="text-right">{formatNumber(rate.service_tax_rate)}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>KWTBB Rate</TableCell>
          <TableCell className="text-right">{formatNumber(rate.kwtbb_rate)}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

export default function SettingsPage() {
  const { t, locale } = useTranslation();
  const pathname = usePathname();
  const apiBaseUrl = useMemo(() => process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8787", []);

  const [auth, setAuth] = useState<AuthState | null>(null);
  const [tariff, setTariff] = useState(loadTariff);

  // Solar config state (form values as strings for controlled inputs)
  const [touRate, setTouRate] = useState<TariffRate | null>(null);
  const [amRate, setAmRate] = useState<TariffRate | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [ratesAsOf, setRatesAsOf] = useState<string>(todayIsoDate());

  // Fetch tariff rates
  useEffect(() => {
    let canceled = false;

    const load = async () => {
      setRatesLoading(true);
      setRatesError(null);
      try {
        const [touRes, amRes] = await Promise.all([
          fetch(`${apiBaseUrl}/tariff-rates?tariffType=TNB_DOMESTIC_TOU&asOf=${encodeURIComponent(ratesAsOf)}`),
          fetch(`${apiBaseUrl}/tariff-rates?tariffType=TNB_DOMESTIC_AM&asOf=${encodeURIComponent(ratesAsOf)}`),
        ]);

        const touJson = touRes.ok ? ((await touRes.json()) as { data: TariffRate }) : null;
        const amJson = amRes.ok ? ((await amRes.json()) as { data: TariffRate }) : null;

        if (!canceled) {
          setTouRate(touJson?.data ?? null);
          setAmRate(amJson?.data ?? null);
        }
      } catch {
        if (!canceled) {
          setTouRate(null);
          setAmRate(null);
          setRatesError(`Unable to reach API at ${apiBaseUrl}.`);
        }
      } finally {
        if (!canceled) setRatesLoading(false);
      }
    };

    void load();
    return () => {
      canceled = true;
    };
  }, [apiBaseUrl, ratesAsOf]);
  const [solarConfig, setSolarConfig] = useState<SolarConfig>(DEFAULT_SOLAR);
  const [solarLoading, setSolarLoading] = useState(false);
  const [solarSaving, setSolarSaving] = useState(false);
  const [solarMessage, setSolarMessage] = useState<string | null>(null);
  const [solarLoaded, setSolarLoaded] = useState(false);

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

  // Fetch solar config from API
  useEffect(() => {
    let canceled = false;

    const run = async () => {
      if (!auth?.token) {
        if (!canceled) { setSolarConfig(DEFAULT_SOLAR); setSolarLoaded(true); }
        return;
      }

      setSolarLoading(true);
      try {
        const res = await fetch(`${apiBaseUrl}/calculator/state`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (res.ok) {
          const payload = (await res.json()) as {
            data: { items: unknown[]; config: SolarConfig };
          };
          if (payload.data?.config && !canceled) {
            setSolarConfig({
              peakSunHours: payload.data.config.peakSunHours ?? DEFAULT_SOLAR.peakSunHours,
              panelWatts: payload.data.config.panelWatts ?? DEFAULT_SOLAR.panelWatts,
              systemEfficiency: payload.data.config.systemEfficiency ?? DEFAULT_SOLAR.systemEfficiency,
            });
          }
        }
      } catch { /* ignore */ } finally {
        if (!canceled) { setSolarLoaded(true); setSolarLoading(false); }
      }
    };

    void run();
    return () => { canceled = true; };
  }, [apiBaseUrl, auth?.token]);

  const saveSolarConfig = async () => {
    if (!auth?.token) return;

    setSolarSaving(true);
    setSolarMessage(null);

    try {
      // Fetch current state first (to preserve items)
      const getRes = await fetch(`${apiBaseUrl}/calculator/state`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      const existing = getRes.ok
        ? (await getRes.json()) as { data: { items: unknown[]; config: SolarConfig } }
        : { data: { items: [], config: DEFAULT_SOLAR } };

      // PUT with existing items + updated config
      const res = await fetch(`${apiBaseUrl}/calculator/state`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({
          items: existing.data.items ?? [],
          config: solarConfig,
        }),
      });

      if (res.ok) {
        setSolarMessage("Solar configuration saved ✓");
        window.dispatchEvent(new CustomEvent("kirasolar:solar-config", { detail: solarConfig }));
      } else {
        setSolarMessage("Failed to save");
      }
    } catch {
      setSolarMessage("Failed to save");
    } finally {
      setSolarSaving(false);
      setTimeout(() => setSolarMessage(null), 2000);
    }
  };

  const handleTariffChange = useCallback((value: string) => {
    setTariff(value);
    saveTariff(value);
  }, []);

  const currentTariff = TARIFF_TYPES.find((t) => t.value === tariff);

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
            <LanguageSwitcher />
          </div>
        </div>

        <div className="flex justify-center mt-4">
          <div className="inline-flex gap-2 rounded-lg border border-input bg-background p-1">
            <Button asChild size="sm" variant={pathname.includes("/dashboard") ? "secondary" : "outline"}>
              <Link href={`/${locale}/dashboard`}>Dashboard</Link>
            </Button>
            <Button asChild size="sm" variant={pathname.includes("/dashboard") || pathname.includes("/ev-calculator") || pathname.includes("/settings") ? "outline" : "secondary"}>
              <Link href={`/${locale}`}>Solar Calculator</Link>
            </Button>
            <Button asChild size="sm" variant={pathname.includes("/ev-calculator") ? "secondary" : "outline"}>
              <Link href={`/${locale}/ev-calculator`}>EV Calculator</Link>
            </Button>
            <Button asChild size="sm" variant={pathname.includes("/settings") ? "secondary" : "outline"}>
              <Link href={`/${locale}/settings`}>Settings</Link>
            </Button>
          </div>
        </div>

        <p className="text-sm sm:text-base text-emerald-600 mt-2">{t("common.description")}</p>
      </div>

      <div className="flex-1 w-full max-w-6xl mx-auto space-y-6">
        {/* Account Section */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent>
            {!auth?.token ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <p className="text-sm text-muted-foreground">Sign in with Google to sync your data to the cloud</p>
                <GoogleAuthButton locale={locale} />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4 rounded-lg border p-4">
                  {auth.user.picture ? (
                    <Image
                      src={auth.user.picture}
                      alt={auth.user.name ?? "User"}
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-full border-2 border-emerald-200 dark:border-emerald-800"
                      unoptimized
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-lg font-medium text-emerald-700 dark:text-emerald-300">
                      {(auth.user.name ?? "U")[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{auth.user.name ?? "User"}</p>
                    <p className="text-sm text-muted-foreground truncate">{auth.user.email ?? ""}</p>
                    <p className="text-xs text-emerald-600 mt-0.5">
                      Syncing data to cloud ✓
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.google?.accounts?.id?.disableAutoSelect?.();
                      clearAuthState();
                    }}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-1.5" />
                    Sign Out
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Solar System Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="w-5 h-5 text-emerald-600" />
              Solar System Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!auth?.token ? (
              <div className="text-sm text-muted-foreground py-2">
                Sign in to configure your solar system settings and sync them to the cloud.
              </div>
            ) : solarLoading ? (
              <div className="text-sm text-muted-foreground py-2">Loading…</div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="peakSunHours">Peak Sun Hours</Label>
                    <Input
                      id="peakSunHours"
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="12"
                      value={String(solarConfig.peakSunHours)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) setSolarConfig((prev) => ({ ...prev, peakSunHours: val }));
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Avg daily peak sun hours at your location (e.g. Malaysia ~4.5–5.5)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="panelWatts">Panel Wattage (W)</Label>
                    <Input
                      id="panelWatts"
                      type="number"
                      step="10"
                      min="100"
                      max="1000"
                      value={String(solarConfig.panelWatts)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) setSolarConfig((prev) => ({ ...prev, panelWatts: val }));
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Wattage per solar panel (typical: 300–600W)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="systemEfficiency">System Efficiency (%)</Label>
                    <Input
                      id="systemEfficiency"
                      type="number"
                      step="0.1"
                      min="1"
                      max="100"
                      value={String(solarConfig.systemEfficiency)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) setSolarConfig((prev) => ({ ...prev, systemEfficiency: Math.min(100, Math.max(1, val)) }));
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Overall system efficiency including inverter losses (typical: 80–90%)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button onClick={() => void saveSolarConfig()} disabled={solarSaving}>
                    {solarSaving ? "Saving…" : "Save Solar Configuration"}
                  </Button>
                  {solarMessage && (
                    <span className={`text-sm ${solarMessage.includes("✓") ? "text-emerald-600" : "text-red-600"}`}>
                      {solarMessage}
                    </span>
                  )}
                </div>

                {solarLoaded && (
                  <div className="rounded-lg bg-muted p-3 text-sm">
                    <strong>Summary:</strong>{" "}
                    {solarConfig.panelWatts}W panels × {solarConfig.peakSunHours}h peak sun ×{" "}
                    {solarConfig.systemEfficiency}% efficiency =
                    {" "}{(solarConfig.panelWatts / 1000 * solarConfig.peakSunHours * solarConfig.systemEfficiency / 100).toFixed(2)} kWh/day per panel
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tariff Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-600" />
              Tariff Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select your home's TNB electricity tariff to use in bill calculations and the solar calculator.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              {TARIFF_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => handleTariffChange(t.value)}
                  className={`text-left rounded-lg border p-4 transition-all cursor-pointer ${
                    tariff === t.value
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-500"
                      : "border-input hover:border-emerald-200 hover:bg-accent"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{t.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                    </div>
                    {tariff === t.value && (
                      <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {currentTariff && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                Active: <strong>{currentTariff.label}</strong> — {currentTariff.desc}.
                View current tariff rates{" "}
                <a href="#tariff-rate-details" className="text-primary underline">below</a>.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tariff Rate Details */}
        <Card id="tariff-rate-details">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-emerald-600" />
              Tariff Rate Details
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div>As of</div>
              <Input
                type="date"
                value={ratesAsOf}
                onChange={(e) => setRatesAsOf(e.target.value)}
                className="w-44"
              />
              {ratesLoading ? <div>Loading…</div> : null}
              {ratesError ? <div className="text-destructive">{ratesError}</div> : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-base font-semibold mb-3">TNB Domestic ToU</h3>
              {touRate ? <RateTable rate={touRate} /> : <div className="text-sm text-muted-foreground">No rate found.</div>}
            </div>
            <div>
              <h3 className="text-base font-semibold mb-3">TNB Domestik Am</h3>
              {amRate ? <RateTable rate={amRate} /> : <div className="text-sm text-muted-foreground">No rate found.</div>}
            </div>
          </CardContent>
        </Card>
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
