import { LayoutTemplate } from 'lucide-react';
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
    title: `${dict.products.platform.title} - HotCRM`,
    description: dict.products.platform.subtitle,
    alternates: {
      languages: {
        'en': '/en/products/platform',
        'zh': '/zh/products/platform',
        'x-default': '/en/products/platform',
      },
    },
  };
}

export default async function PlatformPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);
  return (
    <ProductPageTemplate
      locale={locale as Locale}
      dict={dict}
      title={dict.products.platform.title}
      subtitle={dict.products.platform.subtitle}
      description={dict.products.platform.description}
      features={dict.products.platform.features}
      icon={<LayoutTemplate className="w-7 h-7" />}
      docsHref="/docs/modules/platform"
    />
  );
}
