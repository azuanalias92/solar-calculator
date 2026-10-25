"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import SegmentedControl from "@/components/SegmentedControl";
import { useTranslation } from "@/lib/useTranslation";

type ThemeChoice = "light" | "dark" | "system";

const noopSubscribe = () => () => {};

function PreferenceRow({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

/** Language and theme. Stored on this device, so available without signing in. */
export default function PreferencesCard() {
  const { t, locale, switchLanguage } = useTranslation();
  const { theme, setTheme } = useTheme();
  // next-themes only knows the stored theme in the browser; avoid a server/client mismatch.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.preferences")}</CardTitle>
        <CardDescription>{t("settings.preferencesDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        <PreferenceRow title={t("common.language")} description={t("settings.languageDesc")}>
          <SegmentedControl
            ariaLabel={t("common.language")}
            value={locale === "en" ? "en" : "ms"}
            onChange={(value) => {
              if (value !== locale) switchLanguage(value);
            }}
            options={[
              { value: "ms", label: t("common.malay") },
              { value: "en", label: t("common.english") },
            ]}
            className="w-full sm:w-auto"
          />
        </PreferenceRow>
        <PreferenceRow title={t("settings.appearance")} description={t("settings.appearanceDesc")}>
          <SegmentedControl<ThemeChoice>
            ariaLabel={t("settings.appearance")}
            value={mounted ? ((theme as ThemeChoice | undefined) ?? "system") : undefined}
            onChange={setTheme}
            options={[
              { value: "light", label: t("theme.light"), icon: Sun },
              { value: "dark", label: t("theme.dark"), icon: Moon },
              { value: "system", label: t("theme.system"), icon: Monitor },
            ]}
            className="w-full sm:w-auto"
          />
        </PreferenceRow>
      </CardContent>
    </Card>
  );
}
