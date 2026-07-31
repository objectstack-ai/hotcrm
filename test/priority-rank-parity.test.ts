// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import stack from '../objectstack.config';
import caseHooks from '../src/objects/case.hook';
import taskHooks from '../src/objects/task.hook';

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
 */

type AnyRec = Record<string, any>;
type Rec = Record<string, unknown>;

const UNRANKED = 0;

const objects: AnyRec[] = (stack as any).objects ?? [];
const fieldOf = (object: string) =>
  objects.find((o) => o.name === object)?.fields?.priority_rank as AnyRec | undefined;

const hookNamed = (hooks: AnyRec[], name: string): AnyRec => {
  const hook = hooks.find((h) => h.name === name);
  if (!hook) throw new Error(`hook "${name}" not found`);
  return hook;
};

/** Minimal beforeInsert context — these hooks only touch `input` for ranking. */
const ctxFor = (input: Rec): AnyRec => ({
  event: 'beforeInsert',
  input,
  previous: undefined,
  user: { id: 'user_1' },
  api: undefined,
});

/** Stamp `priority` through a hook and read back the rank it materialised. */
const rankFor = async (hook: AnyRec, priority: string): Promise<unknown> => {
  const input: Rec = { priority };
  await hook.handler(ctxFor(input));
  return input.priority_rank;
};

const RANKED = [
  {
    object: 'crm_case',
    hook: hookNamed(caseHooks as AnyRec[], 'case_sla_defaults'),
    // Ascending urgency — the ordinal must follow this order, not the strings.
    ladder: ['low', 'medium', 'high', 'critical'],
  },
  {
    object: 'crm_task',
    hook: hookNamed(taskHooks as AnyRec[], 'task_completion'),
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

describe.each(RANKED)('$object priority ranking', ({ hook, ladder }) => {
  it('ranks the known priorities in ascending urgency', async () => {
    const ranks = [];
    for (const priority of ladder) ranks.push(await rankFor(hook, priority));
    expect(ranks).toEqual([1, 2, 3, 4]);
  });

  it('falls back to the unranked sentinel for an unrecognised priority', async () => {
    expect(await rankFor(hook, 'blocker')).toBe(UNRANKED);
  });

  it('the sentinel sorts below every real rank on a `priority_rank desc` queue', async () => {
    // A fallback of 1 or 2 (the previous behaviour) buried an unknown priority
    // in the middle of the queue, wearing a real priority's ordinal.
    const known = [];
    for (const priority of ladder) known.push(Number(await rankFor(hook, priority)));
    expect(Math.min(...known)).toBeGreaterThan(UNRANKED);
  });
});

describe('the two hand-copied rank maps stay in agreement', () => {
  it('an unknown priority ranks identically on both objects', async () => {
    const [caseRank, taskRank] = await Promise.all([
      rankFor(RANKED[0].hook, 'blocker'),
      rankFor(RANKED[1].hook, 'blocker'),
    ]);
    expect(caseRank).toBe(taskRank);
  });

  it('each hook stamps the same rank its object defaults to when unknown', async () => {
    for (const { object, hook } of RANKED) {
      expect(await rankFor(hook, 'blocker'), `${object} hook vs field default`).toBe(
        fieldOf(object)?.defaultValue,
      );
    }
  });
});
