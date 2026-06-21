"use client";

import Link from "next/link";
import { Coffee, Github } from "lucide-react";
import { useTranslation } from "@/lib/useTranslation";

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t bg-card/50 backdrop-blur-sm mt-4">
      <div className="w-full max-w-6xl mx-auto flex flex-col gap-3 sm:gap-4 mt-3 sm:mt-4 md:flex-row md:justify-between md:items-center px-2 sm:px-0">
        <div className="text-base sm:text-lg font-semibold text-primary text-center md:text-left">
          {t("common.title")}
        </div>

        <div className="text-xs sm:text-sm text-muted-foreground text-center md:text-left order-3 md:order-2">
          {t("footer.madeBy")}{" "}
          <a
            href="https://azuanalias.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs sm:text-sm text-primary hover:text-primary/70 transition-colors"
          >
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
  );
}
