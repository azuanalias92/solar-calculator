"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/lib/useTranslation";

export default function NavBar({ locale }: { locale: string }) {
  const pathname = usePathname();
  const { t } = useTranslation();

  const isDashboard =
    pathname === `/${locale}` || pathname.includes("/bill-ev") || pathname.includes("/usage") || (pathname.includes("/ev") && !pathname.includes("/ev-calculator"));
  const isCalculator = pathname.includes("/solar-calculator");
  const isEvCalculator = pathname.includes("/ev-calculator");
  const isSettings = pathname.includes("/settings");

  const items = [
    {
      labelKey: "nav.dashboard",
      href: `/${locale}`,
      active: isDashboard,
    },
    {
      labelKey: "nav.solarCalculator",
      href: `/${locale}/solar-calculator`,
      active: isCalculator,
    },
    {
      labelKey: "nav.evCalculator",
      href: `/${locale}/ev-calculator`,
      active: isEvCalculator,
    },
    {
      labelKey: "nav.settings",
      href: `/${locale}/settings`,
      active: isSettings,
    },
  ];

  return (
    <nav className="hidden md:inline-flex gap-1 rounded-full border bg-card p-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={`inline-flex h-8 items-center rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
            item.active ? "bg-primary/10 text-link" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t(item.labelKey)}
        </Link>
      ))}
    </nav>
  );
}
