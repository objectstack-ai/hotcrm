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
 * Bullet items of the list under `heading`, up to the next heading.
 *
 * The sibling of {@link tableAfter} for the pages whose claims live in a bullet
 * list rather than a table — `profiles.mdx`'s per-profile blocks (#807). Same
 * contract: it asserts the heading is still there, so a section that was renamed
 * fails loudly instead of silently yielding nothing for every rule to pass over.
 */
const bulletsAfter = (doc: string, heading: string, file: string): string[] => {
  const start = doc.indexOf(heading);
  expect(start, `"${heading}" is gone from ${file} — this guard has gone blind`).toBeGreaterThan(-1);
  const bullets: string[] = [];
  for (const line of doc.slice(start + heading.length).split('\n')) {
    if (line.startsWith('#')) break; // the next heading ends the block
    if (line.startsWith('- ')) bullets.push(line.slice(2).trim());
  }
  return bullets;
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
 * The OWD table IS the registered-object list — on all three locale pages
 * (#710 for the parent-derived rows, #790 for the rest of the table).
 *
 * `crm_event_attendee` shipped `controlled_by_parent` with the activity model
 * (#592) and never reached the Org-Wide Defaults table, so the section right
 * under that table went on saying "the four parent-derived objects above" while
 * the app shipped five. #710 pinned that class. Two neighbouring defects it
 * deliberately left alone (#790) proved the class was drawn too narrowly:
 * `crm_event` had no row either, and a `Competitor` row outlived the object —
 * `crm_competitor` went with the demo-only module, taking four profile grants
 * with it (`.changeset/dangling-competitor-grants.md`), while the row stayed
 * behind telling admins to look in Setup for an object that is not there.
 * Neither was parent-derived, so neither was visible to #710's guard.
 *
 * So the rule is now the whole table: **one row per registered object, no row
 * for anything else.** The table earns that reading — with `Competitor` gone and
 * `Event` added it holds exactly the 17 objects `objectstack.config.ts`
 * registers, which is what an admin uses it for.
 *
 * ## What is derived, and what is authored
 *
 * The ROW SET and each row's OWD VALUE are derived from the compiled stack: every
 * registered object must have exactly one row, that row's OWD cell must state the
 * `sharingModel` the object actually ships, and no row may name an object this
 * app does not register. The ROW LABEL per locale is authored in {@link ROW_LABEL},
 * because it cannot be derived: these pages translate object labels themselves
 * rather than reusing the app's locale packs (the zh-Hans table says 商机行项 where
 * `src/translations/zh-CN.ts` says 商机产品明细), and the app ships no zh-Hant pack
 * at all. So a new object costs one ledger line plus three doc rows — and the
 * failure names the object AND the page, which is the point.
 *
 * `sys_*` objects are excluded, on `docs-object-coverage.test.ts`'s criterion:
 * platform objects are documented by the platform, not here. Today the compiled
 * stack contains none, so the filter changes nothing; it is there so a platform
 * that starts injecting them does not turn this table into a platform manual.
 *
 * The parent named in the cell's parentheses — "(Event)", "（活动）" — is not
 * checked: which field the platform resolves as the master is an ADR-0055
 * derivation, and asserting our guess at it here would pin this repo's reading of
 * the platform rather than the app's own metadata.
 *
 * ## What replaced #710's reverse rule
 *
 * #710 had a narrower pair: parent-derived objects must have a row, and no row
 * may *claim* Controlled by Parent for anything the stack does not derive. Both
 * are now special cases and both are gone as separate rules — a row marked
 * Controlled by Parent for a `private` object fails the OWD-value check, and a
 * row for an object nobody registers fails the ghost-row check, whatever its OWD
 * cell says. The count rule below is the one thing that did NOT generalise, and
 * it stays exactly as #710 wrote it: it counts parent-derived objects because
 * that is what the sentence under the table counts.
 *
 * ## The count is pinned to the stack, not to the table
 *
 * The number word under the table is derived from the same compiled stack as the
 * rows, never from how many rows the table happens to have. That is what makes
 * this guard catch #592's defect from either side: a page cannot lose a row and
 * talk its own prose into agreeing with the loss.
 *
 * ## Reverse verification (#790, #791)
 *
 * Five directions, each predicted before it was run, each measured on this tree:
 *
 *   1. Delete the new `Event` row from the zh-Hant page → predicted RED on that
 *      page's row rule only, naming `crm_event`; the count rule stays GREEN,
 *      because Event is not parent-derived. Measured, 1 failed | 28 passed:
 *      "crm_event: content/docs/administration/sharing-and-security.zh-Hant.mdx
 *      (zh-Hant) has no "活動" row".
 *   2. Put the `Competitor` row back on the English page → predicted RED on the
 *      ghost-row rule for that page only. This is the direction #710's guard
 *      could not see at all: the row is `Public Read-Only`, so nothing about it
 *      was parent-derived. Measured, 1 failed | 28 passed:
 *      "…sharing-and-security.mdx (en): row "Competitor" names no object this app
 *      registers".
 *   3. Delete a PARENT-DERIVED row (Event Attendee) from the zh-Hans page →
 *      predicted RED on that page's row rule, and GREEN on its count rule, which
 *      keeps reading 五 off the stack. Measured, 1 failed | 28 passed:
 *      "crm_event_attendee: …sharing-and-security.zh-Hans.mdx (zh-Hans) has no
 *      "活动参与者" row" — and no count failure anywhere, which is the point of
 *      direction 3: rows and the number word cannot drift into agreeing with
 *      each other while both disagree with the app.
 *   4. Delete the new `活动` row from the zh-Hans RELATED-LIST table → predicted
 *      RED on the Chinese related-list coverage rule for that page only.
 *      Measured, 1 failed | 28 passed: "…zh-Hans.mdx (zh-Hans): the related-list
 *      table has to cover every account child in the ledger … expected
 *      [ 'crm_case', 'crm_contact', …(4) ] to deeply equal
 *      [ 'crm_case', 'crm_contact', …(5) ]  -   "crm_event"".
 *   5. Put the pre-#699 promise back on the zh-Hans page ("**读** —— 你能看到其父
 *      记录你能看到的那些行") → predicted RED on the reach-claim rule below, and
 *      only there: no row moved, so no row rule can see it. That is the whole
 *      point — this is the defect #791 reports, and until now NOTHING was red on
 *      it. Measured, 1 failed | 28 passed: "…zh-Hans.mdx (zh-Hans): no sentence
 *      matching /本版本计算出来的结果是组织范围，而不是按父记录收窄/".
 */

type Locale = 'en' | 'zh-Hans' | 'zh-Hant';

/** The OWD values this app's objects actually ship. */
type SharingModel = 'private' | 'public_read' | 'controlled_by_parent';

interface LocalePage {
  locale: Locale;
  file: string;
  /** The heading the Org-Wide Defaults table follows. */
  owdHeading: string;
  /** How this page spells each OWD value in the table's second cell. */
  owdCell: Record<SharingModel, RegExp>;
  /**
   * The sentence under the OWD table counting the parent-derived objects;
   * group 1 is the number word.
   */
  countSentence: RegExp;
  /**
   * The sentence stating what Controlled by Parent *computes to* in this
   * release. See the reach-claim guard below for why this is authored per
   * locale rather than derived.
   */
  reachClaim: RegExp;
  /** The heading the related-list table follows. */
  relatedListHeading: string;
  /** A related-list verdict reading "their own only" in this language. */
  saysOwnOnly: RegExp;
  /** A related-list verdict promising the child follows the account. */
  saysFollowsAccount: RegExp;
}

const PAGES: LocalePage[] = [
  {
    locale: 'en',
    file: SHARING_DOC,
    owdHeading: '## Layer 1 — Org-Wide Defaults',
    owdCell: {
      private: /^Private$/i,
      public_read: /^Public Read-Only$/i,
      controlled_by_parent: /^Controlled by Parent\b/i,
    },
    countSentence: /For the ([A-Za-z]+) parent-derived objects above/,
    reachClaim: /in this release the computed answer is org-wide, not parent-scoped/,
    relatedListHeading: '### A rule widens one object, not the records underneath it',
    saysOwnOnly: /own (deals |)only/i,
    saysFollowsAccount: /follows the account/i,
  },
  {
    locale: 'zh-Hans',
    file: 'content/docs/administration/sharing-and-security.zh-Hans.mdx',
    owdHeading: '## 第 1 层 —— 组织范围默认值',
    owdCell: {
      private: /^私有$/,
      public_read: /^公共只读$/,
      controlled_by_parent: /^由父级控制/,
    },
    countSentence: /对于上面([一二三四五六七八九十]+)个由父级派生的对象/,
    reachClaim: /本版本计算出来的结果是组织范围，而不是按父记录收窄/,
    relatedListHeading: '### 一条规则放开的是一个对象，而不是它下面的记录',
    saysOwnOnly: /只有自己的/,
    saysFollowsAccount: /跟随客户/,
  },
  {
    locale: 'zh-Hant',
    file: 'content/docs/administration/sharing-and-security.zh-Hant.mdx',
    owdHeading: '## 第 1 層 —— 組織範圍預設值',
    owdCell: {
      private: /^私有$/,
      public_read: /^公開唯讀$/,
      controlled_by_parent: /^由父層控制/,
    },
    countSentence: /對於上面([一二三四五六七八九十]+)個由父層衍生的物件/,
    reachClaim: /本版本計算出來的結果是組織範圍，而不是按父記錄收窄/,
    relatedListHeading: '### 一條規則放開的是一個物件，而不是它底下的記錄',
    saysOwnOnly: /只有自己的/,
    saysFollowsAccount: /跟隨客戶/,
  },
];

/**
 * The OWD table's row label for each registered object, per locale.
 *
 * Authored, not derived — see the header. The Chinese pages reuse these same
 * labels in the related-list table (Chinese has no plural form), which is why
 * the related-list guard further down can read this ledger too; the English page
 * pluralises there, and is checked against the stack's own `pluralLabel` by the
 * rule in the docs describe above.
 */
const ROW_LABEL: Record<string, Record<Locale, string>> = {
  crm_lead: { en: 'Lead', 'zh-Hans': '线索', 'zh-Hant': '線索' },
  crm_account: { en: 'Account', 'zh-Hans': '客户', 'zh-Hant': '客戶' },
  crm_contact: { en: 'Contact', 'zh-Hans': '联系人', 'zh-Hant': '聯絡人' },
  crm_opportunity: { en: 'Opportunity', 'zh-Hans': '商机', 'zh-Hant': '商機' },
  crm_opportunity_line_item: {
    en: 'Opportunity Line Item',
    'zh-Hans': '商机行项',
    'zh-Hant': '商機明細',
  },
  crm_quote: { en: 'Quote', 'zh-Hans': '报价', 'zh-Hant': '報價' },
  crm_quote_line_item: { en: 'Quote Line Item', 'zh-Hans': '报价行项', 'zh-Hant': '報價明細' },
  crm_contract: { en: 'Contract', 'zh-Hans': '合同', 'zh-Hant': '合約' },
  crm_case: { en: 'Case', 'zh-Hans': '工单', 'zh-Hant': '案件' },
  crm_task: { en: 'Task', 'zh-Hans': '任务', 'zh-Hant': '任務' },
  crm_event: { en: 'Event', 'zh-Hans': '活动', 'zh-Hant': '活動' },
  crm_event_attendee: { en: 'Event Attendee', 'zh-Hans': '活动参与者', 'zh-Hant': '活動參與者' },
  crm_forecast: { en: 'Forecast', 'zh-Hans': '预测', 'zh-Hant': '預測' },
  crm_product: { en: 'Product', 'zh-Hans': '产品', 'zh-Hant': '產品' },
  crm_campaign: { en: 'Campaign', 'zh-Hans': '市场活动', 'zh-Hant': '行銷活動' },
  crm_campaign_member: { en: 'Campaign Member', 'zh-Hans': '活动成员', 'zh-Hant': '活動成員' },
  crm_knowledge_article: {
    en: 'Knowledge Article',
    'zh-Hans': '知识文章',
    'zh-Hant': '知識文章',
  },
};

/** Every business object the compiled stack registers — the OWD table's row set. */
const registeredObjects = objects
  .map((o) => o.name as string)
  .filter((name) => !name.startsWith('sys_'))
  .sort();

/** The subset the section under the table counts. */
const parentDerived = registeredObjects.filter((name) => owdOf(name) === 'controlled_by_parent');

describe('the OWD table lists every registered object, in every locale', () => {
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

  it('the row ledger answers exactly the objects this app registers', () => {
    // Anti-vacuum, both halves. 17 objects ship today, 5 of them parent-derived;
    // a ledger compared against an empty derived set would pass by checking
    // nothing at all, and so would every rule below.
    expect(
      registeredObjects.length,
      'fewer than 15 business objects in the compiled stack — either the app genuinely ' +
        'shrank (then lower this number knowingly) or the derivation broke and every rule ' +
        'below is comparing empty sets',
    ).toBeGreaterThanOrEqual(15);
    expect(
      parentDerived.length,
      'fewer than five controlled_by_parent objects in the compiled stack — same reasoning: ' +
        'lower this knowingly, or find out why the derivation stopped seeing them',
    ).toBeGreaterThanOrEqual(5);

    const unledgered = registeredObjects.filter((name) => !(name in ROW_LABEL));
    expect(
      unledgered,
      `registered objects with no OWD row label:\n  ${unledgered.join('\n  ')}\n` +
        'Add the three locale labels here, and the row to each of the three pages.',
    ).toEqual([]);

    const stale = Object.keys(ROW_LABEL).filter((name) => !registeredObjects.includes(name));
    expect(
      stale,
      `ledger entries whose object this app no longer registers:\n  ${stale.join('\n  ')}\n` +
        'Its OWD row now describes an object nobody can find in Setup — the way the ' +
        '`Competitor` row outlived `crm_competitor` (#790). Drop the row, then the entry.',
    ).toEqual([]);
  });

  it('no two objects share a row label within one locale', () => {
    // "Exactly one row per object" is only meaningful while labels identify
    // objects one-for-one. Two objects sharing a label would let one row answer
    // for both, and a ghost row for the other would go unnoticed.
    const bad: string[] = [];
    for (const { locale } of PAGES) {
      const seen = new Map<string, string>();
      for (const name of registeredObjects) {
        const label = ROW_LABEL[name]?.[locale];
        if (!label) continue;
        const owner = seen.get(label);
        if (owner) bad.push(`${locale}: "${label}" labels both ${owner} and ${name}`);
        else seen.set(label, name);
      }
    }
    expect(bad, `ambiguous OWD row labels:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  for (const page of PAGES) {
    describe(page.file, () => {
      const rowsOf = () => tableAfter(DOC(page.file), page.owdHeading, page.file);

      it('the OWD table still parses', () => {
        // Anti-vacuum #2: a table that stopped parsing would let every rule
        // below pass over an empty row list.
        expect(
          rowsOf().length,
          `no OWD table row parsed out of ${page.file} after "${page.owdHeading}" — the table ` +
            'moved, changed shape, or lost its heading, and this whole block has gone blind',
        ).toBeGreaterThan(0);
      });

      it('every registered object has exactly one row, stating the OWD it ships', () => {
        const rows = rowsOf();
        const bad: string[] = [];
        for (const name of registeredObjects) {
          const label = ROW_LABEL[name]?.[page.locale];
          if (!label) continue; // reported by the ledger test above
          const matched = rows.filter((cells) => cells[0] === label);
          if (matched.length === 0) {
            bad.push(`${name}: ${page.file} (${page.locale}) has no "${label}" row`);
            continue;
          }
          if (matched.length > 1) {
            bad.push(
              `${name}: ${page.file} (${page.locale}) has ${matched.length} "${label}" rows`,
            );
            continue;
          }
          const model = owdOf(name) as SharingModel;
          const spelling = page.owdCell[model];
          if (!spelling) {
            throw new Error(
              `${name} ships sharingModel '${model}', which this ledger cannot spell — add it ` +
                `to owdCell on all three pages (and to the "Options for OWD" line under the table)`,
            );
          }
          if (!spelling.test(matched[0][1] ?? '')) {
            bad.push(
              `${name}: ${page.file} (${page.locale}) row "${label}" gives OWD ` +
                `"${matched[0][1]}", but the object ships ${model}`,
            );
          }
        }
        expect(
          bad,
          `OWD rows that do not match the objects this app registers:\n  ${bad.join('\n  ')}\n` +
            'This table is the admin’s object list. A missing row sends them looking for a ' +
            'setting that is documented nowhere; a wrong OWD cell tells them the baseline is ' +
            'something it is not.',
        ).toEqual([]);
      });

      it('no row names an object this app does not register', () => {
        const known = new Set(
          registeredObjects.map((name) => ROW_LABEL[name]?.[page.locale]).filter(Boolean),
        );
        const bad = rowsOf()
          .map((cells) => cells[0])
          .filter((label) => !known.has(label))
          .map(
            (label) =>
              `${page.file} (${page.locale}): row "${label}" names no object this app registers`,
          );
        expect(
          bad,
          `OWD rows for objects that are not in the stack:\n  ${bad.join('\n  ')}\n` +
            'A reader takes this row to Setup and finds nothing — which is what the ' +
            '`Competitor` row did for four releases after `crm_competitor` was removed (#790). ' +
            'Either the object was renamed (fix the row and the ledger) or it is gone (drop the row).',
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

/**
 * The Chinese pages describe the same account children as the English one (#791).
 *
 * The related-list rule in the docs describe above reads the English page only,
 * and that is how `| Events | Their own only |` — added there when the activity
 * model landed (#592) — stayed missing from both Chinese tables: nothing was
 * looking. Same shape as the OWD gap #710 closed, one table further down.
 *
 * Why this covers the two Chinese pages and not all three: the English rule
 * resolves its rows against `pluralLabel` **derived from the stack**, which is
 * strictly stronger than a ledger and needs no entry here. The Chinese pages
 * cannot be checked that way — the app ships no zh-Hant locale pack, and the
 * zh-Hans doc translates independently of the one it does ship — so they are
 * checked against {@link ROW_LABEL}, which they reuse verbatim because Chinese
 * has no plural form. Two rules, one per kind of page, rather than one rule
 * weakened to the worse of the two.
 *
 * The verdict predicates are the English rule's, transposed per locale: a row
 * may not promise the child follows the account unless the ledger says
 * 'derived', may not say own-only about a parent-derived child, and must name a
 * position for every extra record it promises. Deliberately NOT extended here:
 * the built-in sharing-rules table (its object and access-level columns are
 * translated too, and no drift is reported there today) — filed as a finding
 * rather than guessed at.
 */
describe('the related-list table names the same account children on the Chinese pages', () => {
  for (const page of PAGES.filter((p) => p.locale !== 'en')) {
    describe(page.file, () => {
      const rowsOf = () => tableAfter(DOC(page.file), page.relatedListHeading, page.file);

      it('the related-list table still parses', () => {
        expect(
          rowsOf().length,
          `no related-list row parsed out of ${page.file} after "${page.relatedListHeading}" — ` +
            'the table moved or lost its heading, and the rule below has gone blind',
        ).toBeGreaterThan(0);
      });

      it('covers every account child in the ledger, and promises what the metadata delivers', () => {
        const byLabel = new Map<string, string>();
        for (const name of Object.keys(ACCOUNT_CHILD_COVERAGE)) {
          const label = ROW_LABEL[name]?.[page.locale];
          if (label) byLabel.set(label, name);
        }
        const bad: string[] = [];
        const documented: string[] = [];
        for (const [listLabel, promise] of rowsOf()) {
          const name = byLabel.get(listLabel);
          if (!name) {
            bad.push(`"${listLabel}" is not an account child this app ships`);
            continue;
          }
          documented.push(name);
          const coverage = ACCOUNT_CHILD_COVERAGE[name];
          if (page.saysFollowsAccount.test(promise) && coverage !== 'derived') {
            bad.push(`${name}: docs say it follows the account, ledger says '${coverage}'`);
          }
          if (page.saysOwnOnly.test(promise) && coverage === 'derived') {
            bad.push(`${name}: docs say own-only, but the object is parent-derived`);
          }
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
        expect(bad, `${page.file}: related-list table drift:\n  ${bad.join('\n  ')}`).toEqual([]);
        expect(
          documented.slice().sort(),
          `${page.file} (${page.locale}): the related-list table has to cover every account ` +
            'child in the ledger — the English page has carried an Events row since #592 and ' +
            'these two never got one',
        ).toEqual(Object.keys(ACCOUNT_CHILD_COVERAGE).sort());
      });
    });
  }
});

/**
 * All three pages state the reach Controlled by Parent actually computes (#791).
 *
 * PR #699 rewrote the English page after `test/parent-derived-reach.test.ts`
 * measured what the platform really does — the derivation resolves accessible
 * parents from the parent object's row-level policies alone, so a
 * Controlled by Parent object reads org-wide rather than per parent. The two
 * Chinese pages did not follow, and for six weeks told their readers the
 * opposite of what the English page told theirs: "你能看到其父记录你能看到的那些行".
 * The existing doc rules all stop at the English page (#725 is the same shape),
 * and `docs-drift.test.ts` compares callout counts, which #699 did not change.
 *
 * What this pins is CO-MOVEMENT, not truth. The truth is pinned by
 * `test/parent-derived-reach.test.ts`, which measures the reach against the
 * engine and fails when the platform narrows it (objectstack-ai/objectstack#5386).
 * This rule only makes the three pages move together when that day comes: the
 * claim is authored per locale because no locale's wording is derivable, and the
 * two pointers are language-neutral tokens, so one check covers all three.
 */
describe('every locale states the parent-derived reach this release computes', () => {
  /** Language-neutral tokens the section must point at, on every page. */
  const POINTERS = ['objectstack-ai/objectstack#5386', 'test/parent-derived-reach.test.ts'];

  it('each page carries the measured reach claim, and points at what pins it', () => {
    const bad: string[] = [];
    for (const page of PAGES) {
      const text = DOC(page.file);
      if (!page.reachClaim.test(text)) {
        bad.push(
          `${page.file} (${page.locale}): no sentence matching ${page.reachClaim} — either this ` +
            'page still promises parent-scoped reach, or the wording moved. If the platform ' +
            'narrowed the derivation, rewrite all three pages and this ledger together; do not ' +
            'delete the check to get green.',
        );
      }
      for (const pointer of POINTERS) {
        if (!text.includes(pointer)) {
          bad.push(`${page.file} (${page.locale}): does not point at ${pointer}`);
        }
      }
    }
    expect(bad, `pages out of step on what Controlled by Parent reaches:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});

/**
 * The profiles page states that same reach, in every locale (#807).
 *
 * Exactly the defect above, one page over. `profiles.mdx` describes the same
 * derivation from the persona's side — what a Sales Representative reaches on
 * Contact and on the two line-item objects — and PR #699 rewrote those two
 * bullets in English only. The two Chinese pages went on promising the
 * pre-#699 reading for six weeks ("**联系人** 跟随客户", "对自己的交易和报价拥有完整
 * 权限"), which is not merely stale but the reverse of what ships: a rep reading
 * one account reads both accounts' contacts, and a rep reading NO quote still
 * reads every quote's lines (`test/parent-derived-reach.test.ts`).
 *
 * Nothing was red. The reach guard above stops at `sharing-and-security`, the
 * OWD and related-list rules read tables this page does not have, and
 * `docs-drift.test.ts` compares callout counts, which #699 did not change —
 * `grep -rn "profiles.mdx" test/` was empty before this block.
 *
 * ## Why a second ledger rather than a fourth entry in PAGES
 *
 * {@link PAGES} describes pages built out of the OWD and related-list TABLES;
 * every field on it (`owdHeading`, `owdCell`, `countSentence`,
 * `relatedListHeading`) is meaningless here, because this page carries the claim
 * in a bullet list under a persona heading. So this block reuses the parsing
 * infrastructure — {@link DOC}, {@link bulletsAfter}, an authored-per-locale
 * RegExp ledger, the same anti-vacuum discipline — and not the row shape.
 *
 * ## What is derived, and what is authored
 *
 * The CLAIM WORDING is authored per locale in {@link PROFILE_PAGES}: no locale's
 * prose is derivable, and — same reason as the reach guard above — the app ships
 * no zh-Hant pack and the zh-Hans page translates independently of the one it
 * does ship. What is DERIVED is the precondition these three bullets rest on:
 * the objects they describe must still be registered and still ship
 * `controlled_by_parent`. That is what keeps the authored regexes answerable to
 * the app: the day Contact stops being parent-derived, this block goes red on
 * the derived rule and the wording has to be re-taken rather than re-matched.
 *
 * Like the guard above, what the claim rules pin is CO-MOVEMENT, not truth. The
 * truth is measured in `test/parent-derived-reach.test.ts`. The English page is
 * checked here too, deliberately: it is the baseline the Chinese pages were
 * brought to, so if a future rewrite moves it and leaves them behind, the
 * English rule is the one that fires first and names the page.
 *
 * The pointer is checked per locale rather than as a language-neutral token: on
 * this page it is a cross-reference to *Controlled by Parent, in practice* on
 * the sharing page (that is the form the English page uses — the upstream issue
 * number lives on the page that pointer lands on), and both the localized route
 * prefix and the translated section title differ per locale.
 *
 * ## Reverse verification (#807)
 *
 * Five directions, each predicted before it was run, each measured on this tree:
 *
 *   1. Put the pre-#699 promise back on the zh-Hans page ("**联系人** 跟随客户：
 *      代表能看到自己可见的每个客户下的联系人") → predicted RED on that page's claim
 *      rule ONLY: no table row moved, so nothing above can see it, and that is
 *      the whole reason this block exists. Measured, 1 failed | 35 passed — and
 *      that one test reported THREE findings, not one, because the pre-#699
 *      bullet carried no cross-reference either: "no bullet matching
 *      /组织内的每一个联系人 —— 而不只是代表能看到的那些客户下面的/", "does not point at
 *      /zh-Hans/docs/administration/sharing-and-security", "does not point at
 *      *“由父级控制”在实践中*". Losing the claim and losing the pointer to what
 *      explains it are the same regression here, which is why they are one rule.
 *   2. Put the narrowed line-item promise back on the zh-Hant page ("對自己的交易
 *      和報價擁有完整權限") → predicted RED on that page's claim rule only, naming
 *      the line-item regex and leaving the contact one green. Measured,
 *      1 failed | 35 passed: "profiles.zh-Hant.mdx (zh-Hant): no bullet matching
 *      /每一筆交易、每一張報價的明細，而不只是代表自己的/".
 *   3. Break the ENGLISH bullet (drop "not only those on accounts the rep can
 *      see") → predicted RED on the English page's claim rule, proving this
 *      block watches the baseline too and does not merely compare the two
 *      Chinese pages to each other. Measured, 1 failed | 35 passed:
 *      "profiles.mdx (en): no bullet matching /every contact in the org — not
 *      only those on accounts the rep can see/".
 *   4. Rename the zh-Hans persona heading (`### 💼 Sales Representative` →
 *      `### 💼 Sales Rep`) → predicted RED TWICE on that page and nowhere else:
 *      the parse rule and the claim rule both read the block through
 *      {@link bulletsAfter}, so a section that moved fails as a missing heading
 *      rather than as an empty list every rule passes over. Measured,
 *      2 failed | 34 passed, both "…"### 💼 Sales Representative" is gone from
 *      content/docs/administration/profiles.zh-Hans.mdx — this guard has gone
 *      blind".
 *   5. Typo one name in {@link PARENT_DERIVED_IN_PROFILES}
 *      (`crm_quote_line_item` → `crm_quote_lineitem`) → predicted RED on the
 *      derived precondition, naming it as unregistered. This is the anti-vacuum:
 *      it proves that rule reads the compiled stack instead of comparing an
 *      authored list to itself. Measured, 1 failed | 35 passed:
 *      "crm_quote_lineitem: not an object this app registers".
 */
const PROFILE_DOC = 'content/docs/administration/profiles.mdx';

/**
 * The objects the Sales Representative bullets claim a parent-derived reach for.
 *
 * Derived precondition, not decoration: every name here must be registered and
 * must still ship `controlled_by_parent`. If one stops, the bullets below are
 * describing a derivation the app no longer has, and re-matching the regex would
 * be the wrong repair.
 */
const PARENT_DERIVED_IN_PROFILES = [
  'crm_contact',
  'crm_opportunity_line_item',
  'crm_quote_line_item',
] as const;

interface ProfilePage {
  locale: Locale;
  file: string;
  /** The heading the Sales Representative bullet list follows. */
  repHeading: string;
  /** The bullet stating how far Contact's parent derivation reaches. */
  contactReach: RegExp;
  /** The bullet stating how far the line-item derivation reaches. */
  lineItemReach: RegExp;
  /**
   * The cross-reference into the sharing page's *Controlled by Parent, in
   * practice* section: the localized route, then the translated section title.
   */
  pointers: readonly string[];
}

const PROFILE_PAGES: ProfilePage[] = [
  {
    locale: 'en',
    file: PROFILE_DOC,
    repHeading: '### 💼 Sales Representative',
    contactReach: /every contact in the org — not only those on accounts the rep can see/,
    lineItemReach: /reaches every deal's and every quote's lines, not only the rep's own/,
    pointers: ['/docs/administration/sharing-and-security', '*Controlled by Parent, in practice*'],
  },
  {
    locale: 'zh-Hans',
    file: 'content/docs/administration/profiles.zh-Hans.mdx',
    repHeading: '### 💼 Sales Representative',
    contactReach: /组织内的每一个联系人 —— 而不只是代表能看到的那些客户下面的/,
    lineItemReach: /每一笔交易、每一张报价的行项，而不只是代表自己的/,
    pointers: [
      '/zh-Hans/docs/administration/sharing-and-security',
      '*“由父级控制”在实践中*',
    ],
  },
  {
    locale: 'zh-Hant',
    file: 'content/docs/administration/profiles.zh-Hant.mdx',
    repHeading: '### 💼 Sales Representative',
    contactReach: /組織內的每一個聯絡人 —— 而不只是代表能看到的那些客戶底下的/,
    lineItemReach: /每一筆交易、每一張報價的明細，而不只是代表自己的/,
    pointers: [
      '/zh-Hant/docs/administration/sharing-and-security',
      '*「由父層控制」在實務中*',
    ],
  },
];

describe('every locale states the parent-derived reach on the profiles page', () => {
  it('the objects those bullets describe are still parent-derived', () => {
    const bad = PARENT_DERIVED_IN_PROFILES.map((name) => {
      if (!objectByName.has(name)) return `${name}: not an object this app registers`;
      const owd = owdOf(name);
      return owd === 'controlled_by_parent' ? null : `${name}: ships '${owd}', not controlled_by_parent`;
    }).filter((m): m is string => m !== null);
    expect(
      bad,
      'the profiles page describes a parent-derived reach for objects that are no longer ' +
        `parent-derived:\n  ${bad.join('\n  ')}\n` +
        'Re-take the wording on all three pages against what the app now ships — do not ' +
        'edit the regexes to match prose that describes a derivation nobody has.',
    ).toEqual([]);
  });

  for (const page of PROFILE_PAGES) {
    describe(page.file, () => {
      const bulletsOf = () => bulletsAfter(DOC(page.file), page.repHeading, page.file);

      it('the Sales Representative block still parses', () => {
        // Anti-vacuum: an empty bullet list would let the rule below pass by
        // searching nothing at all.
        expect(
          bulletsOf().length,
          `no bullet parsed out of ${page.file} under "${page.repHeading}" — the persona block ` +
            'moved, changed shape, or lost its heading, and the rule below has gone blind',
        ).toBeGreaterThan(0);
      });

      it('states the reach Contact and the line items really have, and points at what explains it', () => {
        const block = bulletsOf();
        const bad: string[] = [];
        for (const claim of [page.contactReach, page.lineItemReach]) {
          if (!block.some((bullet) => claim.test(bullet))) {
            bad.push(
              `${page.file} (${page.locale}): no bullet matching ${claim} — either this page ` +
                'still promises the pre-#699 reach ("contacts follow the account", "full ' +
                'control of their own deals"), or the wording moved',
            );
          }
        }
        for (const pointer of page.pointers) {
          if (!block.some((bullet) => bullet.includes(pointer))) {
            bad.push(`${page.file} (${page.locale}): does not point at ${pointer}`);
          }
        }
        expect(
          bad,
          `profiles pages out of step on what a rep's parent-derived reach is:\n  ${bad.join('\n  ')}\n` +
            'The measured reach is pinned by test/parent-derived-reach.test.ts. If the platform ' +
            'narrowed it (objectstack-ai/objectstack#5386), rewrite all three profiles pages, all ' +
            'three sharing pages and both ledgers together; do not relax a regex to get green.',
        ).toEqual([]);
      });
    });
  }
});
