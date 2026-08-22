// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import stack from '../objectstack.config';

/**
 * Every business object this app ships has a user-facing docs page (#672).
 *
 * ## The rule, and why it needed a guard
 *
 * AGENTS.md, Coding Standards: *"Every new object/feature requires user-facing
 * documentation under `content/docs/` … written for business users + admins
 * (not developers)."* Nothing enforced it. `os validate` and `pnpm lint` walk
 * authored metadata and never open `content/docs`, so the rule was a convention
 * — and #592 / PR #670 duly shipped `crm_event` and `crm_event_attendee` with a
 * nav group, six list views, a dashboard, a dataset and four permission sets,
 * and ZERO documentation. Neither object was named anywhere under
 * `content/docs/` until #672. A convention nothing checks is a convention that
 * survives exactly as long as nobody is busy.
 *
 * ## The criterion: which objects are "user-visible"
 *
 * **Every object this app authors — i.e. every registered object carrying the
 * `crm_` business prefix.** Platform `sys_*` objects are documented by the
 * platform, not here, and they are the only exclusion.
 *
 * The tempting narrower criterion — "objects reachable from app navigation" —
 * was measured and rejected: `crm_event_attendee` has no nav entry (it is
 * edited inside its parent's related list) and it is *precisely* the object
 * this guard exists for. A user meets it in a related list, in the attendee
 * columns of a report, and in the error message that refuses to delete a
 * meeting while its attendees are still there. "Has no tab" is not "invisible".
 *
 * ## The ledger, and what it costs to add an object
 *
 * {@link DOCS_LEDGER} maps each business object to the page that documents it.
 * The set on the left is derived from the compiled stack, never hand-listed, so
 * registering a new object turns this file red until a page exists for it. That
 * is the whole point: the ledger is the enforcement, not the documentation of
 * an enforcement that lives elsewhere.
 *
 * Two objects may legitimately share one page (a quote and its line items are
 * one story), and that is allowed — what is not allowed is an object with no
 * page at all.
 *
 * ## What each entry is checked for
 *
 *  1. The page exists in **all three locales** (`.mdx`, `.zh-Hans.mdx`,
 *     `.zh-Hant.mdx`) — a page that exists only in English is not documentation
 *     for the half of this product's audience that reads the zh pages.
 *  2. The page is **registered in its section's `meta.json`**, in all three
 *     locales. Fumadocs renders the sidebar from those files; an unregistered
 *     page is unreachable by navigation, which is indistinguishable from absent
 *     for anyone who is not already searching for it.
 *  3. The page **names the object** — by API name, `label`, `pluralLabel`, or
 *     the entry's `term` override for the handful of concepts the docs spell
 *     differently from the metadata ("line item", "article").
 *  4. The page is **not a developer page**. `content/docs/customization/
 *     api-reference.mdx` tabulates nearly every object in the app, so
 *     "mentioned somewhere under content/docs" would have been satisfied for
 *     free by an API table row. A row in a reference table is not user
 *     documentation, and a guard that accepts it enforces nothing.
 *
 * ## Locale asymmetry, stated rather than hidden
 *
 * Check 3 runs on the **English page only**. The zh pages translate the
 * business vocabulary (`Quote` → 报价 / 報價, `Case` → 工单 / 工單), so a
 * term match against the English label would fail on a perfectly good
 * translation, and per-locale term tables would be three ledgers to drift
 * instead of one. The translations are held to checks 1 and 2, which are
 * locale-honest: the page has to exist and be navigable in every locale.
 * Widen this if translated pages start going hollow — do not assume it is
 * already covered.
 *
 * ## Reverse verification (#672)
 *
 * Predicted direction: **red**. Deleting `content/docs/sales/
 * meetings-and-calls.mdx` fails "the page exists in every locale" naming
 * `crm_event` and `crm_event_attendee`; deleting their ledger rows instead
 * fails "every registered business object has a ledger entry" with the same two
 * names. Both were run before this file was pushed.
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as any).objects ?? [];

/** Objects this app authors. `sys_*` belongs to the platform's own docs. */
const BUSINESS_OBJECTS = objects
  .filter((o) => typeof o?.name === 'string' && o.name.startsWith('crm_'))
  .map((o) => ({
    name: o.name as string,
    label: typeof o.label === 'string' ? o.label : '',
    pluralLabel: typeof o.pluralLabel === 'string' ? o.pluralLabel : '',
  }));

