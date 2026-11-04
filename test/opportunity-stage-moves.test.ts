// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { VerifyStack } from '@objectstack/verify';
import { Opportunity } from '../src/sales/objects/opportunity.object';
import { REPO_ROOT } from './helpers/repo-root';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

/**
 * Which opportunity stage changes save, and which are refused (#2234).
 *
 * The Opportunities page said a rep "can't skip forward — you have to walk
 * through the funnel one stage at a time. The system blocks invalid jumps."
 * `opportunity_stage_progression` is `severity: 'warning'`, so that was read
 * as an overstatement — the class #2220 corrected on leads — and measured
 * here rather than assumed, on `main` `1e71d5e`, through
 * `PATCH /data/crm_opportunity/:id`, as the deal's own sales rep and as the
 * dev admin:
 *
 *   1. **A forward skip saves** (Prospecting → Negotiation): 200, the new
 *      stage is stored, and Probability follows it. The rule's message comes
 *      back to the caller in the response's `warnings[]` and as one WARN line
 *      in the server log; nothing is refused. (Whether the console surfaces
 *      that warning to the rep was not measured, so the page does not say.)
 *   2. **A backward move on an open deal saves** (Negotiation → Qualification,
 *      Proposal → Prospecting), the same way.
 *   3. **A move out of Closed Won / Closed Lost is refused** — 409
 *      `RECORD_LOCKED`, by the closed-deal freeze in `opportunity.hook.ts`,
 *      not by the stage rule — and the deal keeps its stage. That holds for a
 *      reopen and for won ↔ lost.
 *
 * The freeze judges user writes only (`ctx.user?.id`); a system write moving
 * a closed deal is not a path a person has, so it is not what the page
 * describes and is not pinned here. The 立项 and status-change gates in the
 * same hook are inert as shipped (`not_required`) and are pinned where they
 * live.
 *
 * The page's paragraph is pinned at the bottom, so the old claim cannot come
 * back while the rule stays a warning: raise the rule to `error` and the
 * first describe goes red, telling you the page must change with it.
 */

type Rec = Record<string, any>;

let verify: VerifyStack;
const people = {} as Record<'rep' | 'admin', Person>;
let accountId = '';
let k = 0;

const rule = (Opportunity.validations as Rec[]).find((v) => v.name === 'opportunity_stage_progression')!;

