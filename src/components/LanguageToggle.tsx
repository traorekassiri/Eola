import React from 'react';
import { Globe } from 'lucide-react';
import { useI18n } from '../lib/i18n';

interface LanguageToggleProps {
  compact?: boolean;
  className?: string;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({
  compact = false,
  className = '',
}) => {
  const { lang, setLang, t } = useI18n();

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
        title={t('common.switchLangTitle')}
        aria-label={t('common.switchLangTitle')}
        className={`inline-flex h-11 sm:h-9 items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-3 text-xs font-semibold text-stone-200 hover:bg-white/10 active:scale-95 transition-all whitespace-nowrap shrink-0 ${className}`}
      >
        <Globe className="h-3.5 w-3.5 text-orange-400" aria-hidden="true" />
        <span className="uppercase">{lang}</span>
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label={t('common.langLabel')}
      className={`inline-flex items-center rounded-full border border-white/12 bg-white/5 p-1 ${className}`}
    >
      <button
        type="button"
        onClick={() => setLang('fr')}
        className={`min-h-[36px] rounded-full px-3 py-1 text-xs font-semibold transition-all ${
          lang === 'fr'
            ? 'zola-gradient text-white shadow-sm'
            : 'text-stone-300 hover:text-white'
        }`}
      >
        FR · Français
      </button>
      <button
        type="button"
        onClick={() => setLang('en')}
        className={`min-h-[36px] rounded-full px-3 py-1 text-xs font-semibold transition-all ${
          lang === 'en'
            ? 'zola-gradient text-white shadow-sm'
            : 'text-stone-300 hover:text-white'
        }`}
      >
        EN · English
      </button>
    </div>
  );
};
