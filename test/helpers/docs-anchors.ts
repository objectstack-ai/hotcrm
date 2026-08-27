// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { remark } from 'remark';
import remarkMdx from 'remark-mdx';
import remarkFrontmatter from 'remark-frontmatter';
import { remarkHeading } from 'fumadocs-core/mdx-plugins';
import { REPO_ROOT } from './repo-root';

/**
 * The anchor half of a `content/docs` link, answered by the renderer itself.
 *
 * ## Why this drives fumadocs instead of slugging the heading here
 *
 * A guard that re-implements "lowercase it and hyphenate the spaces" is wrong
 * in **four** measured ways against the page a reader actually loads, and the
 * two failure directions cost differently:
 *
 * | heading source | id fumadocs emits | what a hand-rolled slugger says |
 * | --- | --- | --- |
 * | `### 🚦 Case Triage` | `-case-triage` | `case-triage` — false GREEN |
 * | `### 🚦 Case Triage [#case-triage]` | `case-triage` | `-case-triage-case-triage` — false RED |
 * | `## 流程（多步骤）` | `流程多步骤` | full-width parens survive — false RED |
 * | `## Standard dashboards & reports` | `standard-dashboards--reports` | one hyphen — false RED |
 *
 * False green is a guard that reports clean about a broken link. False red is
 * worse in practice: a guard that fails on correct docs gets muted, and then
 * both directions are gone. The only way to be right about all four at once is
 * to stop having a second opinion — so the ids below come out of
 * `remarkHeading` from `fumadocs-core/mdx-plugins`, the same plugin
 * `apps/docs` renders with, read off the TOC it writes onto the vfile.
 *
 * `test/docs-anchor-links.test.ts` pins the version this resolves to against
 * `apps/docs/package.json`, because "the renderer's own rule" stops being true
 * the moment the two copies of fumadocs-core drift apart.
 *
 * ## Why the whole MDX pipeline and not just the heading plugin
 *
 * `remarkMdx` is not decoration. It makes an unparseable page a thrown error
 * instead of a silently different tree, which is what catches the `{#id}`
 * spelling of an explicit heading id: `{…}` in `.mdx` is a JSX expression, and
 * `{#case-triage}` is not valid JS, so the page dies at build time with
 * `Could not parse expression with acorn`. The id syntax fumadocs reads is
 * `[#id]` — see `test/helpers/heading-label.ts` for that regex, copied from the
 * same fumadocs release. A guard that parsed plain markdown would happily
 * report the anchors of a page that cannot ship.
 */
const processor = remark().use(remarkFrontmatter, ['yaml']).use(remarkMdx).use(remarkHeading);

/** Locales `apps/docs/lib/i18n.ts` declares beyond the default. */
export const LOCALES = ['zh-Hans', 'zh-Hant'] as const;
/** `defineI18n({ defaultLanguage: 'en', hideLocale: 'default-locale' })` — no URL prefix. */
export const DEFAULT_LOCALE = 'en';

/** One `.mdx` page, addressed the way a link addresses it. */
export interface DocsPage {
  /** POSIX path relative to `content/docs`, e.g. `service/knowledge-base.zh-Hans.mdx`. */
  readonly file: string;
  readonly source: string;
}

/** A link this guard refuses, with enough detail to fix it without re-running anything. */
export interface AnchorIssue {
  readonly file: string;
  readonly line: number;
  readonly href: string;
  readonly reason: string;
}

/** A page whose MDX does not parse — its ids are unknowable, not empty. */
export interface ParseFailure {
  readonly file: string;
  readonly error: string;
}

interface MdastNode {
  readonly type: string;
  readonly children?: readonly MdastNode[];
  readonly position?: { readonly start?: { readonly line?: number } };
  readonly url?: string;
  readonly attributes?: readonly {
    readonly type?: string;
    readonly name?: string;
    readonly value?: unknown;
  }[];
}

