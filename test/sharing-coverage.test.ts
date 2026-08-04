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
 * but the account's children each keep their own baseline: `crm_contact` is
 * `controlled_by_parent` and follows, while `crm_quote`, `crm_contract` and
 * `crm_task` are `private` with no rule of their own, and `crm_opportunity`
 * only widens through the >= $100k leadership rules. A rep who receives an
 * account through a territory rule therefore opens it to partially empty
 * related lists.
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
 * How far a rep's reach on an account carries into the records under it.
 *
 *   'derived'  — OWD is controlled_by_parent: the child follows the account.
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
  /** Rows of the first markdown table after `heading`, as trimmed cell arrays. */
  const tableAfter = (doc: string, heading: string): string[][] => {
    const start = doc.indexOf(heading);
    expect(start, `"${heading}" is gone from ${SHARING_DOC} — this guard has gone blind`).toBeGreaterThan(-1);
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
