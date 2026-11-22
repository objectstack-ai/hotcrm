import type * as PageTree from 'fumadocs-core/page-tree';
import { getLayoutTabs, type LayoutTab } from 'fumadocs-ui/layouts/shared';

/**
 * Sidebar sections (the tab dropdown at the top of the docs sidebar).
 *
 * Each section is a Fumadocs root folder: a `(group)` directory under
 * `content/docs/` whose `meta.json` sets `"root": true`. The parentheses keep
 * the group out of the URL, so `/docs/sales/leads` is the same page it was
 * before the sections existed.
 *
 * Fumadocs only offers a root folder as a tab when the folder itself holds an
 * index or a page; three of the four sections hold folders only (Sales,
 * Service, …). Rather than add a landing page per section (a new URL each),
 * the tab entry point is the section's first page, found in a copy of the
 * tree used only to build the tab list — the sidebar renders the real tree.
 */
export function sectionTabs(tree: PageTree.Root): LayoutTab[] {
  const original = new Map<PageTree.Folder, PageTree.Folder>();
  const children = tree.children.map((node) => {
    if (node.type !== 'folder' || !node.root || node.index) return node;
    const copy = { ...node, index: firstPage(node) };
    original.set(copy, node);
    return copy;
  });

  // Point each tab back at the real folder, so matching the active section
  // compares against the nodes the sidebar actually renders.
  return getLayoutTabs({ ...tree, children }).map((tab) => {
    const folder = tab.$folder && original.get(tab.$folder);
    return folder ? { ...tab, $folder: folder } : tab;
  });
}

function firstPage(folder: PageTree.Folder): PageTree.Item | undefined {
  if (folder.index) return folder.index;
  for (const child of folder.children) {
    if (child.type === 'page' && !child.external) return child;
    if (child.type === 'folder') {
      const found = firstPage(child);
      if (found) return found;
    }
  }
  return undefined;
}
