"use client";

import { useId, useState, type DragEvent } from "react";
import { ExternalLink, FileText, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { mergeUsageRows, parseTnbCsv, type ParsedCsv } from "@/lib/tnbCsv";
import type { DailyUsageItem } from "./types";

export const MYTNB_SMART_LIVING_URL = "https://smartliving.myaccount.mytnb.com.my/dashboard";

type ParsedFile = ParsedCsv & { id: string; name: string };

type Props = {
  t: (key: string) => string;
  locale: string;
  disabled?: boolean;
  /** Saves the rows; resolves to true on success. */
  onImport: (rows: DailyUsageItem[]) => Promise<boolean>;
  triggerClassName?: string;
};

function formatRange(rows: DailyUsageItem[], locale: string): string {
  const fmt = new Intl.DateTimeFormat(locale === "ms" ? "ms-MY" : "en-MY", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const first = fmt.format(new Date(`${rows[0].date}T00:00:00Z`));
  const last = fmt.format(new Date(`${rows[rows.length - 1].date}T00:00:00Z`));
  return first === last ? first : `${first} – ${last}`;
}

export default function UsageImportDialog({ t, locale, disabled, onImport, triggerClassName }: Props) {
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [failed, setFailed] = useState(false);

  const rows = mergeUsageRows(...files.filter((f) => !f.error).map((f) => f.rows));

  const addFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    setFailed(false);
    const parsed = await Promise.all(
      Array.from(list).map(async (file): Promise<ParsedFile> => {
        const id = `${file.name}-${file.size}-${file.lastModified}`;
        if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") return { id, name: file.name, rows: [], skipped: 0, error: "noValidRows" };
        try {
          return { id, name: file.name, ...parseTnbCsv(await file.text()) };
        } catch {
          return { id, name: file.name, rows: [], skipped: 0, error: "noValidRows" };
        }
      }),
    );
    // Re-adding the same file replaces it instead of listing it twice.
    setFiles((prev) => [...prev.filter((f) => !parsed.some((p) => p.id === f.id)), ...parsed]);
  };

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragging(false);
    void addFiles(e.dataTransfer.files);
  };

  const submit = async () => {
    if (rows.length === 0) return;
    setImporting(true);
    setFailed(false);
    const ok = await onImport(rows);
    setImporting(false);
    if (ok) {
      setFiles([]);
      setOpen(false);
    } else {
      setFailed(true);
    }
  };

  const errorText: Record<NonNullable<ParsedCsv["error"]>, string> = {
    tooLarge: t("dashboard.csvTooLarge"),
    empty: t("dashboard.csvEmpty"),
    noValidRows: t("import.fileNotRecognised"),
  };

  const steps = [t("import.step1"), t("import.step2"), t("import.step3"), t("import.step4")];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (importing) return;
        setOpen(next);
        if (!next) {
          setFiles([]);
          setFailed(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" disabled={disabled} className={triggerClassName}>
          <Upload />
          {t("import.trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("import.title")}</DialogTitle>
          <DialogDescription>{t("import.description")}</DialogDescription>
        </DialogHeader>

        <ol className="space-y-3">
          {steps.map((step, i) => (
            <li key={step} className="flex gap-3 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-xs text-muted-foreground">
                {i + 1}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-2 pt-0.5">
                <span>{step}</span>
                {i === 0 ? (
                  <Button asChild variant="outline" size="sm" className="w-full sm:w-fit">
                    <a href={MYTNB_SMART_LIVING_URL} target="_blank" rel="noopener noreferrer">
                      {t("import.openMyTnb")}
                      <ExternalLink />
                    </a>
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ol>

        <label
          htmlFor={inputId}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors",
            "focus-within:ring-2 focus-within:ring-ring/50",
            dragging ? "border-primary bg-primary/10" : "hover:border-border-strong hover:bg-accent/50",
          )}
        >
          <Upload className="h-5 w-5 text-muted-foreground" aria-hidden />
          <span className="text-sm font-medium">{t("import.dropFiles")}</span>
          <span className="text-xs text-muted-foreground">{t("import.dropHint")}</span>
          <input
            id={inputId}
            type="file"
            accept=".csv,text/csv"
            multiple
            className="sr-only"
            onChange={(e) => {
              void addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>

        {files.length > 0 ? (
          <ul className="divide-y rounded-lg border">
            {files.map((file) => (
              <li key={file.id} className="flex items-center gap-3 px-3 py-2">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{file.name}</p>
                  {file.error ? (
                    <p className="text-xs text-destructive">{errorText[file.error]}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {file.rows.length} {t("import.daysFound")} · {formatRange(file.rows, locale)}
                      {file.skipped > 0 ? ` · ${file.skipped} ${t("import.rowsSkipped")}` : ""}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  aria-label={`${t("import.removeFile")} ${file.name}`}
                  onClick={() => setFiles((prev) => prev.filter((f) => f.id !== file.id))}
                >
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}

        {rows.length > 0 ? (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {t("import.ready")} <span className="text-foreground">{rows.length} {t("import.daysFound")}</span> ({formatRange(rows, locale)})
          </p>
        ) : null}
        {failed ? (
          <p className="text-sm text-destructive" role="alert">
            {t("dashboard.uploadFailed")}
          </p>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={importing}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={rows.length === 0 || importing}>
            {importing ? <Loader2 className="animate-spin" /> : <Upload />}
            {rows.length > 0 ? `${t("import.importAction")} ${rows.length} ${t("import.days")}` : t("import.importAction")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
