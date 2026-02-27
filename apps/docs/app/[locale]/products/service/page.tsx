import { LifeBuoy } from 'lucide-react';
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
  return { title: `${dict.products.service.title} - HotCRM`, description: dict.products.service.subtitle };
}

export default async function ServicePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);
  return (
    <ProductPageTemplate
      locale={locale as Locale}
      dict={dict}
      title={dict.products.service.title}
      subtitle={dict.products.service.subtitle}
      description={dict.products.service.description}
      features={dict.products.service.features}
      icon={<LifeBuoy className="w-7 h-7" />}
      docsHref="/docs/modules/service"
    />
  );
}
