import type { Metadata } from "next";
import LegalPage, { getLegalStrings } from "@/components/LegalPage";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const content = getLegalStrings(locale).terms;

  return {
    title: `${content.title} | Kira Solar`,
    description: content.metaDescription,
    alternates: {
      canonical: `/${locale}/terms`,
      languages: {
        "en-US": "/en/terms",
        "ms-MY": "/ms/terms",
        "x-default": "/ms/terms",
      },
    },
  };
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  return <LegalPage locale={locale} doc="terms" />;
}
