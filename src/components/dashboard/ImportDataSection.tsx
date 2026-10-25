"use client";

import type { AuthState } from "@/lib/auth";
import EvImportCard from "./EvImportCard";
import MyTnbImportCard from "./MyTnbImportCard";
import type { ChargingSession, DailyUsageItem } from "./types";

interface ImportDataSectionProps {
  auth: AuthState | null;
  t: (key: string) => string;
  locale: string;
  onImportUsage: (rows: DailyUsageItem[]) => Promise<boolean>;
  rawInput: string;
  setRawInput: (v: string) => void;
  sessions: ChargingSession[];
  importedKeys: Set<string>;
  countedKeys: Set<string>;
  evMsg: string | null;
  handleParse: () => void | Promise<void>;
  handleSaveEv: () => Promise<void>;
  saving: boolean;
}

/** "Import data" tab: myTNB daily usage and Easy Charging sessions, side by side on wide screens. */
export default function ImportDataSection({ auth, t, locale, onImportUsage, ...ev }: ImportDataSectionProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <MyTnbImportCard t={t} locale={locale} disabled={!auth?.token} onImport={onImportUsage} />
      <EvImportCard auth={auth} t={t} {...ev} />
    </div>
  );
}
