import { NextRequest, NextResponse } from "next/server";

const locales = ["en", "ms"];
const defaultLocale = "ms";

function getLocale(request: NextRequest): string {
  const { pathname } = request.nextUrl;
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );

  if (pathnameHasLocale) {
    return pathname.split("/")[1];
  }

  // 1. Check saved cookie preference first
  const cookieLocale = request.cookies.get("preferred_lang")?.value;
  if (cookieLocale && locales.includes(cookieLocale)) {
    return cookieLocale;
  }

  // 2. Fall back to browser Accept-Language
  const acceptLanguage = request.headers.get("accept-language");
  if (acceptLanguage) {
    const preferredLocale = acceptLanguage
      .split(",")
      .map((lang) => lang.split(";")[0].trim())
      .find((lang) => {
        if (lang === "ms" || lang.startsWith("ms-")) return "ms";
        if (lang === "en" || lang.startsWith("en-")) return "en";
        return null;
      });

    if (preferredLocale && locales.includes(preferredLocale)) {
      return preferredLocale;
    }
  }

  return defaultLocale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );

  if (pathnameHasLocale) {
    return NextResponse.next();
  }

  const locale = getLocale(request);
  const newUrl = new URL(`/${locale}${pathname}`, request.url);

  if (pathname === "/") {
    if (locale === defaultLocale) {
      return NextResponse.redirect(new URL("/ms", request.url));
    }
    return NextResponse.redirect(new URL(`/${locale}`, request.url));
  }

  return NextResponse.redirect(newUrl);
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|logo.svg|manifest.json|robots.txt|sitemap|.*\\.).*)"],
};
