// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import stack from '../objectstack.config';

/**
 * Which status fields are governed by a transition table, and why (#575 B4).
 *
 * Only `crm_lead`, `crm_opportunity` and `crm_case` declared a `state_machine`
 * validation. That looked like a coverage gap across every remaining object
 * with a status field, and it was not — the test is whether an illegal
 * transition has a business consequence:
 *
 *   • `crm_quote` and `crm_contract` — YES, and neither had so much as a status
 *     guard in its hook. A quote could go `draft → accepted` (a number nobody
 *     reviewed or sent, now binding), and a contract `draft → activated`, which
 *     stamps `signed_date`, promotes the account to `customer` and starts the
 *     renewal clock — on an agreement that never passed approval.
 *   • `crm_campaign` and `crm_task` — NO. Their `status` is DESCRIPTIVE
 *     (running / paused, not started / in progress), not a controlled
 *     lifecycle. A transition table there would reject ordinary edits and teach
 *     users to ignore the warning.
 *
 * The second half is the part worth pinning: "deliberately absent" and
 * "forgotten" look identical in the metadata, and only one of them should stay
 * that way.
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as any).objects ?? [];
const objectNamed = (name: string): AnyRec => {
  const found = objects.find((o) => o.name === name);
  if (!found) throw new Error(`object ${name} not registered`);
  return found;
};

const machinesOf = (name: string): AnyRec[] =>
  ((objectNamed(name).validations ?? []) as AnyRec[]).filter((v) => v.type === 'state_machine');

/** Objects that must be governed, and the field the table governs. */
const GOVERNED = [
  { object: 'crm_lead', field: 'status' },
  { object: 'crm_opportunity', field: 'stage' },
  { object: 'crm_case', field: 'status' },
  { object: 'crm_quote', field: 'status' },
  { object: 'crm_contract', field: 'status' },
] as const;

/** Objects whose status is descriptive — a table here is a regression. */
const UNGOVERNED = ['crm_campaign', 'crm_task'] as const;

describe.each(GOVERNED)('$object lifecycle is constrained', ({ object, field }) => {
  const [machine, ...extra] = machinesOf(object);

  it('declares exactly one state machine, over the lifecycle field', () => {
    expect(machine, `${object} has no state_machine validation`).toBeTruthy();
    expect(extra, `${object} declares more than one state machine`).toEqual([]);
    expect(machine!.field).toBe(field);
  });

  it('warns rather than blocks, like the three that came first', () => {
    // Every machine in this repo is advisory. A hard `error` would make a
    // legitimate support correction impossible without a data fix.
    expect(machine!.severity).toBe('warning');
    expect(String(machine!.message ?? '')).not.toBe('');
  });

  it('covers every option of the field, on both sides of the arrow', () => {
    // A status missing from the table's KEYS is unconstrained (nothing
    // describes what may follow it); a status missing from every VALUE is
    // unreachable. Both are silent.
    const options: string[] = ((objectNamed(object).fields?.[field]?.options ?? []) as AnyRec[]).map(
      (o) => String(o.value),
    );
    expect(options.length, `${object}.${field} has no options`).toBeGreaterThan(2);

    const transitions = machine!.transitions as Record<string, string[]>;
    const states = Object.keys(transitions);
    expect(
      options.filter((o) => !states.includes(o)),
      `${object}.${field} values with no outbound rule`,
    ).toEqual([]);

    const targets = new Set(Object.values(transitions).flat());
    const unreachable = options.filter((o) => !targets.has(o));
    // The initial state is legitimately unreachable — nothing transitions INTO
    // `draft` / `new` / `prospecting`; a record is created there.
    const initial = ((objectNamed(object).fields?.[field]?.options ?? []) as AnyRec[])
      .filter((o) => o.default === true)
      .map((o) => String(o.value));
    expect(
      unreachable.filter((o) => !initial.includes(o)),
      `${object}.${field} values nothing can transition into`,
    ).toEqual([]);
  });

  it('names no state outside the field vocabulary', () => {
    const legal = new Set(
      ((objectNamed(object).fields?.[field]?.options ?? []) as AnyRec[]).map((o) => String(o.value)),
    );
    const transitions = machine!.transitions as Record<string, string[]>;
    const bad = Object.entries(transitions).flatMap(([from, tos]) =>
      [from, ...tos].filter((s) => !legal.has(s)).map((s) => `${from} → ${s}`),
    );
    expect(bad, `${object} transitions naming non-existent states:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});

describe('the new tables agree with the automation that drives them', () => {
  const quote = machinesOf('crm_quote')[0]!.transitions as Record<string, string[]>;
  const contract = machinesOf('crm_contract')[0]!.transitions as Record<string, string[]>;

  it('every unsettled quote status can still expire', () => {
    // `quote_expiration` sweeps on `expiration_date` alone — it expires a draft
    // that was never sent as readily as a presented one. A table that omitted
    // one of those edges would make the nightly sweep emit warnings.
    for (const from of ['draft', 'in_review', 'presented']) {
      expect(quote[from], `quote ${from} → expired is not allowed`).toContain('expired');
    }
  });

  it('quote states the pricing guard freezes are terminal', () => {
    // `quote_pricing_guard` lets nothing but `internal_notes` change on an
    // accepted or expired quote, so any outbound edge here would be a rule the
    // hook forbids one layer down.
    expect(quote.accepted).toEqual([]);
    expect(quote.expired).toEqual([]);
  });

  it('a quote cannot jump from draft straight to accepted', () => {
    expect(quote.draft).not.toContain('accepted');
    expect(quote.draft).not.toContain('presented');
  });

  it('a contract reaches activation only through approval', () => {
    expect(contract.draft).not.toContain('activated');
    expect(contract.in_approval).toContain('activated');
  });

  it('only an activated contract expires', () => {
    // `contract_expiration` filters on `status: 'activated'`; nothing else ages
    // out, and both end states are final because a renewal is a NEW contract.
    const expiring = Object.entries(contract)
      .filter(([, tos]) => tos.includes('expired'))
      .map(([from]) => from);
    expect(expiring).toEqual(['activated']);
    expect(contract.expired).toEqual([]);
    expect(contract.terminated).toEqual([]);
  });
});

describe.each(UNGOVERNED)('%s status stays descriptive', (object) => {
  it('has a status field to be tempted by', () => {
    // Without this the assertion below would also pass for an object that lost
    // its status field entirely.
    expect(objectNamed(object).fields?.status, `${object}.status missing`).toBeTruthy();
  });

  it('declares no state machine', () => {
    expect(
      machinesOf(object).map((m) => m.name),
      `${object} gained a transition table. Its status describes what the record ` +
        'is doing, not a controlled lifecycle — see #575 B4 before adding one.',
    ).toEqual([]);
  });
});
