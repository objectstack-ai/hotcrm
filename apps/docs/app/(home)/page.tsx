import Link from 'next/link';
import { ArrowRight, Bot, Database, Code2, Sparkles, Box, ShieldCheck, TrendingUp, LifeBuoy, Megaphone, Banknote, Users, LayoutTemplate, GitBranch, TestTube, Blocks, Cpu, Terminal, Zap, Lock, Globe } from 'lucide-react';
import { siteConfig } from '@/lib/layout.shared';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section — Multi-layer glow + gradient */}
      <section className="hero-section relative overflow-hidden pt-24 pb-36 md:pt-36 md:pb-52">
        {/* Glow layers */}
        <div className="hero-glow-1" />
        <div className="hero-glow-2" />
        <div className="hero-grid" />

        <div className="container relative mx-auto px-4 text-center z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-sm font-medium bg-primary/10 text-primary rounded-full border border-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <Sparkles className="w-4 h-4" />
            <span>The World&apos;s First AI-Native CRM</span>
          </div>

          <h1 className="max-w-5xl mx-auto text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 text-foreground animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
            Enterprise Power.
            <br />
            Start-up Speed.
            <br />
            <span className="hero-gradient-text">AI Intelligence.</span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground mb-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200 leading-relaxed">
            The open-source alternative to Salesforce. Built on{' '}
            <strong className="text-foreground">ObjectStack Protocol</strong> — metadata-driven
            rigor meets agentic AI flexibility.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <Link
              href="/docs"
              className="hero-cta-primary inline-flex h-12 items-center justify-center rounded-lg bg-primary px-8 text-base font-medium text-primary-foreground shadow-lg transition-all hover:shadow-primary/25 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Get Started
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link
              href={siteConfig.github}
              target="_blank"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-border bg-background/50 backdrop-blur-sm px-8 text-base font-medium shadow-sm transition-all hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <GitBranch className="mr-2 w-5 h-5" />
              View on GitHub
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
                  <span className="text-foreground">npx create-hotcrm@latest my-crm</span>
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
            Built with production-grade technologies
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-14">
            <TrustItem label="TypeScript" />
            <TrustItem label="React 19" />
            <TrustItem label="Next.js 16" />
            <TrustItem label="Zod 4" />
            <TrustItem label="Pino" />
            <TrustItem label="Vitest" />
          </div>
        </div>
      </section>

      {/* Core Value Propositions — 3-column with hover glow */}
      <section className="container mx-auto px-4 py-24">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Why HotCRM?</h2>
          <p className="text-muted-foreground text-lg">
            A CRM platform designed for the way modern teams actually work.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <GlowCard
            icon={<Database className="w-6 h-6" />}
            title="Metadata-Driven"
            description="Define business objects in TypeScript. Type-safe, version-controlled, and instantly deployable."
          />
          <GlowCard
            icon={<Bot className="w-6 h-6" />}
            title="Agentic AI"
            description="AI Agents that proactively manage pipelines, draft emails, and enrich data autonomously."
          />
          <GlowCard
            icon={<Code2 className="w-6 h-6" />}
            title="Developer First"
            description="Built on @objectstack/runtime. Extensible via standard packages. No proprietary DSL."
          />
        </div>
      </section>

      {/* Code Highlight Section */}
      <section className="bg-muted/20 border-y border-border/40 py-24">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 text-xs font-semibold bg-primary/10 text-primary rounded-full uppercase tracking-wider border border-primary/20">
                Define Once, Run Everywhere
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Schema as Code
              </h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Business objects are TypeScript files — validated at build time, version-controlled in Git, and hot-reloaded at runtime.
              </p>

              <div className="space-y-5">
                <ArchitectureItem
                  icon={<ShieldCheck className="w-4 h-4" />}
                  title="ObjectQL Engine"
                  description="Type-safe, permission-aware data access layer. Zero raw SQL."
                />
                <ArchitectureItem
                  icon={<Zap className="w-4 h-4" />}
                  title="Hot-Reload Registry"
                  description="Schema changes reflect instantly. No downtime deployments."
                />
                <ArchitectureItem
                  icon={<Globe className="w-4 h-4" />}
                  title="Vector Store + RAG"
                  description="Native semantic search and retrieval-augmented generation."
                />
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

      {/* Solution Grid */}
      <section className="container mx-auto px-4 py-24">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Complete Business Capabilities</h2>
          <p className="text-muted-foreground text-lg">
            Modular packages for the entire customer lifecycle.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <SolutionCard
            icon={<TrendingUp className="w-5 h-5" />}
            title="Sales Cloud"
            description="Leads, Opportunities, and Deals."
            href="/docs/modules/sales"
          />
          <SolutionCard
            icon={<LifeBuoy className="w-5 h-5" />}
            title="Service Cloud"
            description="Cases, Knowledge, and SLA tracking."
            href="/docs/modules/service"
          />
          <SolutionCard
            icon={<Megaphone className="w-5 h-5" />}
            title="Marketing Cloud"
            description="Campaigns, Journeys, and ROI."
            href="/docs/modules/marketing"
          />
          <SolutionCard
            icon={<Banknote className="w-5 h-5" />}
            title="Revenue Cloud"
            description="CPQ, Billing, and Subscriptions."
            href="/docs/modules/revenue"
          />
          <SolutionCard
            icon={<Users className="w-5 h-5" />}
            title="HR Cloud"
            description="Recruitment to Retirement."
            href="/docs/modules/hr"
          />
          <SolutionCard
            icon={<LayoutTemplate className="w-5 h-5" />}
            title="Platform & AI"
            description="ObjectQL, Metadata, and Agents."
            href="/docs/modules/platform"
          />
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-border/40 bg-muted/20 py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            <StatItem icon={<Blocks className="w-5 h-5" />} value="148" label="Business Objects" />
            <StatItem icon={<Lock className="w-5 h-5" />} value="121" label="Server Hooks" />
            <StatItem icon={<TestTube className="w-5 h-5" />} value="3,813" label="Tests Passing" />
            <StatItem icon={<Cpu className="w-5 h-5" />} value="13" label="Business Packages" />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden py-28">
        <div className="cta-glow" />
        <div className="container relative mx-auto px-4 text-center z-10">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Ship your CRM in weeks, not quarters.
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            148 business objects. 13 packages. One command to start.
          </p>

          {/* npx command block */}
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
              Read the Docs
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link
              href={siteConfig.github}
              target="_blank"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-border bg-background/50 backdrop-blur-sm px-8 text-base font-medium shadow-sm transition-all hover:bg-accent hover:text-accent-foreground"
            >
              Star on GitHub
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────── */

function TrustItem({ label }: { label: string }) {
  return (
    <span className="text-sm font-medium text-muted-foreground/70 hover:text-foreground transition-colors">
      {label}
    </span>
  );
}

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

function SolutionCard({ icon, title, description, href }: { icon: React.ReactNode; title: string; description: string; href: string }) {
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
