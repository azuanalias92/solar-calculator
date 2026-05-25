"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/useTranslation";
import GoogleAuthButton from "@/components/GoogleAuthButton";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Coffee, Github } from "lucide-react";

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

export default function RatesPage() {
  const apiBaseUrl = useMemo(() => process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8787", []);
  const { t, locale } = useTranslation();
  const pathname = usePathname();

  const [asOf, setAsOf] = useState<string>(todayIsoDate());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touRate, setTouRate] = useState<TariffRate | null>(null);
  const [amRate, setAmRate] = useState<TariffRate | null>(null);

  useEffect(() => {
    let canceled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [touRes, amRes] = await Promise.all([
          fetch(`${apiBaseUrl}/tariff-rates?tariffType=TNB_DOMESTIC_TOU&asOf=${encodeURIComponent(asOf)}`),
          fetch(`${apiBaseUrl}/tariff-rates?tariffType=TNB_DOMESTIC_AM&asOf=${encodeURIComponent(asOf)}`),
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
          setError(`Unable to reach API at ${apiBaseUrl}. Start the backend or set NEXT_PUBLIC_API_BASE_URL.`);
        }
      } finally {
        if (!canceled) setLoading(false);
      }
    };

    void load();
    return () => {
      canceled = true;
    };
  }, [apiBaseUrl, asOf]);

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
            <Button asChild size="sm" variant={pathname.includes("/bill-ev") || pathname.includes("/rates") || pathname.includes("/usage") || pathname.includes("/ev") || pathname.includes("/settings") ? "outline" : "secondary"}>
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
            <Button asChild size="sm" variant={pathname.includes("/settings") ? "secondary" : "outline"}>
              <Link href={`/${locale}/settings`}>Settings</Link>
            </Button>
          </div>
        </div>

        <p className="text-sm sm:text-base text-emerald-600 mt-2">{t("common.description")}</p>
      </div>

      <div className="flex-1 w-full max-w-6xl mx-auto">
        <div className="w-full space-y-6">
          <Card>
            <CardHeader className="space-y-2">
              <CardTitle>Tariff Rate Preview</CardTitle>
              <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-muted-foreground">
                <div>As of</div>
                <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="w-44" />
                {loading ? <div>Loading…</div> : null}
                {error ? <div className="text-destructive">{error}</div> : null}
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>TNB Domestic ToU</CardTitle>
            </CardHeader>
            <CardContent>{touRate ? <RateTable rate={touRate} /> : <div className="text-sm text-muted-foreground">No rate found.</div>}</CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>TNB Domestik Am</CardTitle>
            </CardHeader>
            <CardContent>{amRate ? <RateTable rate={amRate} /> : <div className="text-sm text-muted-foreground">No rate found.</div>}</CardContent>
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
