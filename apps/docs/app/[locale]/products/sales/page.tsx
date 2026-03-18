import { TrendingUp } from 'lucide-react';
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
  return {
    title: `${dict.products.sales.title} - HotCRM`,
    description: dict.products.sales.subtitle,
    alternates: {
      languages: {
        'en': '/en/products/sales',
        'zh': '/zh/products/sales',
        'x-default': '/en/products/sales',
      },
    },
  };
}

export default async function SalesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);
  return (
    <ProductPageTemplate
      locale={locale as Locale}
      dict={dict}
      title={dict.products.sales.title}
      subtitle={dict.products.sales.subtitle}
      description={dict.products.sales.description}
      features={dict.products.sales.features}
      icon={<TrendingUp className="w-7 h-7" />}
      docsHref="/docs/modules/sales"
    />
  );
}
