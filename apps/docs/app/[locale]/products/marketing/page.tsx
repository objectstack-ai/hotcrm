import { Megaphone } from 'lucide-react';
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
  return { title: `${dict.products.marketing.title} - HotCRM`, description: dict.products.marketing.subtitle };
}

export default async function MarketingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);
  return (
    <ProductPageTemplate
      locale={locale as Locale}
      dict={dict}
      title={dict.products.marketing.title}
      subtitle={dict.products.marketing.subtitle}
      description={dict.products.marketing.description}
      features={dict.products.marketing.features}
      icon={<Megaphone className="w-7 h-7" />}
      docsHref="/docs/modules/marketing"
    />
  );
}
