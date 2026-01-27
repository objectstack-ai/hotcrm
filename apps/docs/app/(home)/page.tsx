import Link from 'next/link';
import { ArrowRight, TrendingUp, Users, Target, Zap, HeartHandshake, Sparkles } from 'lucide-react';
import { siteConfig } from '@/lib/layout.shared';

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-sm font-medium bg-primary/10 text-primary rounded-full">
            <Sparkles className="w-4 h-4" />
            <span>AI-Powered Enterprise CRM</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Transform Customer Relationships into Revenue
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-4">
            Accelerate sales, delight customers, and grow your business
          </p>
          
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            HotCRM unifies marketing, sales, and customer service in one powerful platform. 
            Close deals faster with AI-powered insights and deliver exceptional customer experiences.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Start Free Trial
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href={siteConfig.github}
              className="inline-flex items-center gap-2 px-6 py-3 border border-border rounded-lg font-medium hover:bg-accent transition-colors"
            >
              See How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16 border-t border-border">
        <h2 className="text-3xl font-bold text-center mb-12">Everything You Need to Grow</h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <FeatureCard
            icon={<TrendingUp className="w-6 h-6" />}
            title="Accelerate Sales"
            description="Win more deals with AI-powered insights, pipeline management, and automated follow-ups that help your team close faster."
          />
          
          <FeatureCard
            icon={<Users className="w-6 h-6" />}
            title="Build Lasting Relationships"
            description="Know your customers inside out with complete interaction history, preferences, and personalized engagement at every touchpoint."
          />
          
          <FeatureCard
            icon={<Target className="w-6 h-6" />}
            title="Smarter Marketing"
            description="Generate more qualified leads with targeted campaigns, automatic scoring, and ROI tracking across all channels."
          />
          
          <FeatureCard
            icon={<Sparkles className="w-6 h-6" />}
            title="AI-Powered Intelligence"
            description="Get recommendations, predictive insights, and automated workflows that make every team member more productive."
          />
          
          <FeatureCard
            icon={<HeartHandshake className="w-6 h-6" />}
            title="Exceptional Customer Service"
            description="Resolve issues faster with intelligent case routing, knowledge base, and SLA management to keep customers happy."
          />
          
          <FeatureCard
            icon={<Zap className="w-6 h-6" />}
            title="Scale with Confidence"
            description="Enterprise-grade security, multi-currency support, approval workflows, and flexible customization for growing businesses."
          />
        </div>
      </section>

      {/* Quick Start - Business Benefits */}
      <section className="container mx-auto px-4 py-16 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Complete Business Solution</h2>
          
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-lg font-semibold mb-3">🎯 Marketing & Lead Generation</h3>
              <p className="text-muted-foreground">
                Launch targeted campaigns, track ROI, and convert more leads with AI-powered scoring and automatic nurturing workflows.
              </p>
            </div>
            
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-lg font-semibold mb-3">💼 Sales Force Automation</h3>
              <p className="text-muted-foreground">
                Manage opportunities, track deals through your pipeline, and get AI recommendations for next steps. Configure quotes, manage contracts, and track payments all in one place.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-lg font-semibold mb-3">🤝 Customer Service & Support</h3>
              <p className="text-muted-foreground">
                Deliver exceptional service with intelligent case management, automated SLA tracking, and a knowledge base that helps agents resolve issues faster.
              </p>
            </div>
          </div>
          
          <div className="text-center mt-8">
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
            >
              Explore all features
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="container mx-auto px-4 py-16 border-t border-border">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto text-center">
          <StatCard number="360°" label="Customer View" />
          <StatCard number="24/7" label="AI Assistant" />
          <StatCard number="All-in-One" label="Platform" />
          <StatCard number="Global" label="Multi-Currency" />
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Business?</h2>
          <p className="text-muted-foreground mb-8">
            Join growing companies using HotCRM to increase revenue, improve customer satisfaction, and scale efficiently.
          </p>
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity text-lg"
          >
            Get Started Today
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
