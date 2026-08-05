// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import stack from '../objectstack.config';

/**
 * Record-level sharing coverage guards (#549).
 *
 * A sharing rule widens **the object it names** — never the records hanging off
 * it. HotCRM authors its widening rules on `crm_account` (territory + team),
 * but the account's children each keep their own baseline: `crm_quote`,
 * `crm_contract` and `crm_task` are `private` with no rule of their own, and
 * `crm_opportunity` only widens through the >= $100k leadership rules. A rep
 * who receives an account through a territory rule therefore opens it to
 * partially empty related lists. `crm_contact` is `controlled_by_parent`, which
 * does NOT mean "follows the account": as MEASURED by
 * `test/parent-derived-reach.test.ts`, a parent-derived child is readable
 * org-wide — see the 'derived' note on ACCOUNT_CHILD_COVERAGE below.
 *
 * Whether those children *should* follow the account is an open business
 * decision (#549) — widening any of them changes what every holder of that
 * object sees, not just the territory recipient. These tests do not take that
 * decision. They pin two things so it stays a decision instead of drift:
 *
 *   1. the coverage ledger below — the shipped answer, per account child, so a
 *      new child object (or a rule added/removed) has to update it knowingly;
 *   2. the admin docs — the prose that describes who sees what has to keep
 *      matching the metadata. The gap in #549 was reported as a *promise*
 *      problem: `content/docs/revenue/contracts.mdx` told admins "contracts
 *      follow the account's sharing" while the metadata delivered own-only.
 *
 * `test/authorization-coverage.test.ts` (#488/#547) covers the object-grant
 * half — this file is only about record-level reach.
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as any).objects ?? [];
const sharingRules: AnyRec[] = (stack as any).sharingRules ?? [];
const permissionSets: AnyRec[] = (stack as any).permissions ?? [];
const positions: AnyRec[] = (stack as any).positions ?? [];

const objectByName = new Map(objects.map((o) => [o.name as string, o]));
const owdOf = (name: string): string => objectByName.get(name)?.sharingModel ?? 'private';
const rulesOn = (name: string) => sharingRules.filter((r) => r.object === name);

const DOC = (...segments: string[]) => readFileSync(join(REPO_ROOT, ...segments), 'utf8');
const SHARING_DOC = 'content/docs/administration/sharing-and-security.mdx';

/**
 * Rows of the first markdown table after `heading`, as trimmed cell arrays.
 *
 * Hoisted out of the docs describe below so the OWD guard at the bottom of this
 * file parses the localized pages the same way — one table reader, not two.
 */
const tableAfter = (doc: string, heading: string, file: string = SHARING_DOC): string[][] => {
  const start = doc.indexOf(heading);
  expect(start, `"${heading}" is gone from ${file} — this guard has gone blind`).toBeGreaterThan(-1);
  const rows: string[][] = [];
  let seenTable = false;
  for (const line of doc.slice(start + heading.length).split('\n')) {
    if (!line.trim().startsWith('|')) {
      if (seenTable) break;
      continue;
    }
    seenTable = true;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.every((c) => /^-+$/.test(c)) || cells.length === 0) continue;
    rows.push(cells);
  }
  return rows.slice(1); // drop the header row
};

/**
 * How far a rep's reach on an account carries into the records under it.
 *
 *   'derived'  — OWD is controlled_by_parent. NOTE what that means as MEASURED
 *                against the engine (`test/parent-derived-reach.test.ts`, #549):
 *                the child is not filtered to accounts the caller can READ —
 *                the ADR-0055 derivation resolves the master id set through the
 *                master's RLS policies only (this app authors none on
 *                `crm_account`) under a system context, so ownership and
 *                `sys_record_share` grants are not folded in. In this app the
 *                practical reach of a 'derived' child is therefore every record
 *                of that object, for every holder of object-level read — which
 *                is why #549's Option 2 (convert quote/contract) does NOT
 *                deliver "follows the account" and is unresolved here. The
 *                narrow semantics is the intended one; the platform gap is
 *                tracked upstream as objectstack-ai/objectstack#5386 (#694).
 *   'own_only' — private, no sharing rule: the child stays with its owner.
 *   'partial'  — private, but a rule of its own widens SOME records (never by
 *                account criteria — the rules match on the child's own fields).
 *
 * This is the status quo, pinned deliberately. Changing an entry is the
 * business decision #549 asks for; it belongs in a PR that also updates the
 * admin docs and the sharing rules, not in a drive-by edit here.
 */
