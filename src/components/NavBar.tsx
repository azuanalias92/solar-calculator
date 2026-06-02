"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function NavBar({ locale }: { locale: string }) {
  const pathname = usePathname();

  const isDashboard =
    pathname === `/${locale}` || pathname.includes("/bill-ev") || pathname.includes("/usage") || (pathname.includes("/ev") && !pathname.includes("/ev-calculator"));
  const isCalculator = pathname.includes("/solar-calculator");
  const isEvCalculator = pathname.includes("/ev-calculator");
  const isSettings = pathname.includes("/settings");

  const items = [
    {
      label: "Dashboard",
      href: `/${locale}`,
      active: isDashboard,
    },
    {
      label: "Solar Calculator",
      href: `/${locale}/solar-calculator`,
      active: isCalculator,
    },
    {
      label: "EV Calculator",
      href: `/${locale}/ev-calculator`,
      active: isEvCalculator,
    },
    {
      label: "Settings",
      href: `/${locale}/settings`,
      active: isSettings,
    },
  ];

  return (
    <div className="hidden md:inline-flex gap-2 rounded-lg border border-input bg-background p-1">
      {items.map((item) => (
        <Button asChild key={item.href} size="sm" variant={item.active ? "secondary" : "outline"}>
          <Link href={item.href}>{item.label}</Link>
        </Button>
      ))}
    </div>
  );
}
