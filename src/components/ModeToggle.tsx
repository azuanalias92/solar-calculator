"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/useTranslation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ModeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const { t } = useTranslation()

  const themeLabel = theme === "light" ? t("theme.light") : theme === "dark" ? t("theme.dark") : t("theme.system")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={cn("w-full justify-center gap-2", className)} aria-label={t("theme.toggle")}>
          <Sun className="h-[1.2rem] w-[1.2rem] transition-all dark:hidden" />
          <Moon className="h-[1.2rem] w-[1.2rem] hidden dark:block" />
          <span>{themeLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          {t("theme.light")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          {t("theme.dark")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          {t("theme.system")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
