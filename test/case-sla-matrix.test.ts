// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import caseHooks from '../src/objects/case.hook';
import {
  CASE_SLA_HOURS, CASE_SLA_DEFAULT_TIER, CASE_SLA_PRIORITIES, CASE_SLA_TIERS, caseSlaHours,
} from '../src/objects/_case-sla';
import { makeHarness, makeDeniedApi, makeCtx, hookNamed, type Rec } from './helpers/hook-harness';

/**
 * The SLA policy matrix, pinned cell by cell (#595).
 *
 * Before this, the app's entire SLA logic was one line: `critical` ⇒ now + 4h.
 * High, Medium and Low cases got no `sla_due_date` at all, which meant
 * `case_sla_monitor` — the hourly breach sweep — could never fire for three of
 * the four priorities: it selects on `sla_due_date < now`, and a blank date is
 * never in the past. `crm_account.tier` was declared and read by nothing.
 *
 * Two copies of the table exist and cannot be merged: `_case-sla.ts` (imported
 * by the seed generator, which needs the real numbers at authoring time) and a
 * hand-written mirror inside the hook body, because L2 hook bodies run
 * body-only in the QuickJS sandbox and a module constant arrives as `undefined`
 * there (see `_line-item-price-fill.ts`; the same forced duplication is what
 * `test/priority-rank-parity.test.ts` guards for `priority_rank`).
 *
 * So this file asserts the numbers by RUNNING THE SHIPPED HANDLER, not by
 * reading the constant it also imports. Change a cell in one copy and the
 * matching case below goes red; change one in both and the explicit expected
 * table at the top goes red. There is no edit that moves a deadline quietly.
 */

type AnyRec = Record<string, any>;

const hook = hookNamed(caseHooks as AnyRec[], 'case_sla_defaults') as AnyRec;
const HOUR = 3_600_000;

/**
 * The matrix, written out longhand.
 *
 * Deliberately NOT derived from `CASE_SLA_HOURS` — a test that recomputes its
 * expectation from the thing under test proves only that the code is
 * self-consistent. These sixteen numbers are the policy, spelled out where a
 * reviewer reads them.
 */
const EXPECTED: Record<string, Record<string, number>> = {
  //          strategic  enterprise  mid_market  smb
  critical: { strategic: 4, enterprise: 4, mid_market: 4, smb: 4 },
  high: { strategic: 6, enterprise: 8, mid_market: 8, smb: 8 },
  medium: { strategic: 24, enterprise: 36, mid_market: 48, smb: 48 },
  low: { strategic: 96, enterprise: 120, mid_market: 168, smb: 168 },
};

/** Run the real handler for a case on an account of `tier`; return the stamp. */
const stampFor = async (
  priority: string,
  tier: string | undefined,
  overrides: { api?: AnyRec; accountId?: string | null } = {},
): Promise<{ input: Rec; dueMs: number | undefined; atMs: number }> => {
  const harness = makeHarness({
    crm_account: tier === undefined ? [] : [{ id: 'acct_1', name: 'Demo Co', tier }],
  });
  const accountId = overrides.accountId === undefined ? 'acct_1' : overrides.accountId;
  const input: Rec = { subject: 'Something broke', priority };
  if (accountId) input.crm_account = accountId;
  const atMs = Date.now();
  await hook.handler(
    makeCtx({
      event: 'beforeInsert',
      input,
      user: { id: 'user_1' },
      api: (overrides.api ?? harness.api) as never,
    }),
  );
  const raw = input.sla_due_date;
  return {
    input,
    dueMs: typeof raw === 'string' ? new Date(raw).getTime() : undefined,
    atMs,
  };
};

/** Assert a stamp lands `hours` from the moment the handler ran. */
const expectHours = (
  res: { dueMs: number | undefined; atMs: number },
  hours: number,
  label: string,
) => {
  expect(res.dueMs, `${label}: no sla_due_date stamped`).toBeTypeOf('number');
  const offset = (res.dueMs! - res.atMs) / HOUR;
  // ±1 minute: the handler reads its own clock a beat after the test read its.
  expect(offset, `${label}: expected ${hours}h, got ${offset.toFixed(3)}h`).toBeGreaterThan(hours - 0.02);
  expect(offset, `${label}: expected ${hours}h, got ${offset.toFixed(3)}h`).toBeLessThan(hours + 0.02);
};

