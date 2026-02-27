import Link from 'next/link';
import {
  ArrowRight, Bot, Database, Code2, Sparkles, Box, ShieldCheck,
  TrendingUp, LifeBuoy, Megaphone, Banknote, Users, LayoutTemplate,
  GitBranch, TestTube, Blocks, Cpu, Terminal, Zap, Lock, Globe,
} from 'lucide-react';
import { getDictionary, locales } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';

export function generateStaticParams() {
  return locales.map(locale => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);
  return {
    title: `HotCRM - ${dict.home.badge}`,
    description: dict.home.subtitle,
  };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="hero-section relative overflow-hidden pt-24 pb-36 md:pt-36 md:pb-52">
        <div className="hero-glow-1" />
        <div className="hero-glow-2" />
        <div className="hero-grid" />

        <div className="container relative mx-auto px-4 text-center z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-sm font-medium bg-primary/10 text-primary rounded-full border border-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <Sparkles className="w-4 h-4" />
            <span>{dict.home.badge}</span>
          </div>

          <h1 className="max-w-5xl mx-auto text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 text-foreground animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
            {dict.home.title1}
            <br />
            {dict.home.title2}
            <br />
            <span className="hero-gradient-text">{dict.home.title3}</span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground mb-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200 leading-relaxed">
            {dict.home.subtitle}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <Link
              href="/docs/getting-started/introduction"
              className="hero-cta-primary inline-flex h-12 items-center justify-center rounded-lg bg-primary px-8 text-base font-medium text-primary-foreground shadow-lg transition-all hover:shadow-primary/25 hover:shadow-xl"
            >
              {dict.home.getStarted}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link
              href="https://github.com/objectstack-ai/hotcrm"
              target="_blank"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-border bg-background/50 backdrop-blur-sm px-8 text-base font-medium shadow-sm transition-all hover:bg-accent hover:text-accent-foreground"
            >
              <GitBranch className="mr-2 w-5 h-5" />
              {dict.home.viewOnGithub}
            </Link>
          </div>

          {/* Terminal preview */}
          <div className="mt-16 max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
            <div className="terminal-window rounded-xl border border-border/60 bg-card/80 backdrop-blur-md shadow-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/30">
                <div className="w-3 h-3 rounded-full bg-red-400/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                <div className="w-3 h-3 rounded-full bg-green-400/80" />
                <span className="ml-2 text-xs text-muted-foreground font-mono">Terminal</span>
              </div>
              <div className="p-4 font-mono text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Terminal className="w-4 h-4 text-primary" />
                  <span className="text-primary">$</span>
                  <span className="text-foreground">{dict.home.terminal}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Block */}
      <section className="border-y border-border/40 bg-muted/20 py-10">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-muted-foreground mb-6 uppercase tracking-wider font-medium">
            {dict.home.trustTitle}
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-14">
            {['TypeScript', 'React 19', 'Next.js 16', 'Zod 4', 'Pino', 'Vitest'].map(label => (
              <span key={label} className="text-sm font-medium text-muted-foreground/70 hover:text-foreground transition-colors">
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Why HotCRM */}
      <section className="container mx-auto px-4 py-24">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{dict.home.whyTitle}</h2>
          <p className="text-muted-foreground text-lg">{dict.home.whySubtitle}</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <GlowCard icon={<Database className="w-6 h-6" />} title={dict.home.metadataTitle} description={dict.home.metadataDesc} />
          <GlowCard icon={<Bot className="w-6 h-6" />} title={dict.home.aiTitle} description={dict.home.aiDesc} />
          <GlowCard icon={<Code2 className="w-6 h-6" />} title={dict.home.devTitle} description={dict.home.devDesc} />
        </div>
      </section>

      {/* Schema as Code */}
      <section className="bg-muted/20 border-y border-border/40 py-24">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 text-xs font-semibold bg-primary/10 text-primary rounded-full uppercase tracking-wider border border-primary/20">
                {dict.home.schemaSubtitle}
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">{dict.home.schemaTitle}</h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">{dict.home.schemaDesc}</p>
              <div className="space-y-5">
                <ArchitectureItem icon={<ShieldCheck className="w-4 h-4" />} title={dict.home.objectqlTitle} description={dict.home.objectqlDesc} />
                <ArchitectureItem icon={<Zap className="w-4 h-4" />} title={dict.home.hotReloadTitle} description={dict.home.hotReloadDesc} />
                <ArchitectureItem icon={<Globe className="w-4 h-4" />} title={dict.home.vectorTitle} description={dict.home.vectorDesc} />
              </div>
            </div>

            <div className="code-block-wrapper relative">
              <div className="code-block-glow" />
              <div className="relative rounded-xl border border-border/60 bg-card shadow-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/30">
                  <Box className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-mono">opportunity.object.ts</span>
                </div>
                <div className="p-6 font-mono text-sm leading-6 overflow-x-auto">
                  <div><span className="text-blue-400">import</span> {'{'} <span className="text-yellow-400">ObjectSchema, Field</span> {'}'} <span className="text-blue-400">from</span> <span className="text-green-400">&apos;@objectstack/spec/data&apos;</span>;</div>
                  <div className="mt-3" />
                  <div><span className="text-purple-400">export const</span> <span className="text-yellow-400">Opportunity</span> = <span className="text-blue-400">ObjectSchema</span>.<span className="text-yellow-400">create</span>({'{'}</div>
                  <div className="pl-4"><span className="text-sky-300">name</span>: <span className="text-green-400">&apos;opportunity&apos;</span>,</div>
                  <div className="pl-4"><span className="text-sky-300">label</span>: <span className="text-green-400">&apos;Opportunity&apos;</span>,</div>
                  <div className="pl-4"><span className="text-sky-300">fields</span>: {'{'}</div>
                  <div className="pl-8"><span className="text-sky-300">amount</span>: <span className="text-blue-400">Field</span>.<span className="text-yellow-400">currency</span>({'{'}</div>
                  <div className="pl-12"><span className="text-sky-300">label</span>: <span className="text-green-400">&apos;Amount&apos;</span>,</div>
                  <div className="pl-12"><span className="text-sky-300">required</span>: <span className="text-blue-400">true</span>,</div>
                  <div className="pl-8">{'}'}),</div>
                  <div className="pl-8"><span className="text-sky-300">stage</span>: <span className="text-blue-400">Field</span>.<span className="text-yellow-400">select</span>({'{'}</div>
                  <div className="pl-12"><span className="text-sky-300">label</span>: <span className="text-green-400">&apos;Stage&apos;</span>,</div>
                  <div className="pl-12"><span className="text-sky-300">options</span>: [<span className="text-green-400">&apos;Prospecting&apos;</span>, <span className="text-green-400">&apos;Negotiation&apos;</span>, <span className="text-green-400">&apos;Closed Won&apos;</span>],</div>
                  <div className="pl-8">{'}'}),</div>
                  <div className="pl-4">{'}'}</div>
                  <div>{'}'});</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solutions Grid */}
      <section className="container mx-auto px-4 py-24">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{dict.home.solutionsTitle}</h2>
          <p className="text-muted-foreground text-lg">{dict.home.solutionsSubtitle}</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <SolutionCard icon={<TrendingUp className="w-5 h-5" />} title={dict.home.salesTitle} description={dict.home.salesDesc} href={`/${locale}/products/sales`} cta={dict.home.learnMore} />
          <SolutionCard icon={<LifeBuoy className="w-5 h-5" />} title={dict.home.serviceTitle} description={dict.home.serviceDesc} href={`/${locale}/products/service`} cta={dict.home.learnMore} />
          <SolutionCard icon={<Megaphone className="w-5 h-5" />} title={dict.home.marketingTitle} description={dict.home.marketingDesc} href={`/${locale}/products/marketing`} cta={dict.home.learnMore} />
          <SolutionCard icon={<Banknote className="w-5 h-5" />} title={dict.home.revenueTitle} description={dict.home.revenueDesc} href={`/${locale}/products/revenue`} cta={dict.home.learnMore} />
          <SolutionCard icon={<Users className="w-5 h-5" />} title={dict.home.hrTitle} description={dict.home.hrDesc} href={`/${locale}/products/hr`} cta={dict.home.learnMore} />
          <SolutionCard icon={<LayoutTemplate className="w-5 h-5" />} title={dict.home.platformTitle} description={dict.home.platformDesc} href={`/${locale}/products/platform`} cta={dict.home.learnMore} />
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border/40 bg-muted/20 py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            <StatItem icon={<Blocks className="w-5 h-5" />} value="148" label={dict.home.statsObjects} />
            <StatItem icon={<Lock className="w-5 h-5" />} value="121" label={dict.home.statsHooks} />
            <StatItem icon={<TestTube className="w-5 h-5" />} value="3,813" label={dict.home.statsTests} />
            <StatItem icon={<Cpu className="w-5 h-5" />} value="13" label={dict.home.statsPackages} />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden py-28">
        <div className="cta-glow" />
        <div className="container relative mx-auto px-4 text-center z-10">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">{dict.home.ctaTitle}</h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">{dict.home.ctaSubtitle}</p>
          <div className="mb-10 inline-flex items-center gap-3 px-6 py-3 rounded-lg border border-border/60 bg-card/80 backdrop-blur-sm font-mono text-sm shadow-lg">
            <Terminal className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">$</span>
            <span className="text-foreground">npx create-hotcrm@latest</span>
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/docs/getting-started/introduction"
              className="inline-flex h-12 items-center justify-center rounded-lg bg-foreground text-background px-8 text-base font-medium transition-all hover:bg-foreground/90 hover:shadow-lg"
            >
              {dict.home.readDocs}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link
              href="https://github.com/objectstack-ai/hotcrm"
              target="_blank"
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

function GlowCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="glow-card group relative rounded-xl border border-border/60 bg-card p-8 transition-all hover:border-primary/40 hover:shadow-lg">
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

function SolutionCard({ icon, title, description, href, cta }: { icon: React.ReactNode; title: string; description: string; href: string; cta: string }) {
  return (
    <Link href={href} className="group block">
      <div className="flex items-start gap-4 rounded-xl border border-border/60 bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md hover:bg-accent/30">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex shrink-0 items-center justify-center text-primary group-hover:bg-primary/15 transition-colors">
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold mb-1 flex items-center gap-1">
            {title}
            <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
          </h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </Link>
  );
}

function ArchitectureItem({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex gap-4">
      <div className="mt-1 w-8 h-8 bg-primary/10 flex shrink-0 items-center justify-center rounded-lg text-primary">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-base">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
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
