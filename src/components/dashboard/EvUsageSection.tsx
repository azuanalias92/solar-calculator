"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { AuthState } from "@/lib/auth";
import GoogleAuthButton from "@/components/GoogleAuthButton";
import { Loader2, Upload, Zap, Fuel } from "lucide-react";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import type { MonthSummary, ChargingSession } from "./types";
import { monthLabel, formatKwh, formatMoney } from "./utils";
import { sessionKey } from "@/lib/evSessions";
import { Badge } from "@/components/ui/badge";

const PREVIEW_ROWS = 5;
// Placeholder values only; shows the column layout of an Easy Charging statement line.
const EXAMPLE_LINE = "123456789  Your Name  2026-06-05  00:06:39  2026-06-05  10:13:03  10H06M  61.0  17.57";

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
  importedKeys: Set<string>;
  evMsg: string | null;
  handleParse: () => void | Promise<void>;
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
  importedKeys,
  evMsg,
  handleParse,
  handleSaveEv,
  saving,
}: EvUsageSectionProps) {
  // Only sessions that aren't already imported get saved.
  const newSessions = sessions.filter((s) => !importedKeys.has(sessionKey(s)));
  const sessionTotals = newSessions.reduce((acc, s) => ({ kwh: acc.kwh + s.kwh, cost: acc.cost + s.cost }), { kwh: 0, cost: 0 });
  // Sessions are saved under their own year, which may differ from the selected one.
  const sessionYears = Array.from(new Set(newSessions.map((s) => s.date.slice(0, 4)))).sort().join(", ");
  const alreadyImported = sessions.length - newSessions.length;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Fuel className="w-5 h-5 text-link" />
            {t("dashboard.evVsNonEv")} {selectedYear}
          </CardTitle>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary" size="sm" className="w-full sm:w-auto">
                <Upload />
                {t("evImport.trigger")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{t("dashboard.evChargingImport")}</DialogTitle>
                <DialogDescription>{t("dashboard.pasteInstructions")}</DialogDescription>
              </DialogHeader>

              <ol className="space-y-3">
                {[t("evImport.step1"), t("evImport.step2"), t("evImport.step3")].map((step, i) => (
                  <li key={step} className="flex gap-3 text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-xs text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="min-w-0 pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>

              <details className="group rounded-md border px-3 py-2 text-sm">
                <summary className="cursor-pointer select-none font-medium marker:text-muted-foreground">{t("evImport.helpTitle")}</summary>
                <div className="mt-2 space-y-2 text-xs text-muted-foreground sm:text-sm">
                  <p>
                    {t("evImport.copyTip")}{" "}
                    <a href="https://www.pdftotext.com" target="_blank" rel="noopener noreferrer" className="text-link underline underline-offset-4">
                      pdftotext.com
                    </a>
                  </p>
                  <p>{t("evImport.expectedFormat")}</p>
                  <pre className="overflow-x-auto rounded bg-muted p-2 font-mono text-[11px] text-foreground">{EXAMPLE_LINE}</pre>
                </div>
              </details>

              <Textarea
                aria-label={t("dashboard.evChargingImport")}
                placeholder={t("dashboard.pastePlaceholder")}
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                rows={6}
                className="font-mono text-xs"
              />

              {sessions.length > 0 ? (
                <div className="rounded-lg border">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2 text-sm">
                    <span className="font-medium">
                      {newSessions.length} {t("evImport.newSessions")}
                      {alreadyImported > 0 ? (
                        <span className="font-normal text-muted-foreground">
                          {" "}
                          · {alreadyImported} {t("evImport.alreadyImported")}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-muted-foreground">
                      {formatKwh(sessionTotals.kwh)} kWh · {formatMoney(sessionTotals.cost)}
                    </span>
                  </div>
                  <ul className="divide-y text-xs sm:text-sm">
                    {sessions.slice(0, PREVIEW_ROWS).map((s) => {
                      const imported = importedKeys.has(sessionKey(s));
                      return (
                        <li key={sessionKey(s)} className={`grid grid-cols-[1fr_auto_auto] items-center gap-3 px-3 py-1.5 ${imported ? "text-muted-foreground" : ""}`}>
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="truncate">
                              {s.date} <span className="text-muted-foreground">{s.startTime}</span>
                            </span>
                            {imported ? (
                              <Badge variant="secondary" className="shrink-0">
                                {t("evImport.importedBadge")}
                              </Badge>
                            ) : null}
                          </span>
                          <span className="text-right tabular-nums">{formatKwh(s.kwh)} kWh</span>
                          <span className="w-20 text-right tabular-nums text-muted-foreground">{formatMoney(s.cost)}</span>
                        </li>
                      );
                    })}
                  </ul>
                  {sessions.length > PREVIEW_ROWS ? (
                    <p className="border-t px-3 py-1.5 text-xs text-muted-foreground">
                      +{sessions.length - PREVIEW_ROWS} {t("evImport.more")}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {evMsg ? (
                <p className="text-sm text-muted-foreground" role="status">
                  {evMsg}
                </p>
              ) : null}

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant={newSessions.length > 0 ? "outline" : "default"} onClick={() => void handleParse()} disabled={!rawInput.trim()}>
                  {t("dashboard.parseSessions")}
                </Button>
                {newSessions.length > 0 && auth?.token ? (
                  <Button onClick={handleSaveEv} disabled={saving}>
                    {saving ? <Loader2 className="animate-spin" /> : <Zap />}
                    {saving ? t("dashboard.saving") : `${t("dashboard.saveTo")} ${sessionYears}`}
                  </Button>
                ) : null}
              </DialogFooter>
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
            <span className="text-destructive">{billEvError}</span>
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
