import generated from './apps.generated.json';
import product from './product.json';
import { i18n } from '@/lib/i18n';

/**
 * The shared product block (#2608): the ruled headline and subtitle, the
 * business chain and the six apps, per docs locale. The homepage and the docs
 * front page both render it, so the positioning is written once.
 *
 * App names come from `apps.generated.json`, which `pnpm docs:product` writes
 * from `src/*\/apps/*.app.ts` and the zh-CN packs; zh-Hant has no pack and
 * reads `appsHant`. Everything else is `product.json`.
 */

export type Locale = 'en' | 'zh-Hans' | 'zh-Hant';

export type ProductApp = {
  name: string;
  label: string;
  who: string;
  what: string;
  href: string;
};

type Copy = (typeof product.locales)['en'];

export function productLocale(lang: string): Locale {
  return (lang in product.locales ? lang : i18n.defaultLanguage) as Locale;
}

/** The path with this locale's prefix (the default locale has none). */
export function localeHref(lang: string, href: string): string {
  if (!href.startsWith('/')) return href;
  return lang === i18n.defaultLanguage ? href : `/${lang}${href}`;
}

export function productCopy(lang: string): Copy {
  return product.locales[productLocale(lang)];
}

function appLabel(name: string, locale: Locale): string {
  const app = generated.apps.find((a) => a.name === name);
  if (locale === 'zh-Hant') return (product.appsHant as Record<string, string>)[name] ?? app?.label.en ?? name;
  if (locale === 'zh-Hans') return app?.label['zh-CN'] || app?.label.en || name;
  return app?.label.en ?? name;
}

/** The six apps in the order the product presents them, named as the UI names them. */
export function productApps(lang: string): ProductApp[] {
  const locale = productLocale(lang);
  const items = product.locales[locale].apps.items as Record<string, { who: string; what: string; href: string }>;
  return product.order.map((name) => ({
    name,
    label: appLabel(name, locale),
    ...items[name],
    href: localeHref(lang, items[name].href),
  }));
}
