"use client";

import MobileNav from "@/components/MobileNav";

export default function NavWrapper({ locale, children }: { locale: string; children: React.ReactNode }) {
  return (
    <>
      <main id="main-content" className="pb-20 md:pb-0">
        {children}
      </main>
      <MobileNav locale={locale} />
    </>
  );
}
