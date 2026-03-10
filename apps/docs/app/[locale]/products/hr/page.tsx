import { Users } from 'lucide-react';
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
    title: `${dict.products.hr.title} - HotCRM`,
    description: dict.products.hr.subtitle,
    alternates: {
      languages: {
        'en': '/en/products/hr',
        'zh': '/zh/products/hr',
        'x-default': '/en/products/hr',
      },
    },
  };
}

export default async function HRPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);
  return (
    <ProductPageTemplate
      locale={locale as Locale}
      dict={dict}
      title={dict.products.hr.title}
      subtitle={dict.products.hr.subtitle}
      description={dict.products.hr.description}
      features={dict.products.hr.features}
      icon={<Users className="w-7 h-7" />}
      docsHref="/docs/modules/hr"
    />
  );
}
