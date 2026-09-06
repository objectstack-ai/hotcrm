// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { CaseViews } from '../src/views/case.view';
import { Case } from '../src/objects/case.object';
import { CaseDetailPage } from '../src/pages/case_detail.page';

/**
 * The case CREATE form offers only what a creator legitimately authors (#1214
 * item 3).
 *
 * ## What made this a defect rather than polish
 *
 * `crm_case.is_sla_violated`, `sla_due_date` and `first_response_date` are
 * `readonly: false` on the object, and `case.hook.ts` only FILLS `sla_due_date`
 * when the incoming row has none (`!input.sla_due_date && !ctx.previous...`).
 * Nothing strips them from a signed-in staff insert — the hook's field-nulling
 * branch is guarded by `isGuestSubmission`. So while these fields sat on the
 * create form, a creator could stamp a violated SLA onto a case AT INTAKE and
 * it persisted. That is authoring state the creator should never author.
 *
 * ## Why the fix had to be the form's own field set
 *
 * The console resolves the create form as `view.form ?? view.formViews.default`
 * from BOTH entry points (`RecordFormPage` for `/new`, `useActionModal` for the
 * list's `+ New` modal), with no create/edit argument, and reads
 * `ListView.addRecord.formView` nowhere. There is no create-only form to
 * author, so `CaseViews.form` IS the create form. The long note on
 * `src/views/case.view.ts` carries the full measurement.
 *
 * ## What this suite pins — BOTH directions
 *
 * 1. REMOVAL — no lifecycle-maintained field is on the create form, and the
 *    form's authorable set is exactly the creator-legitimate set (closed, so a
 *    newly added writable lifecycle field fails here too).
 * 2. RETENTION — every field removed from the form still appears on the
 *    surface it legitimately belongs to (list columns, sort keys, the
 *    calendar's `startDateField`, the timeline's date fields, the record
 *    page). A pin that only checked the removal would go green on a change
 *    that gutted the views, which is the failure the #1214 ruling named.
 */

type AnyRec = Record<string, any>;

/** A form section's `fields` entry is either a bare name or `{ field }`. */
const fieldNamesOf = (section: AnyRec): string[] =>
  (section.fields ?? []).map((f: any) => (typeof f === 'string' ? f : f?.field)).filter(Boolean);

const formFields = (): string[] =>
  ((CaseViews as AnyRec).form?.sections ?? []).flatMap(fieldNamesOf);

const objectFields = (Case as AnyRec).fields as Record<string, AnyRec>;

/**
 * The fields a person raising a case actually has in hand. CLOSED on purpose:
 * adding a field to the create form is a decision, and it should be made here
 * as well as in the view.
 *
 * `case_number` is on the form and absent from this set because it is
 * `readonly: true` on the object — the renderer disables it, so it is shown
 * and never authored.
 */
const CREATOR_AUTHORABLE = new Set([
  'subject',
  'crm_account',
  'crm_contact',
  'status',
  'priority',
  'origin',
  'owner_id',
  'description',
]);

/**
 * Every field the create form used to carry that the LIFECYCLE owns, with the
 * writer that owns it and the surface it must keep.
 *
 * An empty `keeps` is a claim in its own right — the field is reachable from
 * NO surface in the roster below — and since #1428 it is asserted in that
 * direction too, not just documented. Two different things produce it: a
 * field no human ever authors (`first_response_date`), and a field whose
 * surface is an OPEN PRODUCT QUESTION (`customer_rating` /
 * `customer_feedback`). `why` says which, because the second kind is a debt
 * and the first is not.
 */
const LIFECYCLE_MAINTAINED: Record<string, { why: string; keeps: string[] }> = {
  created_date: {
    why: 'readonly on the object; stamped at insert',
    keeps: ['case_timeline.startDateField'],
  },
  first_response_date: {
    why: '`event.hook.ts` is its single writer — no human surface by design',
    keeps: [],
  },
  sla_due_date: {
    why: '`case.hook.ts` stamps it from the priority x account-tier matrix',
    keeps: [
      'list.columns',
      'list.sort',
      'sla_calendar.startDateField',
      'detail.highlights',
    ],
  },
  resolution_time_hours: {
    why: 'readonly on the object; derived at close',
    keeps: ['detail.details'],
  },
  is_sla_violated: {
    why: 'derived from the SLA sweep, never authored',
    keeps: ['list.columns', 'detail.highlights'],
  },
  is_escalated: {
    // readonly since #1434 — stamped by `case_escalation`, `case_sla_monitor`
    // and the `case_escalation_stamp` sub-flow, all `runAs: 'system'`.
    why: 'readonly on the object; stamped by the escalation flows, never typed',
    keeps: ['list.columns', 'escalated_cases.filter', 'detail.details'],
  },
  escalation_reason: {
    why: 'written alongside `is_escalated` by the escalation path',
    keeps: ['detail.details'],
  },
  resolution: {
    why: 'authored when CLOSING a case, not when raising one',
    keeps: ['detail.details'],
  },
  // ⛔ HELD, not "by design" (#1428). Whether staff should type a customer's
  // satisfaction score on the customer's behalf is a product question, and the
  // alternative — a survey the customer answers — is a different feature. Both
  // fields stay reachable from nowhere until that is ruled on; `case_csat_
  // followup` meanwhile notifies the owner to log a rating they cannot enter.
  // Adding a surface for either is a DECISION: record it here as well.
  customer_rating: {
    why: 'post-resolution survey data — no surface pending the product ruling (#1428)',
    keeps: [],
  },
  customer_feedback: {
    why: 'post-resolution survey data — no surface pending the product ruling (#1428)',
    keeps: [],
  },
  closed_date: { why: 'readonly on the object; stamped at close', keeps: ['case_timeline.endDateField'] },
  is_closed: {
    why: 'readonly on the object; derived from `status` on every write',
    // `my_open_cases.filter` was on this line until #1328 moved that view onto
    // `status not_in ['resolved', 'closed']`: the flag is derived as
    // `status === 'closed'` and never flips on `resolved`, so it could not
    // express the tab's own label. `case_workflow` keeps the flag — that kanban
    // is the lifecycle itself and `resolved` is a real swimlane on it. Both
    // facts are pinned in `test/live-work-predicate-parity.test.ts`.
    keeps: ['case_workflow.filter'],
  },
};

