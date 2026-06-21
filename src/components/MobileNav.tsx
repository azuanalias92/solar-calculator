"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Sun, Car, Settings } from "lucide-react";
import { useTranslation } from "@/lib/useTranslation";

export default function MobileNav({ locale }: { locale: string }) {
  const pathname = usePathname();
  const { t } = useTranslation();

  const isDashboard =
    pathname === `/${locale}` || pathname.includes("/bill-ev") || pathname.includes("/usage") || (pathname.includes("/ev") && !pathname.includes("/ev-calculator"));
  const isCalculator = pathname.includes("/solar-calculator");
  const isEvCalculator = pathname.includes("/ev-calculator");
  const isSettings = pathname.includes("/settings");

  const items = [
    { label: t("nav.dashboard"), href: `/${locale}`, icon: BarChart3, active: isDashboard },
    { label: t("nav.solarCalculator"), href: `/${locale}/solar-calculator`, icon: Sun, active: isCalculator },
    { label: t("nav.evCalculator"), href: `/${locale}/ev-calculator`, icon: Car, active: isEvCalculator },
    { label: t("nav.settings"), href: `/${locale}/settings`, icon: Settings, active: isSettings },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                item.active
                  ? "text-emerald-600"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
