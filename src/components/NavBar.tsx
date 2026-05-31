"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Dashboard", href: "" },
  { label: "Solar Calculator", href: "" },
  { label: "EV Calculator", href: "/ev-calculator" },
  { label: "Settings", href: "/settings" },
];

export default function NavBar({ locale }: { locale: string }) {
  const pathname = usePathname();

  const isDashboard =
    pathname.includes("/dashboard") ||
    pathname.includes("/bill-ev") ||
    pathname.includes("/usage") ||
    (pathname.includes("/ev") && !pathname.includes("/ev-calculator"));
  const isEvCalculator = pathname.includes("/ev-calculator");
  const isSettings = pathname.includes("/settings");
  const isCalculator = !isDashboard && !isEvCalculator && !isSettings;

  const items = [
    {
      label: "Dashboard",
      href: `/${locale}/dashboard`,
      active: isDashboard,
    },
    {
      label: "Solar Calculator",
      href: `/${locale}`,
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
        <Button
          asChild
          key={item.href}
          size="sm"
          variant={item.active ? "secondary" : "outline"}
        >
          <Link href={item.href}>{item.label}</Link>
        </Button>
      ))}
    </div>
  );
}
