"use client";

import NavBar from "@/components/NavBar";
import MobileNav from "@/components/MobileNav";

type Props = {
  locale: string;
  title: string;
  description: string;
  logoAlt: string;
};

export default function AppHeader({ locale, title, description, logoAlt }: Props) {
  return (
    <div className="w-full max-w-6xl mx-auto text-center mb-6 sm:mb-8">
      <div className="flex flex-col items-start gap-2 sm:gap-3">
        <div className="flex flex-row justify-between items-center w-full gap-2 sm:gap-3">
          <div className="flex flex-row items-center justify-center">
            <img src="/logo.svg" alt={logoAlt} className="w-8 h-8 sm:w-10 sm:h-10" />
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-emerald-800">{title}</h1>
          </div>
          <div className="hidden md:flex justify-center items-center">
            <NavBar locale={locale} />
          </div>
          <div className="md:hidden">
            <MobileNav locale={locale} />
          </div>
        </div>
        <p className="text-sm sm:text-base text-emerald-600 mt-2 items-start">{description}</p>
      </div>
    </div>
  );
}