beforeAll(async () => {
  verify = await hotcrmStack();
  const adminToken = await verify.signIn();
  people.admin = { token: adminToken, id: String((await verify.contextFor(adminToken)).userId) } as Person;
  people.rep = await signUpPerson(verify, 'rep@opportunity-stage-moves.test', {
    name: 'Stage Moves Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  const [account] = await verify.seed('crm_account', [{ name: 'Stage Moves Co', owner_id: people.rep.id, approval_status: 'approved' }]);
  accountId = String(account!.id);
}, 120_000);

const PEOPLE = [['the deal’s rep', 'rep'], ['the admin', 'admin']] as const;

/** The reason a close needs, so a refusal below is never the reason rule's. */
const REASON: Rec = { closed_won: { win_reason: 'better_product' }, closed_lost: { loss_reason: 'no_budget' } };

/** A deal of the rep's stored at `stage`, written as the system (an insert is not judged). */
const dealAt = async (stage: string): Promise<Rec> =>
  (await verify.seed('crm_opportunity', [{
    name: `Stage Moves ${++k}`, stage, amount: 1000, close_date: '2030-06-30',
    crm_account: accountId, owner_id: people.rep.id, ...(REASON[stage] ?? {}),
  }]))[0]!;

const stored = async (id: string): Promise<Rec> => (await verify.rows('crm_opportunity', { id }))[0]!;

const move = async (who: Person, id: string, to: string): Promise<{ status: number; body: Rec; text: string }> => {
  const res = await verify.apiAs(who.token, 'PATCH', `/data/crm_opportunity/${id}`, { stage: to, ...(REASON[to] ?? {}) });
  const text = await res.text();
  let body: Rec = {};
  try { body = JSON.parse(text); } catch { body = { raw: text }; }
  return { status: res.status, body, text };
};

/** Off the declared path, on open deals: forward skips and backward moves. */
const OFF_PATH = [
  ['prospecting', 'negotiation'],
  ['negotiation', 'qualification'],
  ['proposal', 'prospecting'],
] as const;

/** Out of a closed stage: a reopen, and won ↔ lost. */
const OUT_OF_CLOSED = [
  ['closed_won', 'negotiation'],
  ['closed_lost', 'prospecting'],
  ['closed_won', 'closed_lost'],
  ['closed_lost', 'closed_won'],
] as const;

const PROBABILITY: Rec = { prospecting: 10, qualification: 25, needs_analysis: 40, proposal: 60, negotiation: 80, closed_won: 100, closed_lost: 0 };

describe('the stage rule is advice (#2234)', () => {
  it('is a warning-severity state machine over stage', () => {
    expect(rule, 'opportunity_stage_progression is not declared on crm_opportunity').toBeTruthy();
    expect({ type: rule.type, field: rule.field, severity: rule.severity })
      .toEqual({ type: 'state_machine', field: 'stage', severity: 'warning' });
  });

  it('does not hold any probed off-path move — the precondition for the cases below', () => {
    for (const [from, to] of [...OFF_PATH, ...OUT_OF_CLOSED]) expect(rule.transitions[from], `${from} → ${to}`).not.toContain(to);
  });
});

describe('an off-path move on an open deal saves (#2234)', () => {
  it.each(PEOPLE.flatMap(([label, key]) => OFF_PATH.map(([from, to]) => [label, from, to, key] as const)))(
    '%s: %s → %s saves with a warning, and Probability follows the stage',
    async (_label, from, to, key) => {
      const deal = await dealAt(from);
      const res = await move(people[key], deal.id, to);
      expect(res.status, res.text).toBe(200);
      expect(res.body.warnings).toEqual([expect.objectContaining({
        rule: rule.name, severity: 'warning', field: 'stage', code: 'invalid_transition', message: rule.message,
      })]);
      const after = await stored(deal.id);
      expect({ stage: after.stage, probability: after.probability }).toEqual({ stage: to, probability: PROBABILITY[to] });
    },
  );
});

/**
 * An early win is on the path (#2371 row 3). A rep closing a Prospecting,
 * Qualification or Needs Analysis deal as won used to get "Saved — with
 * warnings: Invalid opportunity stage transition" on top of the save toast,
 * for a move the business accepts. Every open stage may now go to Closed Won,
 * as every open stage could already go to Closed Lost; take `closed_won` back
 * out of a row and the warning returns, and this goes red.
 */
const EARLY_WIN = ['prospecting', 'qualification', 'needs_analysis'] as const;

describe('an early win saves without a warning (#2371 row 3)', () => {
  it('lets every open stage close as won or lost', () => {
    for (const from of ['prospecting', 'qualification', 'needs_analysis', 'proposal', 'negotiation']) {
      expect(rule.transitions[from], from).toEqual(expect.arrayContaining(['closed_won', 'closed_lost']));
    }
  });

  it.each(EARLY_WIN)('the rep: %s → closed_won saves with no warning', async (from) => {
    const deal = await dealAt(from);
    const res = await move(people.rep, deal.id, 'closed_won');
    expect(res.status, res.text).toBe(200);
    expect(res.body.warnings ?? []).toEqual([]);
    expect((await stored(deal.id)).stage).toBe('closed_won');
  });
});

describe('a closed deal keeps its stage (#2234)', () => {
  it.each(PEOPLE.flatMap(([label, key]) => OUT_OF_CLOSED.map(([from, to]) => [label, from, to, key] as const)))(
    '%s: %s → %s is refused by the closed-deal freeze',
    async (_label, from, to, key) => {
      const deal = await dealAt(from);
      const res = await move(people[key], deal.id, to);
      expect({ status: res.status, code: res.body.code }).toEqual({ status: 409, code: 'RECORD_LOCKED' });
      expect(String(res.body.error)).toContain(`is closed (${from})`);
      expect((await stored(deal.id)).stage).toBe(from);
    },
  );
});

describe('the Opportunities page says what was measured (#2234)', () => {
  const PAGES = [
    {
      file: 'content/docs/sales/opportunities.mdx',
      says: ['**advice, not a gate**', 'A move off it still saves', 'its stage cannot be changed'],
      retired: ["you can't skip forward", 'blocks invalid jumps'],
    },
    {
      file: 'content/docs/sales/opportunities.zh-Hans.mdx',
      says: ['**建议，不是闸门**', '偏离路线的移动照样保存', '阶段就不能再改'],
      retired: ['你不能向前跳过', '拦截无效跳转'],
    },
    {
      file: 'content/docs/sales/opportunities.zh-Hant.mdx',
      says: ['**建議，不是閘門**', '偏離路線的移動照樣儲存', '階段就不能再改'],
      retired: ['你不能向前跳過', '攔截無效跳轉'],
    },
  ];

  it.each(PAGES)('$file', ({ file, says, retired }) => {
    const text = readFileSync(join(REPO_ROOT, file), 'utf8');
    for (const phrase of says) expect(text, `${file} lost "${phrase}"`).toContain(phrase);
    for (const phrase of retired) expect(text, `${file} still claims "${phrase}"`).not.toContain(phrase);
  });
});
