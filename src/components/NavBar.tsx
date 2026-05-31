"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    <>
      {/* Desktop: inline tabs */}
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

      {/* Mobile: hamburger menu */}
      <div className="md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Navigation menu">
              <Menu className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[180px]">
            {items.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link
                  href={item.href}
                  className={item.active ? "font-semibold" : ""}
                >
                  {item.active ? `✓ ${item.label}` : item.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
