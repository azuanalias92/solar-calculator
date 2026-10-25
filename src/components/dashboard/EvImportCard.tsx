"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AuthState } from "@/lib/auth";
import { sessionKey } from "@/lib/evSessions";
import { Car, Loader2, Zap } from "lucide-react";
import type { ChargingSession } from "./types";
import { formatKwh, formatMoney } from "./utils";

const PREVIEW_ROWS = 5;
// Placeholder values only; shows the column layout of an Easy Charging statement line.
const EXAMPLE_LINE = "123456789  Your Name  2026-06-05  00:06:39  2026-06-05  10:13:03  10H06M  61.0  17.57";

interface EvImportCardProps {
  auth: AuthState | null;
  t: (key: string) => string;
  rawInput: string;
  setRawInput: (v: string) => void;
  sessions: ChargingSession[];
  importedKeys: Set<string>;
  evMsg: string | null;
  handleParse: () => void | Promise<void>;
  handleSaveEv: () => Promise<void>;
  saving: boolean;
}

/** Imports EV charging sessions pasted from an Easy Charging PDF statement. */
export default function EvImportCard({
  auth,
  t,
  rawInput,
  setRawInput,
  sessions,
  importedKeys,
  evMsg,
  handleParse,
  handleSaveEv,
  saving,
}: EvImportCardProps) {
  // Only sessions that aren't already imported get saved.
  const newSessions = sessions.filter((s) => !importedKeys.has(sessionKey(s)));
  const sessionTotals = newSessions.reduce((acc, s) => ({ kwh: acc.kwh + s.kwh, cost: acc.cost + s.cost }), { kwh: 0, cost: 0 });
  // Sessions are saved under their own year, which may differ from the selected one.
  const sessionYears = Array.from(new Set(newSessions.map((s) => s.date.slice(0, 4)))).sort().join(", ");
  const alreadyImported = sessions.length - newSessions.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Car className="h-5 w-5 text-link" aria-hidden />
          {t("dashboard.evChargingImport")}
        </CardTitle>
        <CardDescription>{t("dashboard.pasteInstructions")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
      </CardContent>
      <CardFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button className="w-full sm:w-auto" variant={newSessions.length > 0 ? "outline" : "default"} onClick={() => void handleParse()} disabled={!rawInput.trim()}>
            {t("dashboard.parseSessions")}
          </Button>
          {newSessions.length > 0 && auth?.token ? (
            <Button className="w-full sm:w-auto" onClick={handleSaveEv} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Zap />}
              {saving ? t("dashboard.saving") : `${t("dashboard.saveTo")} ${sessionYears}`}
            </Button>
          ) : null}
      </CardFooter>
    </Card>
  );
}
