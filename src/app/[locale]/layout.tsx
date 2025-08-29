import { Inter } from 'next/font/google';
import '../globals.css';
import { Metadata } from 'next';
import en from '../../locales/en.json';
import ms from '../../locales/ms.json';

const inter = Inter({ subsets: ['latin'] });

const translations = {
  en,
  ms,
};

type Props = {
  params: { locale: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = params.locale || 'en';
  const t = translations[locale as keyof typeof translations] || translations.en;

  return {
    title: t.seo.title,
    description: t.seo.description,
    keywords: t.seo.keywords,
    authors: [{ name: 'Solar Calculator Team' }],
    publisher: 'Solar Calculator',
    metadataBase: new URL('https://solar-calculator.vercel.app'),
    alternates: {
      canonical: `/${locale === 'en' ? '' : locale}`,
      languages: {
        'en': '/',
        'ms': '/ms',
      },
    },
    openGraph: {
      title: t.seo.title,
      description: t.seo.description,
      url: `/${locale === 'en' ? '' : locale}`,
      siteName: 'Solar Calculator',
      locale: locale,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: t.seo.title,
      description: t.seo.description,
    },
  };
}

export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const locale = params.locale || 'en';
  const t = translations[locale as keyof typeof translations] || translations.en;

  // Generate structured data
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: t.seo.title,
    description: t.seo.description,
    url: `https://solar-calculator.vercel.app/${locale === 'en' ? '' : locale}`,
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    featureList: [
      'Solar Panel Calculation',
      'Multi-language Support',
      'Responsive Design',
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />
      <link rel="alternate" hrefLang="en" href="/" />
      <link rel="alternate" hrefLang="ms" href="/ms" />
      <link rel="alternate" hrefLang="x-default" href="/" />
      {children}
    </>
  );
}

export async function generateStaticParams() {
  return [
    { locale: 'en' },
    { locale: 'ms' },
  ];
}