import Link from 'next/link';
import { localeHref, productApps, productCopy } from '@/lib/product';

/**
 * The shared product block (#2608), rendered by the homepage and by
 * `content/docs/(start)/index*.mdx`. Its words live in `lib/product/`, never here.
 */

export function ProductHeadline({ lang, subtitle = false }: { lang: string; subtitle?: boolean }) {
  const copy = productCopy(lang);
  return (
    <div className="not-prose">
      <p className="text-xl font-semibold leading-snug text-fd-foreground md:text-2xl">{copy.headline}</p>
      {subtitle ? <p className="mt-3 text-fd-muted-foreground md:text-lg">{copy.subtitle}</p> : null}
    </div>
  );
}

export function ProductChain({ lang, heading = true }: { lang: string; heading?: boolean }) {
  const { chain } = productCopy(lang);
  return (
    <div className="not-prose">
      {heading ? <h2 className="mb-4 text-2xl font-semibold">{chain.title}</h2> : null}
      <ol className="flex flex-wrap items-center gap-2 text-sm">
        {chain.steps.map((step, i) => (
          <li key={step.href} className="flex items-center gap-2">
            <Link
              href={localeHref(lang, step.href)}
              className="rounded-full border bg-fd-card px-3 py-1.5 font-medium transition-colors hover:bg-fd-accent"
            >
              {step.label}
            </Link>
            {i < chain.steps.length - 1 ? (
              <span aria-hidden className="text-fd-muted-foreground">
                →
              </span>
            ) : null}
          </li>
        ))}
      </ol>
      <p className="mt-4 text-sm text-fd-muted-foreground">
        <Link href={localeHref(lang, chain.noteHref)} className="underline underline-offset-4 hover:text-fd-foreground">
          {chain.note}
        </Link>
      </p>
    </div>
  );
}

export function ProductApps({ lang, heading = true }: { lang: string; heading?: boolean }) {
  const copy = productCopy(lang);
  const apps = productApps(lang);
  return (
    <div className="not-prose">
      {heading ? <h2 className="mb-2 text-2xl font-semibold">{copy.apps.title}</h2> : null}
      <p className="mb-4 text-fd-muted-foreground">{copy.apps.intro}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {apps.map((app) => (
          <Link
            key={app.name}
            href={app.href}
            className="block rounded-xl border bg-fd-card p-4 transition-colors hover:bg-fd-accent"
          >
            <p className="font-semibold">{app.label}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-fd-muted-foreground">
              {copy.apps.who} · {app.who}
            </p>
            <p className="mt-2 text-sm text-fd-muted-foreground">{app.what}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
