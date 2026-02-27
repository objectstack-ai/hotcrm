import { getDictionary, locales } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { notFound } from 'next/navigation';

export function generateStaticParams() {
  return locales.map(locale => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();

  const dict = getDictionary(locale as Locale);

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader locale={locale as Locale} dict={dict} />
      <main className="flex-1">{children}</main>
      <SiteFooter locale={locale as Locale} dict={dict} />
    </div>
  );
}
