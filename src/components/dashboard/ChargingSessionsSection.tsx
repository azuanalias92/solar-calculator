"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ChargingSession } from "./types";
import { formatKwh, formatMoney } from "./utils";
import { Car } from "lucide-react";

interface ChargingSessionsSectionProps {
  t: (key: string) => string;
  sessions: ChargingSession[];
  sessionTotals: { kwh: number; cost: number };
}

export default function ChargingSessionsSection({
  t,
  sessions,
  sessionTotals,
}: ChargingSessionsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Car className="w-4 h-4 text-emerald-600" />
          {t("dashboard.chargingSessions")} ({sessions.length})
        </CardTitle>
        <div className="flex gap-4 text-sm">
          <span>
            {t("dashboard.total")}:{" "}
            <strong>
              {formatKwh(sessionTotals.kwh)} {t("dashboard.kwh")}
            </strong>
          </span>
          <span>
            {t("dashboard.cost")}: <strong>{formatMoney(sessionTotals.cost)}</strong>
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-2 sm:p-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("dashboard.date")}</TableHead>
                <TableHead>{t("dashboard.start")}</TableHead>
                <TableHead>{t("dashboard.end")}</TableHead>
                <TableHead>{t("dashboard.duration")}</TableHead>
                <TableHead className="text-right">{t("dashboard.kwh")}</TableHead>
                <TableHead className="text-right">{t("dashboard.costRm")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{s.date}</TableCell>
                  <TableCell>{s.startTime}</TableCell>
                  <TableCell>{s.endTime}</TableCell>
                  <TableCell>{s.duration}</TableCell>
                  <TableCell className="text-right">{s.kwh.toFixed(1)}</TableCell>
                  <TableCell className="text-right">{s.cost.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
