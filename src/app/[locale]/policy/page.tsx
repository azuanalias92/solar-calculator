import type { Metadata } from "next";
import LegalPage, { getLegalStrings } from "@/components/LegalPage";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const content = getLegalStrings(locale).policy;

  return {
    title: `${content.title} | Kira Solar`,
    description: content.metaDescription,
    alternates: {
      canonical: `/${locale}/policy`,
      languages: {
        "en-US": "/en/policy",
        "ms-MY": "/ms/policy",
        "x-default": "/ms/policy",
      },
    },
  };
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  return <LegalPage locale={locale} doc="policy" />;
}
