"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/useTranslation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import GoogleAuthButton from "@/components/GoogleAuthButton";
import { Coffee, Github, BatteryCharging, Zap } from "lucide-react";

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(value);
}

export default function EvCalculatorPage() {
  const { t, locale } = useTranslation();
  const pathname = usePathname();
  const apiBaseUrl = useMemo(() => process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8787", []);

  const [batteryKwh, setBatteryKwh] = useState("60");
  const [currentPct, setCurrentPct] = useState("37");
  const [targetPct, setTargetPct] = useState("80");
  const [pricePerKwh, setPricePerKwh] = useState("1.30");
  const [rateName, setRateName] = useState("Easy Charging");

  const bKwh = Number.parseFloat(batteryKwh) || 0;
  const cur = Number.parseFloat(currentPct) || 0;
  const tgt = Number.parseFloat(targetPct) || 0;
  const price = Number.parseFloat(pricePerKwh) || 0;

  const pctAdded = tgt - cur;
  const kwhNeeded = bKwh > 0 && pctAdded > 0 ? (bKwh * pctAdded) / 100 : 0;
  const cost = kwhNeeded > 0 && price > 0 ? kwhNeeded * price : 0;
  const costPerPct = pctAdded > 0 && cost > 0 ? cost / pctAdded : 0;

  const pctStart = Math.max(0, Math.min(100, cur));
  const pctEnd = Math.max(0, Math.min(100, tgt));
  const barAdded = Math.max(0, pctEnd - pctStart);
  const barRemaining = Math.max(0, 100 - pctEnd);

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
            <Button asChild size="sm" variant={pathname.includes("/bill-ev") || pathname.includes("/usage") || pathname.includes("/ev") || pathname.includes("/ev-calculator") || pathname.includes("/settings") ? "outline" : "secondary"}>
              <Link href={`/${locale}`}>Calculator</Link>
            </Button>
            <Button asChild size="sm" variant={pathname.includes("/bill-ev") ? "secondary" : "outline"}>
              <Link href={`/${locale}/bill-ev`}>Bill EV</Link>
            </Button>
            <Button asChild size="sm" variant={pathname.includes("/usage") ? "secondary" : "outline"}>
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
        {/* Input Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BatteryCharging className="w-5 h-5 text-emerald-600" />
              EV Charging Cost Calculator
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="batteryKwh">Battery Capacity (kWh)</Label>
                <Input
                  id="batteryKwh"
                  type="number"
                  min="1"
                  step="1"
                  value={batteryKwh}
                  onChange={(e) => setBatteryKwh(e.target.value)}
                  placeholder="e.g. 60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currentPct">Current Charge (%)</Label>
                <Input
                  id="currentPct"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={currentPct}
                  onChange={(e) => setCurrentPct(e.target.value)}
                  placeholder="e.g. 37"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetPct">Target Charge (%)</Label>
                <Input
                  id="targetPct"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={targetPct}
                  onChange={(e) => setTargetPct(e.target.value)}
                  placeholder="e.g. 80"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Rate (RM/kWh)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={pricePerKwh}
                  onChange={(e) => setPricePerKwh(e.target.value)}
                  placeholder="e.g. 1.30"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Label htmlFor="rateName" className="text-sm whitespace-nowrap">Rate Name:</Label>
              <Input
                id="rateName"
                value={rateName}
                onChange={(e) => setRateName(e.target.value)}
                className="max-w-[200px]"
                placeholder="e.g. Easy Charging"
              />
            </div>
          </CardContent>
        </Card>

        {/* Results Card */}
        {kwhNeeded > 0 && (
          <>
            {/* Battery Visual */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="w-4 h-4 text-emerald-600" />
                  Battery Visual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full max-w-md mx-auto">
                  {/* Battery shape */}
                  <div className="relative w-full h-14 sm:h-16 rounded-lg border-2 border-foreground overflow-hidden">
                    {/* Battery terminal */}
                    <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-2 h-5 rounded-r border-2 border-foreground border-l-0 bg-background" />
                    {/* Current charge */}
                    <div
                      className="absolute left-0 top-0 h-full bg-emerald-200 transition-all"
                      style={{ width: `${pctStart}%` }}
                      title={`Current: ${cur}%`}
                    />
                    {/* Added charge */}
                    {barAdded > 0 && (
                      <div
                        className="absolute left-0 top-0 h-full bg-emerald-600 transition-all"
                        style={{ width: `${pctEnd}%` }}
                        title={`After charging: ${tgt}%`}
                      >
                        {/* Label inside the bar */}
                        {pctEnd > 20 && (
                          <span className="absolute right-1 top-1/2 -translate-y-1/2 text-xs font-bold text-white drop-shadow-sm">
                            {tgt}%
                          </span>
                        )}
                      </div>
                    )}
                    {/* Current charge level marker */}
                    <div
                      className="absolute top-0 h-full w-0.5 bg-amber-500 z-10"
                      style={{ left: `${pctStart}%` }}
                    />
                  </div>
                  {/* Legend */}
                  <div className="flex justify-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 rounded-sm bg-emerald-600" />
                      Charge added ({barAdded.toFixed(0)}%)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 rounded-sm bg-emerald-200" />
                      Existing ({cur.toFixed(0)}%)
                    </span>
                    {barRemaining > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="inline-block w-3 h-3 rounded-sm bg-muted" />
                        Available ({barRemaining.toFixed(0)}%)
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cost Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="w-4 h-4 text-emerald-600" />
                  Cost Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="text-sm text-muted-foreground">Charge Added</div>
                    <div className="text-2xl font-bold text-emerald-600">{pctAdded.toFixed(0)}%</div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="text-sm text-muted-foreground">Energy Needed</div>
                    <div className="text-2xl font-bold">{kwhNeeded.toFixed(2)} kWh</div>
                  </div>
                  <div className="p-4 rounded-lg bg-emerald-600/10 border border-emerald-600/20">
                    <div className="text-sm text-muted-foreground">Estimated Cost</div>
                    <div className="text-2xl font-bold text-emerald-600">{formatMoney(cost)}</div>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30">
                  <p className="text-sm text-muted-foreground">
                    Charging <strong>{bKwh} kWh</strong> battery from{" "}
                    <strong>{cur}%</strong> to <strong>{tgt}%</strong> ({pctAdded.toFixed(0)}% charge) at{" "}
                    <strong>{formatMoney(price)}/kWh</strong> ({rateName}) costs approx{" "}
                    <strong className="text-emerald-700 dark:text-emerald-400">{formatMoney(cost)}</strong>.
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Quick Presets */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Presets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "20→80% (60kWh)", bat: "60", cur: "20", tgt: "80", price: "1.30" },
                { label: "30→80% (60kWh)", bat: "60", cur: "30", tgt: "80", price: "1.30" },
                { label: "10→90% (40kWh)", bat: "40", cur: "10", tgt: "90", price: "1.30" },
                { label: "0→100% (60kWh)", bat: "60", cur: "0", tgt: "100", price: "1.30" },
              ].map((p) => (
                <Button
                  key={p.label}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setBatteryKwh(p.bat);
                    setCurrentPct(p.cur);
                    setTargetPct(p.tgt);
                    setPricePerKwh(p.price);
                  }}
                >
                  {p.label}
                </Button>
              ))}
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
