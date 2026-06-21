"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
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
    <div className="hidden md:inline-flex gap-2 rounded-lg border border-input bg-background p-1">
      {items.map((item) => (
        <Button asChild key={item.href} size="sm" variant={item.active ? "secondary" : "outline"}>
          <Link href={item.href}>{t(item.labelKey)}</Link>
        </Button>
      ))}
    </div>
  );
}
