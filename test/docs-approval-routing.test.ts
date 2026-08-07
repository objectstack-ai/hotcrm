// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';

/**
 * The setup checklist staffs the positions approvals actually route to (#1024).
 *
 * ## What is actually true
 *
 * `src/flows/opportunity-approval.flow.ts` — this app's only approval flow —
 * resolves each tier's approvers from a POSITION:
 * `{ type: 'position', value: 'sales_manager' }` on `manager_review`, and
 * `{ type: 'position', value: 'sales_director' }` on `director_signoff`. The
 * slate is snapshotted when the request opens, so a position nobody holds opens
 * the request with an EMPTY approver list while `lockRecord: true` holds the
 * opportunity — `onEmptyApprovers: 'admin_rescue'` is the escape hatch, not the
 * happy path. `src/sharing/demo-staffing.ts` says the same thing from the other
 * side: staffing the sales manager is what makes `manager_review` "resolve to a
 * non-empty slate for the first time".
 *
 * Nothing routes off a user's **manager**. `manager_id` exists on the platform's
 * user record (it feeds the `own_and_reports` hierarchy scope from
 * `@objectstack/security-enterprise`, which this app does not install), and it
 * has **zero** occurrences in `src/`, as does `own_and_reports`: every sharing
 * rule is `{ type: 'position', … }`, and flow templates cannot dot-walk it at all
 * — `{record.owner_id.manager}` interpolates to the literal string "undefined",
 * which is why four flows carry a comment saying so.
 *
 * ## What the docs said instead
 *
 * `administration/setup`, in all three locales, put this in the Day 2 checklist:
 * *"Set a manager for each user (drives approval routing)"*. An admin who works
 * that list top to bottom fills in a column that changes nothing, and never gets
 * told the thing that does matter — that leaving `sales_manager` or
 * `sales_director` unheld is what locks the first big deal somebody submits.
 * Section 12 then said approvers are confirmed "by role", the vocabulary
 * ADR-0090 D3 retired.
 *
 * ## The rule, in two halves
 *
 * 1. **Source-derived, positive.** Every position an `approval` node routes to
 *    must be named on the setup page, in every locale. This is the half with
 *    teeth: change the flow to route to `deal_desk` and the docs go red until
 *    somebody adds it to the staffing checklist — which is exactly the drift
 *    that produced #1024 (a checklist describing a routing mechanism the flow
 *    does not have).
 * 2. **Negative, and deliberately narrow.** No checklist STEP may pair a user's
 *    manager with approval routing. It is scoped to list items rather than to
 *    prose on purpose: correct prose has to be able to say the opposite —
 *    "approvals route to a position, never to a reporting line" is the sentence
 *    this PR added, and a co-occurrence rule cannot tell that from the claim it
 *    denies. A checklist step is an INSTRUCTION; there is no correct way to
 *    write "set a manager … so approvals route" as one. Half 1 is what covers
 *    the mechanism in prose, by requiring the real one to be present.
 *
 * ## Why the source side asserts `type: 'position'` first
 *
 * Half 2 is only correct while every approver descriptor is a position. If a
 * future flow legitimately routes to `{ type: 'user_field', value: 'manager' }`,
 * the docs SHOULD start describing a manager, and this rule would be wrong
 * rather than merely stale. So the descriptor types are asserted, and the
 * failure message says to revisit the docs rule — not to delete the descriptor.
 *
 * ## Reverse verification (#1024)
 *
 * Predicted direction, decided before running, and different for each half:
 *
 *  - **Half 2: red before, green after — on twice as many lines as the issue
 *    named.** Measured across the whole docs tree, not just the one page: the
 *    pre-fix tree reports **6** offending list items and no others. Three are
 *    the Day 2 bullet #1024 quotes; the other three are section 12's *"Confirm
 *    approvers (manager + director by role)"* in the same three locales, which
 *    the issue does not mention. That second line describes the same approver
 *    slate in the vocabulary ADR-0090 D3 retired, and it is why this PR rewrites
 *    it too: with it left alone the rule is red, and excusing it would excuse
 *    the family the rule exists for. After the rewrite: 0.
 *  - **Half 1: red before AND after — until the rewrite supplies the positions.**
 *    This is the half whose direction is not "the bad text went away": the
 *    pre-fix page never named `sales_manager` or `sales_director` at all, so
 *    deleting the false bullet would leave it red. It goes green only because
 *    the new text says which positions to staff, which is the actual deliverable
 *    of #1024. Measured pre-fix: 6 misses (2 positions × 3 locales); after: 0.
 */