type LedgerEntry = {
  /** Docs page slug, relative to `content/docs`, without the `.mdx` suffix. */
  page: string;
  /**
   * What the page calls this object, when that is neither the API name nor the
   * declared label. Only three concepts need one, and each is a deliberate
   * choice by the page's author, not a workaround:
   * line items are "line item" in prose, and a knowledge article is "article"
   * on a page whose whole subject is the knowledge base.
   */
  term?: string;
};

/**
 * object → the page that documents it, for a business reader.
 *
 * Keep this pointing at the page a USER would be sent to. If an object's real
 * home is a section that does not exist yet, write the page — do not point the
 * row at whichever existing page happens to mention the word.
 */
const DOCS_LEDGER: Record<string, LedgerEntry> = {
  crm_lead: { page: 'sales/leads' },
  crm_account: { page: 'sales/accounts' },
  crm_contact: { page: 'sales/contacts' },
  crm_opportunity: { page: 'sales/opportunities' },
  crm_opportunity_line_item: { page: 'sales/opportunities', term: 'line item' },
  crm_quote: { page: 'sales/quotes' },
  crm_quote_line_item: { page: 'sales/quotes', term: 'line item' },
  crm_forecast: { page: 'sales/forecasting' },
  crm_task: { page: 'sales/activities' },
  // #672 — the two objects that shipped undocumented, and the reason this
  // guard exists.
  crm_event: { page: 'sales/meetings-and-calls' },
  crm_event_attendee: { page: 'sales/meetings-and-calls' },
  crm_campaign: { page: 'marketing/campaigns' },
  crm_campaign_member: { page: 'marketing/campaign-members' },
  crm_contract: { page: 'revenue/contracts' },
  crm_product: { page: 'revenue/products' },
  crm_case: { page: 'service/cases' },
  crm_knowledge_article: { page: 'service/knowledge-base', term: 'article' },
  // #601 — the vote row behind the article's Helpful / Not Helpful counters.
  // Documented on the article's own page rather than a page of its own, the
  // same call `crm_event_attendee` makes: a verdict is only ever read beside
  // the article it is about, and a standalone page would document a row nobody
  // navigates to.
  crm_article_feedback: { page: 'service/knowledge-base', term: 'Article Feedback' },
};

/** Sections written for developers — see check 4 in the header note. */
const DEVELOPER_SECTIONS = ['customization', 'marketplace', 'reference'];

/** Fumadocs locale suffixes. `''` is the default (English) page. */
const LOCALES = ['', '.zh-Hans', '.zh-Hant'] as const;

const docPath = (slug: string, locale: string): string =>
  join(REPO_ROOT, 'content/docs', `${slug}${locale}.mdx`);

const metaPath = (slug: string, locale: string): string =>
  join(REPO_ROOT, 'content/docs', dirname(slug), `meta${locale}.json`);

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Does `text` name `term`? Boundary-aware on both sides, which is load-bearing
 * here and not decoration: without the trailing boundary, `crm_event` matches
 * inside `crm_event_attendee`, and a page documenting only the attendee row
 * would silently satisfy the event's row too (same trap for `crm_quote` /
 * `crm_quote_line_item` and `crm_campaign` / `crm_campaign_member`).
 */
const names = (text: string, term: string): boolean =>
  new RegExp(`(?<![A-Za-z0-9_])${escapeRe(term)}(?![A-Za-z0-9_])`, 'i').test(text);

