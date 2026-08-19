import type { TranslationSchema } from './en';

type PathSegments<T> = T extends string
  ? []
  : { [K in Extract<keyof T, string>]: [K, ...PathSegments<T[K]>] }[Extract<keyof T, string>];

type Join<T extends string[]> = T extends [infer Head extends string]
  ? Head
  : T extends [infer Head extends string, ...infer Rest extends string[]]
    ? `${Head}.${Join<Rest>}`
    : never;

export type TranslationKey = Join<PathSegments<TranslationSchema>>;

export type TranslationVars = Record<string, string | number>;

export type TranslateFn = (key: TranslationKey, vars?: TranslationVars) => string;
