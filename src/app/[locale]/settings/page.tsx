"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import AppHeader from "@/components/AppHeader";

interface SolarConfig {
  peakSunHours: number;
  panelWatts: number;
  systemEfficiency: number;
}

const TARIFF_TYPES = [
  { value: "TNB_DOMESTIC_TOU", labelKey: "settings.tariffTnbDomesticTou", descKey: "settings.tariffTnbDomesticTouDesc" },
  { value: "TNB_DOMESTIC_AM", labelKey: "settings.tariffTnbDomesticAm", descKey: "settings.tariffTnbDomesticAmDesc" },
] as const;

function saveTariff(value: string) {
  try {
    window.localStorage.setItem("kirasolar.tariff", value);
    window.dispatchEvent(new CustomEvent("kirasolar:tariff", { detail: value }));
  } catch {
    /* ignore */
  }
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

function RateTable({ rate, t }: { rate: TariffRate; t: (key: string) => string }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("settings.rateField")}</TableHead>
          <TableHead className="text-right">{t("settings.rateValue")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>{t("settings.rateId")}</TableCell>
          <TableCell className="text-right">{rate.id}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>{t("settings.rateTariffType")}</TableCell>
          <TableCell className="text-right">{rate.tariff_type}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>{t("settings.rateEffectiveDate")}</TableCell>
          <TableCell className="text-right">{rate.effective_date}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>{t("settings.ratePeakEnergy")}</TableCell>
          <TableCell className="text-right">{formatNumber(rate.peak_energy)}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>{t("settings.rateOffPeakEnergy")}</TableCell>
          <TableCell className="text-right">{formatNumber(rate.off_peak_energy)}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>{t("settings.rateCapacityCharge")}</TableCell>
          <TableCell className="text-right">{formatNumber(rate.capacity_rate)}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>{t("settings.rateNetworkCharge")}</TableCell>
          <TableCell className="text-right">{formatNumber(rate.network_rate)}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>{t("settings.rateRetailCharge")}</TableCell>
          <TableCell className="text-right">{formatMoney(rate.retail_charge_rm)}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>{t("settings.rateAfaRate")}</TableCell>
          <TableCell className="text-right">{formatNumber(rate.afa_rate)}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>{t("settings.rateEfficiencyIncentive")}</TableCell>
          <TableCell className="text-right">{formatNumber(rate.efficiency_incentive_rate)}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>{t("settings.rateServiceTax")}</TableCell>
          <TableCell className="text-right">{formatNumber(rate.service_tax_rate)}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>{t("settings.rateKwtbbRate")}</TableCell>
          <TableCell className="text-right">{formatNumber(rate.kwtbb_rate)}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

export default function SettingsPage() {
  const { t, locale } = useTranslation();
  const apiBaseUrl = useMemo(() => process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8787", []);

  const [auth, setAuth] = useState<AuthState | null>(null);
  const [tariff, setTariff] = useState<string>("TNB_DOMESTIC_TOU");

  // Solar config state (form values as strings for controlled inputs)
  const [touRate, setTouRate] = useState<TariffRate | null>(null);
  const [amRate, setAmRate] = useState<TariffRate | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [ratesAsOf, setRatesAsOf] = useState<string>("");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("kirasolar.tariff");
      if (stored === "TNB_DOMESTIC_TOU" || stored === "TNB_DOMESTIC_AM") {
        setTariff(stored);
      }
    } catch {
      /* ignore */
    }
    setRatesAsOf(todayIsoDate());
  }, []);

  // Fetch tariff rates
  useEffect(() => {
    if (!ratesAsOf) return;
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
          setRatesError(t("settings.unableToReachApi") + ` ${apiBaseUrl}.`);
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
        if (!canceled) {
          setSolarConfig(DEFAULT_SOLAR);
          setSolarLoaded(true);
        }
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
      } catch {
        /* ignore */
      } finally {
        if (!canceled) {
          setSolarLoaded(true);
          setSolarLoading(false);
        }
      }
    };

    void run();
    return () => {
      canceled = true;
    };
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
      const existing = getRes.ok ? ((await getRes.json()) as { data: { items: unknown[]; config: SolarConfig } }) : { data: { items: [], config: DEFAULT_SOLAR } };

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
        setSolarMessage(t("settings.configSaved"));
        window.dispatchEvent(new CustomEvent("kirasolar:solar-config", { detail: solarConfig }));
      } else {
        setSolarMessage(t("settings.configSaveFailed"));
      }
    } catch {
      setSolarMessage(t("settings.configSaveFailed"));
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
    <div className="flex flex-col min-h-screen p-2 sm:p-6 lg:p-8 bg-background">
      <AppHeader locale={locale} title={t("common.title")} description={t("common.description")} logoAlt={t("common.logoAlt")} />

      <div className="flex-1 w-full max-w-6xl mx-auto space-y-6">
        {/* Account Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.account")}</CardTitle>
          </CardHeader>
          <CardContent>
            {!auth?.token ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <p className="text-sm text-muted-foreground">{t("settings.signInPrompt")}</p>
                <GoogleAuthButton locale={locale} />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4 rounded-lg border p-4">
                  {auth.user.picture ? (
                    <Image
                      src={auth.user.picture}
                      alt={auth.user.name ?? t("settings.defaultUsername")}
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-full border-2 border-emerald-200 dark:border-emerald-800"
                      unoptimized
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-lg font-medium text-emerald-700 dark:text-emerald-300">
                      {(auth.user.name ?? t("settings.defaultUsername"))[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{auth.user.name ?? t("settings.defaultUsername")}</p>
                    <p className="text-sm text-muted-foreground truncate">{auth.user.email ?? ""}</p>
                    <p className="text-xs text-emerald-600 mt-0.5">{t("settings.syncingStatus")}</p>
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
                    {t("settings.signOut")}
                  </Button>
                </div>
              </div>
            )}
            {/* Language & Theme */}
            <div className="border-t pt-4">
              <LanguageSwitcher />
            </div>
          </CardContent>
        </Card>

        {/* Solar System Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="w-5 h-5 text-emerald-600" />
              {t("settings.solarConfigTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!auth?.token ? (
              <div className="text-sm text-muted-foreground py-2">{t("settings.signInToConfigure")}</div>
            ) : solarLoading ? (
              <div className="text-sm text-muted-foreground py-2">{t("settings.loading")}</div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="peakSunHours">{t("settings.peakSunHours")}</Label>
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
                    <p className="text-xs text-muted-foreground">{t("settings.peakSunHoursDesc")}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="panelWatts">{t("settings.panelWatts")}</Label>
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
                    <p className="text-xs text-muted-foreground">{t("settings.panelWattsDesc")}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="systemEfficiency">{t("settings.systemEfficiency")}</Label>
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
                    <p className="text-xs text-muted-foreground">{t("settings.systemEfficiencyDesc")}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button onClick={() => void saveSolarConfig()} disabled={solarSaving}>
                    {solarSaving ? t("settings.saving") : t("settings.saveConfig")}
                  </Button>
                  {solarMessage && <span className={`text-sm ${solarMessage.includes("✓") ? "text-emerald-600" : "text-red-600"}`}>{solarMessage}</span>}
                </div>

                {solarLoaded && (
                  <div className="rounded-lg bg-muted p-3 text-sm">
                    <strong>{t("settings.summary")}</strong>{" "}
                    {`${solarConfig.panelWatts}W panels × ${solarConfig.peakSunHours}h peak sun × ${solarConfig.systemEfficiency}% efficiency = ${(
                      (solarConfig.panelWatts / 1000) *
                      solarConfig.peakSunHours *
                      (solarConfig.systemEfficiency / 100)
                    ).toFixed(2)} kWh/day per panel`}
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
              {t("settings.tariffTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("settings.tariffDescription")}</p>

            <div className="grid gap-3 sm:grid-cols-2">
              {TARIFF_TYPES.map((tt) => (
                <button
                  key={tt.value}
                  type="button"
                  onClick={() => handleTariffChange(tt.value)}
                  className={`text-left rounded-lg border p-4 transition-all cursor-pointer ${
                    tariff === tt.value
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-500"
                      : "border-input hover:border-emerald-200 hover:bg-accent"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{t(tt.labelKey)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t(tt.descKey)}</p>
                    </div>
                    {tariff === tt.value && (
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
                {t("settings.tariffActive")} <strong>{t(currentTariff.labelKey)}</strong> — {t(currentTariff.descKey)}. {t("settings.tariffViewRates")}{" "}
                <a href="#tariff-rate-details" className="text-primary underline">
                  {t("settings.below")}
                </a>
                .
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tariff Rate Details */}
        <Card id="tariff-rate-details">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-emerald-600" />
              {t("settings.tariffRateDetails")}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div>{t("settings.asOf")}</div>
              <Input type="date" value={ratesAsOf} onChange={(e) => setRatesAsOf(e.target.value)} className="w-44" />
              {ratesLoading ? <div>{t("settings.loading")}</div> : null}
              {ratesError ? <div className="text-destructive">{ratesError}</div> : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-base font-semibold mb-3">{t("settings.tnbDomesticToU")}</h3>
              {touRate ? <RateTable rate={touRate} t={t} /> : <div className="text-sm text-muted-foreground">{t("settings.noRateFound")}</div>}
            </div>
            <div>
              <h3 className="text-base font-semibold mb-3">{t("settings.tnbDomesticAm")}</h3>
              {amRate ? <RateTable rate={amRate} t={t} /> : <div className="text-sm text-muted-foreground">{t("settings.noRateFound")}</div>}
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
