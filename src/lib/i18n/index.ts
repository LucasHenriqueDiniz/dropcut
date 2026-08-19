import { en, type TranslationSchema } from './en';
import { ptBR } from './pt-BR';
import { es } from './es';
import type { TranslationKey, TranslationVars } from './types';

export const SUPPORTED_LOCALES = ['en', 'pt-BR', 'es'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  'pt-BR': 'Português (Brasil)',
  es: 'Español',
};

const dictionaries: Record<Locale, TranslationSchema> = {
  en,
  'pt-BR': ptBR,
  es,
};

function resolvePath(dictionary: TranslationSchema, key: string): string | undefined {
  const value = key.split('.').reduce<unknown>(
    (accumulator, segment) =>
      typeof accumulator === 'object' && accumulator !== null
        ? (accumulator as Record<string, unknown>)[segment]
        : undefined,
    dictionary
  );
  return typeof value === 'string' ? value : undefined;
}

export function translate(locale: Locale, key: TranslationKey, vars?: TranslationVars): string {
  const template = resolvePath(dictionaries[locale], key) ?? resolvePath(dictionaries[DEFAULT_LOCALE], key) ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const replacement = vars[name];
    return replacement === undefined ? match : String(replacement);
  });
}

export function isSupportedLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function detectInitialLocale(): Locale {
  const language = typeof navigator === 'undefined' ? '' : navigator.language.toLowerCase();
  if (language.startsWith('pt')) return 'pt-BR';
  if (language.startsWith('es')) return 'es';
  return DEFAULT_LOCALE;
}

export type { TranslationKey, TranslationVars, TranslateFn } from './types';
