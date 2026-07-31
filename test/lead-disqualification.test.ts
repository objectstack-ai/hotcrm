// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import stack from '../objectstack.config';
import { CrmSeedData } from '../src/data/index';

/**
 * `crm_lead.disqualification_reason` — promise vs enforcement (#575 A2).
 *
 * The field's own `description` has read **"Required when status is
 * Unqualified"** since it was added, and nothing in the repo implemented it:
 * no validation, no hook, and no form that even rendered the field. A lead
 * could be parked in `unqualified` with no recorded reason, which is the one
 * datum a disqualification review needs — and the seeded demo leads did
 * exactly that.
 *
 * Enforcement now lives in the `disqualification_reason_required` script
 * validation on `crm_lead`, modelled on `crm_case.escalation_reason_required`.
 * A validation without a writer is worse than none, though: a form that lets a
 * user pick "Unqualified" but never shows the reason field produces a save
 * error the user has no way to clear. These tests pin all three halves —
 * the rule, the forms that can trip it, and the seed rows that must satisfy it.
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as any).objects ?? [];
const views: AnyRec[] = (stack as any).views ?? [];

const lead = objects.find((o) => o.name === 'crm_lead') as AnyRec | undefined;
// A view names its object on the default list, not at the top level (see
// `objectOf()` in metadata-references.test.ts).
const leadView = views.find(
  (v) => (v.list?.data?.object ?? v.form?.data?.object ?? v.object) === 'crm_lead',
) as AnyRec | undefined;

/** `P` compiles to `{ dialect: 'cel', source }`; older rules may be raw strings. */
const celSource = (condition: unknown): string =>
  typeof condition === 'string'
    ? condition
    : String((condition as AnyRec | null)?.source ?? '');

const rule = ((lead?.validations ?? []) as AnyRec[]).find(
  (v) => v.name === 'disqualification_reason_required',
);

describe('crm_lead disqualification reason is enforced, not just documented', () => {
  it('the object still carries the promise the rule exists to keep', () => {
    // Guard the guard: if someone drops the description, this test would
    // otherwise keep passing while the stated contract quietly disappeared.
    const field = lead?.fields?.disqualification_reason;
    expect(field, 'crm_lead.disqualification_reason missing').toBeTruthy();
    expect(String(field.description ?? '')).toMatch(/required when status is unqualified/i);
  });

  it('declares an error-severity script validation for it', () => {
    expect(rule, 'crm_lead.disqualification_reason_required missing').toBeTruthy();
    expect(rule!.type).toBe('script');
    expect(rule!.severity).toBe('error');
    expect(String(rule!.message ?? '')).not.toBe('');
  });

  it('the condition fires exactly on an unqualified lead with no reason', () => {
    const source = celSource(rule?.condition);
    // Both halves must be present: the status test and the blank test. A rule
    // that only checked `isBlank(...)` would reject every non-unqualified lead.
    expect(source).toMatch(/record\.status\s*==\s*"unqualified"/);
    expect(source).toMatch(/isBlank\(record\.disqualification_reason\)/);
  });

  it('every lead form that can set status also offers the reason', () => {
    // The writer half. A form exposing an editable `status` can put the record
    // into `unqualified`; without `disqualification_reason` on the same form,
    // the save fails with an error the user cannot clear.
    const forms: [string, AnyRec][] = [
      ...(leadView?.form ? ([['form', leadView.form]] as [string, AnyRec][]) : []),
      ...(Object.entries(leadView?.formViews ?? {}) as [string, AnyRec][]),
    ];
    expect(forms.length, 'no crm_lead forms found — the walker stopped matching').toBeGreaterThan(3);

    /** Field names a form section renders, whether declared bare or as an object. */
    const fieldNames = (form: AnyRec): string[] =>
      ((form.sections ?? []) as AnyRec[]).flatMap((s) =>
        ((s.fields ?? []) as unknown[]).map((f) =>
          typeof f === 'string' ? f : String((f as AnyRec).field ?? ''),
        ),
      );
    /** Is `status` editable here, or pinned readonly (conversion wizard)? */
    const editableStatus = (form: AnyRec): boolean =>
      ((form.sections ?? []) as AnyRec[]).some((s) =>
        ((s.fields ?? []) as unknown[]).some((f) =>
          typeof f === 'string'
            ? f === 'status'
            : (f as AnyRec).field === 'status' && (f as AnyRec).readonly !== true,
        ),
      );

    const bad = forms
      .filter(([, form]) => editableStatus(form))
      .filter(([, form]) => !fieldNames(form).includes('disqualification_reason'))
      .map(([name]) => name);

    expect(
      bad,
      `lead forms that can set status=unqualified but hide the reason:\n  ${bad.join('\n  ')}`,
    ).toEqual([]);
  });
});

describe('seeded unqualified leads satisfy the rule they are shipped under', () => {
  const leadSeed = CrmSeedData.find((s: any) => s.object === 'crm_lead') as
    | { records: AnyRec[] }
    | undefined;
  const records = leadSeed?.records ?? [];
  const unqualified = records.filter((r) => r.status === 'unqualified');

  it('the demo dataset actually contains unqualified leads', () => {
    // Otherwise the assertion below is vacuously true.
    expect(unqualified.length, 'no unqualified lead seeds').toBeGreaterThan(0);
  });

  it('every one carries a reason drawn from the field vocabulary', () => {
    const legal = new Set(
      ((lead?.fields?.disqualification_reason?.options ?? []) as AnyRec[]).map((o) => o.value),
    );
    expect(legal.size, 'disqualification_reason has no options').toBeGreaterThan(0);

    const bad = unqualified
      .filter((r) => !legal.has(r.disqualification_reason))
      .map((r) => `${r.email ?? r.company}: ${String(r.disqualification_reason)}`);
    expect(
      bad,
      `unqualified lead seeds rejected by disqualification_reason_required:\n  ${bad.join('\n  ')}`,
    ).toEqual([]);
  });
});
