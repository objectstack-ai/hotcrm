import { Banknote } from 'lucide-react';
import { getDictionary, locales } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { ProductPageTemplate } from '@/components/marketing/product-page-template';
import type { Metadata } from 'next';

export function generateStaticParams() {
  return locales.map(locale => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);
  return { title: `${dict.products.revenue.title} - HotCRM`, description: dict.products.revenue.subtitle };
}

export default async function RevenuePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);
  return (
    <ProductPageTemplate
      locale={locale as Locale}
      dict={dict}
      title={dict.products.revenue.title}
      subtitle={dict.products.revenue.subtitle}
      description={dict.products.revenue.description}
      features={dict.products.revenue.features}
      icon={<Banknote className="w-7 h-7" />}
      docsHref="/docs/modules/revenue"
    />
  );
}
