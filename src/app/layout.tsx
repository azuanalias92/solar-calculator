import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/lib/ThemeProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Kira Solar - Calculate Your Solar Energy Needs",
    template: "%s | Kira Solar",
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
  authors: [{ name: "Kira Solar" }],
  creator: "Kira Solar",
  publisher: "Kira Solar",
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
    title: "Kira Solar - Calculate Your Solar Energy Needs",
    description:
      "Free solar panel calculator to estimate how many solar panels you need for your home. Calculate energy consumption, solar system requirements, and potential savings.",
    url: "https://solar-calculator.vercel.app",
    siteName: "Kira Solar",
    images: [
      {
        url: "/logo.svg",
        width: 1200,
        height: 630,
        alt: "Kira Solar - Calculate Your Solar Energy Needs",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kira Solar - Calculate Your Solar Energy Needs",
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
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION ?? "",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Kira Solar",
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
      name: "Kira Solar",
    },
    publisher: {
      "@type": "Organization",
      name: "Kira Solar",
    },
  };

  return (
    <html lang="ms" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href="https://kirasolar.my" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Kira Solar" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Kira Solar" />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "if('serviceWorker'in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js');});}",
          }}
        />
<script
          dangerouslySetInnerHTML={{
            __html: "let deferredPrompt;window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferredPrompt=e;var btn=document.createElement('button');btn.textContent='Install App';btn.className='fixed bottom-4 right-4 z-50 px-4 py-2 bg-emerald-600 text-white rounded-lg shadow-lg hover:bg-emerald-700 text-sm font-medium transition-all';btn.onclick=function(){if(deferredPrompt){deferredPrompt.prompt();deferredPrompt.userChoice.then(function(r){if(r.outcome==='accepted'){btn.remove();}});}};document.body.appendChild(btn);});",
          }}
        />
      </head>
      <body className={inter.className}>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:border focus:rounded focus:text-foreground focus:outline-none">
          Skip to main content
        </a>

        <script
          dangerouslySetInnerHTML={{
            __html: "window.addEventListener('offline',function(){document.body.setAttribute('data-offline','true');});window.addEventListener('online',function(){document.body.removeAttribute('data-offline');});if(!navigator.onLine){document.body.setAttribute('data-offline','true');}",
          }}
        />

        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Toaster richColors closeButton />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}