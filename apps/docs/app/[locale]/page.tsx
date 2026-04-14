import Link from 'next/link';
import {
  ArrowRight, Bot, TrendingUp, Users, Shield, Zap, Globe, Target,
  LifeBuoy, Megaphone, Banknote, LayoutTemplate, CheckCircle2,
  Building2, Briefcase, ShoppingCart, Factory, HeartPulse, Lightbulb,
  Mail, MessageSquare, Calendar, FileText, Lock, Award, Play,
} from 'lucide-react';
import { getDictionary, locales } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { IntegrationMarquee } from '@/components/marketing/integration-marquee';

export function generateStaticParams() {
  return locales.map(locale => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);
  return {
    title: `HotCRM - ${dict.home.badge}`,
    description: dict.home.subtitle,
    alternates: {
      languages: {
        'en': '/en',
        'zh': '/zh',
        'x-default': '/en',
      },
    },
  };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="hero-section relative overflow-hidden pt-24 pb-36 md:pt-36 md:pb-52 bg-white">
        <div className="hero-glow-1" />
        <div className="hero-glow-2" />
        <div className="hero-grid" />

        <div className="container relative mx-auto px-4 text-center z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-sm font-medium bg-primary/10 text-primary rounded-full border border-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <Bot className="w-4 h-4" />
            <span>{dict.home.badge}</span>
          </div>

          <h1 className="max-w-5xl mx-auto text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 text-foreground animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
            {dict.home.title1} {dict.home.title2}
            <br />
            <span className="hero-gradient-text">{dict.home.title3}</span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground mb-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200 leading-relaxed">
            {dict.home.subtitle}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <Link
              href="https://demo.hotcrm.com"
              className="hero-cta-primary inline-flex h-12 items-center justify-center rounded-lg bg-primary px-8 text-base font-medium text-primary-foreground shadow-lg transition-all hover:shadow-primary/25 hover:shadow-xl"
            >
              {dict.home.getStarted}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link
              href="https://demo.hotcrm.com"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-border bg-background/50 backdrop-blur-sm px-8 text-base font-medium shadow-sm transition-all hover:bg-accent hover:text-accent-foreground"
            >
              {dict.home.viewOnGithub}
            </Link>
          </div>

          {/* Product Visual */}
          <div className="mt-16 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
            <img
              src="/dashboard-mockup.webp"
              alt="HotCRM Product Dashboard"
              width={1280}
              height={800}
              className="w-full rounded-2xl shadow-2xl ring-1 ring-gray-900/10"
            />
          </div>
        </div>
      </section>

      {/* Customer Logo Wall */}
      <section className="bg-slate-50 border-y border-border/40 py-10">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-muted-foreground mb-6 uppercase tracking-wider font-medium">
            {dict.home.trustTitle}
          </p>
          <div className="customer-logos grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 items-center justify-items-center">
            {[
              { name: 'Technology', icon: <Globe className="w-8 h-8" /> },
              { name: 'Finance', icon: <Building2 className="w-8 h-8" /> },
              { name: 'Retail', icon: <ShoppingCart className="w-8 h-8" /> },
              { name: 'Manufacturing', icon: <Factory className="w-8 h-8" /> },
              { name: 'Healthcare', icon: <HeartPulse className="w-8 h-8" /> },
              { name: 'Services', icon: <Briefcase className="w-8 h-8" /> },
            ].map(industry => (
              <div key={industry.name} className="customer-logo-item flex flex-col items-center gap-2 text-muted-foreground/60 hover:text-foreground transition-colors">
                {industry.icon}
                <span className="text-xs font-medium">{industry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Business Value Proposition */}
      <section className="container mx-auto px-4 py-24">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{dict.home.whyTitle}</h2>
          <p className="text-muted-foreground text-lg">{dict.home.whySubtitle}</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <ValueCard
            icon={<Target className="w-6 h-6" />}
            title={dict.home.metadataTitle}
            description={dict.home.metadataDesc}
          />
          <ValueCard
            icon={<Zap className="w-6 h-6" />}
            title={dict.home.aiTitle}
            description={dict.home.aiDesc}
          />
          <ValueCard
            icon={<Users className="w-6 h-6" />}
            title={dict.home.devTitle}
            description={dict.home.devDesc}
          />
        </div>
      </section>

      {/* Product Showcase */}
      <section className="bg-slate-50 py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 text-xs font-semibold bg-primary/10 text-primary rounded-full uppercase tracking-wider border border-primary/20">
              {dict.home.schemaSubtitle}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">{dict.home.schemaTitle}</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">{dict.home.schemaDesc}</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Globe className="w-5 h-5" />}
              title={dict.home.objectqlTitle}
              description={dict.home.objectqlDesc}
            />
            <FeatureCard
              icon={<Bot className="w-5 h-5" />}
              title={dict.home.hotReloadTitle}
              description={dict.home.hotReloadDesc}
            />
            <FeatureCard
              icon={<TrendingUp className="w-5 h-5" />}
              title={dict.home.vectorTitle}
              description={dict.home.vectorDesc}
            />
          </div>
        </div>
      </section>

      {/* Solutions Grid */}
      <section className="bg-slate-50 py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{dict.home.solutionsTitle}</h2>
            <p className="text-muted-foreground text-lg">{dict.home.solutionsSubtitle}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <SolutionCard
              icon={<TrendingUp className="w-6 h-6" />}
              title={dict.home.salesTitle}
              description={dict.home.salesDesc}
              href={`/${locale}/products/sales`}
              cta={dict.home.learnMore}
            />
            <SolutionCard
              icon={<LifeBuoy className="w-6 h-6" />}
              title={dict.home.serviceTitle}
              description={dict.home.serviceDesc}
              href={`/${locale}/products/service`}
              cta={dict.home.learnMore}
            />
            <SolutionCard
              icon={<Megaphone className="w-6 h-6" />}
              title={dict.home.marketingTitle}
              description={dict.home.marketingDesc}
              href={`/${locale}/products/marketing`}
              cta={dict.home.learnMore}
            />
            <SolutionCard
              icon={<Banknote className="w-6 h-6" />}
              title={dict.home.revenueTitle}
              description={dict.home.revenueDesc}
              href={`/${locale}/products/revenue`}
              cta={dict.home.learnMore}
            />
            <SolutionCard
              icon={<Users className="w-6 h-6" />}
              title={dict.home.hrTitle}
              description={dict.home.hrDesc}
              href={`/${locale}/products/hr`}
              cta={dict.home.learnMore}
            />
            <SolutionCard
              icon={<LayoutTemplate className="w-6 h-6" />}
              title={dict.home.platformTitle}
              description={dict.home.platformDesc}
              href={`/${locale}/products/platform`}
              cta={dict.home.learnMore}
            />
          </div>
        </div>
      </section>

      {/* AI Differentiator Section */}
      <section className="bg-white py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{dict.home.aiSectionTitle}</h2>
            <p className="text-muted-foreground text-lg mb-6">{dict.home.aiSectionSubtitle}</p>
            <p className="text-muted-foreground leading-relaxed">{dict.home.aiSectionDesc}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <AIFeatureCard
              icon={<Target className="w-5 h-5" />}
              title={dict.home.aiFeature1Title}
              description={dict.home.aiFeature1Desc}
            />
            <AIFeatureCard
              icon={<Mail className="w-5 h-5" />}
              title={dict.home.aiFeature2Title}
              description={dict.home.aiFeature2Desc}
            />
            <AIFeatureCard
              icon={<TrendingUp className="w-5 h-5" />}
              title={dict.home.aiFeature3Title}
              description={dict.home.aiFeature3Desc}
            />
          </div>
        </div>
      </section>

      {/* Customer Testimonials */}
      <section className="container mx-auto px-4 py-24">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{dict.home.testimonialsTitle}</h2>
          <p className="text-muted-foreground text-lg">{dict.home.testimonialsSubtitle}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <TestimonialCard
            quote={dict.home.testimonial1Quote}
            author={dict.home.testimonial1Author}
            role={dict.home.testimonial1Role}
            company={dict.home.testimonial1Company}
            avatarImg={1}
          />
          <TestimonialCard
            quote={dict.home.testimonial2Quote}
            author={dict.home.testimonial2Author}
            role={dict.home.testimonial2Role}
            company={dict.home.testimonial2Company}
            avatarImg={11}
          />
          <TestimonialCard
            quote={dict.home.testimonial3Quote}
            author={dict.home.testimonial3Author}
            role={dict.home.testimonial3Role}
            company={dict.home.testimonial3Company}
            avatarImg={20}
          />
        </div>
      </section>

      {/* Industry Solutions */}
      <section className="bg-slate-50 py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{dict.home.industryTitle}</h2>
            <p className="text-muted-foreground text-lg">{dict.home.industrySubtitle}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <IndustryCard icon={<Globe className="w-6 h-6" />} title={dict.home.industryTech} description={dict.home.industryTechDesc} />
            <IndustryCard icon={<Building2 className="w-6 h-6" />} title={dict.home.industryFinance} description={dict.home.industryFinanceDesc} />
            <IndustryCard icon={<ShoppingCart className="w-6 h-6" />} title={dict.home.industryRetail} description={dict.home.industryRetailDesc} />
            <IndustryCard icon={<Factory className="w-6 h-6" />} title={dict.home.industryManufacturing} description={dict.home.industryManufacturingDesc} />
            <IndustryCard icon={<HeartPulse className="w-6 h-6" />} title={dict.home.industryHealthcare} description={dict.home.industryHealthcareDesc} />
            <IndustryCard icon={<Briefcase className="w-6 h-6" />} title={dict.home.industryProfessional} description={dict.home.industryProfessionalDesc} />
          </div>
        </div>
      </section>

      {/* Integration Ecosystem */}
      <section className="container mx-auto px-4 py-24">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{dict.home.integrationsTitle}</h2>
          <p className="text-muted-foreground text-lg">{dict.home.integrationsSubtitle}</p>
        </div>

        <IntegrationMarquee />
      </section>

      {/* Security & Compliance */}
      <section className="bg-white py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{dict.home.securityTitle}</h2>
            <p className="text-muted-foreground text-lg">{dict.home.securitySubtitle}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <SecurityBadge icon={<Shield className="w-5 h-5" />} text={dict.home.securityFeature1} />
            <SecurityBadge icon={<Lock className="w-5 h-5" />} text={dict.home.securityFeature2} />
            <SecurityBadge icon={<Users className="w-5 h-5" />} text={dict.home.securityFeature3} />
            <SecurityBadge icon={<Shield className="w-5 h-5" />} text={dict.home.securityFeature4} />
            <SecurityBadge icon={<Award className="w-5 h-5" />} text={dict.home.securityFeature5} />
            <SecurityBadge icon={<CheckCircle2 className="w-5 h-5" />} text={dict.home.securityFeature6} />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          <StatItem icon={<Users className="w-5 h-5" />} value={dict.home.statsValue1} label={dict.home.statsObjects} />
          <StatItem icon={<Globe className="w-5 h-5" />} value={dict.home.statsValue2} label={dict.home.statsHooks} />
          <StatItem icon={<TrendingUp className="w-5 h-5" />} value={dict.home.statsValue3} label={dict.home.statsTests} />
          <StatItem icon={<Building2 className="w-5 h-5" />} value={dict.home.statsValue4} label={dict.home.statsPackages} />
        </div>
      </section>

      {/* Pricing Entry Point */}
      <section className="bg-slate-50 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">{dict.home.pricingTitle}</h2>
          <p className="text-muted-foreground mb-8">{dict.home.pricingSubtitle}</p>
          <Link
            href={`/${locale}/docs/getting-started/introduction`}
            className="inline-flex h-11 items-center justify-center rounded-full border border-foreground/30 bg-background px-6 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground"
          >
            {dict.home.pricingCta}
            <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden py-28">
        <div className="cta-glow" />
        <div className="container relative mx-auto px-4 text-center z-10">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">{dict.home.ctaTitle}</h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">{dict.home.ctaSubtitle}</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="https://demo.hotcrm.com"
              className="inline-flex h-12 items-center justify-center rounded-lg bg-foreground text-background px-8 text-base font-medium transition-all hover:bg-foreground/90 hover:shadow-lg"
            >
              {dict.home.readDocs}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link
              href="https://demo.hotcrm.com"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-border bg-background/50 backdrop-blur-sm px-8 text-base font-medium shadow-sm transition-all hover:bg-accent hover:text-accent-foreground"
            >
              {dict.home.starOnGithub}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────── */

function ValueCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="value-card group relative rounded-xl border border-gray-100 bg-white p-8 shadow-sm hover:shadow-md transition-shadow hover:border-primary/40">
      <div className="glow-card-shine" />
      <div className="relative z-10">
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-5 group-hover:bg-primary/15 transition-colors">
          {icon}
        </div>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow hover:border-primary/40">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function SolutionCard({ icon, title, description, href, cta }: { icon: React.ReactNode; title: string; description: string; href: string; cta: string }) {
  return (
    <Link href={href} className="group block">
      <div className="flex flex-col gap-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow hover:border-primary/40 h-full">
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/15 transition-colors">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-2 flex items-center gap-1">
            {title}
            <ArrowRight className="w-4 h-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>
    </Link>
  );
}

function AIFeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow hover:border-primary/40">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex shrink-0 items-center justify-center text-primary">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function TestimonialCard({ quote, author, role, company, avatarImg }: { quote: string; author: string; role: string; company: string; avatarImg: number }) {
  return (
    <div className="testimonial-card rounded-xl border border-gray-100 bg-white p-8 shadow-sm hover:shadow-md transition-shadow hover:border-primary/40">
      <div className="mb-6">
        <p className="text-muted-foreground leading-relaxed italic">&quot;{quote}&quot;</p>
      </div>
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`https://i.pravatar.cc/150?img=${avatarImg}`} alt={author} className="w-10 h-10 rounded-full object-cover shrink-0" />
        <div>
          <p className="font-semibold">{author}</p>
          <p className="text-sm text-muted-foreground">{role}</p>
          <p className="text-xs text-muted-foreground">{company}</p>
        </div>
      </div>
    </div>
  );
}

function IndustryCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow hover:border-primary/40">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex shrink-0 items-center justify-center text-primary">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function SecurityBadge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white px-4 py-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="text-primary shrink-0">{icon}</div>
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}

function StatItem({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="text-primary mb-1">{icon}</div>
      <div className="text-3xl md:text-4xl font-bold tracking-tight">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