describe('the matrix covers every declared priority and tier', () => {
  it('has a row per case priority and a cell per account tier', () => {
    // A new tier option on `crm_account` or a new case priority must be given a
    // policy, not silently inherit one.
    expect(Object.keys(CASE_SLA_HOURS).sort()).toEqual([...CASE_SLA_PRIORITIES].sort());
    for (const priority of CASE_SLA_PRIORITIES) {
      expect(Object.keys(CASE_SLA_HOURS[priority]).sort(), `row ${priority}`).toEqual(
        [...CASE_SLA_TIERS].sort(),
      );
    }
  });

  it('names the same options the account object declares', async () => {
    const stack = (await import('../objectstack.config')).default as AnyRec;
    const account = (stack.objects ?? []).find((o: AnyRec) => o.name === 'crm_account');
    const options = (account?.fields?.tier?.options ?? []).map((o: AnyRec) => o.value);
    expect(options.sort()).toEqual([...CASE_SLA_TIERS].sort());
    // The fallback column must be the tier the field itself defaults to,
    // otherwise an unclassified account is judged by a policy nobody chose.
    const defaulted = (account?.fields?.tier?.options ?? []).find((o: AnyRec) => o.default);
    expect(defaulted?.value).toBe(CASE_SLA_DEFAULT_TIER);
  });
});

describe.each(Object.keys(EXPECTED))('%s priority', (priority) => {
  it.each(Object.keys(EXPECTED[priority]))(
    `stamps the matrix cell on a %s account`,
    async (tier) => {
      const hours = EXPECTED[priority][tier];
      // Both copies of the table, and then the behaviour itself.
      expect(CASE_SLA_HOURS[priority as never][tier as never], `constant cell ${priority}×${tier}`).toBe(hours);
      expectHours(await stampFor(priority, tier), hours, `${priority}×${tier}`);
    },
  );
});

describe('every priority now gets a clock', () => {
  it('leaves no priority without an sla_due_date', async () => {
    // The defect in one assertion: `case_sla_monitor` selects on
    // `sla_due_date < now`, so a blank date made three of four priorities
    // permanently invisible to the breach sweep.
    for (const priority of CASE_SLA_PRIORITIES) {
      const { input } = await stampFor(priority, 'enterprise');
      expect(input.sla_due_date, `${priority} got no SLA clock`).toBeTruthy();
    }
  });

  it('is a strict superset of the old critical-only rule', async () => {
    // The old rule gave EVERY critical case four hours, whatever the account.
    // Differentiating the critical row by tier would take that clock away from
    // the critical cases of non-strategic accounts — a loosening dressed up as
    // a feature. The row is flat on purpose.
    for (const tier of CASE_SLA_TIERS) {
      expectHours(await stampFor('critical', tier), 4, `critical×${tier}`);
    }
  });

  it('a critical case needs no account and no api at all', async () => {
    // The flat row means the tier lookup is skipped entirely for critical, so
    // this path is byte-for-byte the old behaviour — including under the
    // user-less / api-less contexts the other runtime tests drive.
    const input: Rec = { priority: 'critical' };
    const at = Date.now();
    await hook.handler(makeCtx({ event: 'beforeInsert', input, user: { id: 'user_1' } }));
    expectHours({ dueMs: new Date(input.sla_due_date as string).getTime(), atMs: at }, 4, 'critical, no api');
  });
});

describe('tier resolution falls back the way the docs say', () => {
  it('uses the smb column when the case names no account', async () => {
    expectHours(await stampFor('medium', 'strategic', { accountId: null }), EXPECTED.medium.smb, 'no account');
  });

  it('uses the smb column when the account carries no tier', async () => {
    const harness = makeHarness({ crm_account: [{ id: 'acct_1', name: 'Unclassified' }] });
    const input: Rec = { priority: 'medium', crm_account: 'acct_1' };
    const at = Date.now();
    await hook.handler(makeCtx({ event: 'beforeInsert', input, user: { id: 'user_1' }, api: harness.api }));
    expectHours({ dueMs: new Date(input.sla_due_date as string).getTime(), atMs: at }, EXPECTED.medium.smb, 'blank tier');
  });

  it('uses the smb column when the account cannot be read at all', async () => {
    // The anonymous web-to-case grant can create a case and read nothing else.
    // A denial there must neither reject the submission nor invent a tighter
    // deadline than the customer's contract — it degrades to the loosest cell.
    const res = await stampFor('high', 'strategic', { api: makeDeniedApi() as never });
    expectHours(res, EXPECTED.high.smb, 'denied read');
  });

  it('uses the smb column for a tier value the matrix does not know', async () => {
    expectHours(await stampFor('low', 'platinum'), EXPECTED.low.smb, 'unknown tier');
  });
});

