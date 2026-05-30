import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { blogSource } from '@/lib/source';
import { getMDXComponents } from '@/mdx-components';
import { i18n } from '@/lib/i18n';

export function generateStaticParams() {
  // Blog posts are flat (single-segment `[slug]`), so collapse the slug array
  // that `generateParams` returns into a string for Next's dynamic segment.
  return blogSource.generateParams('slug', 'lang').map(({ slug, lang }) => ({
    slug: slug.join('/'),
    lang,
  }));
}

export async function generateMetadata(
  props: PageProps<'/[lang]/blog/[slug]'>,
): Promise<Metadata> {
  const { lang, slug } = await props.params;
  const page = blogSource.getPage([slug], lang);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
  };
}

export default async function BlogPost(props: PageProps<'/[lang]/blog/[slug]'>) {
  const { lang, slug } = await props.params;
  const page = blogSource.getPage([slug], lang);
  if (!page) notFound();

  const MDX = page.data.body;
  const prefix = lang === i18n.defaultLanguage ? '' : `/${lang}`;
  const backLabel =
    lang === 'zh-Hans' ? '← 博客' : lang === 'zh-Hant' ? '← 部落格' : '← Blog';

  return (
    <main className="container mx-auto max-w-3xl px-4 py-16">
      <Link href={`${prefix}/blog`} className="text-sm text-fd-muted-foreground hover:underline">
        {backLabel}
      </Link>

      <article className="mt-6">
        <h1 className="mb-2 text-3xl font-bold">{page.data.title}</h1>
        <p className="mb-8 text-sm text-fd-muted-foreground">
          {page.data.author}
          {page.data.date ? ` · ${new Date(page.data.date).toLocaleDateString(lang)}` : null}
        </p>
        <div className="prose dark:prose-invert">
          <MDX components={getMDXComponents()} />
        </div>
      </article>
    </main>
  );
}
