import Link from 'next/link';
import { ArrowRight, CheckCircle } from 'lucide-react';
import type { Dictionary, Locale } from '@/lib/i18n';

type ProductFeature = {
  title: string;
  description: string;
};

export function ProductPageTemplate({
  locale,
  dict,
  title,
  subtitle,
  description,
  features,
  icon,
  docsHref,
}: {
  locale: Locale;
  dict: Dictionary;
  title: string;
  subtitle: string;
  description: string;
  features: ProductFeature[];
  icon: React.ReactNode;
  docsHref: string;
}) {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="hero-section relative overflow-hidden pt-20 pb-24 md:pt-28 md:pb-32">
        <div className="hero-glow-1" />
        <div className="hero-glow-2" />
        <div className="hero-grid" />
        <div className="container relative mx-auto px-4 z-10">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            {dict.products.backToHome}
          </Link>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              {icon}
            </div>
            <h1 className="text-4xl md:text-6xl font-bold">{title}</h1>
          </div>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl leading-relaxed mb-8">
            {subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/docs/getting-started/introduction"
              className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-8 text-base font-medium text-primary-foreground shadow-lg transition-all hover:shadow-primary/25 hover:shadow-xl"
            >
              {dict.products.getStarted}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link
              href={docsHref}
              className="inline-flex h-12 items-center justify-center rounded-lg border border-border bg-background/50 backdrop-blur-sm px-8 text-base font-medium shadow-sm transition-all hover:bg-accent hover:text-accent-foreground"
            >
              {dict.products.readDocs}
            </Link>
          </div>
        </div>
      </section>

      {/* Description */}
      <section className="container mx-auto px-4 py-16">
        <p className="text-lg text-muted-foreground max-w-4xl leading-relaxed">
          {description}
        </p>
      </section>

      {/* Features Grid */}
      <section className="bg-slate-50 py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{dict.products.keyCapabilities}</h2>
          <p className="text-muted-foreground text-lg mb-12">{dict.products.features}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow hover:border-primary/40"
              >
                <div className="flex items-start gap-3 mb-3">
                  <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <h3 className="font-semibold text-lg">{feature.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pl-8">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden py-24">
        <div className="cta-glow" />
        <div className="container relative mx-auto px-4 text-center z-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">{dict.home.ctaTitle}</h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">{dict.home.ctaSubtitle}</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/docs/getting-started/introduction"
              className="inline-flex h-12 items-center justify-center rounded-lg bg-foreground text-background px-8 text-base font-medium transition-all hover:bg-foreground/90 hover:shadow-lg"
            >
              {dict.home.readDocs}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