/** Field names reachable on each named surface OUTSIDE the create form. */
const surfaces = (): Record<string, Set<string>> => {
  const v = CaseViews as AnyRec;
  const list = v.list ?? {};
  const lv = v.listViews ?? {};
  const names = (arr: any[] | undefined, pick: (x: any) => any) =>
    new Set<string>((arr ?? []).map(pick).filter(Boolean));

  const detailFields = new Set<string>();
  const highlightFields = new Set<string>();
  const walk = (node: any, into: 'highlights' | 'details' | null): void => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const n of node) walk(n, into);
      return;
    }
    let next = into;
    if (node.type === 'record:highlights') next = 'highlights';
    else if (node.type === 'record:details') next = 'details';
    if (next && Array.isArray(node.fields)) {
      for (const f of node.fields) {
        const name = typeof f === 'string' ? f : f?.field;
        if (name) (next === 'highlights' ? highlightFields : detailFields).add(name);
      }
    }
    for (const value of Object.values(node)) walk(value, next);
  };
  walk(CaseDetailPage, null);

  return {
    'list.columns': names(list.columns, (c: any) => (typeof c === 'string' ? c : c?.field)),
    'list.sort': names(list.sort, (s: any) => s?.field),
    'sla_calendar.startDateField': new Set([lv.sla_calendar?.calendar?.startDateField].filter(Boolean)),
    'case_timeline.startDateField': new Set([lv.case_timeline?.timeline?.startDateField].filter(Boolean)),
    'case_timeline.endDateField': new Set([lv.case_timeline?.timeline?.endDateField].filter(Boolean)),
    'case_workflow.filter': names(lv.case_workflow?.filter, (f: any) => f?.field),
    'my_open_cases.filter': names(lv.my_open_cases?.filter, (f: any) => f?.field),
    'escalated_cases.filter': names(lv.escalated_cases?.filter, (f: any) => f?.field),
    'detail.highlights': highlightFields,
    'detail.details': detailFields,
  };
};

describe('crm_case create form — removal direction', () => {
  it('is the create form: one form serves both create and edit', () => {
    // If a create-only form ever becomes authorable, this assertion is where
    // the reader is told the premise of this whole suite changed.
    const v = CaseViews as AnyRec;
    expect(v.form, '`form` is what the console resolves for /new and the + New modal').toBeTruthy();
    expect(v.formViews?.default, 'no `formViews.default` — the fallback branch is unused').toBeUndefined();
    expect(v.list?.addRecord, '`addRecord.formView` is read by no console code path — do not author it').toBeUndefined();
  });

  it('offers no lifecycle-maintained field', () => {
    const present = formFields().filter((f) => f in LIFECYCLE_MAINTAINED);
    expect(
      present,
      `create form offers lifecycle-maintained field(s): ${present
        .map((f) => `${f} (${LIFECYCLE_MAINTAINED[f].why})`)
        .join('; ')}`,
    ).toEqual([]);
  });

  it('its authorable set is exactly the creator-legitimate set', () => {
    const authorable = formFields().filter((f) => objectFields[f]?.readonly !== true);
    expect(new Set(authorable)).toEqual(CREATOR_AUTHORABLE);
  });

  it('the public web-to-case form stays narrower still', () => {
    const wtc = (CaseViews as AnyRec).formViews?.web_to_case;
    const fields = (wtc?.sections ?? []).flatMap(fieldNamesOf);
    expect(new Set(fields)).toEqual(new Set(['subject', 'description', 'type', 'priority']));
  });
});