const ACCOUNT_CHILD_COVERAGE: Record<string, 'derived' | 'own_only' | 'partial'> = {
  crm_contact: 'derived',
  crm_opportunity: 'partial',
  crm_case: 'partial',
  crm_quote: 'own_only',
  crm_contract: 'own_only',
  crm_task: 'own_only',
  // #592. `crm_event` is `private` with no sharing rule of its own, exactly
  // like `crm_task` — the two are the same kind of record (a rep's personal
  // activity) and there is no reason for one to reach further than the
  // other. A rep who receives an account through a territory rule therefore
  // sees the account's meetings only where they own them. Widening that is
  // the same open business decision #549 asks about tasks, and it belongs in
  // the PR that answers it for the whole family, not in this one.
  crm_event: 'own_only',
};

/**
 * Objects that hang off `crm_account` through a lookup or master-detail field,
 * i.e. the ones an account's related lists are built from.
 *
 * `converted_*` fields are excluded: `crm_lead.converted_account` records what a
 * conversion produced, so the lead is the account's ancestor, not its child —
 * no related list on the account renders it.
 */
const accountChildren = objects
  .filter((o) => typeof o.name === 'string' && !o.name.startsWith('sys_') && o.name !== 'crm_account')
  .filter((o) =>
    Object.entries((o.fields ?? {}) as Record<string, AnyRec>).some(
      ([fieldName, f]) =>
        (f?.type === 'lookup' || f?.type === 'master_detail') &&
        (f.reference ?? f.reference_to ?? f.referenceTo) === 'crm_account' &&
        !fieldName.startsWith('converted_'),
    ),
  )
  .map((o) => o.name as string);

