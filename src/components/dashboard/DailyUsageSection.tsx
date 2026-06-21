"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import type { AuthState } from "@/lib/auth";
import { BarChart3, Loader2, Upload } from "lucide-react";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import type { DailyUsageItem, DailyUsageSummaryItem } from "./types";
import { monthLabel, formatKwh, formatMoney, formatDisplayDate, getDay } from "./utils";

interface DailyUsageSectionProps {
  auth: AuthState | null;
  t: (key: string) => string;
  selectedYear: number;
  selectedMonth: number;
  loadingDaily: boolean;
  loadingSummary: boolean;
  uploading: boolean;
  usageMsg: string | null;
  dailyData: DailyUsageItem[];
  summaryData: DailyUsageSummaryItem[];
  dailyTotals: { peak: number; offPeak: number; total: number };
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export default function DailyUsageSection({
  auth,
  t,
  selectedYear,
  selectedMonth,
  loadingDaily,
  loadingSummary,
  uploading,
  usageMsg,
  dailyData,
  summaryData,
  dailyTotals,
  fileInputRef,
  handleFileUpload,
}: DailyUsageSectionProps) {
  const maxDailyTotal = dailyData.reduce((max, d) => Math.max(max, d.peakKwh + d.offPeakKwh), 0);

  return (
    <>
      {/* ════════════════════════ SECTION 1: Daily Energy Usage ════════════════════════ */}
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              {t("dashboard.dailyEnergyUsage")} For {monthLabel(selectedMonth)} {selectedYear}
            </CardTitle>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm text-muted-foreground">
                {!auth?.token ? t("dashboard.loginToView") : ""}
                {loadingDaily ? <Loader2 className="w-3 h-3 inline animate-spin ml-1" /> : null}
                {usageMsg ? <span className="text-foreground ml-2">{usageMsg}</span> : null}
              </span>
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
              <Button variant="secondary" size="sm" disabled={!auth?.token || uploading} onClick={() => fileInputRef.current?.click()}>
                {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                {t("dashboard.uploadCsv")}
              </Button>
            </div>
          </div>
          {auth?.token && (
            <div className="flex flex-wrap gap-4 text-sm pt-1">
              <div className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-sm bg-amber-500" />
                {t("dashboard.peak")}:{" "}
                <strong>
                {formatKwh(dailyTotals.peak)} {t("dashboard.kwh")}
                </strong>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-sm bg-emerald-600" />
                {t("dashboard.offPeak")}:{" "}
                <strong>
                {formatKwh(dailyTotals.offPeak)} {t("dashboard.kwh")}
                </strong>
              </div>
              <div>
                {t("dashboard.total")}:{" "}
                <strong>
                  {formatKwh(dailyTotals.total)} {t("dashboard.kwh")}
                </strong>
              </div>
            </div>
          )}
        </CardHeader>
        {auth?.token && (
          <CardContent className="space-y-6">
            {/* ── Bar chart ── */}
            {dailyData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">{loadingDaily ? t("dashboard.loading") : t("dashboard.noDataThisMonth")}</p>
            ) : (
              <div className="w-full overflow-x-auto" style={{ height: 300 }}>
                <BarChart
                  width={Math.max(dailyData.length * 40, 300)}
                  height={300}
                  data={dailyData.map((d) => ({ ...d, day: getDay(d.date) }))}
                  barGap={0}
                  barCategoryGap={4}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={10} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tickLine={false} axisLine={false} fontSize={10} tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => formatKwh(v)} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                    formatter={(value: unknown, name: unknown) => [
                      `${formatKwh(Number(value))} kWh`,
                      name === "peakKwh" ? t("dashboard.peak") : t("dashboard.offPeak"),
                    ]}
                  />
                  <Legend
                    formatter={(value: unknown) =>
                      value === "peakKwh" ? t("dashboard.peak") : t("dashboard.offPeak")
                    }
                  />
                  <Bar dataKey="peakKwh" name="peakKwh" stackId="a" fill="#f59e0b" maxBarSize={32} />
                  <Bar dataKey="offPeakKwh" name="offPeakKwh" stackId="a" fill="#059669" maxBarSize={32} />
                </BarChart>
              </div>
            )}

            {/* ── Daily breakdown table ── */}
            {dailyData.length > 0 && (
              <Accordion type="single" collapsible>
                <AccordionItem value="daily-table">
                  <AccordionTrigger className="text-sm font-medium">{t("dashboard.dailyBreakdown")}</AccordionTrigger>
                  <AccordionContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("dashboard.date")}</TableHead>
                            <TableHead className="text-right">{t("dashboard.peakKwh")}</TableHead>
                            <TableHead className="text-right">{t("dashboard.offPeakKwh")}</TableHead>
                            <TableHead className="text-right">{t("dashboard.totalKwh")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dailyData.map((d) => (
                            <TableRow key={d.date}>
                              <TableCell className="font-medium">{formatDisplayDate(d.date)}</TableCell>
                              <TableCell className="text-right">{formatKwh(d.peakKwh)}</TableCell>
                              <TableCell className="text-right">{formatKwh(d.offPeakKwh)}</TableCell>
                              <TableCell className="text-right font-medium">{formatKwh(d.peakKwh + d.offPeakKwh)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </CardContent>
        )}
      </Card>

      {auth?.token && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              {t("dashboard.monthlyBillSummary")} For {selectedYear}
            </CardTitle>
            {summaryData.length > 0 && (
              <div className="flex flex-wrap gap-4 text-sm">
                <span>
                  {t("dashboard.total")}:{" "}
                  <strong>
                    {formatKwh(summaryData.reduce((s, m) => s + m.totalKwh, 0))} {t("dashboard.kwh")}
                  </strong>
                </span>
                <span>
                  {t("dashboard.estBill")}:{" "}
                  <strong>
                    {formatMoney(summaryData.reduce((s, m) => s + (m.billAmount ?? 0), 0))}
                  </strong>
                </span>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {loadingSummary ? (
              <p className="text-center text-muted-foreground py-4">{t("dashboard.loading")}</p>
            ) : summaryData.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">{t("dashboard.noDataYet")}</p>
            ) : (
              <>
                {/* ── Monthly bar chart ── */}
                <div className="w-full overflow-x-auto" style={{ height: 300 }}>
                  <BarChart
                    width={Math.max(summaryData.length * 40, 300)}
                    height={300}
                    data={summaryData}
                    barGap={0}
                    barCategoryGap={4}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={10} tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => monthLabel(v)} />
                    <YAxis tickLine={false} axisLine={false} fontSize={10} tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => formatKwh(v)} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                      formatter={(value: unknown, name: unknown) => [
                        `${formatKwh(Number(value))} kWh`,
                        name === "peakKwh" ? t("dashboard.peak") : t("dashboard.offPeak"),
                      ]}
                    />
                    <Legend formatter={(value: unknown) => value === "peakKwh" ? t("dashboard.peak") : t("dashboard.offPeak")} />
                    <Bar dataKey="peakKwh" name="peakKwh" stackId="a" fill="#f59e0b" maxBarSize={32} />
                    <Bar dataKey="offPeakKwh" name="offPeakKwh" stackId="a" fill="#059669" maxBarSize={32} />
                  </BarChart>
                </div>
                {/* ── Monthly bill table ── */}
                <Accordion type="single" collapsible>
                  <AccordionItem value="monthly-table">
                    <AccordionTrigger className="text-sm font-medium">{t("dashboard.monthlyBreakdownKwh")}</AccordionTrigger>
                    <AccordionContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t("dashboard.month")}</TableHead>
                              <TableHead className="text-right">{t("dashboard.peakKwh")}</TableHead>
                              <TableHead className="text-right">{t("dashboard.offPeakKwh")}</TableHead>
                              <TableHead className="text-right">{t("dashboard.totalKwh")}</TableHead>
                              <TableHead className="text-right">{t("dashboard.estBill")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {summaryData.map((s) => (
                              <TableRow key={s.month} className={s.month === selectedMonth ? "bg-muted/50" : ""}>
                                <TableCell className="font-medium">{monthLabel(s.month)}</TableCell>
                                <TableCell className="text-right">{formatKwh(s.peakKwh)}</TableCell>
                                <TableCell className="text-right">{formatKwh(s.offPeakKwh)}</TableCell>
                                <TableCell className="text-right font-medium">{formatKwh(s.totalKwh)}</TableCell>
                                <TableCell className="text-right">{s.billAmount != null ? formatMoney(s.billAmount) : "—"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
