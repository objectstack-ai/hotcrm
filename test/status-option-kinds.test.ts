// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import stack from './helpers/composed-stack';

/**
 * Each lifecycle field's options declare their `kind` (#2326).
 *
 * The record path draws a step by the option's lifecycle `kind` (`open` /
 * `won` / `lost`, `SelectOption.kind` in `@objectstack/spec` 18.2.0) and falls
 * back to guessing from the value's spelling when it is absent. `unqualified`
 * and 未通过 match no spelling, so a lead's path drew it as a fifth step after
 * 已转化. These pins read the composed stack, so a kind that `defineStack`
 * dropped or a new option added without one turns them red.
 *
 * Every option declares its kind, `open` included: an absent kind reads as
 * `open` on a plain field, but the field an object's `stageField` names must
 * declare it on every option, and "declared open" is a different fact from
 * "forgot the key". Case and task carry no cancelled-type value, so neither has
 * a `lost` option; a task's Deferred is postponed, not abandoned.
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as any).objects ?? [];

const kindsOf = (objectName: string, field: string): Record<string, unknown> => {
  const object = objects.find((o) => o.name === objectName);
  if (!object) throw new Error(`object ${objectName} not registered`);
  const options: AnyRec[] = object.fields?.[field]?.options ?? [];
  return Object.fromEntries(options.map((o) => [o.value, o.kind]));
};

const EXPECTED: Array<[string, string, Record<string, string>]> = [
  [
    'crm_lead',
    'status',
    { new: 'open', contacted: 'open', qualified: 'open', unqualified: 'lost', converted: 'won' },
  ],
  [
    'crm_opportunity',
    'stage',
    {
      prospecting: 'open',
      qualification: 'open',
      needs_analysis: 'open',
      proposal: 'open',
      negotiation: 'open',
      closed_won: 'won',
      closed_lost: 'lost',
    },
  ],
  [
    'crm_case',
    'status',
    {
      new: 'open',
      in_progress: 'open',
      waiting_customer: 'open',
      waiting_support: 'open',
      escalated: 'open',
      resolved: 'won',
      closed: 'won',
    },
  ],
  [
    'crm_task',
    'status',
    { not_started: 'open', in_progress: 'open', waiting: 'open', completed: 'won', deferred: 'open' },
  ],
];

describe('lifecycle kind on status options (#2326)', () => {
  it.each(EXPECTED)('%s.%s declares the ruled kind on every option', (objectName, field, expected) => {
    expect(kindsOf(objectName, field)).toStrictEqual(expected);
  });
});
