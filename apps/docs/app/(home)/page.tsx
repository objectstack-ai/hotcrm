import Link from 'next/link';
import { ArrowRight, Boxes, Database, Zap, Code, Shield, Sparkles } from 'lucide-react';
import { siteConfig } from '@/lib/layout.shared';

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-sm font-medium bg-primary/10 text-primary rounded-full">
            <Sparkles className="w-4 h-4" />
            <span>Enterprise CRM Built on @objectstack/spec</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            HotCRM
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-4">
            World-class Customer Relationship Management
          </p>
          
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Salesforce-level functionality with Apple/Linear-level UX. 
            Built with metadata-driven architecture, ObjectQL, and AI-native features.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href={siteConfig.github}
              className="inline-flex items-center gap-2 px-6 py-3 border border-border rounded-lg font-medium hover:bg-accent transition-colors"
            >
              View on GitHub
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16 border-t border-border">
        <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <FeatureCard
            icon={<Database className="w-6 h-6" />}
            title="Metadata Driven"
            description="All business objects defined natively in TypeScript with strict type safety using @objectstack/spec schemas."
          />
          
          <FeatureCard
            icon={<Code className="w-6 h-6" />}
            title="ObjectQL"
            description="Type-safe query language replacing traditional SQL. No raw SQL or ORMs needed."
          />
          
          <FeatureCard
            icon={<Boxes className="w-6 h-6" />}
            title="14 Core Objects"
            description="Complete CRM suite covering Lead-to-Cash: Account, Contact, Opportunity, Case, and more."
          />
          
          <FeatureCard
            icon={<Sparkles className="w-6 h-6" />}
            title="AI-First Design"
            description="Every major feature enhanced with AI capabilities: scoring, recommendations, and insights."
          />
          
          <FeatureCard
            icon={<Zap className="w-6 h-6" />}
            title="Monorepo Architecture"
            description="Modular package structure with pnpm workspaces for deep customization and scalability."
          />
          
          <FeatureCard
            icon={<Shield className="w-6 h-6" />}
            title="Enterprise Ready"
            description="SLA management, approval workflows, multi-currency support, and row-level security."
          />
        </div>
      </section>

      {/* Quick Start */}
      <section className="container mx-auto px-4 py-16 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Quick Start</h2>
          
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-lg font-semibold mb-3">Installation</h3>
              <pre className="bg-muted p-4 rounded-md overflow-x-auto">
                <code className="text-sm">{`# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start development server
pnpm dev`}</code>
              </pre>
            </div>
            
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-lg font-semibold mb-3">ObjectQL Example</h3>
              <pre className="bg-muted p-4 rounded-md overflow-x-auto">
                <code className="text-sm">{`// Query technology accounts
const accounts = await objectql.find({
  object: 'Account',
  fields: ['Name', 'Industry'],
  filters: [['Industry', '=', 'Technology']]
});`}</code>
              </pre>
            </div>
          </div>
          
          <div className="text-center mt-8">
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
            >
              Read full documentation
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="container mx-auto px-4 py-16 border-t border-border">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto text-center">
          <StatCard number="14" label="Core Objects" />
          <StatCard number="7" label="Sales Stages" />
          <StatCard number="8" label="Currencies" />
          <StatCard number="6" label="Service Channels" />
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-muted-foreground mb-8">
            Dive into the documentation and start building with HotCRM today.
          </p>
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity text-lg"
          >
            Explore Documentation
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 hover:shadow-lg transition-shadow">
      <div className="mb-4 text-primary">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function StatCard({ number, label }: { number: string; label: string }) {
  return (
    <div>
      <div className="text-4xl font-bold text-primary mb-2">{number}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
