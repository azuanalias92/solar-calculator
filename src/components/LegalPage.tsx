import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import Footer from "@/components/Footer";
import en from "@/locales/en.json";
import ms from "@/locales/ms.json";

export type LegalDoc = "policy" | "terms";

const translations = { en, ms };

export function getLegalStrings(locale: string) {
  return (translations[locale as keyof typeof translations] ?? translations.ms).legal;
}

// Section bodies are plain strings: blank lines separate blocks, and a block
// whose lines all start with "- " renders as a bulleted list.
function SectionBody({ body }: { body: string }) {
  return (
    <>
      {body.split("\n\n").map((block, i) => {
        const lines = block.split("\n");
        if (lines.every((line) => line.startsWith("- "))) {
          return (
            <ul key={i} className="list-disc space-y-2 pl-5">
              {lines.map((line, j) => (
                <li key={j}>{line.slice(2)}</li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{block}</p>;
      })}
    </>
  );
}

export default function LegalPage({ locale, doc }: { locale: string; doc: LegalDoc }) {
  const legal = getLegalStrings(locale);
  const common = (translations[locale as keyof typeof translations] ?? translations.ms).common;
  const content = legal[doc];
  const other: LegalDoc = doc === "policy" ? "terms" : "policy";

  return (
    <div className="flex flex-col min-h-screen p-2 sm:p-6 lg:p-8 bg-background">
      <AppHeader locale={locale} title={common.title} description={common.description} logoAlt={common.logoAlt} />

      <article className="flex-1 w-full max-w-3xl mx-auto px-2 sm:px-0">
        <header className="mb-8 border-b pb-6">
          <h2 className="text-2xl sm:text-3xl font-normal tracking-tight text-foreground">{content.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {legal.lastUpdated}: {legal.updatedDate}
          </p>
          <p className="mt-4 text-sm sm:text-base leading-relaxed text-foreground">{content.intro}</p>
        </header>

        <div className="space-y-8">
          {Object.entries(content.sections).map(([id, section]) => (
            <section key={id} aria-labelledby={`${doc}-${id}`} className="space-y-3">
              <h3 id={`${doc}-${id}`} className="text-lg font-medium text-foreground">
                {section.title}
              </h3>
              <div className="space-y-3 text-sm sm:text-base leading-relaxed text-muted-foreground">
                <SectionBody body={section.body} />
              </div>
            </section>
          ))}
        </div>

        <p className="mt-10 border-t pt-6 text-sm text-muted-foreground">
          {legal.seeAlso}:{" "}
          <Link href={`/${locale}/${other}`} className="inline-flex min-h-11 items-center text-link hover:underline underline-offset-4">
            {other === "policy" ? legal.privacyPolicy : legal.termsOfService}
          </Link>
        </p>
      </article>

      <Footer />
    </div>
  );
}
