// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import stack from '../objectstack.config';

type AnyRec = Record<string, any>;

/*
 * ─── A docs list-view roster names the views the app actually ships (#1194) ──
 *
 * `content/docs/revenue/products.mdx` carried a *Standard list views* section
 * naming three views — **Active Products**, **By Category**, **By Family** —
 * and `src/views/product.view.ts` declares neither those nor anything like
 * them: the real inventory is *All Products* (a grid grouped by category) and
 * *Product Catalog* (a gallery). All three locale faces said it, row for row.
 * The two grouping entries look like a misreading of one real setting —
 * `all_products` sets `grouping: { fields: [{ field: 'category' }] }`, which is
 * one grid grouped by category, not two saved views.
 *
 * That is the section a manager reads to learn what queues exist, so naming
 * three that cannot be found in the UI is a product defect. Nothing was
 * checking it. The #729 count rule (`test/docs-metadata-counts.test.ts`) counts
 * objects, flows, dashboards, datasets, actions and positions, and views are not
 * among them; the STATUS.md transcript rule
 * (`test/docs-declared-versions.test.ts`) counts registered view FILES (one per
 * object), not the individual saved views a page like this describes. This file
 * is that missing rule, and it lives here rather than beside them because a
 * dedicated `test/docs-*.test.ts` per family is this repo's standing shape. When
 * it was written the reason was arithmetic too — `docs-drift.test.ts` was 97KB
 * against this repo's 100KB source-file cap, and adding it there failed `pnpm
 * hygiene`, measured — which is the condition #1196 resolved by splitting that
 * file into the two files named above and five more.
 *
 * ## The rule is COVERAGE, not "no phantom names" — and that was measured
 *
 * The obvious rule is the other one: every bolded name in the section must
 * resolve to a shipped view. It was written and measured first, and it is not
 * viable. Across the ten English pages carrying this section it produces
 * thirteen false positives on five pages, because the section legitimately
 * bolds things that are not views:
 *
 *   - column and filter names inside the same table (`**Health Score**`,
 *     `**Annual Revenue of $10M or more**`);
 *   - whole sentences (`**Status is the filter you already have.**`);
 *   - TAB labels in the first column where the view name is in a later one
 *     (`sales/activities` is written that way throughout);
 *   - and, worst, the pages that are RIGHT: `service/cases` closes with
 *     "Six names this section used to list are not views at all" and then names
 *     them, so the corrected page fails hardest.
 *
 * Excusing thirteen cases needs an exemption map bigger than the roster it
 * guards — the hand-maintained list #729's header argues against. So the rule
 * runs the other direction: every view the stack SHIPS for the object a page
 * documents must be named somewhere in that page's roster section. It caught
 * this card's defect (products named neither real view), and it is derived from
 * `src/views/**` rather than written down here, so it moves when a view does.
 *
 * Stated limitation, since a guard that oversells itself is worse than none: a
 * roster that names every real view AND one invented one passes. What cannot
 * happen any more is a roster written from imagination instead of from source,
 * which is what all four instances of this defect have been.
 *
 * ## The NAME COLUMN is checkable, and the thirteen do not transfer (#1326)
 *
 * The rejection above is of the phantom rule at its WIDEST — every bolded run
 * anywhere in the section — and at that width it stands. Narrowed to the **name
 * column** of the roster table, the same rule costs nothing: measured across the
 * ten English pages it reads 55 name cells and raises ZERO false positives.
 * Every one of the thirteen lives outside that column:
 *
 *   - column and filter names (`**Health Score**`, `**Annual Revenue of $10M or
 *     more**`) sit in the *What it shows* column, never in the first one;
 *   - the whole-sentence bolds (`**Status is the filter you already have.**`)
 *     are bullets beneath the table, not rows in it;
 *   - `service/cases` names its six retired non-views in a bullet list below
 *     the table, so the page that was RIGHT is the page this rule never reads;
 *   - and the TAB-label shape — the one the list above tolerates, *"TAB labels
 *     in the first column where the view name is in a later one"* — is not a
 *     legitimate exception at all. It was the #1318 defect, in the one page
 *     cited as carrying it.
 *
 * That last line is why the narrow rule is worth having. `list.tabs[].name` was
 * never read: the object-view switcher labels each tab with the target view's
 * own `label`, so #1304 dropped those entries' labels, #1316 deleted the key
 * outright, and #1322 took the invented Tab column off fifteen pages across
 * three faces. A tab has no second, shorter name, so a roster's first column
 * has nothing to carry but view names — and holding it to that costs no page
 * anything, which is the measurement above.
 *
 * ## What this adds that coverage cannot (#1326)
 *
 * The limitation stated above — "a roster that names every real view AND one
 * invented one passes" — is not a theoretical corner. It was measured: the
 * #1318 dev restored `sales/activities.mdx` to its pre-fix bytes on top of the
 * fix, reinstating the false prose claim and all eight fictional tab names, and
 * this file ran **4/4 green**. Coverage only ever asks whether each shipped
 * label appears SOMEWHERE in the section, so a first column written entirely
 * from imagination passes as long as a later column is right.
 *
 * Two rules, two directions, and neither subsumes the other: coverage says no
 * shipped view may go unnamed, and this one says the name column may name
 * nothing else. Both are needed — this rule alone would pass a roster that
 * dropped a view, and coverage alone passed the whole of #1318.
 *
 * ### `getting-started/quick-tour` does not collide with this (#1326)
 *
 * `docs-quick-tour-navigation.test.ts` reserves **bold** on that page for names
 * the app really carries, and it failed 3/3 the first time #1324 tried to bold
 * a view label there — so a rule REQUIRING bold in a name column reads like a
 * head-on conflict. Measured, it is not one: quick-tour carries no
 * `## Standard list views` heading at all (its sections are the seven numbered
 * tour steps), so `rosterOf` returns null for it, vacuity guard #1 does not
 * demand it be mapped, and it never enters PAGE_OBJECT. The two rules never see
 * each other's page. No exemption is needed, and adding one would be a lie
 * about a conflict that does not exist.
 *
 * ### Reverse verification (#1326)
 *
 * Predicted **red on the pre-#1322 bytes and green on `main`**, and measured as
 * such — green-on-main alone is what coverage already achieved while the defect
 * was present, so it proves nothing on its own. Writing
 * `git show 794d6fe~1:content/docs/sales/activities.mdx` to disk (blob
 * `3fc1568` against HEAD's `0f7117e`, hashed before the verdict was read) fails
 * this rule with eight name-column entries — *All*, *Board*, *Schedule*,
 * *Plan*, *Worklog*, *My Tasks*, *Priority*, *Backlog* — none of which
 * `crm_task` ships, while the coverage rule beside it stays green. Restored
 * with `git checkout HEAD -- <path>` and proved by an empty `git diff HEAD`,
 * the count is 0 across 55 cells.
 *
 * ## Why only the English face resolves names
 *
 * The translated faces spell view labels in Chinese on most pages
 * (`revenue/contracts.zh-Hans` says 全部合同), and there is no zh-Hant locale
 * bundle in this app at all — `i18n.supportedLocales` is en / zh-CN / ja-JP /
 * es-ES — so a traditional-Chinese label has nothing to resolve against. The
 * faces are held to STRUCTURE instead, the same honest split #736 made for
 * callouts: same section, same number of roster entries. That is what the
 * defect actually looked like — one roster, wrong, replicated three times.
 *
 * ## Reverse verification
 *
 * Predicted **red before the content fix, green after**, and measured as such.
 * Before: three English pages failed coverage — `revenue/products` (missing
 * both of its views), `marketing/campaigns` (missing all four; the section
 * named six views that do not exist, the same defect one page over) and
 * `service/cases` (missing *Unassigned — triage*, on a page that says how many
 * views it is listing). After the fixes in this PR: 0. The rule is not vacuous
 * either — it resolves 54 shipped labels across ten pages, so it is comparing
 * real rosters, not empty sets against empty sets.
 */
