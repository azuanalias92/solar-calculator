import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeProvider } from "@/lib/ThemeProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Solar Panel Estimator - Calculate Your Solar Energy Needs",
    template: "%s | Solar Panel Estimator",
  },
  description:
    "Free solar panel calculator to estimate how many solar panels you need for your home. Calculate energy consumption, solar system requirements, and potential savings with our easy-to-use solar estimator tool.",
  keywords: [
    "solar panel calculator",
    "solar energy estimator",
    "solar system calculator",
    "solar panels needed",
    "renewable energy calculator",
    "home solar calculator",
    "solar power estimator",
    "energy consumption calculator",
    "solar installation calculator",
    "green energy calculator",
  ],
  authors: [{ name: "Solar Panel Estimator" }],
  creator: "Solar Panel Estimator",
  publisher: "Solar Panel Estimator",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://solar-calculator.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Solar Panel Estimator - Calculate Your Solar Energy Needs",
    description:
      "Free solar panel calculator to estimate how many solar panels you need for your home. Calculate energy consumption, solar system requirements, and potential savings.",
    url: "https://solar-calculator.vercel.app",
    siteName: "Solar Panel Estimator",
    images: [
      {
        url: "/logo.svg",
        width: 1200,
        height: 630,
        alt: "Solar Panel Estimator - Calculate Your Solar Energy Needs",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Solar Panel Estimator - Calculate Your Solar Energy Needs",
    description: "Free solar panel calculator to estimate how many solar panels you need for your home. Calculate energy consumption and solar system requirements.",
    images: ["/logo.svg"],
    creator: "@solarcalculator",
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
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
  manifest: "/manifest.json",
  category: "technology",
  classification: "Solar Energy Calculator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Solar Panel Estimator",
    description:
      "Free solar panel calculator to estimate how many solar panels you need for your home. Calculate energy consumption, solar system requirements, and potential savings.",
    url: "https://solar-panel-estimator.vercel.app",
    applicationCategory: "UtilityApplication",
    operatingSystem: "Web Browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "MYR",
    },
    featureList: ["Solar panel calculation", "Energy consumption analysis", "Solar system configuration", "PDF export functionality", "Real-time calculations"],
    author: {
      "@type": "Organization",
      name: "Solar Panel Estimator",
    },
    publisher: {
      "@type": "Organization",
      name: "Solar Panel Estimator",
    },
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
        <meta name="google-site-verification" content="4lKZH8KcO9eLi7zabiRr44VFolbxR2Q6MZw1Tt0pZk8" /> <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href="https://solar-calculator.vercel.app" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