describe('crm_case create form — retention direction', () => {
  const s = surfaces();

  for (const [field, { why, keeps }] of Object.entries(LIFECYCLE_MAINTAINED)) {
    it(`${field} keeps ${keeps.length ? keeps.join(' + ') : 'no human surface'}`, () => {
      for (const surface of keeps) {
        expect(s[surface], `unknown surface "${surface}" in the roster`).toBeDefined();
        expect(
          Array.from(s[surface]),
          `${field} left ${surface} — narrowing the create form must not strip the views (${why})`,
        ).toContain(field);
      }
      if (keeps.length === 0) {
        const found = Object.entries(s)
          .filter(([, names]) => names.has(field))
          .map(([surface]) => surface);
        expect(
          found,
          `${field} gained a surface (${found.join(', ')}) while its roster entry still claims none. ` +
            `That is a decision, not a detail — update the entry with the reason (${why})`,
        ).toEqual([]);
      }
    });
  }

  /**
   * ⛔ The tempting "fix" for the guard this change tripped
   * (`test/metadata-references.test.ts` → "fields the list views filter on are
   * editable in some form") is to mark a stamped flag `readonly` so the guard
   * skips it. This assertion is what stops someone doing that from the other
   * end.
   *
   * The reason is NOT the blanket this comment used to carry ("the platform
   * DROPS writes to readonly fields"). Measured in
   * `test/readonly-write-semantics.test.ts` on 17.1.0, re-measured there on
   * 17.2.0 (#1460) and re-measured again on the current pin 17.3.0 (#1676),
   * same result every time: the strip is one branch of the
   * UPDATE path, `if (!opCtx.context?.isSystem)`, over CALLER-supplied keys —
   * so a `beforeUpdate` hook's own stamp survives it, an insert is exempt from
   * it entirely, and a FLOW write survives it exactly when the flow's
   * effective `runAs` is `'system'` (the engine defaults it to `'user'`).
   *
   * ⭐ NARROWED BY #1434, and the two fields that left did so for the RIGHT
   * reason. `is_escalated` / `escalated_date` used to be pinned here as
   * HARD-blocked, because the `escalate_case` screen flow wrote them while
   * running as the USER. The maintainer-approved ruling (decision batch #21 ②)
   * removed that cause instead of documenting it: the stamp moved into the
   * dedicated `runAs: 'system'` `case_escalation_stamp` sub-flow, reached by a
   * `subflow` node, so `escalate_case` still runs as the acting agent and both
   * columns are now honestly `readonly: true`. They are consequently NOT
   * pinned as writable any more — pinning them so would now be the false
   * statement. The forward direction is pinned instead, in
   * `test/readonly-write-semantics.test.ts`.
   *
   * `is_sla_violated` remains, and its rationale never depended on the
   * platform: its only writer, `case_sla_monitor`, is `runAs: 'system'` and
   * would survive a `readonly` declaration. It stays pinned because flipping
   * it is a real decision about the seed/profile/form surfaces — not a
   * shortcut for silencing a guard, which is the move this pin exists to
   * block.
   *
   * ⛔ Do not re-add an escalation field to this list to make a user-context
   * write land. That is #1434 re-opened; the answer was a `subflow` node.
   */
  it('the flow-stamped SLA flag stays declarable — i.e. NOT readonly', () => {
    for (const name of ['is_sla_violated']) {
      expect(
        objectFields[name]?.readonly,
        `${name} must stay writable — see the note above: flipping it is a decision ` +
          'about its authoring surfaces, not a way to skip a guard. Its writer is ' +
          'runAs:"system" and would survive readonly, so the platform is not the ' +
          'obstacle (measured, test/readonly-write-semantics.test.ts).',
      ).not.toBe(true);
    }
  });

  /**
   * #1428 — `internal_notes` was the third field that left with the Resolution
   * section, and unlike the ten above it kept NO surface: not a list column,
   * not a filter, not a section on the record page. It is staff prose somebody
   * has to type, so "no human surface" was never a design, and this is the pin
   * that keeps its replacement surface from being refactored away silently.
   *
   * BOTH directions, and the second is the load-bearing one: it belongs on the
   * record page (inline edit on the Details tab) and it must stay OFF the
   * create form. That form is also the edit form, so the one thing that cannot
   * be done to fix a missing edit surface is to put the field back at intake —
   * where `case.hook.ts`'s guest branch nulls the column anyway.
   */
  it('internal_notes is authorable on the record page and nowhere at intake (#1428)', () => {
    expect(
      Array.from(s['detail.details']),
      'internal_notes lost its only authoring surface — see #1428; do not solve it on the create form',
    ).toContain('internal_notes');
    expect(
      formFields(),
      'internal_notes is not an intake field: the guest branch of case.hook.ts nulls it',
    ).not.toContain('internal_notes');
  });

  it('the queue still sorts on the SLA deadline', () => {
    const sort = ((CaseViews as AnyRec).list?.sort ?? []).map((x: any) => x.field);
    expect(sort).toContain('sla_due_date');
  });
});
