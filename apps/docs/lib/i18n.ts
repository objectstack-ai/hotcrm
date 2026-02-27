import { dictionary as en } from './dictionaries/en';
import { dictionary as zh } from './dictionaries/zh';

export type Dictionary = typeof en;
export type Locale = 'en' | 'zh';

export const locales: Locale[] = ['en', 'zh'];
export const defaultLocale: Locale = 'en';

const dictionaries: Record<Locale, Dictionary> = { en, zh };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}
