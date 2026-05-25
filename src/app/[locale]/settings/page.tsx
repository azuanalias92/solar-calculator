"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAuthState, clearAuthState, type AuthState } from "@/lib/auth";
import { useTranslation } from "@/lib/useTranslation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import GoogleAuthButton from "@/components/GoogleAuthButton";
import { Coffee, Github, LogOut, Zap } from "lucide-react";

const TARIFF_TYPES = [
  { value: "TNB_DOMESTIC_TOU", label: "TNB Domestic TOU", desc: "Peak & Off-Peak rates" },
  { value: "TNB_DOMESTIC_AM", label: "TNB Domestic AM", desc: "Flat rate" },
] as const;

function loadTariff(): string {
  if (typeof window === "undefined") return "TNB_DOMESTIC_TOU";
  return window.localStorage.getItem("kirasolar.tariff") ?? "TNB_DOMESTIC_TOU";
}

function saveTariff(value: string) {
  try {
    window.localStorage.setItem("kirasolar.tariff", value);
    window.dispatchEvent(new CustomEvent("kirasolar:tariff", { detail: value }));
  } catch { /* ignore */ }
}

export default function SettingsPage() {
  const { t, locale } = useTranslation();
  const pathname = usePathname();

  const [auth, setAuth] = useState<AuthState | null>(null);
  const [tariff, setTariff] = useState(loadTariff);

  useEffect(() => {
    const refresh = () => setAuth(getAuthState());
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("kirasolar:auth", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("kirasolar:auth", refresh);
    };
  }, []);

  const handleTariffChange = useCallback((value: string) => {
    setTariff(value);
    saveTariff(value);
  }, []);

  const currentTariff = TARIFF_TYPES.find((t) => t.value === tariff);

  return (
    <div className="flex flex-col min-h-screen p-4 sm:p-6 lg:p-8 bg-background">
      <div className="w-full max-w-6xl mx-auto text-center mb-6 sm:mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-4">
          <div className="hidden sm:block" />

          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <img src="/logo.svg" alt={t("common.logoAlt")} className="w-8 h-8 sm:w-10 sm:h-10" />
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-emerald-800">{t("common.title")}</h1>
          </div>

          <div className="flex justify-center sm:justify-end items-center gap-3">
            <LanguageSwitcher />
          </div>
        </div>

        <div className="flex justify-center mt-4">
          <div className="inline-flex gap-2 rounded-lg border border-input bg-background p-1">
            <Button asChild size="sm" variant={pathname.includes("/bill-ev") || pathname.includes("/rates") || pathname.includes("/usage") || pathname.includes("/ev") || pathname.includes("/settings") ? "outline" : "secondary"}>
              <Link href={`/${locale}`}>Calculator</Link>
            </Button>
            <Button asChild size="sm" variant={pathname.includes("/bill-ev") ? "secondary" : "outline"}>
              <Link href={`/${locale}/bill-ev`}>Bill EV</Link>
            </Button>
            <Button asChild size="sm" variant={pathname.includes("/rates") ? "secondary" : "outline"}>
              <Link href={`/${locale}/rates`}>Rates</Link>
            </Button>
            <Button asChild size="sm" variant={pathname.includes("/usage") ? "secondary" : "outline"}>
              <Link href={`/${locale}/usage`}>Usage</Link>
            </Button>
            <Button asChild size="sm" variant={pathname.includes("/ev") ? "secondary" : "outline"}>
              <Link href={`/${locale}/ev`}>EV</Link>
            </Button>
            <Button asChild size="sm" variant={pathname.includes("/settings") ? "secondary" : "outline"}>
              <Link href={`/${locale}/settings`}>Settings</Link>
            </Button>
          </div>
        </div>

        <p className="text-sm sm:text-base text-emerald-600 mt-2">{t("common.description")}</p>
      </div>

      <div className="flex-1 w-full max-w-6xl mx-auto space-y-6">
        {/* Account Section */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent>
            {!auth?.token ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <p className="text-sm text-muted-foreground">Sign in with Google to sync your data to the cloud</p>
                <GoogleAuthButton locale={locale} />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4 rounded-lg border p-4">
                  {auth.user.picture ? (
                    <Image
                      src={auth.user.picture}
                      alt={auth.user.name ?? "User"}
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-full border-2 border-emerald-200"
                      unoptimized
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-lg font-medium text-emerald-700">
                      {(auth.user.name ?? "U")[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{auth.user.name ?? "User"}</p>
                    <p className="text-sm text-muted-foreground truncate">{auth.user.email ?? ""}</p>
                    <p className="text-xs text-emerald-600 mt-0.5">
                      Syncing data to cloud ✓
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.google?.accounts?.id?.disableAutoSelect?.();
                      clearAuthState();
                    }}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-1.5" />
                    Sign Out
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tariff Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-600" />
              Tariff Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select your home's TNB electricity tariff to use in bill calculations and the solar calculator.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              {TARIFF_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => handleTariffChange(t.value)}
                  className={`text-left rounded-lg border p-4 transition-all cursor-pointer ${
                    tariff === t.value
                      ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                      : "border-input hover:border-emerald-200 hover:bg-accent"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{t.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                    </div>
                    {tariff === t.value && (
                      <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {currentTariff && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                Active: <strong>{currentTariff.label}</strong> — {currentTariff.desc}.
                Learn more on the{" "}
                <Link href={`/${locale}/rates`} className="text-primary underline">Rates</Link> page.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <footer className="border-t bg-card/50 backdrop-blur-sm mt-4">
        <div className="w-full max-w-6xl mx-auto flex flex-col gap-3 sm:gap-4 mt-3 sm:mt-4 md:flex-row md:justify-between md:items-center px-2 sm:px-0">
          <div className="text-base sm:text-lg font-semibold text-primary text-center md:text-left">{t("common.title")}</div>

          <div className="text-xs sm:text-sm text-muted-foreground text-center md:text-left order-3 md:order-2">
            {t("footer.madeBy")}{" "}
            <a href="https://azuanalias.com" target="_blank" rel="noopener noreferrer" className="text-xs sm:text-sm text-primary hover:text-outline transition-colors">
              Azuan Alias
            </a>
          </div>

          <div className="flex items-center justify-center gap-3 sm:gap-4 order-2 md:order-3">
            <a
              href="https://github.com/azuanalias92"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Github className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{t("footer.github")}</span>
            </a>
            <a
              href="https://ko-fi.com/azuanalias"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Coffee className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{t("footer.buyMeCoffee")}</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
