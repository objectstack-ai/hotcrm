import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';
import { sectionTabs } from '@/lib/section-tabs';

export default async function Layout({
  params,
  children,
}: {
  params: Promise<{ lang: string }>;
  children: React.ReactNode;
}) {
  const { lang } = await params;
  const tree = source.getPageTree(lang);

  return (
    <DocsLayout tree={tree} tabs={sectionTabs(tree)} {...baseOptions(lang)}>
      {children}
    </DocsLayout>
  );
}
