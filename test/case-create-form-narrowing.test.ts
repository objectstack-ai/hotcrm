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
 * writer that owns it and the surface it must keep. An empty `keeps` is a
 * claim in its own right: the field has no human surface BY DESIGN, and `why`
 * says which code writes it.
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
    why: 'written by `case_escalation` / `escalate_case`',
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
  customer_rating: { why: 'post-resolution survey data', keeps: [] },
  customer_feedback: { why: 'post-resolution survey data', keeps: [] },
  closed_date: { why: 'readonly on the object; stamped at close', keeps: ['case_timeline.endDateField'] },
  is_closed: {
    why: 'readonly on the object; derived from `status` on every write',
    keeps: ['case_workflow.filter', 'my_open_cases.filter'],
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
    it(`${field} keeps ${keeps.length ? keeps.join(' + ') : 'no human surface (by design)'}`, () => {
      for (const surface of keeps) {
        expect(s[surface], `unknown surface "${surface}" in the roster`).toBeDefined();
        expect(
          Array.from(s[surface]),
          `${field} left ${surface} — narrowing the create form must not strip the views (${why})`,
        ).toContain(field);
      }
    });
  }

  /**
   * ⛔ The tempting "fix" for the guard this change tripped
   * (`test/metadata-references.test.ts` → "fields the list views filter on are
   * editable in some form") is to mark the escalation flags `readonly` so the
   * guard skips them. `case.object.ts` records — on `is_sla_violated` and on
   * `escalated_date` — that the platform DROPS writes to readonly fields, so
   * that edit would silently stop `case_escalation` / `case_sla_monitor` from
   * maintaining them. The exemption in that guard exists because this
   * declaration cannot be made; this assertion is what stops someone undoing
   * it from the other end.
   */
  it('the flow-stamped escalation flags stay declarable — i.e. NOT readonly', () => {
    for (const name of ['is_escalated', 'is_sla_violated', 'escalated_date']) {
      expect(
        objectFields[name]?.readonly,
        `${name} must stay writable: the platform drops writes to readonly fields and the escalation flows write it`,
      ).not.toBe(true);
    }
  });

  it('the queue still sorts on the SLA deadline', () => {
    const sort = ((CaseViews as AnyRec).list?.sort ?? []).map((x: any) => x.field);
    expect(sort).toContain('sla_due_date');
  });
});
