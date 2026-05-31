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

export default function MobileNav({ locale }: { locale: string }) {
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
    { label: "Dashboard", href: `/${locale}/dashboard`, active: isDashboard },
    { label: "Solar Calculator", href: `/${locale}`, active: isCalculator },
    { label: "EV Calculator", href: `/${locale}/ev-calculator`, active: isEvCalculator },
    { label: "Settings", href: `/${locale}/settings`, active: isSettings },
  ];

  return (
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
  );
}
