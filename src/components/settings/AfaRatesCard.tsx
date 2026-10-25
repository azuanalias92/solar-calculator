"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ExternalLink, Fuel, RotateCcw } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type AfaRate = { month: string; rate: number; source: string; updatedAt: string };

const REBATE = "hsl(var(--chart-rebate))";
const SURCHARGE = "hsl(var(--chart-surcharge))";
const MYTNB_TARIFF_URL = "https://www.mytnb.com.my/tariff/index.html";

type Props = {
  t: (key: string) => string;
  locale: string;
  apiBaseUrl: string;
};

/** "+3.61" / "-4.99" / "0.00" sen/kWh from an RM/kWh rate. */
function formatSen(rate: number): string {
  const sen = rate * 100;
  return `${sen > 0 ? "+" : ""}${sen.toFixed(2)}`;
}

/** Monthly AFA rates from the API (synced daily from myTNB). No sign-in needed. */
export default function AfaRatesCard({ t, locale, apiBaseUrl }: Props) {
  const [rates, setRates] = useState<AfaRate[] | null>(null);
  const [currentMonth, setCurrentMonth] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let canceled = false;
    const run = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/afa-rates`);
        if (!res.ok) throw new Error(`afa-rates ${res.status}`);
        const payload = (await res.json()) as { data: AfaRate[]; currentMonth: string };
        if (!canceled) {
          setRates(payload.data ?? []);
          setCurrentMonth(payload.currentMonth ?? null);
          setFailed(false);
        }
      } catch {
        if (!canceled) setFailed(true);
      }
    };
    void run();
    return () => {
      canceled = true;
    };
  }, [apiBaseUrl, reloadKey]);

  const intlLocale = locale === "ms" ? "ms-MY" : "en-MY";
  const monthLabel = useCallback(
    (month: string, style: "short" | "long") =>
      new Intl.DateTimeFormat(intlLocale, { month: style, year: style === "short" ? "2-digit" : "numeric", timeZone: "UTC" }).format(
        new Date(`${month}-01T00:00:00Z`),
      ),
    [intlLocale],
  );

  const latest = rates?.length ? rates[rates.length - 1] : null;
  const lastSynced = useMemo(() => {
    if (!rates?.length) return null;
    const newest = rates.reduce((a, b) => (a.updatedAt > b.updatedAt ? a : b)).updatedAt;
    // D1 timestamps are UTC without a zone ("YYYY-MM-DD HH:MM:SS").
    return new Intl.DateTimeFormat(intlLocale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${newest.replace(" ", "T")}Z`));
  }, [rates, intlLocale]);
  // Two series so each bar is rounded only at its end away from zero.
  const chartData = useMemo(
    () =>
      (rates ?? []).map((r) => {
        const sen = Number((r.rate * 100).toFixed(2));
        return { month: r.month, rebate: sen < 0 ? sen : null, surcharge: sen > 0 ? sen : null };
      }),
    [rates],
  );

  const typeLabel = (rate: number) => (rate < 0 ? t("afa.rebate") : rate > 0 ? t("afa.surcharge") : t("afa.noChange"));

  return (
    <Card id="afa-rates">
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2">
          <Fuel className="h-5 w-5 text-link" aria-hidden />
          {t("afa.title")}
        </CardTitle>
        <CardDescription>{t("afa.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {failed ? (
          <div className="flex flex-col items-start gap-3 text-sm sm:flex-row sm:items-center">
            <span className="text-destructive">{t("afa.loadFailed")}</span>
            <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
              <RotateCcw />
              {t("afa.retry")}
            </Button>
          </div>
        ) : !rates ? (
          <div className="space-y-3" aria-busy>
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-[220px] w-full" />
          </div>
        ) : rates.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("afa.noData")}</p>
        ) : (
          <>
            {/* Headline: the latest announced month */}
            {latest ? (
              <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
                <div>
                  <p className="text-xs text-muted-foreground">{monthLabel(latest.month, "long")}</p>
                  <p className="text-3xl font-normal tracking-tight tabular-nums">
                    {formatSen(latest.rate)} <span className="text-base text-muted-foreground">{t("afa.unit")}</span>
                  </p>
                </div>
                <p className="flex items-center gap-1.5 pb-1 text-sm">
                  <span className="inline-block h-3 w-3 rounded-sm" style={{ background: latest.rate < 0 ? REBATE : SURCHARGE }} aria-hidden />
                  {typeLabel(latest.rate)}
                  {currentMonth && latest.month < currentMonth ? <span className="text-muted-foreground"> · {t("afa.notAnnounced")}</span> : null}
                </p>
              </div>
            ) : null}

            {/* Legend + chart: rebates below zero, surcharges above */}
            <div className="space-y-2">
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-sm" style={{ background: REBATE }} aria-hidden />
                  {t("afa.rebate")}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-sm" style={{ background: SURCHARGE }} aria-hidden />
                  {t("afa.surcharge")}
                </span>
              </div>
              <div className="h-[220px] w-full" role="img" aria-label={t("afa.chartLabel")}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 0, bottom: 0, left: 0 }} barCategoryGap="12%">
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      fontSize={10}
                      interval="preserveStartEnd"
                      minTickGap={8}
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(m: string) => monthLabel(m, "short")}
                    />
                    <YAxis tickLine={false} axisLine={false} fontSize={10} width={28} tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v: number) => `${v}`} />
                    <ReferenceLine y={0} stroke="hsl(var(--border-strong))" />
                    <Tooltip
                      separator=": "
                      cursor={{ fill: "hsl(var(--accent))", opacity: 0.6 }}
                      contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border-strong))", borderRadius: "6px", fontSize: "12px" }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                      labelFormatter={(m: unknown) => monthLabel(String(m), "long")}
                      formatter={(value: unknown) => [`${formatSen(Number(value) / 100)} ${t("afa.unit")}`, typeLabel(Number(value))]}
                    />
                    <Bar dataKey="rebate" stackId="afa" fill={REBATE} radius={[0, 0, 4, 4]} isAnimationActive={false} />
                    <Bar dataKey="surcharge" stackId="afa" fill={SURCHARGE} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Table view of every month, newest first */}
            <Accordion type="single" collapsible>
              <AccordionItem value="afa-table">
                <AccordionTrigger className="text-sm">{t("afa.allMonths")}</AccordionTrigger>
                <AccordionContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("afa.month")}</TableHead>
                        <TableHead className="text-right">{t("afa.unit")}</TableHead>
                        <TableHead className="text-right">{t("afa.type")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...rates].reverse().map((r) => (
                        <TableRow key={r.month} className={cn(r.month === currentMonth && "bg-muted/60")}>
                          <TableCell>
                            {monthLabel(r.month, "long")}
                            {r.month === currentMonth ? <span className="ml-2 text-xs text-muted-foreground">({t("afa.thisMonth")})</span> : null}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{formatSen(r.rate)}</TableCell>
                          <TableCell className="text-right">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: r.rate < 0 ? REBATE : r.rate > 0 ? SURCHARGE : "hsl(var(--muted-foreground))" }} aria-hidden />
                              {typeLabel(r.rate)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="space-y-1 text-xs text-muted-foreground">
              <p>{t("afa.exemptionNote")}</p>
              <p className="flex flex-wrap items-center gap-x-1">
                {t("afa.source")}
                {lastSynced ? ` · ${t("afa.lastUpdated")} ${lastSynced}` : ""} ·
                <a href={MYTNB_TARIFF_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-link underline-offset-4 hover:underline">
                  myTNB
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
