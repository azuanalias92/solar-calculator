"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/useTranslation";
import { Coffee, Github, BatteryCharging, Zap } from "lucide-react";
import AppHeader from "@/components/AppHeader";

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(value);
}

export default function EvCalculatorPage() {
  const { t, locale } = useTranslation();
  const apiBaseUrl = useMemo(() => process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8787", []);

  const [batteryKwh, setBatteryKwh] = useState("60.22");
  const [currentPct, setCurrentPct] = useState("20");
  const [targetPct, setTargetPct] = useState("80");
  const [pricePerKwh, setPricePerKwh] = useState("1.20");
  const [drivingRange, setDrivingRange] = useState("");

  const bKwh = Number.parseFloat(batteryKwh) || 0;
  const cur = Number.parseFloat(currentPct) || 0;
  const tgt = Number.parseFloat(targetPct) || 0;
  const price = Number.parseFloat(pricePerKwh) || 0;
  const rangeKm = Number.parseFloat(drivingRange) || 0;

  const pctAdded = tgt - cur;
  const kwhNeeded = bKwh > 0 && pctAdded > 0 ? (bKwh * pctAdded) / 100 : 0;
  const cost = kwhNeeded > 0 && price > 0 ? kwhNeeded * price : 0;
  const costPerPct = pctAdded > 0 && cost > 0 ? cost / pctAdded : 0;
  const kmPerPct = rangeKm > 0 ? rangeKm / 100 : 0;

  const pctStart = Math.max(0, Math.min(100, cur));
  const pctEnd = Math.max(0, Math.min(100, tgt));
  const barAdded = Math.max(0, pctEnd - pctStart);
  const barRemaining = Math.max(0, 100 - pctEnd);

  return (
    <div className="flex flex-col min-h-screen p-2 sm:p-6 lg:p-8 bg-background">
      <AppHeader locale={locale} title={t("common.title")} description={t("common.description")} logoAlt={t("common.logoAlt")} />

      <div className="flex-1 w-full max-w-6xl mx-auto space-y-6">
        {/* Input Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BatteryCharging className="w-5 h-5 text-emerald-600" />
              {t("evCalc.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="batteryKwh">{t("evCalc.quickPresets")}</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: t("evCalc.presets.20to80"), bat: "60.22", cur: "20", tgt: "80", price: "1.20" },
                    { label: t("evCalc.presets.30to80"), bat: "60.22", cur: "30", tgt: "80", price: "1.20" },
                    { label: t("evCalc.presets.10to90"), bat: "60.22", cur: "10", tgt: "100", price: "1.20" },
                    { label: t("evCalc.presets.0to100"), bat: "60.22", cur: "0", tgt: "100", price: "1.20" },
                  ].map((p) => (
                    <Button
                      key={p.label}
                      variant="default"
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
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label htmlFor="batteryKwh">{t("evCalc.batteryCapacity")}</Label>
                <Input
                  id="batteryKwh"
                  type="number"
                  min="1"
                  step="1"
                  value={batteryKwh}
                  onChange={(e) => setBatteryKwh(e.target.value)}
                  placeholder={t("evCalc.batteryCapacityPlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currentPct">{t("evCalc.currentCharge")}</Label>
                <Input
                  id="currentPct"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={currentPct}
                  onChange={(e) => setCurrentPct(e.target.value)}
                  placeholder={t("evCalc.currentChargePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetPct">{t("evCalc.targetCharge")}</Label>
                <Input
                  id="targetPct"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={targetPct}
                  onChange={(e) => setTargetPct(e.target.value)}
                  placeholder={t("evCalc.targetChargePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">{t("evCalc.rate")}</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={pricePerKwh}
                  onChange={(e) => setPricePerKwh(e.target.value)}
                  placeholder={t("evCalc.ratePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="drivingRange">{t("evCalc.drivingRange")}</Label>
                <Input
                  id="drivingRange"
                  type="number"
                  min="0"
                  step="1"
                  value={drivingRange}
                  onChange={(e) => setDrivingRange(e.target.value)}
                  placeholder={t("evCalc.drivingRangePlaceholder")}
                />
              </div>
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
                  {t("evCalc.batteryVisual")}
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
                      className="absolute left-0 top-0 h-full bg-emerald-200 dark:bg-emerald-800 transition-all"
                      style={{ width: `${pctStart}%` }}
                      title={`${t("evCalc.currentTitle")} ${cur}%`}
                    />
                    {/* Added charge */}
                    {barAdded > 0 && (
                      <div
                        className="absolute top-0 h-full bg-emerald-600 transition-all"
                        style={{ left: `${pctStart}%`, width: `${barAdded}%` }}
                        title={`${t("evCalc.afterChargingTitle")} ${tgt}%`}
                      >
                        {/* Label inside the bar */}
                        {barAdded > 20 && <span className="absolute right-1 top-1/2 -translate-y-1/2 text-xs font-bold text-white drop-shadow-sm">{tgt}%</span>}
                      </div>
                    )}
                    {/* Current charge level marker */}
                    <div className="absolute top-0 h-full w-0.5 bg-amber-500 z-10" style={{ left: `${pctStart}%` }} />
                  </div>
                  {/* Legend */}
                  <div className="flex justify-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 rounded-sm bg-emerald-600" />
                      {t("evCalc.chargeAddedLegend")} ({barAdded.toFixed(0)}%)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 rounded-sm bg-emerald-200 dark:bg-emerald-800" />
                      {t("evCalc.existingLegend")} ({cur.toFixed(0)}%)
                    </span>
                    {barRemaining > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="inline-block w-3 h-3 rounded-sm bg-muted" />
                        {t("evCalc.availableLegend")} ({barRemaining.toFixed(0)}%)
                      </span>
                    )}
                  </div>
                  {/* kWh per percent indicator */}
                  <p className="text-center text-xs text-muted-foreground mt-2">
                    1% = {(bKwh / 100).toFixed(2)} kWh
                    {kmPerPct > 0 && <> = {(kmPerPct).toFixed(0)} km</>}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Cost Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="w-4 h-4 text-emerald-600" />
                  {t("evCalc.costBreakdown")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="text-sm text-muted-foreground">{t("evCalc.chargeAddedLabel")}</div>
                    <div className="text-2xl font-bold text-emerald-600">{pctAdded.toFixed(0)}%</div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="text-sm text-muted-foreground">{t("evCalc.energyNeeded")}</div>
                    <div className="text-2xl font-bold">{kwhNeeded.toFixed(2)} kWh</div>
                  </div>
                  <div className="p-4 rounded-lg bg-emerald-600/10 dark:bg-emerald-900/30 border border-emerald-600/20 dark:border-emerald-800/40">
                    <div className="text-sm text-muted-foreground">{t("evCalc.estimatedCost")}</div>
                    <div className="text-2xl font-bold text-emerald-600">{formatMoney(cost)}</div>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30">
                  <p className="text-sm text-muted-foreground">
                    {t("evCalc.chargingSummaryPrefix")} <strong>{bKwh} kWh</strong> {t("evCalc.chargingSummaryBattery")} <strong>{cur}%</strong> {t("evCalc.chargingSummaryTo")}{" "}
                    <strong>{tgt}%</strong> ({pctAdded.toFixed(0)}% {t("evCalc.chargingSummaryCharge")}) {t("evCalc.chargingSummaryAt")} <strong>{formatMoney(price)}/kWh</strong>{" "}
                    {t("evCalc.chargingSummaryCostsApprox")} <strong className="text-emerald-700 dark:text-emerald-400">{formatMoney(cost)}</strong>.
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
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
