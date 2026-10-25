"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/useTranslation";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    // Set by the capture script in src/app/layout.tsx.
    __kiraInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

const DISMISS_KEY = "kirasolar.installDismissedAt";
const DISMISS_DAYS = 30;

function recentlyDismissed(): boolean {
  try {
    const at = Number(window.localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(at) && Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

/** Homepage-only suggestion to install the PWA. Renders nothing unless the browser offers installation. */
export default function InstallPrompt() {
  const { t } = useTranslation();
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    const refresh = () => setInstallEvent(recentlyDismissed() ? null : window.__kiraInstallPrompt ?? null);
    refresh();
    window.addEventListener("kirasolar:installable", refresh);
    return () => window.removeEventListener("kirasolar:installable", refresh);
  }, []);

  if (!installEvent) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setInstallEvent(null);
  };

  const install = async () => {
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    // The event can only be used once.
    window.__kiraInstallPrompt = null;
    if (outcome === "dismissed") dismiss();
    else setInstallEvent(null);
  };

  return (
    <div
      role="region"
      aria-label={t("install.title")}
      className="w-full max-w-6xl mx-auto mb-4 flex items-center gap-3 rounded-lg border bg-card p-3 sm:p-4"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-background">
        <Download className="h-4 w-4 text-link" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{t("install.title")}</p>
        <p className="text-xs sm:text-sm text-muted-foreground">{t("install.description")}</p>
      </div>
      <Button size="sm" onClick={install} className="shrink-0">
        {t("install.action")}
      </Button>
      <Button size="icon" variant="ghost" onClick={dismiss} className="shrink-0" aria-label={t("install.dismiss")}>
        <X />
      </Button>
    </div>
  );
}
