import Link from 'next/link';
import type { Metadata } from 'next';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions, siteConfig } from '@/lib/layout.shared';
import { localeHref, productCopy } from '@/lib/product';
import { ProductApps, ProductChain } from '@/components/product/blocks';
import { homeCopy } from '@/components/product/home-copy';

/**
 * The product homepage at the site root (#2608). Until this card the root only
 * redirected to `/docs`, so a first-time visitor landed in a manual. Sections,
 * in the card's order: headline, business chain, six apps, three scenarios, AI,
 * boundaries, open source and deployment, partners and developers.
 */

const RUN = [
  'git clone https://github.com/objectstack-ai/hotcrm.git && cd hotcrm',
  'pnpm install',
  'pnpm dev',
];

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const copy = productCopy(lang);
  return { title: { absolute: `HotCRM — ${copy.headline}` }, description: copy.subtitle };
}

function Section({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mx-auto w-full max-w-5xl px-4 py-10 md:py-12">
      {children}
    </section>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 text-2xl font-semibold">{children}</h2>;
}

function More({ lang, href, children }: { lang: string; href: string; children: React.ReactNode }) {
  return (
    <Link href={localeHref(lang, href)} className="text-sm font-medium text-fd-primary underline-offset-4 hover:underline">
      {children} →
    </Link>
  );
}

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const product = productCopy(lang);
  const home = homeCopy[lang] ?? homeCopy.en;
  const base = baseOptions(lang);

  return (
    <HomeLayout {...base} links={[{ text: home.docs, url: localeHref(lang, '/docs') }, ...(base.links ?? [])]}>
      <main className="flex flex-1 flex-col">
        <section className="hero-section relative overflow-hidden border-b">
          <div className="mx-auto w-full max-w-5xl px-4 py-20 md:py-28">
            <h1 className="max-w-3xl text-3xl font-bold leading-tight tracking-tight md:text-5xl">{product.headline}</h1>
            <p className="mt-5 max-w-2xl text-lg text-fd-muted-foreground">{product.subtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#run"
                className="rounded-full bg-fd-primary px-5 py-2.5 text-sm font-medium text-fd-primary-foreground transition-opacity hover:opacity-90"
              >
                {home.run}
              </a>
              <a
                href={siteConfig.github}
                className="rounded-full border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-fd-accent"
              >
                {home.github}
              </a>
            </div>
          </div>
        </section>

        <Section>
          <ProductChain lang={lang} />
        </Section>

        <Section>
          <ProductApps lang={lang} />
        </Section>

        <Section>
          <H2>{home.scenarios.title}</H2>
          <p className="mb-4 text-fd-muted-foreground">{home.scenarios.intro}</p>
          <div className="grid gap-3 md:grid-cols-3">
            {home.scenarios.items.map((s) => (
              <Link
                key={s.href}
                href={localeHref(lang, s.href)}
                className="block rounded-xl border bg-fd-card p-4 transition-colors hover:bg-fd-accent"
              >
                <p className="font-semibold">{s.title}</p>
                <p className="mt-2 text-sm text-fd-muted-foreground">{s.text}</p>
              </Link>
            ))}
          </div>
        </Section>

        <Section>
          <H2>{home.ai.title}</H2>
          <div className="grid gap-6 md:grid-cols-3">
            {home.ai.points.map((p) => (
              <div key={p.title}>
                <p className="font-semibold">{p.title}</p>
                <p className="mt-2 mb-3 text-sm text-fd-muted-foreground">{p.text}</p>
                <More lang={lang} href={p.link.href}>
                  {p.link.label}
                </More>
              </div>
            ))}
          </div>
        </Section>

        <Section>
          <H2>{home.boundaries.title}</H2>
          <p className="mb-3 max-w-3xl text-fd-muted-foreground">{home.boundaries.text}</p>
          <More lang={lang} href={home.boundaries.link.href}>
            {home.boundaries.link.label}
          </More>
        </Section>

        <Section id="run">
          <H2>{home.open.title}</H2>
          <ul className="mb-3 list-disc space-y-1 pl-5 text-fd-muted-foreground">
            {home.open.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <More lang={lang} href={home.open.link.href}>
            {home.open.link.label}
          </More>
          <p className="mt-8 mb-2 font-semibold">{home.open.runTitle}</p>
          <pre className="overflow-x-auto rounded-xl border bg-fd-card p-4 text-sm">
            <code>{RUN.join('\n')}</code>
          </pre>
          <p className="mt-2 text-sm text-fd-muted-foreground">{home.open.runAfter}</p>
        </Section>

        <Section>
          <H2>{home.partners.title}</H2>
          <p className="mb-3 max-w-3xl text-fd-muted-foreground">{home.partners.text}</p>
          <div className="flex flex-wrap gap-4">
            {home.partners.links.map((l) => (
              <More key={l.href} lang={lang} href={l.href}>
                {l.label}
              </More>
            ))}
          </div>
          <p className="mt-8 text-sm text-fd-muted-foreground">
            <a href="https://github.com/objectstack-ai/objectstack" className="underline underline-offset-4 hover:text-fd-foreground">
              {home.partners.builtOn}
            </a>
          </p>
        </Section>
      </main>
    </HomeLayout>
  );
}