describe('every business object has a user-facing docs page', () => {
  it('reads a real object set off the compiled stack', () => {
    // Vacuity guard. A derivation that silently returned [] would make every
    // coverage assertion below pass over nothing at all — the exact state the
    // repo was in before this file existed.
    expect(
      BUSINESS_OBJECTS.length,
      'no crm_* objects found in the stack — this guard has gone vacuous',
    ).toBeGreaterThan(10);
    expect(BUSINESS_OBJECTS.map((o) => o.name)).toContain('crm_account');
  });

  it('every registered business object appears in the docs ledger', () => {
    const undocumented = BUSINESS_OBJECTS.map((o) => o.name).filter((n) => !DOCS_LEDGER[n]);
    expect(
      undocumented,
      `objects with no docs page: ${undocumented.join(', ')}. AGENTS.md requires a ` +
        'user-facing page under content/docs/ for every new object — write it (business ' +
        'users + admins, not developers), then add the row here. Do not delete the row ' +
        'to get green.',
    ).toEqual([]);
  });

  it('the ledger names no object the stack does not register', () => {
    const registered = new Set(BUSINESS_OBJECTS.map((o) => o.name));
    const stale = Object.keys(DOCS_LEDGER).filter((n) => !registered.has(n));
    expect(
      stale,
      `ledger rows for objects that no longer exist: ${stale.join(', ')}. ` +
        'Retire the row together with the object (and check whether its docs page ' +
        'still describes something that ships).',
    ).toEqual([]);
  });

  it('no object is documented only on a developer page', () => {
    const misfiled = Object.entries(DOCS_LEDGER)
      .filter(([, e]) => DEVELOPER_SECTIONS.includes(dirname(e.page)))
      .map(([name, e]) => `${name} → ${e.page}`);
    expect(
      misfiled,
      `these rows point at a developer section (${DEVELOPER_SECTIONS.join(', ')}):\n  ` +
        `${misfiled.join('\n  ')}\n` +
        'content/docs/customization/api-reference.mdx tabulates nearly every object — a ' +
        'row in that table is not user documentation. Point at the page a business user ' +
        'would be sent to.',
    ).toEqual([]);
  });

  for (const [name, entry] of Object.entries(DOCS_LEDGER)) {
    it(`${name}: its page ships in every locale, is navigable, and names it`, () => {
      const missing = LOCALES.filter((l) => !existsSync(docPath(entry.page, l))).map(
        (l) => `${entry.page}${l}.mdx`,
      );
      expect(
        missing,
        `${name} is documented by ${entry.page}, but these locale pages are missing: ` +
          `${missing.join(', ')}. A page that exists only in English documents the object ` +
          'for one of three audiences.',
      ).toEqual([]);

      const slug = basename(entry.page);
      const unregistered = LOCALES.filter((l) => {
        const meta = metaPath(entry.page, l);
        if (!existsSync(meta)) return true;
        const pages: unknown = JSON.parse(readFileSync(meta, 'utf8')).pages;
        return !(Array.isArray(pages) && pages.includes(slug));
      }).map((l) => `meta${l}.json`);
      expect(
        unregistered,
        `${entry.page} is not listed in ${unregistered.join(', ')} — Fumadocs builds the ` +
          'sidebar from those files, so the page is unreachable by navigation. Add the ' +
          "slug to each locale's meta file.",
      ).toEqual([]);

      const object = BUSINESS_OBJECTS.find((o) => o.name === name);
      // A stale row is reported by its own test above; nothing to check here.
      if (!object) return;
      const terms = [name, object.label, object.pluralLabel, entry.term].filter(
        (t): t is string => typeof t === 'string' && t.length > 0,
      );
      const text = readFileSync(docPath(entry.page, ''), 'utf8');
      expect(
        terms.some((t) => names(text, t)),
        `${entry.page}.mdx never names ${name} — none of ${JSON.stringify(terms)} appears ` +
          'on the page. Either the page stopped covering the object (write the section) or ' +
          'the docs call it something else (add a `term` to its ledger row).',
      ).toBe(true);
    });
  }

  it('the term matcher can actually fail', () => {
    // Guard the guard: the check above is only worth its runtime if a name that
    // is NOT on a page comes back false. A matcher that returned true for
    // everything would report full coverage over an empty docs tree.
    const pages = [...new Set(Object.values(DOCS_LEDGER).map((e) => e.page))];
    // Only pages that exist: a missing page is the per-object test's finding,
    // and reading it here would turn one clear failure into two noisy ones.
    const texts = pages
      .filter((p) => existsSync(docPath(p, '')))
      .map((p) => readFileSync(docPath(p, ''), 'utf8'));
    expect(texts.length, 'no ledger page could be read — nothing was matched against').toBeGreaterThan(0);
    expect(texts.some((t) => names(t, 'crm_absent_object'))).toBe(false);
    // And the boundary really binds: `crm_event` must not be satisfied by a
    // page that only ever writes `crm_event_attendee`.
    expect(names('see crm_event_attendee for the junction', 'crm_event')).toBe(false);
    expect(names('see crm_event_attendee for the junction', 'crm_event_attendee')).toBe(true);
  });
});
