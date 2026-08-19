import { createContext, useContext } from 'react';
import { isSupportedLocale, type Locale, type TranslateFn } from './i18n';

/**
 * Context and hooks live apart from `LocaleProvider.tsx` on purpose: React Fast
 * Refresh only works when a module exports components alone, and mixing the
 * provider with these hooks made every edit tear down the whole tree in dev.
 */
export type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslateFn;
};

export const LOCALE_STORAGE_KEY = 'dropcut.locale.v1';

export const LocaleContext = createContext<LocaleContextValue | null>(null);

export function loadStoredLocale(): Locale | null {
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isSupportedLocale(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error('useLocale must be used inside LocaleProvider');
  return value;
}

export function useTranslation(): TranslateFn {
  return useLocale().t;
}