describe('what a shared account carries into its related lists', () => {
  it('every object hanging off crm_account is answered by the ledger', () => {
    const unledgered = accountChildren.filter((name) => !(name in ACCOUNT_CHILD_COVERAGE));
    expect(
      unledgered,
      'account children with no authored answer — a related list whose record-level reach ' +
        'nobody decided (see #549):\n  ' + unledgered.join('\n  '),
    ).toEqual([]);
  });

  it('the ledger names only objects that still hang off crm_account', () => {
    const stale = Object.keys(ACCOUNT_CHILD_COVERAGE).filter((name) => !accountChildren.includes(name));
    expect(stale, `stale ledger entries:\n  ${stale.join('\n  ')}`).toEqual([]);
  });

  it('the ledger matches the shipped OWD and sharing rules', () => {
    const bad: string[] = [];
    for (const [name, expected] of Object.entries(ACCOUNT_CHILD_COVERAGE)) {
      if (!objectByName.has(name)) continue;
      const owd = owdOf(name);
      const rules = rulesOn(name);
      const actual =
        owd === 'controlled_by_parent' ? 'derived' : rules.length > 0 ? 'partial' : 'own_only';
      if (actual !== expected) {
        bad.push(
          `${name}: ledger says '${expected}', metadata says '${actual}' ` +
            `(OWD ${owd}, ${rules.length} sharing rule(s))`,
        );
      }
    }
    expect(
      bad,
      'record-level reach changed without updating the ledger and the admin docs:\n  ' +
        bad.join('\n  '),
    ).toEqual([]);
  });

  it('no sharing rule widens an account child by account criteria behind the ledger’s back', () => {
    // Option 1 in #549 (mirror the territory criteria onto each child) would
    // read the child's OWN account field. Nothing does that today; if a rule
    // starts to, the ledger's 'partial' entries stop meaning "some records of
    // their own" and the docs table above has to be rewritten.
    const bad = Object.keys(ACCOUNT_CHILD_COVERAGE)
      .flatMap((name) => rulesOn(name).map((r) => ({ name, rule: r })))
      .filter(({ rule }) => /record\.(crm_account|related_to_account)\b/.test(rule.condition?.source ?? ''))
      .map(({ name, rule }) => `${rule.name}: shares ${name} by account criteria — update the ledger + docs`);
    expect(bad, `undocumented account-criteria sharing:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('an own-only child grants no wider read than "own" to the sales personas', () => {
    // The rep/agent sets are what the #549 report is written against: if a
    // profile quietly picks up viewAllRecords on a ledger'd own-only object,
    // the "keyhole" is gone for that persona and the docs are wrong again.
    const PERSONAS = ['sales_rep', 'service_agent'];
    const bad: string[] = [];
    for (const [name, coverage] of Object.entries(ACCOUNT_CHILD_COVERAGE)) {
      if (coverage !== 'own_only') continue;
      for (const set of permissionSets.filter((ps) => PERSONAS.includes(ps.name))) {
        const perm = (set.objects ?? {})[name];
        if (!perm?.allowRead) continue;
        if (perm.viewAllRecords === true) bad.push(`${set.name}.${name}: viewAllRecords on an own-only child`);
        else if (perm.readScope !== 'own') bad.push(`${set.name}.${name}: read granted with no 'own' scope`);
      }
    }
    expect(bad, `persona scope drifted from the ledger:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});

describe('the admin docs describe the sharing the app actually ships', () => {
  const doc = DOC(SHARING_DOC);

  it('the built-in rules table lists exactly the shipped sharing rules', () => {
    const documented = tableAfter(doc, '### Built-in sharing rules').map((r) => r[0]);
    const shipped = sharingRules.map((r) => r.label as string);
    expect(documented.slice().sort(), 'the docs’ rule table has drifted from src/sharing/')
      .toEqual(shipped.slice().sort());
  });

  it('every documented rule states the object, access level and position it really grants', () => {
    const byLabel = new Map(sharingRules.map((r) => [r.label as string, r]));
    const labelOf = (name: string) => objectByName.get(name)?.label ?? name;
    const bad: string[] = [];
    for (const [label, objectLabel, access, grantee] of tableAfter(doc, '### Built-in sharing rules')) {
      const rule = byLabel.get(label);
      if (!rule) continue; // covered by the test above
      if (objectLabel !== labelOf(rule.object)) {
        bad.push(`${label}: doc says object "${objectLabel}", rule targets "${labelOf(rule.object)}"`);
      }
      if (access.toLowerCase() !== (rule.accessLevel ?? 'read')) {
        bad.push(`${label}: doc says "${access}", rule grants "${rule.accessLevel ?? 'read'}"`);
      }
      if (rule.sharedWith?.type === 'position' && !grantee.includes(`\`${rule.sharedWith.value}\``)) {
        bad.push(`${label}: doc does not name the position "${rule.sharedWith.value}"`);
      }
    }
    expect(bad, `sharing-rule table drift:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('the positions block matches the shipped positions', () => {
    const block = doc.match(/## Layer 2 — Positions[\s\S]*?```\n([\s\S]*?)```/);
    expect(block, 'the positions code block is gone from the docs').toBeTruthy();
    const listed = new Set((block![1].match(/\b[a-z][a-z_]+\b/g) ?? []).filter((w) => w !== 'territory' && w !== 'groupings'));
    const shipped = new Set(positions.map((p) => p.name as string));
    expect([...listed].sort(), 'the documented position list has drifted').toEqual([...shipped].sort());
  });

  it('the related-list table tells the truth about each account child', () => {
    const rows = tableAfter(doc, '### A rule widens one object, not the records underneath it');
    const byPluralLabel = new Map(
      objects.map((o) => [(o.pluralLabel ?? o.label ?? o.name) as string, o.name as string]),
    );
    const bad: string[] = [];
    const documented: string[] = [];
    for (const [listLabel, promise] of rows) {
      const name = byPluralLabel.get(listLabel);
      if (!name) {
        bad.push(`"${listLabel}" is not an object this app ships`);
        continue;
      }
      documented.push(name);
      const coverage = ACCOUNT_CHILD_COVERAGE[name];
      const saysOwnOnly = /own (deals |)only/i.test(promise);
      const saysFollows = /follows the account/i.test(promise);
      if (saysFollows && coverage !== 'derived') {
        bad.push(`${name}: docs say it follows the account, ledger says '${coverage}'`);
      }
      if (saysOwnOnly && coverage === 'derived') {
        bad.push(`${name}: docs say own-only, but the object is parent-derived`);
      }
      // A row promising extra records must name the position that gets them.
      const positionsNamed = [...promise.matchAll(/`([a-z_]+)`/g)].map((m) => m[1]);
      for (const position of positionsNamed) {
        if (!rulesOn(name).some((r) => r.sharedWith?.value === position)) {
          bad.push(`${name}: docs promise \`${position}\` extra records, no sharing rule grants them`);
        }
      }
      if (coverage === 'partial' && positionsNamed.length === 0) {
        bad.push(`${name}: a sharing rule widens it, the docs row names no position`);
      }
    }
    expect(bad, `related-list table drift:\n  ${bad.join('\n  ')}`).toEqual([]);
    expect(
      documented.slice().sort(),
      'the related-list table has to cover every account child in the ledger',
    ).toEqual(Object.keys(ACCOUNT_CHILD_COVERAGE).sort());
  });

  it('no doc promises that a private, unshared object follows its account', () => {
    // The #549 report: `contracts.mdx` said "Contracts follow the account's
    // sharing" while `crm_contract` shipped private + own-only. Any doc making
    // that promise for a ledger'd own-only object is the same defect.
    const PAGES = [
      ['content/docs/revenue/contracts.mdx', 'crm_contract'],
      ['content/docs/sales/quotes.mdx', 'crm_quote'],
      ['content/docs/sales/activities.mdx', 'crm_task'],
    ] as const;
    const bad: string[] = [];
    for (const [page, name] of PAGES) {
      let text: string;
      try {
        text = DOC(page);
      } catch {
        continue; // the page is optional; other guards cover missing docs
      }
      if (ACCOUNT_CHILD_COVERAGE[name] !== 'own_only') continue;
      if (/follows? the account'?s sharing|if you can see the account, you can see/i.test(text)) {
        bad.push(`${page}: promises account-derived visibility that "${name}" does not deliver`);
      }
    }
    expect(bad, `docs promising a 360° view the metadata denies:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});

/**
 * The OWD table names every parent-derived object — on all three locale pages (#710).
 *
 * `crm_event_attendee` shipped `controlled_by_parent` with the activity model
 * (#592) and never reached the Org-Wide Defaults table, so the section right
 * under that table went on saying "the four parent-derived objects above" while
 * the app shipped five. Nothing caught it: the two doc rules above read the
 * sharing-rule table and the related-list table, and both stop at the English
 * page.
 *
 * ## What is derived, and what is authored
 *
 * The ROW SET is derived from the compiled stack — every object whose
 * `sharingModel` is `controlled_by_parent` must have a row, and no row may claim
 * Controlled by Parent for anything else. The ROW LABEL per locale is authored
 * below, because it cannot be derived: these pages translate object labels
 * themselves rather than reusing the app's locale packs (the zh-Hans table says
 * 商机行项 where `src/translations/zh-CN.ts` says 商机产品明细), and the app ships
 * no zh-Hant pack at all. So a sixth parent-derived object costs one ledger line
 * plus three doc rows — and the failure names the object AND the page, which is
 * the point.
 *
 * ## Scope: the parent-derived rows only, deliberately
 *
 * The table also lists `private` and `public_read` objects, and this guard says
 * nothing about them. It is not the full registered-object list today — `crm_event`
 * has no row, and a `Competitor` row outlived the object and the profile grants
 * that were removed with it (filed as #790) — so a whole-table rule would be red
 * on arrival over defects this change does not own; and locking every row would
 * turn an ordinary OWD change into a two-place edit for objects nobody derives.
 * Parent-derived is the class where a missing row ALSO falsifies the prose right
 * below the table, which is the defect that actually shipped. Widen this to the
 * full object set when #790 lands.
 *
 * The parent named in the cell's parentheses — "(Event)", "（活动）" — is not
 * checked: which field the platform resolves as the master is an ADR-0055
 * derivation, and asserting our guess at it here would pin this repo's reading of
 * the platform rather than the app's own metadata.
 *
 * ## Reverse verification (#710)
 *
 * Three directions, each predicted before it was run, each measured on this tree:
 *
 *   1. Delete the new Event Attendee row from the English page → predicted RED on
 *      the presence rule for that page only. Measured, 1 failed | 22 passed:
 *      "crm_event_attendee: content/docs/administration/sharing-and-security.mdx
 *      (en) has no "Event Attendee" row".
 *   2. Put "four" / 四 back in all three pages → predicted RED three times, once
 *      per locale, and GREEN on the row rules — the count is derived from the
 *      stack, never from the table's own row count, so a page cannot talk itself
 *      into agreement by losing a row. Measured, 3 failed | 20 passed, e.g.
 *      "…zh-Hant.mdx (zh-Hant) counts "四" parent-derived objects; the stack ships
 *      5 (crm_campaign_member, crm_contact, crm_event_attendee,
 *      crm_opportunity_line_item, crm_quote_line_item)".
 *   3. Add a row claiming Controlled by Parent for an object nobody registers →
 *      predicted RED on the reverse rule only. Measured, 1 failed | 22 passed:
 *      "…zh-Hant.mdx (zh-Hant): row "戰場情報" is documented Controlled by Parent,
 *      but no object with that label ships controlled_by_parent".
 *
 * Direction 2 is the one worth reading twice: it is what makes this guard catch
 * #592's defect from either side. The row and the count are pinned to the same
 * derived set, so they cannot drift into agreeing with each other while both
 * disagree with the app.
 */
describe('the OWD table lists every parent-derived object, in every locale', () => {
  type Locale = 'en' | 'zh-Hans' | 'zh-Hant';

  /** Every object whose record access derives from a parent — off the compiled stack. */
  const parentDerived = objects
    .filter((o) => o.sharingModel === 'controlled_by_parent')
    .map((o) => o.name as string)
    .sort();

  /** The OWD table's row label for each parent-derived object, per locale (see header). */
  const ROW_LABEL: Record<string, Record<Locale, string>> = {
    crm_contact: { en: 'Contact', 'zh-Hans': '联系人', 'zh-Hant': '聯絡人' },
    crm_opportunity_line_item: {
      en: 'Opportunity Line Item',
      'zh-Hans': '商机行项',
      'zh-Hant': '商機明細',
    },
    crm_quote_line_item: { en: 'Quote Line Item', 'zh-Hans': '报价行项', 'zh-Hant': '報價明細' },
    crm_campaign_member: { en: 'Campaign Member', 'zh-Hans': '活动成员', 'zh-Hant': '活動成員' },
    crm_event_attendee: { en: 'Event Attendee', 'zh-Hans': '活动参与者', 'zh-Hant': '活動參與者' },
  };

  /**
   * How each page spells the count in the sentence under the table. An
   * unmapped count is a deliberate failure, the same convention
   * `docs-drift.test.ts` uses for `CRON_LABEL`.
   */
  const COUNT_WORD: Record<Locale, Record<number, string>> = {
    en: { 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight' },
    'zh-Hans': { 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八' },
    'zh-Hant': { 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八' },
  };

  const PAGES: {
    locale: Locale;
    file: string;
    /** The heading the OWD table follows. */
    heading: string;
    /** An OWD cell reading "controlled by parent" in this language. */
    derived: RegExp;
    /** The sentence under the table that counts them; group 1 is the number word. */
    countSentence: RegExp;
  }[] = [
    {
      locale: 'en',
      file: SHARING_DOC,
      heading: '## Layer 1 — Org-Wide Defaults',
      derived: /^Controlled by Parent\b/i,
      countSentence: /For the ([A-Za-z]+) parent-derived objects above/,
    },
    {
      locale: 'zh-Hans',
      file: 'content/docs/administration/sharing-and-security.zh-Hans.mdx',
      heading: '## 第 1 层 —— 组织范围默认值',
      derived: /^由父级控制/,
      countSentence: /对于上面([一二三四五六七八九十]+)个由父级派生的对象/,
    },
    {
      locale: 'zh-Hant',
      file: 'content/docs/administration/sharing-and-security.zh-Hant.mdx',
      heading: '## 第 1 層 —— 組織範圍預設值',
      derived: /^由父層控制/,
      countSentence: /對於上面([一二三四五六七八九十]+)個由父層衍生的物件/,
    },
  ];

  it('the row ledger answers exactly the objects the stack derives from a parent', () => {
    // Anti-vacuum. Five ship today (#592 added the fifth); a ledger compared
    // against an empty derived set would pass by checking nothing at all.
    expect(
      parentDerived.length,
      'fewer than five controlled_by_parent objects in the compiled stack — either the app ' +
        'genuinely retired some (then lower this number knowingly) or the derivation broke ' +
        'and every rule below is comparing empty sets',
    ).toBeGreaterThanOrEqual(5);

    const unledgered = parentDerived.filter((name) => !(name in ROW_LABEL));
    expect(
      unledgered,
      `parent-derived objects with no OWD row label:\n  ${unledgered.join('\n  ')}\n` +
        'Add the three locale labels here, and the row to each of the three pages.',
    ).toEqual([]);

    const stale = Object.keys(ROW_LABEL).filter((name) => !parentDerived.includes(name));
    expect(
      stale,
      `ledger entries whose object is no longer controlled_by_parent:\n  ${stale.join('\n  ')}\n` +
        'Its OWD row now states the wrong model — fix the pages, then drop the entry.',
    ).toEqual([]);
  });

  for (const page of PAGES) {
    describe(page.file, () => {
      const rowsOf = () => tableAfter(DOC(page.file), page.heading, page.file);

      it('the OWD table still parses', () => {
        // Anti-vacuum #2: a table that stopped parsing would let every rule
        // below pass over an empty row list.
        expect(
          rowsOf().length,
          `no OWD table row parsed out of ${page.file} after "${page.heading}" — the table ` +
            'moved, changed shape, or lost its heading, and this whole block has gone blind',
        ).toBeGreaterThan(0);
      });

      it('every parent-derived object has a row, marked Controlled by Parent', () => {
        const rows = rowsOf();
        const bad: string[] = [];
        for (const name of parentDerived) {
          const label = ROW_LABEL[name]?.[page.locale];
          if (!label) continue; // reported by the ledger test above
          const row = rows.find((cells) => cells[0] === label);
          if (!row) {
            bad.push(`${name}: ${page.file} (${page.locale}) has no "${label}" row`);
            continue;
          }
          if (!page.derived.test(row[1] ?? '')) {
            bad.push(
              `${name}: ${page.file} (${page.locale}) row "${label}" gives OWD "${row[1]}", ` +
                'but the object ships controlled_by_parent',
            );
          }
        }
        expect(
          bad,
          `OWD rows missing for objects this app derives from a parent:\n  ${bad.join('\n  ')}\n` +
            'A parent-derived object with no row also falsifies the count in the section under ' +
            'the table — which is exactly how #592 left the page saying "four".',
        ).toEqual([]);
      });

      it('no row claims Controlled by Parent for something the stack does not derive', () => {
        const rows = rowsOf();
        const known = new Set(
          parentDerived.map((name) => ROW_LABEL[name]?.[page.locale]).filter(Boolean),
        );
        const bad = rows
          .filter((cells) => page.derived.test(cells[1] ?? ''))
          .map((cells) => cells[0])
          .filter((label) => !known.has(label))
          .map(
            (label) =>
              `${page.file} (${page.locale}): row "${label}" is documented Controlled by Parent, ` +
              'but no object with that label ships controlled_by_parent',
          );
        expect(
          bad,
          `OWD rows deriving from a parent nobody has:\n  ${bad.join('\n  ')}\n` +
            'Either the object was renamed/retired (fix the row) or its OWD changed (fix the row ' +
            'and the ledger above).',
        ).toEqual([]);
      });

      it('the prose under the table counts the parent-derived objects the app ships', () => {
        const text = DOC(page.file);
        const match = text.match(page.countSentence);
        expect(
          match,
          `${page.file}: the sentence counting the parent-derived objects ` +
            `(${page.countSentence}) is gone — reword the regex, do not delete the check`,
        ).toBeTruthy();
        const expected = COUNT_WORD[page.locale][parentDerived.length];
        if (!expected) {
          throw new Error(
            `${parentDerived.length} parent-derived objects — add that number word to ` +
              `COUNT_WORD['${page.locale}'] and update all three pages`,
          );
        }
        expect(
          match?.[1],
          `${page.file} (${page.locale}) counts "${match?.[1]}" parent-derived objects; the ` +
            `stack ships ${parentDerived.length} (${parentDerived.join(', ')})`,
        ).toBe(expected);
      });
    });
  }
});
