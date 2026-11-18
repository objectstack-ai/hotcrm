// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import { evaluateValidationRules } from '@objectstack/objectql';
import type { VerifyStack } from '@objectstack/verify';
import stack from './helpers/composed-stack';
import { hotcrmStack, signUpPerson, daysFromNow, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * A campaign may start and end on the same day (#2633).
 *
 * `crm_campaign.end_after_start` used to refuse `end_date <= start_date`, so a
 * webinar or a one-day fair could not be saved: the form answered "End Date
 * must be after Start Date", and the only way round it was to type the next
 * day, which shifts the campaign's duration and the 2 AM auto-complete sweep
 * by a day. The rule is now `end_not_before_start` and refuses only an end
 * date BEFORE the start date.
 *
 * Every write is a marketing user's, through the public create door
 * (`POST /data/crm_campaign`) on the app booted by `@objectstack/verify`, so
 * the rule is evaluated where production evaluates it.
 *
 * Two refusers guard "ends before it starts", and the door shows only the
 * first: the `campaign_validation` hook (`campaign.hook.ts`, `start > end`)
 * runs before the object's rules and answers the HTTP write itself (measured:
 * 400 `VALIDATION_FAILED`, "The campaign's Start Date (…) must not be after its
 * End Date (…)"). So the rule's own verdict is pinned separately, by running
 * the shipped rule through the engine's `evaluateValidationRules`.
 */


const RULE = 'end_not_before_start';
const campaign = (((stack as any).objects ?? []) as Rec[]).find((o) => o.name === 'crm_campaign') as Rec;
const rule = ((campaign.validations ?? []) as Rec[]).find((r) => r?.name === RULE) as Rec;

let verify: VerifyStack;
let marketer: Person;
let k = 0;

beforeAll(async () => {
  verify = await hotcrmStack();
  marketer = await signUpPerson(verify, 'marketer@campaign-same-day.test', {
    name: 'Same Day Marketer', positions: ['crm_marketing_user'],
  });
}, 180_000);

const create = async (start: string, end: string) => {
  const name = `Same Day ${++k}`;
  const res = await verify.apiAs(marketer.token, 'POST', '/data/crm_campaign', {
    name, status: 'planning', start_date: start, end_date: end,
  });
  return { name, status: res.status, body: (await res.json()) as Rec };
};

describe('a campaign may start and end on the same day (#2633)', () => {
  it('saves a one-day campaign and stores both dates as written', async () => {
    const day = daysFromNow(3);
    const made = await create(day, day);
    expect(made.status, JSON.stringify(made.body)).toBe(201);
    const [stored] = await verify.rows('crm_campaign', { name: made.name });
    expect(stored).toMatchObject({ start_date: day, end_date: day });
  });

  it('still refuses a campaign that ends before it starts', async () => {
    const made = await create(daysFromNow(3), daysFromNow(2));
    expect([made.status, made.body?.code]).toEqual([400, 'VALIDATION_FAILED']);
    expect(await verify.rows('crm_campaign', { name: made.name })).toHaveLength(0);
  });
});

describe(`the shipped crm_campaign.${RULE} rule, evaluated by the engine`, () => {
  /** Run only this rule on an insert of `data`; hand back the error, or undefined when admitted. */
  const verdict = (data: Rec) => {
    const warns: string[] = [];
    const logger = { warn: (...a: unknown[]) => void warns.push(a.map(String).join(' ')) };
    const obj = { ...JSON.parse(JSON.stringify(campaign)), validations: [JSON.parse(JSON.stringify(rule))] };
    let caught: Rec | undefined;
    try {
      evaluateValidationRules(obj as never, data, 'insert', { logger } as never);
    } catch (err) {
      caught = err as Rec;
    }
    // A predicate that could not answer is a broken rule, not a verdict (#4649).
    expect(warns.filter((w) => /failed to evaluate/.test(w))).toEqual([]);
    return caught;
  };

  it('is shipped', () => {
    expect(rule, `crm_campaign.${RULE} is missing`).toBeDefined();
  });

  it('admits a campaign that starts and ends on the same day', () => {
    expect(verdict({ start_date: '2026-11-18', end_date: '2026-11-18' })).toBeUndefined();
  });

  it('refuses a campaign that ends before it starts, with its own message', () => {
    const err = verdict({ start_date: '2026-11-18', end_date: '2026-11-17' });
    expect(err, 'the rule ADMITTED an end date before the start date').toBeDefined();
    expect([err!.name, err!.code]).toEqual(['ValidationError', 'VALIDATION_FAILED']);
    // Measured, as `forecast-period-boundary.test.ts` pins for the forecast
    // rules: this engine's ValidationError carries no `status`.
    expect(err!.status).toBeUndefined();
    expect(String(err!.message)).toBe(rule.message);
  });
});