describe('the rules the matrix does not change', () => {
  it('stamps nothing for an unrecognised priority', async () => {
    // Same refusal-to-invent as the `0` unranked sentinel: a priority nobody
    // wrote a policy for gets no deadline rather than a guessed one.
    const { input } = await stampFor('blocker', 'strategic');
    expect(input.sla_due_date).toBeUndefined();
    expect(caseSlaHours('blocker', 'strategic')).toBeUndefined();
  });

  it('stamps nothing when the write already carries a due date', async () => {
    const harness = makeHarness({ crm_account: [{ id: 'acct_1', tier: 'strategic' }] });
    const input: Rec = { priority: 'critical', crm_account: 'acct_1', sla_due_date: '2026-01-01T00:00:00.000Z' };
    await hook.handler(makeCtx({ event: 'beforeInsert', input, user: { id: 'user_1' }, api: harness.api }));
    expect(input.sla_due_date).toBe('2026-01-01T00:00:00.000Z');
  });

  it('never overwrites a deadline the record already has', async () => {
    // A service manager may renegotiate a due date; a later edit to the case
    // must not silently pull it back to the matrix default.
    const harness = makeHarness({ crm_account: [{ id: 'acct_1', tier: 'strategic' }] });
    const input: Rec = { priority: 'critical', status: 'in_progress' };
    await hook.handler(
      makeCtx({
        event: 'beforeUpdate',
        input,
        previous: { crm_account: 'acct_1', priority: 'high', sla_due_date: '2026-01-01T00:00:00.000Z' },
        user: { id: 'user_1' },
        api: harness.api,
      }),
    );
    expect(input.sla_due_date).toBeUndefined();
  });

  it('reads the tier through the account named on the PREVIOUS row', async () => {
    // A priority edit carries no `crm_account` in its input; the tier still has
    // to come from the account the case already hangs off.
    const harness = makeHarness({ crm_account: [{ id: 'acct_1', tier: 'strategic' }] });
    const input: Rec = { priority: 'medium' };
    const at = Date.now();
    await hook.handler(
      makeCtx({
        event: 'beforeUpdate',
        input,
        previous: { crm_account: 'acct_1', priority: 'low' },
        user: { id: 'user_1' },
        api: harness.api,
      }),
    );
    expectHours(
      { dueMs: new Date(input.sla_due_date as string).getTime(), atMs: at },
      EXPECTED.medium.strategic,
      'tier off previous',
    );
  });

  it('asks the account only for its tier, and only by id', async () => {
    // `findOne`/`count` silently ignore a `filter` key and answer about the
    // wrong row (see `_hook-api.ts`) — the harness throws on it, so this also
    // pins that the lookup uses `where`.
    const harness = makeHarness({ crm_account: [{ id: 'acct_1', tier: 'enterprise' }] });
    await hook.handler(
      makeCtx({
        event: 'beforeInsert',
        input: { priority: 'medium', crm_account: 'acct_1' },
        user: { id: 'user_1' },
        api: harness.api,
      }),
    );
    // Reads are not recorded as calls; what matters is that no WRITE happened.
    expect(harness.callsFor('crm_account'), 'the SLA hook must not write to accounts').toEqual([]);
  });
});

describe('the clock is calendar hours, stated out loud', () => {
  it('adds elapsed milliseconds, so a DST transition cannot shorten an SLA', async () => {
    // `setHours(getHours() + n)` does LOCAL calendar arithmetic: across a
    // transition "+4 hours" becomes 3 or 5 real hours, and the 168h Low clock
    // crosses one twice a year by construction.
    const res = await stampFor('low', 'mid_market');
    expect(res.dueMs! - res.atMs).toBeGreaterThan(168 * HOUR - 60_000);
    expect(res.dueMs! - res.atMs).toBeLessThan(168 * HOUR + 60_000);
  });

  it('says so in the source, where the numbers are', async () => {
    // The one thing a reader of this table must not have to infer. There is no
    // business-hours calendar on the platform, so a Friday-5pm P1 is due at
    // 9pm the same Friday — documenting that is part of the deliverable, not
    // decoration around it.
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { REPO_ROOT } = await import('./helpers/repo-root');
    for (const file of ['src/objects/_case-sla.ts', 'src/objects/case.hook.ts']) {
      const source = readFileSync(join(REPO_ROOT, file), 'utf8');
      expect(source, `${file} must state the calendar-hours assumption`).toMatch(
        /CALENDAR HOURS|CALENDAR hours/,
      );
      expect(source, `${file} must say the app has no business-hours calendar`).toMatch(
        /business-hours calendar/,
      );
    }
  });
});
