"use client";

import { useTranslation } from '@/lib/useTranslation';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

const LanguageSwitcher = () => {
  const { locale, switchLanguage } = useTranslation();

  const toggleLanguage = () => {
    const newLocale = locale === 'en' ? 'ms' : 'en';
    switchLanguage(newLocale);
  };

  const getLanguageLabel = () => {
    return locale === 'en' ? 'BM' : 'EN';
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center gap-2"
    >
      <Globe className="w-4 h-4" />
      {getLanguageLabel()}
    </Button>
  );
};

export default LanguageSwitcher;