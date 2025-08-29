import { useRouter, usePathname, useParams } from "next/navigation";
import en from "../locales/en.json";
import ms from "../locales/ms.json";

type TranslationKey = string;
type Translations = typeof en;

const translations: Record<string, Translations> = {
  en,
  ms,
};

export function useTranslation() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  // Get locale from params or extract from pathname
  const locale = (params?.locale as string) || (pathname.startsWith("/ms") ? "ms" : "en");

  const t = (key: TranslationKey): string => {
    const keys = key.split(".");
    let value: any = translations[locale];

    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = value[k];
      } else {
        // Fallback to English if key not found
        value = translations["en"];
        for (const fallbackKey of keys) {
          if (value && typeof value === "object" && fallbackKey in value) {
            value = value[fallbackKey];
          } else {
            return key; // Return key if not found in fallback
          }
        }
        break;
      }
    }

    return typeof value === "string" ? value : key;
  };

  const switchLanguage = (newLocale: string) => {
    // For App Router with [locale] structure
    const currentPath = pathname.replace(/^\/(en|ms)/, "") || "";
    const newPath = `/${newLocale}${currentPath}`;
    router.push(newPath);
  };

  return {
    t,
    locale,
    switchLanguage,
    availableLocales: ["en", "ms"],
  };
}

export type { TranslationKey, Translations };
