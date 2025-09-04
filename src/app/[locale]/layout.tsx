import { Inter } from "next/font/google";
import "../globals.css";
import { Metadata } from "next";
import en from "../../locales/en.json";
import ms from "../../locales/ms.json";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

const translations = {
  en,
  ms,
};

type Props = {
  params: { locale: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = params.locale || "ms";
  const t = translations[locale as keyof typeof translations] || translations.ms;

  return {
    title: t.seo.title,
    description: t.seo.description,
    keywords: t.seo.keywords,
    authors: [{ name: "Solar Calculator Team" }],
    publisher: "Solar Calculator",
    metadataBase: new URL("https://solar-calculator.vercel.app"),
    alternates: {
      canonical: `/${locale === "ms" ? "ms" : locale}`,
      languages: {
        "en-US": "/en",
        "ms-MY": "/ms",
        "x-default": "/ms",
      },
    },
    other: {
      "google-site-verification": process.env.GOOGLE_SITE_VERIFICATION || "",
    },
    openGraph: {
      title: t.seo.title,
      description: t.seo.description,
      url: `/${locale === "ms" ? "ms" : locale}`,
      siteName: locale === "ms" ? "Kira Solar" : "Kira Solar",
      locale: locale === "ms" ? "ms_MY" : "en_US",
      alternateLocale: locale === "ms" ? "en_US" : "ms_MY",
      type: "website",
      images: [
        {
          url: `/og-image-${locale}.svg`,
          width: 1200,
          height: 630,
          alt: t.seo.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t.seo.title,
      description: t.seo.description,
      images: [`/og-image-${locale}.svg`],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export default function LocaleLayout({ children, params }: { children: React.ReactNode; params: { locale: string } }) {
  const locale = params.locale || "ms";
  const t = translations[locale as keyof typeof translations] || translations.ms;

  const baseStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: t.seo.title,
    description: t.seo.description,
    url: `https://solar-calculator.vercel.app/${locale === "ms" ? "ms" : locale}`,
    applicationCategory: "UtilityApplication",
    operatingSystem: "Web Browser",
    inLanguage: locale === "ms" ? "ms-MY" : "en-US",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: locale === "ms" ? "MYR" : "USD",
    },
    author: {
      "@type": "Organization",
      name: "Solar Calculator Team",
    },
    keywords: t.seo.keywords,
  };

  // Add Malaysian-specific local business schema for Malay locale
  const localBusinessData =
    locale === "ms"
      ? {
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: "Kira Solar",
          description: "Perkhidmatan kalkulator panel solar terbaik di Malaysia",
          url: "https://solar-calculator.vercel.app/ms",
          areaServed: {
            "@type": "Country",
            name: "Malaysia",
          },
          serviceType: "Solar Panel Calculator",
          priceRange: "Percuma",
          currenciesAccepted: "MYR",
          paymentAccepted: "Percuma",
          availableLanguage: ["Bahasa Malaysia", "English"],
          knowsAbout: ["Panel Solar Malaysia", "Tenaga Boleh Diperbaharui", "Sistem Solar Rumah", "TNB Net Energy Metering", "Feed-in Tariff Malaysia"],
        }
      : null;

  const structuredData = [baseStructuredData, localBusinessData].filter(Boolean);

  return (
    <html lang={locale}>
      <head>
        {structuredData.map((data, index) => (
          <Script
            key={`structured-data-${index}`}
            id={`structured-data-${index}`}
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(data),
            }}
          />
        ))}
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}

export async function generateStaticParams() {
  return [{ locale: "en" }, { locale: "ms" }];
}
