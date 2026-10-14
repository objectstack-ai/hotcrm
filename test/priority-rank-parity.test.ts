// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import stack from './helpers/composed-stack';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

/**
 * `priority_rank` parity between crm_case and crm_task (#575 A4).
 *
 * Both objects materialise a sortable urgency ordinal because sorting on the
 * `priority` select itself compares raw strings and inverts urgency. The two
 * rank maps CANNOT be shared: L2 hook bodies run body-only in the QuickJS
 * sandbox, so a module constant resolves at authoring time and arrives as
 * `undefined` (see `_line-item-price-fill.ts`). They are therefore written out
 * twice, and drifted — `rank[p] ?? 1` on the case, `?? 2` on the task, with
 * field defaults to match. The same unknown priority sorted differently on the
 * two objects, and on each it was indistinguishable from a real priority
 * (`low` / `normal` respectively).
 *
 * The convention is now a shared UNRANKED sentinel of `0`, below every real
 * rank on the `priority_rank desc` queues. Since the duplication is forced,
 * this file is the thing keeping the two copies honest.
 *
 * ### Measured on the shipped app
 *
 * Every ranking case is a real write: a service agent opens a case, a sales
 * rep writes a task, each through the engine's write door (`hooks.run`) on the
 * app booted by `@objectstack/verify`, and the rank asserted is the one the
 * engine STORED.
 *
 * An unrecognised priority never reaches either hook: `priority` is a required
 * select on both objects, so the engine refuses `blocker` before any hook runs
 * — through a person's write and through the system's own seed door alike —
 * and an omitted or cleared priority takes the field default or is refused.
 * The two copies of the in-body fallback can therefore not disagree on any
 * stored row. What keeps a row without a stamped rank sorting the same way on
 * both objects is the field default, pinned first below; the refusal is
 * pinned last, so a select that ever widened would hand the fallbacks back to
 * this file's attention.
 */

type AnyRec = Record<string, any>;
type Rec = Record<string, unknown>;

const UNRANKED = 0;

const objects: AnyRec[] = (stack as any).objects ?? [];
const fieldOf = (object: string) =>
  objects.find((o) => o.name === object)?.fields?.priority_rank as AnyRec | undefined;

let verify: VerifyStack;
let agent: Person;
let rep: Person;
let k = 0;
beforeAll(async () => {
  verify = await hotcrmStack();
  agent = await signUpPerson(verify, 'agent@priority-rank-parity.test', {
    name: 'Rank Agent', positions: ['service_agent'], permissionSets: ['service_agent'],
  });
  rep = await signUpPerson(verify, 'rep@priority-rank-parity.test', {
    name: 'Rank Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
}, 120_000);

/** Write one record of `object` with `priority` as the person who works it. */
const write = (object: string, priority: unknown): Promise<AnyRec> =>
  object === 'crm_case'
    ? verify.hooks.run('crm_case', 'insert', { subject: `Rank ${++k}`, description: 'Ranked.', priority }, { as: agent.token })
    : verify.hooks.run('crm_task', 'insert', { subject: `Rank ${++k}`, priority }, { as: rep.token });

/** Stamp `priority` through a real write and read back the rank the engine stored. */
const rankFor = async (object: string, priority: string): Promise<unknown> => {
  const row = await write(object, priority);
  return (await verify.rows(object, { id: row.id }))[0]?.priority_rank;
};

/** How the engine answers a write carrying `priority` — the refusal, or null when it stored a row. */
const refusalOf = async (object: string, priority: unknown): Promise<AnyRec | null> => {
  try {
    await write(object, priority);
    return null;
  } catch (e) {
    return e as AnyRec;
  }
};

const RANKED = [
  {
    object: 'crm_case',
    // Ascending urgency — the ordinal must follow this order, not the strings.
    ladder: ['low', 'medium', 'high', 'critical'],
  },
  {
    object: 'crm_task',
    ladder: ['low', 'normal', 'high', 'urgent'],
  },
];

describe('priority_rank uses one unranked sentinel across objects', () => {
  it.each(RANKED.map((r) => r.object))('%s defaults priority_rank to the sentinel', (object) => {
    const field = fieldOf(object);
    expect(field, `${object}.priority_rank missing`).toBeTruthy();
    expect(field!.type).toBe('number');
    expect(field!.defaultValue, `${object}.priority_rank defaultValue`).toBe(UNRANKED);
  });

  it('both objects agree on the default, so an unstamped row sorts the same way', () => {
    // The assertion the per-object check cannot make on its own: it is the
    // AGREEMENT that matters, and it is what drifted.
    expect(fieldOf('crm_case')?.defaultValue).toBe(fieldOf('crm_task')?.defaultValue);
  });
});

describe.each(RANKED)('$object priority ranking', ({ object, ladder }) => {
  it('ranks the known priorities in ascending urgency', async () => {
    const ranks = [];
    for (const priority of ladder) ranks.push(await rankFor(object, priority));
    expect(ranks).toEqual([1, 2, 3, 4]);
  });

  it('the sentinel sorts below every real rank on a `priority_rank desc` queue', async () => {
    // A fallback of 1 or 2 (the previous behaviour) buried an unknown priority
    // in the middle of the queue, wearing a real priority's ordinal.
    const known = [];
    for (const priority of ladder) known.push(Number(await rankFor(object, priority)));
    expect(Math.min(...known)).toBeGreaterThan(UNRANKED);
  });

  it('an omitted priority stores the field default and its rank', async () => {
    const row = await write(object, undefined);
    const [stored] = await verify.rows(object, { id: row.id });
    expect(stored!.priority_rank).toBe(ladder.indexOf(String(stored!.priority)) + 1);
  });
});

describe('the two hand-copied rank maps cannot disagree on a stored row', () => {
  it.each(RANKED.map((r) => r.object))('%s refuses an unrecognised priority before any hook ranks it', async (object) => {
    const refusal = await refusalOf(object, 'blocker');
    expect(refusal, `${object} stored a row with an unrecognised priority — the in-body fallbacks are live again`).not.toBeNull();
    // The engine's validation envelope: the code, and the field it names with
    // the option-set breach (the REST door answers it 400).
    expect(refusal!.code).toBe('VALIDATION_FAILED');
    expect(refusal!.fields).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'priority', code: 'invalid_option' })]));
  });

  it.each(RANKED.map((r) => r.object))('%s refuses a cleared priority', async (object) => {
    const refusal = await refusalOf(object, '');
    expect(refusal, `${object} stored a row with an empty priority`).not.toBeNull();
    expect(refusal!.code).toBe('VALIDATION_FAILED');
    expect(refusal!.fields).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'priority' })]));
  });
});