describe('docs staff the positions approvals route to (#1024)', () => {
  /** Approver descriptors authored on `approval` nodes, across every flow. */
  const APPROVERS: { file: string; type: string; value: string }[] = readdirSync(
    join(REPO_ROOT, 'src/flows'),
  )
    .filter((f) => f.endsWith('.flow.ts'))
    .flatMap((file) => {
      const source = readFileSync(join(REPO_ROOT, 'src/flows', file), 'utf8');
      return [...source.matchAll(/approvers:\s*\[([\s\S]*?)\]/g)].flatMap((block) =>
        [...block[1].matchAll(/\{\s*type:\s*'([a-z_]+)'\s*,\s*value:\s*'([a-z_0-9]+)'\s*\}/g)].map(
          (m) => ({ file, type: m[1], value: m[2] }),
        ),
      );
    });

  /** The setup checklist, in every locale it ships in. */
  const SETUP_PAGES = ['', '.zh-Hans', '.zh-Hant'].map((locale) => {
    const file = `content/docs/administration/setup${locale}.mdx`;
    return { file, raw: existsSync(join(REPO_ROOT, file)) ? readFileSync(join(REPO_ROOT, file), 'utf8') : '' };
  });

  /** Depth-first walk of a docs tree, REPO_ROOT-relative. */
  const walkPages = (dir: string): string[] => {
    const root = join(REPO_ROOT, dir);
    if (!existsSync(root)) return [];
    return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
      const rel = join(dir, entry.name);
      return entry.isDirectory() ? walkPages(rel) : rel.endsWith('.mdx') ? [rel] : [];
    });
  };

  /**
   * A user's manager as a THING TO SET. `\bmanager\b` deliberately does not
   * match inside `sales_manager` — the position is the correct answer, and a
   * checklist step naming it must not be reported by the rule that exists to
   * demand it.
   */
  const MANAGER_TERMS = [
    { label: 'manager', re: /\bmanagers?\b/i },
    { label: 'reporting line', re: /reporting line/i },
    { label: '经理', re: /经理/ },
    { label: '經理', re: /經理/ },
    { label: '汇报线', re: /汇报线/ },
    { label: '匯報線', re: /匯報線/ },
  ];

  /** Approval ROUTING, not the word "approval" — see the note on half 2. */
  const ROUTING_TERMS = [
    { label: 'approval routing', re: /approval rout(?:ing|e)/i },
    { label: 'routes approvals', re: /routes? (?:the )?approvals?/i },
    // the same claim in the passive, which is how a rewrite usually spells it
    { label: 'approvals are routed', re: /approvals? (?:are|is) routed/i },
    { label: 'approver', re: /approvers?\b/i },
    { label: '审批路由', re: /审批路由/ },
    { label: '審批路由', re: /審批路由/ },
    { label: '审批人', re: /审批人/ },
    { label: '審批人', re: /審批人/ },
  ];

  /** List items of a page — `- foo`, `* foo`, `- [ ] foo`, `1. foo`. */
  const listItems = (raw: string): string[] =>
    raw.split('\n').filter((line) => /^\s*(?:[-*+]|\d+\.)\s/.test(line));

  /** The manager-routing claim a list item still makes, if any. */
  const claimIn = (item: string): string | '' => {
    const manager = MANAGER_TERMS.find((t) => t.re.test(item));
    const routing = ROUTING_TERMS.find((t) => t.re.test(item));
    return manager && routing ? `${manager.label} + ${routing.label}` : '';
  };

  it('the approver descriptors are read from real flow source', () => {
    // Vacuity guard #1: a regex that stopped matching would certify every claim
    // below by finding nothing to check them against.
    expect(
      APPROVERS.length,
      'no approver descriptors parsed out of src/flows/*.flow.ts — this guard has gone vacuous',
    ).toBeGreaterThanOrEqual(2);
    expect(
      [...new Set(APPROVERS.map((a) => a.value))].sort(),
      'the approver positions changed; the setup checklist and this rule both key on them',
    ).toEqual(['sales_director', 'sales_manager']);
  });

  it('every approver resolves from a position, which is what the docs rule assumes', () => {
    const nonPosition = APPROVERS.filter((a) => a.type !== 'position').map(
      (a) => `${a.file}: { type: '${a.type}', value: '${a.value}' }`,
    );
    expect(
      nonPosition,
      `an approval node routes to something other than a position:\n  ${nonPosition.join('\n  ')}\n` +
        'That may well be correct — but the docs rule below assumes positions are the whole story, and ' +
        'the setup checklist tells admins to staff positions. Update both together, or the checklist ' +
        'starts describing a mechanism the flow no longer has (which is #1024, in the other direction).',
    ).toEqual([]);
  });

  it('the setup checklist names every position approvals route to, in every locale', () => {
    // Half 1. The pre-fix page named neither position; deleting the false bullet
    // would not have satisfied this. Naming them is the deliverable.
    const missing = SETUP_PAGES.flatMap(({ file, raw }) => {
      if (!raw) return [`${file}: page not found`];
      return [...new Set(APPROVERS.map((a) => a.value))]
        .filter((value) => !raw.includes(value))
        .map((value) => `${file}: never names \`${value}\``);
    });
    expect(
      missing,
      `the setup checklist does not staff the positions approvals route to:\n  ${missing.join('\n  ')}\n` +
        'An approval request snapshots its approver slate from the position when it opens, so a position ' +
        'nobody holds opens the request with an EMPTY slate while `lockRecord: true` holds the deal ' +
        "(`onEmptyApprovers: 'admin_rescue'` is the rescue, not the design). Staffing them belongs in the " +
        'checklist, by name.',
    ).toEqual([]);
  });

  it('no checklist step tells an admin that a user manager routes approvals', () => {
    // Half 2, scanned over the whole docs tree rather than the one page, so the
    // claim cannot simply move next door.
    const offenders = walkPages('content/docs').flatMap((file) => {
      const raw = readFileSync(join(REPO_ROOT, file), 'utf8');
      return listItems(raw)
        .map((item) => ({ item, claim: claimIn(item) }))
        .filter((x) => x.claim !== '')
        .map((x) => `${file}: ${x.claim} — ${x.item.trim()}`);
    });
    expect(
      offenders,
      `checklist steps tying a user's manager to approval routing:\n  ${offenders.join('\n  ')}\n` +
        "Approvals resolve their slate from a POSITION (`sales_manager` / `sales_director`). Nothing in " +
        'this app reads a user\'s manager: `manager_id` and `own_and_reports` have zero occurrences in ' +
        '`src/`, every sharing rule is position-based, and a flow template cannot dot-walk ' +
        '`{record.owner_id.manager}` — it interpolates to the literal "undefined". Tell the admin to ' +
        'staff the two positions instead.',
    ).toEqual([]);
  });

  it('the claim detector reads the removed bullets, and leaves the correct ones alone', () => {
    // Vacuity guard #2. Group A is what this PR deleted (all three locales);
    // group B is what it wrote in their place plus the neighbouring steps that
    // legitimately say "manager" or "approver" — a rule that reddened those
    // would be forbidding the fix.
    const mustReport = [
      '- [ ] Set a manager for each user (drives approval routing)',
      '- [ ] 为每个用户设置一名经理（驱动审批路由）',
      '- [ ] 為每個使用者設置一名經理（驅動審批路由）',
      '- Approvals are routed to the submitter\'s manager.',
      '- [ ] 确认审批人（按经理汇报线）',
    ];
    const mustNotReport = [
      '- [ ] Make sure `sales_manager` and `sales_director` each have at least one holder — those two positions are what opportunity approvals route to',
      '- [ ] Confirm both approver positions have holders — `sales_manager` (> $100K) and `sales_director` (> $500K)',
      '- [ ] 确认两个审批岗位都有人持有 —— `sales_manager`（> $100K）与 `sales_director`（> $500K）',
      '- [ ] 確認兩個審批職位都有人持有 —— `sales_manager`（> $100K）與 `sales_director`（> $500K）',
      '- [ ] Set up product manager (the contact for each product line)',
      '- [ ] Schedule weekly subscription emails for managers',
      '- The thresholds ($100K / $500K), the tiers (manager → director), and `lockRecord` are all defined in the **Opportunity Approval flow**',
    ];
    const missed = mustReport.filter((item) => claimIn(item) === '');
    const overreached = mustNotReport
      .filter((item) => claimIn(item) !== '')
      .map((item) => `${claimIn(item)} — ${item}`);
    expect(
      { missed, overreached },
      'the manager/approval-routing detector drifted:\n' +
        `  no longer reported: ${JSON.stringify(missed, null, 2)}\n` +
        `  newly over-reported: ${JSON.stringify(overreached, null, 2)}\n` +
        'A claim it cannot see is a checklist nobody is checking; a correct step it reddens is a rule ' +
        'that forbids the fix. Both halves have to hold.',
    ).toEqual({ missed: [], overreached: [] });
  });
});
