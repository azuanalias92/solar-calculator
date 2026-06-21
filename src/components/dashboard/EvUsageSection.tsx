"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { AuthState } from "@/lib/auth";
import GoogleAuthButton from "@/components/GoogleAuthButton";
import { Loader2, Upload, Car, Zap, Fuel } from "lucide-react";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import type { MonthSummary, ChargingSession } from "./types";
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
  rawInput: string;
  setRawInput: (v: string) => void;
  sessions: ChargingSession[];
  evMsg: string | null;
  handleParse: () => void;
  handleSaveEv: () => Promise<void>;
  saving: boolean;
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
  rawInput,
  setRawInput,
  sessions,
  evMsg,
  handleParse,
  handleSaveEv,
  saving,
}: EvUsageSectionProps) {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Fuel className="w-5 h-5 text-emerald-600" />
            {t("dashboard.evVsNonEv")} {selectedYear}
          </CardTitle>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary" size="sm">
                <Upload className="w-4 h-4 mr-1" />
                {t("dashboard.importPlus")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Car className="w-5 h-5 text-emerald-600" />
                  {t("dashboard.evChargingImport")}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <p className="text-sm text-muted-foreground">{t("dashboard.pasteInstructions")}</p>
                <details className="text-xs text-muted-foreground bg-muted/30 rounded-md p-3">
                  <summary className="cursor-pointer font-medium text-foreground text-sm mb-1">How to extract text from PDF</summary>
                  <ol className="list-decimal list-inside space-y-1 mt-2 text-xs sm:text-sm">
                    <li>Open your Easy Charging PDF</li>
                    <li>Copy all text from the PDF (<code className="bg-muted px-1 rounded">Ctrl+A</code> → <code className="bg-muted px-1 rounded">Ctrl+C</code>)</li>
                    <li>Paste it in the text area below</li>
                  </ol>
                  <p className="mt-2 text-xs sm:text-sm">
                    <strong>Tip:</strong> If copying doesn't work, use{" "}
                    <a href="https://www.pdftotext.com" target="_blank" rel="noopener noreferrer" className="underline">pdftotext.com</a>{" "}
                    or run <code className="bg-muted px-1 rounded break-all">pdftotext -layout charging.pdf output.txt</code> on desktop.
                  </p>
                  <p className="mt-2 text-xs sm:text-sm">
                    <strong>Expected format per line:</strong>
                  </p>
                  <pre className="bg-muted p-2 rounded mt-1 text-[10px] sm:text-xs overflow-x-auto whitespace-nowrap">
254902721  Azuan Alias  2026-06-05  00:06:39  2026-06-05  10:13:03  10H06M  61.0  17.57</pre>
                </details>
                <Textarea placeholder={t("dashboard.pastePlaceholder")} value={rawInput} onChange={(e) => setRawInput(e.target.value)} rows={6} className="font-mono text-sm" />
                <div className="flex gap-2">
                  <Button onClick={handleParse} disabled={!rawInput.trim()}>
                    <Upload className="w-4 h-4 mr-1" />
                    {t("dashboard.parseSessions")}
                  </Button>
                  {sessions.length > 0 && auth?.token && (
                    <Button onClick={handleSaveEv} variant="secondary" disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Zap className="w-4 h-4 mr-1" />}
                      {saving ? t("dashboard.saving") : `${t("dashboard.saveTo")} ${selectedYear}`}
                    </Button>
                  )}
                </div>
                {evMsg && <p className="text-sm text-foreground">{evMsg}</p>}
              </div>
            </DialogContent>
          </Dialog>
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
            <span className="text-red-600">{billEvError}</span>
          ) : monthsWithData > 0 ? null : (
            <span>
              {t("dashboard.noDataFor")} {selectedYear}
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
                  <circle cx="75" cy="75" r="60" fill="none" className="stroke-sky-500" strokeWidth="22"
                    strokeDasharray={`${evLen} ${circ}`}
                    transform="rotate(-90 75 75)"
                    strokeLinecap="round"
                  />
                )}
                {/* Non-EV arc */}
                {nonEvTotal > 0 && (
                  <circle cx="75" cy="75" r="60" fill="none" className="stroke-emerald-600" strokeWidth="22"
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
                  <span className="inline-block w-3 h-3 rounded-sm bg-sky-500" />
                  <strong>{formatKwh(evTotal)}</strong> kWh ({evPct}%)
                </span>
                <span className="flex items-center gap-1.5 text-sm">
                  <span className="inline-block w-3 h-3 rounded-sm bg-emerald-600" />
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
                  contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                  formatter={(value: unknown, name: unknown) => [
                    `${formatKwh(Number(value))} kWh`,
                    name === "evKwh" || name === "evCharging" ? t("dashboard.evCharging") : t("dashboard.nonEv"),
                  ]}
                />
                <Legend formatter={(value: unknown) => value === "evKwh" || value === "evCharging" ? t("dashboard.evCharging") : t("dashboard.nonEv")} />
                <Bar dataKey="evKwh" name="evCharging" stackId="a" fill="#0ea5e9" maxBarSize={32} />
                <Bar dataKey="nonEvKwh" name="nonEv" stackId="a" fill="#059669" maxBarSize={32} />
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