const walk = (node: MdastNode, visit: (n: MdastNode) => void): void => {
  visit(node);
  for (const child of node.children ?? []) walk(child, visit);
};

/**
 * Every heading id fumadocs emits for a page, in document order.
 *
 * Includes the `#` -less form of each TOC url, the depth-1 heading included:
 * fumadocs gives the body `# Title` an id like any other heading, so a link may
 * legitimately point at it.
 */
export const headingIds = async (source: string): Promise<string[]> => {
  const file = await processor.process(source);
  const data = file.data as unknown as { toc?: readonly { url?: unknown }[] };
  return (data.toc ?? []).map((item) => String(item.url ?? '').replace(/^#/, ''));
};

/** Every link href on a page, with the line it sits on. */
const linksOf = (source: string): { href: string; line: number }[] => {
  const found: { href: string; line: number }[] = [];
  walk(processor.parse(source) as unknown as MdastNode, (node) => {
    const line = node.position?.start?.line ?? 0;
    // Markdown links — including the ones nested inside a `<Callout>`, which
    // MDX parses as flow content rather than as an opaque HTML block. That is
    // not a detail: the three live dangling links this guard was written for
    // all sit inside a `<Callout type="info">`.
    if (node.type === 'link' && typeof node.url === 'string') found.push({ href: node.url, line });
    // `<Card href="/docs/…#a" />` — no page writes one today, and a guard that
    // only reads markdown links would never say so.
    if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
      for (const attribute of node.attributes ?? []) {
        if (attribute.type === 'mdxJsxAttribute' && attribute.name === 'href') {
          if (typeof attribute.value === 'string') found.push({ href: attribute.value, line });
        }
      }
    }
  });
  return found;
};

interface PageIdentity {
  readonly locale: string;
  /** Slug path under `/docs`, `''` for `content/docs/index.mdx`. */
  readonly slug: string;
}

/** The URL a `content/docs` file answers to, per `apps/docs/lib/source.ts`. */
export const pageIdentity = (file: string): PageIdentity => {
  let stem = file.replace(/\.mdx$/, '');
  let locale: string = DEFAULT_LOCALE;
  for (const candidate of LOCALES) {
    if (stem.endsWith(`.${candidate}`)) {
      locale = candidate;
      stem = stem.slice(0, -(candidate.length + 1));
    }
  }
  const slug = stem === 'index' ? '' : stem.replace(/\/index$/, '');
  return { locale, slug };
};

const key = (locale: string, slug: string): string => `${locale}:${slug}`;

/**
 * Audit the anchored intra-doc links of a set of pages.
 *
 * Three rules, all of them "does this resolve" — never "does this belong".
 * Whether a localized page should carry an anchor at all is an editorial
 * question with its own decision to make, and it is deliberately not asked
 * here.
 *
 *  1. **the target page exists.** Only for anchored links: an un-anchored link
 *     is a broader surface than this guard claims, and widening it here would
 *     import failures that belong to other cards.
 *  2. **the anchor exists on it**, compared against the renderer's own ids.
 *  3. **the link's language prefix matches the page it is written on.** A
 *     `/docs/…` link on a `.zh-Hans.mdx` page walks the reader out of their
 *     locale; `/zh-Hant/…` on a `.zh-Hans.mdx` page walks them into the wrong
 *     one. Zero pages do this today, so this rule is pure recurrence
 *     prevention — it is here because the cost of carrying it is one
 *     comparison, not because it has stock to clear.
 *
 * Links out of the docs tree (`http…`, `mailto:`, `/blog/…`) are not this
 * guard's surface and are skipped.
 */
export const auditAnchors = async (
  pages: readonly DocsPage[],
): Promise<{ issues: AnchorIssue[]; parseFailures: ParseFailure[]; anchoredLinks: number }> => {
  const ids = new Map<string, string[]>();
  const byUrl = new Map<string, string>();
  const parseFailures: ParseFailure[] = [];

  for (const page of pages) {
    const identity = pageIdentity(page.file);
    byUrl.set(key(identity.locale, identity.slug), page.file);
    try {
      ids.set(page.file, await headingIds(page.source));
    } catch (error) {
      parseFailures.push({ file: page.file, error: String(error).split('\n')[0] });
    }
  }

  const issues: AnchorIssue[] = [];
  let anchoredLinks = 0;

  for (const page of pages) {
    if (!ids.has(page.file)) continue; // its own parse failure is already reported
    const self = pageIdentity(page.file);
    for (const { href, line } of linksOf(page.source)) {
      const hash = href.indexOf('#');
      if (hash < 0) continue; // no anchor — page-existence alone is not this guard
      if (/^[a-z][a-z0-9+.-]*:/i.test(href)) continue; // http:, mailto:, …
      const path = href.slice(0, hash);
      const anchor = href.slice(hash + 1);
      const at = { file: page.file, line, href };

      let targetLocale = self.locale;
      let slug: string;
      if (path === '') {
        slug = self.slug; // `#anchor` — same page
      } else if (!path.startsWith('/')) {
        issues.push({ ...at, reason: 'not a site-absolute link; write `/docs/…` or `#anchor`' });
        continue;
      } else {
        // The locale of a site-absolute link is whatever its own prefix says —
        // never the locale of the page it is written on. Reading it off the
        // containing page instead makes rule 3 unfalsifiable: a `/docs/…` link
        // on a `.zh-Hans.mdx` page would be compared against itself and always
        // agree. No page in the tree writes one today, so the repo would have
        // stayed green over a rule that could not fire; the fixture that feeds
        // it the violation is what caught it.
        let rest = path;
        targetLocale = DEFAULT_LOCALE;
        for (const candidate of LOCALES) {
          if (rest === `/${candidate}` || rest.startsWith(`/${candidate}/`)) {
            targetLocale = candidate;
            rest = rest.slice(candidate.length + 1);
          }
        }
        if (!(rest === '/docs' || rest.startsWith('/docs/'))) continue; // /blog/…, /og/…
        slug = rest.slice('/docs'.length).replace(/^\//, '').replace(/\/$/, '');
      }

      anchoredLinks += 1;

      if (targetLocale !== self.locale) {
        issues.push({
          ...at,
          reason: `language prefix is ${targetLocale}, but the page is ${self.locale}`,
        });
        continue;
      }
      if (anchor === '') {
        issues.push({ ...at, reason: 'empty anchor — drop the trailing `#`' });
        continue;
      }

      // `fallbackLanguage: 'en'` — an untranslated page renders its English
      // source, so the English ids are what the reader gets.
      const target = byUrl.get(key(targetLocale, slug)) ?? byUrl.get(key(DEFAULT_LOCALE, slug));
      if (target === undefined) {
        issues.push({ ...at, reason: `no page answers /${slug}` });
        continue;
      }
      const available = ids.get(target);
      if (available === undefined) {
        issues.push({ ...at, reason: `target ${target} does not parse, so its ids are unknown` });
        continue;
      }
      let decoded = anchor;
      try {
        decoded = decodeURIComponent(anchor);
      } catch {
        /* a malformed escape is not an id either — fall through with the raw text */
      }
      if (!available.includes(anchor) && !available.includes(decoded)) {
        issues.push({ ...at, reason: `${target} has no heading with id "${decoded}"` });
      }
    }
  }

  return { issues, parseFailures, anchoredLinks };
};

/** Every `.mdx` page under `content/docs`, read off disk. */
export const readDocsPages = (): DocsPage[] => {
  const root = join(REPO_ROOT, 'content/docs');
  const collect = (dir: string, prefix: string): DocsPage[] =>
    readdirSync(dir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))
      .flatMap((entry) => {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) return collect(full, `${prefix}${entry.name}/`);
        if (!entry.isFile() || !entry.name.endsWith('.mdx')) return [];
        return [{ file: `${prefix}${entry.name}`, source: readFileSync(full, 'utf8') }];
      });
  return collect(root, '');
};
