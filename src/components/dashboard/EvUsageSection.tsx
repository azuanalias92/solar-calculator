"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import type { AuthState } from "@/lib/auth";
import GoogleAuthButton from "@/components/GoogleAuthButton";
import { Loader2, Upload, Fuel } from "lucide-react";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import type { MonthSummary } from "./types";
import { monthLabel, formatKwh } from "./utils";

interface EvUsageSectionProps {
  auth: AuthState | null;
  t: (key: string) => string;
  locale: string;
  selectedYear: number;
  selectedMonth: number;
  billEvData: MonthSummary[];
  loadingBillEv: boolean;
  billEvError: string | null;
  billEvTotals: { evTotal: number; nonEvTotal: number; grandTotal: number };
  monthsWithData: number;
  onGoToImport: () => void;
}

export default function EvUsageSection({
  auth,
  t,
  locale,
  selectedYear,
  selectedMonth,
  billEvData,
  loadingBillEv,
  billEvError,
  billEvTotals,
  monthsWithData,
  onGoToImport,
}: EvUsageSectionProps) {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Fuel className="w-5 h-5 text-link" />
            {t("dashboard.evVsNonEv")} {selectedYear}
          </CardTitle>
        </div>
        <div className="text-sm text-muted-foreground">
          {!auth?.token ? (
            <span>{t("dashboard.loginToView")}</span>
          ) : loadingBillEv ? (
            <span>
              <Loader2 className="w-3 h-3 inline animate-spin mr-1" />
              {t("dashboard.loading")}
            </span>
          ) : billEvError ? (
            <span className="text-destructive">{billEvError}</span>
          ) : monthsWithData > 0 ? null : (
            <span className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
              {t("dashboard.noDataFor")} {selectedYear}
              <Button variant="outline" size="sm" onClick={onGoToImport}>
                <Upload />
                {t("dashboard.goToImport")}
              </Button>
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {(() => {
          const total = billEvTotals.grandTotal;
          const evTotal = billEvTotals.evTotal;
          const nonEvTotal = billEvTotals.nonEvTotal;
          if (total <= 0) return null;
          const circ = 2 * Math.PI * 55;
          const evLen = (evTotal / total) * circ;
          const evPct = ((evTotal / total) * 100).toFixed(1);
          const nonEvPct = ((nonEvTotal / total) * 100).toFixed(1);
          return (
            <div className="flex flex-col items-center py-2">
              <svg width="150" height="150" viewBox="0 0 150 150">
                {/* Background ring */}
                <circle cx="75" cy="75" r="60" fill="none" className="stroke-muted" strokeWidth="22" />
                {/* EV arc */}
                {evTotal > 0 && (
                  <circle cx="75" cy="75" r="60" fill="none" className="stroke-info" strokeWidth="22"
                    strokeDasharray={`${evLen} ${circ}`}
                    transform="rotate(-90 75 75)"
                    strokeLinecap="round"
                  />
                )}
                {/* Non-EV arc */}
                {nonEvTotal > 0 && (
                  <circle cx="75" cy="75" r="60" fill="none" className="stroke-primary" strokeWidth="22"
                    strokeDasharray={`${circ - evLen} ${circ}`}
                    strokeDashoffset={-evLen}
                    transform="rotate(-90 75 75)"
                    strokeLinecap="round"
                  />
                )}
                {/* Center total */}
                <text x="75" y="70" textAnchor="middle" className="fill-foreground" fontSize="22" fontWeight="bold">
                  {formatKwh(total)}
                </text>
                <text x="75" y="92" textAnchor="middle" className="fill-muted-foreground" fontSize="12">
                  kWh
                </text>
              </svg>
              <div className="flex gap-6 mt-2">
                <span className="flex items-center gap-1.5 text-sm">
                  <span className="inline-block w-3 h-3 rounded-sm bg-info" />
                  <strong>{formatKwh(evTotal)}</strong> kWh ({evPct}%)
                </span>
                <span className="flex items-center gap-1.5 text-sm">
                  <span className="inline-block w-3 h-3 rounded-sm bg-primary" />
                  <strong>{formatKwh(nonEvTotal)}</strong> kWh ({nonEvPct}%)
                </span>
              </div>
            </div>
          );
        })()}

        {monthsWithData > 0 && (
          <>
            <div className="w-full overflow-x-auto" style={{ height: 300 }}>
              <BarChart
                width={Math.max(billEvData.length * 40, 300)}
                height={300}
                data={billEvData}
                barGap={0}
                barCategoryGap={4}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={10} tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => monthLabel(v)} />
                <YAxis tickLine={false} axisLine={false} fontSize={10} tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => formatKwh(v)} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border-strong))", borderRadius: "6px", fontSize: "12px" }}
                  formatter={(value: unknown, name: unknown) => [
                    `${formatKwh(Number(value))} kWh`,
                    name === "evKwh" || name === "evCharging" ? t("dashboard.evCharging") : t("dashboard.nonEv"),
                  ]}
                />
                <Legend formatter={(value: unknown) => value === "evKwh" || value === "evCharging" ? t("dashboard.evCharging") : t("dashboard.nonEv")} />
                <Bar dataKey="evKwh" name="evCharging" stackId="a" fill="hsl(var(--info))" maxBarSize={32} />
                <Bar dataKey="nonEvKwh" name="nonEv" stackId="a" fill="hsl(var(--primary))" maxBarSize={32} />
              </BarChart>
            </div>
          </>
        )}

        <Accordion type="single" collapsible>
          <AccordionItem value="ev-table">
            <AccordionTrigger className="text-sm font-medium">{t("dashboard.totalUsage")}</AccordionTrigger>
            <AccordionContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("dashboard.month")}</TableHead>
                      <TableHead>{t("dashboard.totalUsage")}</TableHead>
                      <TableHead>{t("dashboard.evCharging")}</TableHead>
                      <TableHead>{t("dashboard.nonEv")}</TableHead>
                      <TableHead className="text-right">{t("dashboard.evPercent")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billEvData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                          {!auth?.token ? t("dashboard.loginToView") : loadingBillEv ? t("dashboard.loading") : `${t("dashboard.noDataFor")} ${selectedYear}.`}
                        </TableCell>
                      </TableRow>
                    ) : (
                      billEvData.map((m) => {
                        const evPct = m.totalKwh > 0 ? (m.evKwh / m.totalKwh) * 100 : 0;
                        return (
                          <TableRow key={m.month} className={m.month === selectedMonth ? "bg-muted/50" : ""}>
                          <TableCell className="font-medium">{monthLabel(m.month)}</TableCell>
                          <TableCell>{formatKwh(m.totalKwh)}</TableCell>
                          <TableCell>
                            <span>{formatKwh(m.evKwh)}</span>
                          </TableCell>
                          <TableCell>
                            <span>{formatKwh(m.nonEvKwh)}</span>
                          </TableCell>
                            <TableCell className="text-right">{evPct.toFixed(1)}%</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {!auth?.token && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-2">{t("dashboard.signInToView")}</p>
            <GoogleAuthButton locale={locale} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
