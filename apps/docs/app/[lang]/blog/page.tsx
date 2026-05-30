import Link from 'next/link';
import { blogSource } from '@/lib/source';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Updates, guides, and announcements from the HotCRM team.',
};

export function generateStaticParams() {
  return blogSource.getLanguages().map((entry) => ({ lang: entry.language }));
}

export default async function BlogIndex({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const posts = [...blogSource.getPages(lang)].sort((a, b) => {
    const da = a.data.date ? new Date(a.data.date).getTime() : 0;
    const db = b.data.date ? new Date(b.data.date).getTime() : 0;
    return db - da;
  });

  return (
    <main className="container mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-2 text-3xl font-bold">Blog</h1>
      <p className="mb-10 text-fd-muted-foreground">
        Updates, guides, and announcements from the HotCRM team.
      </p>

      <ul className="flex flex-col gap-6">
        {posts.map((post) => (
          <li key={post.url}>
            <Link
              href={post.url}
              className="block rounded-lg border border-fd-border p-5 transition-colors hover:bg-fd-accent"
            >
              <h2 className="text-xl font-semibold">{post.data.title}</h2>
              {post.data.description ? (
                <p className="mt-1 text-fd-muted-foreground">{post.data.description}</p>
              ) : null}
              <p className="mt-3 text-sm text-fd-muted-foreground">
                {post.data.author}
                {post.data.date
                  ? ` · ${new Date(post.data.date).toLocaleDateString(lang)}`
                  : null}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