describe('a docs list-view roster names the views the app ships (#1194)', () => {
  /** Every spelling the roster heading has settled into, across three faces. */
  const ROSTER_HEADING =
    /^## +(Standard list views|标准列表视图|標準列表檢視|標準清單檢視|標準列表視圖|標準清單視圖)/;

  /**
   * Which object each page documents.
   *
   * Hand-written because nothing links a docs page to an object — but it cannot
   * silently go stale: the vacuity test below fails when an English page grows
   * a roster section and is not listed here, so a new page joins the guard
   * rather than escaping it.
   */
  const PAGE_OBJECT: Record<string, string> = {
    'content/docs/sales/accounts.mdx': 'crm_account',
    'content/docs/sales/contacts.mdx': 'crm_contact',
    'content/docs/sales/leads.mdx': 'crm_lead',
    'content/docs/sales/opportunities.mdx': 'crm_opportunity',
    'content/docs/sales/activities.mdx': 'crm_task',
    'content/docs/sales/quotes.mdx': 'crm_quote',
    'content/docs/service/cases.mdx': 'crm_case',
    'content/docs/marketing/campaigns.mdx': 'crm_campaign',
    'content/docs/revenue/contracts.mdx': 'crm_contract',
    'content/docs/revenue/products.mdx': 'crm_product',
  };

  /** Object → every saved view label it ships, read off the registered stack. */
  const LABELS: Map<string, string[]> = new Map();
  for (const view of ((stack as AnyRec).views ?? []) as AnyRec[]) {
    const object = view.list?.data?.object;
    if (typeof object !== 'string') continue;
    const labels = [
      view.list?.label,
      ...Object.values((view.listViews ?? {}) as Record<string, AnyRec>).map((v) => v?.label),
    ].filter((l): l is string => typeof l === 'string' && l.length > 0);
    LABELS.set(object, [...(LABELS.get(object) ?? []), ...labels]);
  }

  /** The body of the roster section, or null when the page has none. */
  const rosterOf = (file: string): string | null => {
    const path = join(REPO_ROOT, file);
    if (!existsSync(path)) return null;
    const lines = readFileSync(path, 'utf8').split('\n');
    const start = lines.findIndex((l) => ROSTER_HEADING.test(l));
    if (start === -1) return null;
    let end = lines.length;
    for (let i = start + 1; i < lines.length; i++) {
      if (/^## /.test(lines[i])) {
        end = i;
        break;
      }
    }
    return lines.slice(start + 1, end).join('\n');
  };

  /** Roster entries: bolded table rows plus bolded top-level bullets. */
  const entryCount = (body: string): number =>
    [...body.matchAll(/^\| *\*\*/gm)].length + [...body.matchAll(/^- +\*\*/gm)].length;

  /** The delimiter row that sits under a markdown table's header (`| --- |`). */
  const TABLE_DELIMITER = /^\| *:?-{2,}/;

  /**
   * Body rows of every markdown table inside a roster section — the header row
   * and the delimiter row under it dropped, so what is left is one line per
   * roster entry. Detecting the header by the delimiter BELOW it rather than by
   * its wording is what lets `revenue/contracts` head its first column *Tab*
   * and `sales/leads` head its own *View* without either being written down.
   */
  const tableBodyRows = (body: string): string[] => {
    const lines = body.split('\n');
    return lines.filter(
      (line, i) =>
        /^\|/.test(line) &&
        !TABLE_DELIMITER.test(line) &&
        !(i + 1 < lines.length && TABLE_DELIMITER.test(lines[i + 1])),
    );
  };

  /** The name column: the first cell of a table row. */
  const nameCell = (row: string): string => (row.replace(/^\|/, '').split('|')[0] ?? '').trim();

  /**
   * The bolded name a name-column cell opens with, or null when it opens with
   * none. Only the leading run is taken, so the trailing annotations these
   * pages carry — `**All Accounts** *(the landing view)*` — are not part of the
   * name being resolved.
   */
  const boldName = (cell: string): string | null => /^\*\*(.+?)\*\*/.exec(cell)?.[1].trim() ?? null;

  const walkMdxPages = (dir: string): string[] => {
    const root = join(REPO_ROOT, dir);
    if (!existsSync(root)) return [];
    return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
      const rel = join(dir, entry.name);
      return entry.isDirectory() ? walkMdxPages(rel) : rel.endsWith('.mdx') ? [rel] : [];
    });
  };

  it('every English page with a roster section is mapped to an object', () => {
    // Vacuity guard #1, and the thing that keeps PAGE_OBJECT from rotting: a
    // page that grows one of these sections joins the rule automatically.
    const unmapped = walkMdxPages('content/docs')
      .filter((f) => !/\.zh-Han[st]\.mdx$/.test(f))
      .filter((f) => rosterOf(f) !== null)
      .filter((f) => PAGE_OBJECT[f] === undefined);
    expect(
      unmapped,
      `pages carrying a list-view roster that this rule does not check:\n  ${unmapped.join('\n  ')}\n` +
        'Add the page to PAGE_OBJECT with the object it documents — a roster nobody checks is ' +
        'how #1194 shipped three views that do not exist, in three locales.',
    ).toEqual([]);
  });

  it('the stack ships views for every mapped object, and the pages have rosters', () => {
    // Vacuity guard #2, both halves. A stack whose view shape moved would leave
    // every label list empty and the rule would pass by comparing nothing; a
    // renamed heading would make every roster null and do the same.
    const empty = Object.entries(PAGE_OBJECT)
      .filter(([, object]) => (LABELS.get(object) ?? []).length === 0)
      .map(([file, object]) => `${file} → ${object}`);
    expect(
      empty,
      `no view labels resolved for:\n  ${empty.join('\n  ')}\n` +
        'Either the registered view shape moved, or those objects lost their views.',
    ).toEqual([]);

    const missingSection = Object.keys(PAGE_OBJECT).filter((f) => rosterOf(f) === null);
    expect(
      missingSection,
      `mapped pages with no roster section any more:\n  ${missingSection.join('\n  ')}\n` +
        'Teach ROSTER_HEADING the new spelling, or drop the page from PAGE_OBJECT deliberately.',
    ).toEqual([]);

    const resolved = [...new Set(Object.values(PAGE_OBJECT))].reduce(
      (n, object) => n + (LABELS.get(object) ?? []).length,
      0,
    );
    expect(resolved, 'this rule is comparing against an empty label set').toBeGreaterThan(40);
  });

  it('every view the app ships is named in its page’s roster', () => {
    const drifted = Object.entries(PAGE_OBJECT).flatMap(([file, object]) => {
      const body = rosterOf(file) ?? '';
      return (LABELS.get(object) ?? [])
        .filter((label) => !body.includes(label))
        .map((label) => `${file} never names "${label}", which ${object} ships`);
    });
    expect(
      drifted,
      `list-view rosters that do not match src/views:\n  ${drifted.join('\n  ')}\n` +
        'The registered view is the source of truth — name it on the page (and say what it ' +
        'shows), or delete the view. Do not remove the section to get green: it is the section ' +
        'a manager reads to learn which queues exist.',
    ).toEqual([]);
  });

  it('the name column of every roster names only views the app ships (#1326)', () => {
    const rosters = Object.entries(PAGE_OBJECT).map(([file, object]) => ({
      file,
      object,
      cells: tableBodyRows(rosterOf(file) ?? '').map(nameCell),
    }));

    // Vacuity guard #3, and the one this rule needs most: it reads TABLE rows,
    // and `entryCount` above shows the sections may also be written as bolded
    // bullets. A page that switched to that shape — or a table this parser
    // stopped recognising — would hand the rule an empty cell list and pass by
    // checking nothing, which is precisely the failure #1318 already survived.
    const unread = rosters.filter((r) => r.cells.length === 0).map((r) => r.file);
    expect(
      unread,
      `roster sections this rule read no name column out of:\n  ${unread.join('\n  ')}\n` +
        'Every mapped page carried a table roster when this was written. If one is now a ' +
        'bulleted list, teach tableBodyRows that shape — do not let the page fall out of the ' +
        'rule silently, which is how a roster written from imagination passes.',
    ).toEqual([]);

    // De-bolding is not an escape hatch. Every roster row on every page opens
    // its name column with a bold run today, so a plain-text name column is a
    // new shape and must be looked at rather than skipped.
    const unbolded = rosters.flatMap(({ file, cells }) =>
      cells
        .filter((cell) => boldName(cell) === null)
        .map((cell) => `${file}: name column reads ${JSON.stringify(cell)}, unbolded`),
    );
    expect(
      unbolded,
      `roster rows whose name column is not a bolded name:\n  ${unbolded.join('\n  ')}\n` +
        'The first column of a roster table is the view’s own name and every page bolds it. ' +
        'Bold it too, rather than leaving a name this rule cannot check.',
    ).toEqual([]);

    const phantom = rosters.flatMap(({ file, object, cells }) =>
      cells
        .map(boldName)
        .filter((name): name is string => name !== null)
        .filter((name) => !(LABELS.get(object) ?? []).includes(name))
        .map((name) => `${file} names "${name}", and ${object} ships no view with that label`),
    );
    expect(
      phantom,
      `names in a roster’s name column that no shipped view carries:\n  ${phantom.join('\n  ')}\n` +
        'The registered view label is the source of truth and the switcher prints it verbatim, ' +
        'emoji included — `list.tabs[].name` was never read by anything and #1316 deleted the ' +
        'key. So a tab has no second, shorter name to put here: print the label. If the app ' +
        'really did lose the view, delete the row rather than renaming it to something findable.',
    ).toEqual([]);

    const checked = rosters.reduce((n, r) => n + r.cells.length, 0);
    expect(checked, 'this rule is reading no name cells at all').toBeGreaterThan(40);
  });

  it('every translated face carries the same roster, entry for entry', () => {
    const drifted = Object.keys(PAGE_OBJECT).flatMap((en) => {
      const enBody = rosterOf(en) ?? '';
      return ['.zh-Hans', '.zh-Hant'].flatMap((locale) => {
        const translated = en.replace(/\.mdx$/, `${locale}.mdx`);
        if (!existsSync(join(REPO_ROOT, translated))) return [];
        const body = rosterOf(translated);
        if (body === null) return [`${translated} has no list-view roster, but ${en} has one`];
        const [a, b] = [entryCount(body), entryCount(enBody)];
        return a === b ? [] : [`${translated}: ${a} roster entr(y|ies), but ${en} has ${b}`];
      });
    });
    expect(
      drifted,
      `translated rosters that do not match the English page:\n  ${drifted.join('\n  ')}\n` +
        'Names cannot be checked here — most translated pages spell view labels in Chinese and ' +
        'this app ships no zh-Hant bundle to resolve them against — so the faces are held to ' +
        'structure, the same split #736 made for callouts. #1194 was one wrong roster copied ' +
        'into three faces; fixing one face and not the others recreates it.',
    ).toEqual([]);
  });
});
