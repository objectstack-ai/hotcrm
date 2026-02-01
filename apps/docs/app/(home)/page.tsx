import Link from 'next/link';
import { ArrowRight, Bot, Database,  LayoutTemplate,  Code2, Sparkles, Box, Workflow, BarChart3, ShieldCheck } from 'lucide-react';
import { siteConfig } from '@/lib/layout.shared';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32 md:pt-32 md:pb-48">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
        
        <div className="container relative mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-sm font-medium bg-primary/10 text-primary rounded-full border border-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <Sparkles className="w-4 h-4" />
            <span>The World's First AI-Native CRM</span>
          </div>
          
          <h1 className="max-w-5xl mx-auto text-5xl md:text-7xl font-bold tracking-tight mb-8 bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
            Enterprise Power.<br/>
            Start-up Speed.<br/>
            <span className="text-primary">AI Intelligence.</span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-xl md:text-2xl text-muted-foreground mb-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            The open-source alternative to Salesforce. Built on <strong>ObjectStack Protocol</strong> to combine metadata-driven rigor with agentic AI flexibility.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <Link
              href="/docs"
              className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-base font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              Get Started
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link
              href="/docs/features/overview"
              className="inline-flex h-12 items-center justify-center rounded-md border border-input bg-background px-8 text-base font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              Explore Features
            </Link>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="container mx-auto px-4 py-24 border-t border-border/50">
        <div className="grid md:grid-cols-3 gap-12">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 rounded-2xl bg-primary/10 text-primary">
              <Database className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold">Metadata-Driven</h3>
            <p className="text-muted-foreground leading-relaxed">
              Define your business logic in TypeScript (`.object.ts`). Type-safe, version-controlled, and instantly deployable.
            </p>
          </div>
          
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 rounded-2xl bg-primary/10 text-primary">
              <Bot className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold">Agentic AI</h3>
            <p className="text-muted-foreground leading-relaxed">
              Not just a chatbot. AI Agents proactively manage pipelines, draft emails, and enrich data without human intervention.
            </p>
          </div>
          
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 rounded-2xl bg-primary/10 text-primary">
              <Code2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold">Developer First</h3>
            <p className="text-muted-foreground leading-relaxed">
              Built on <strong>@objectstack/runtime</strong>. Extensible via standard packages. No proprietary languages to learn.
            </p>
          </div>
        </div>
      </section>

      {/* Solutions Grid */}
      <section className="bg-muted/30 py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Complete Business Capabilities</h2>
            <p className="text-muted-foreground text-lg">
              Everything you need to manage the customer lifecycle, available as modular packages.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<UsersIcon />}
              title="Customer 360"
              description="Unified B2B & B2C data graph. The single source of truth for every interaction."
              href="/docs/features/customer-360"
            />
            <FeatureCard
              icon={<TrendingUpIcon />}
              title="Sales Intelligence"
              description="AI-guided selling, outcome-based forecasting, and pipeline automation."
              href="/docs/features/sales-intelligence"
            />
            <FeatureCard
              icon={<BanknoteIcon />}
              title="Revenue Cloud"
              description="CPQ (Configure, Price, Quote), subscription management, and billing."
              href="/docs/features/revenue-cloud"
            />
            <FeatureCard
              icon={<LifeBuoyIcon />}
              title="Service Excellence"
              description="Omni-channel support with autonomous agent resolution."
              href="/docs/features/service-excellence"
            />
            <FeatureCard
              icon={<MegaphoneIcon />}
              title="Marketing Journeys"
              description="Real-time, signal-based customer journeys and segmentation."
              href="/docs/features/marketing-journeys"
            />
             <FeatureCard
              icon={<LayoutTemplate />}
              title="Platform PaaS"
              description="Build your own apps using the same tools we use for the standard clouds."
              href="/docs/features/platform-extensibility"
            />
          </div>
        </div>
      </section>

       {/* Architecture Section */}
       <section className="container mx-auto px-4 py-24 border-t border-border/50">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 text-xs font-semibold bg-accent text-accent-foreground rounded-full uppercase tracking-wider">
              Architecture
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              The Engine: @objectstack/runtime
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              HotCRM is built on a rock-solid foundation. The runtime engine handles the heavy lifting, while you focus on business logic.
            </p>
            
            <div className="space-y-6">
              <ArchitectureItem 
                title="ObjectQL Engine"
                description="Type-safe, permission-aware data access. No raw SQL."
              />
              <ArchitectureItem 
                title="Metadata Registry"
                description="Hot-reloading schema definitions for Objects, Fields, and Views."
              />
              <ArchitectureItem 
                title="Vector Store Integration"
                description="Native support for RAG (Retrieval-Augmented Generation) and semantic search."
              />
            </div>
          </div>
          
          <div className="relative rounded-xl border bg-card p-8 shadow-2xl">
            <div className="space-y-4 font-mono text-sm">
              <div className="flex items-center gap-2 text-muted-foreground border-b pb-4 mb-4">
                <Box className="w-4 h-4" />
                <span>packages/crm/src/opportunity.object.ts</span>
              </div>
              <div className="text-blue-400">import <span className="text-foreground">type</span> <span className="text-yellow-400">{'{ ObjectSchema }'}</span> <span className="text-purple-400">from</span> <span className="text-green-400">'@objectstack/spec'</span>;</div>
              <div className="text-purple-400">export default const <span className="text-yellow-400">Opportunity</span>: <span className="text-yellow-400">ObjectSchema</span> = {'{'}</div>
              <div className="pl-4 text-sky-300">name: <span className="text-green-400">'Opportunity'</span>,</div>
              <div className="pl-4 text-sky-300">fields: {'['}</div>
              <div className="pl-8 text-sky-300">{' { '}</div>
              <div className="pl-12 text-sky-300">name: <span className="text-green-400">'amount'</span>,</div>
              <div className="pl-12 text-sky-300">type: <span className="text-green-400">'currency'</span>,</div>
              <div className="pl-12 text-sky-300">required: <span className="text-blue-400">true</span></div>
              <div className="pl-8 text-sky-300">{' } '}</div>
              <div className="pl-4 text-sky-300">{']'}</div>
              <div className="text-foreground">{'}'}</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-24 text-center">
        <h2 className="text-3xl md:text-5xl font-bold mb-8">Ready to modernize your CRM?</h2>
        <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
          Join the community of developers building the future of enterprise software.
        </p>
        <div className="flex justify-center gap-4">
          <Link
             href="/docs/getting-started/installation"
             className="inline-flex h-12 items-center justify-center rounded-md bg-foreground text-background px-8 text-base font-medium transition-colors hover:bg-foreground/90"
          >
            Start Building
          </Link>
           <Link
             href="https://github.com/hotcrm/hotcrm"
             target="_blank"
             className="inline-flex h-12 items-center justify-center rounded-md border border-input bg-background px-8 text-base font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            View on GitHub
          </Link>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description, href }: { icon: React.ReactNode, title: string, description: string, href?: string }) {
  const content = (
    <div className="flex flex-col h-full bg-card p-6 rounded-xl border hover:border-primary/50 transition-colors">
      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground flex-1">{description}</p>
      {href && (
        <div className="mt-4 flex items-center text-primary font-medium text-sm group">
          Learn more <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href} className="block h-full">{content}</Link>;
  }

  return content;
}

function ArchitectureItem({ title, description }: { title: string, description: string }) {
  return (
    <div className="flex gap-4">
      <div className="mt-1 bg-primary/20 p-2 rounded-full h-fit">
        <ShieldCheck className="w-4 h-4 text-primary" />
      </div>
      <div>
        <h3 className="font-bold text-lg">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

// Icons
function UsersIcon() { return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function TrendingUpIcon() { return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>; }
function BanknoteIcon() { return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>; }
function LifeBuoyIcon() { return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m4.93 19.07 4.24-4.24"/></svg>; }
function MegaphoneIcon() { return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>; }
