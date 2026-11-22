import generated from './apps.generated.json';
import screens from './home-screens.generated.json';
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

export type ProductScreen = {
  id: string;
  src: string;
  width: number;
  height: number;
  /** The screen's `title` in its `meta.yaml`, shown as the caption. */
  title: string;
  alt: string;
};

type GeneratedScreen = Omit<(typeof screens)['hero'], 'app'>;

/**
 * A screen in the image's language: en pages show the en capture; zh-Hans and
 * zh-Hant pages show the zh-Hans one, with its own caption and alt. The app
 * ships no Traditional locale, so there is no Traditional capture to show and
 * no Traditional caption to coin (#1397, #1368).
 */
function screenFor(screen: GeneratedScreen, lang: string): ProductScreen {
  const image = productLocale(lang) === 'en' ? screen.locales.en : screen.locales['zh-Hans'];
  return { id: screen.id, width: screen.width, height: screen.height, ...image };
}

/** The homepage screenshots (#2694): the hero shot, and one per app keyed by app name. */
export function productScreens(lang: string): {
  hero: ProductScreen & { app: string };
  apps: Record<string, ProductScreen>;
} {
  const apps = screens.apps as Record<string, GeneratedScreen>;
  return {
    hero: { app: screens.hero.app, ...screenFor(screens.hero, lang) },
    apps: Object.fromEntries(Object.entries(apps).map(([name, screen]) => [name, screenFor(screen, lang)])),
  };
}
