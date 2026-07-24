// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import stack from '../objectstack.config';

/**
 * Action & flow contract guards — the CI net for the class of defect that
 * `os validate` / `build` can't see.
 *
 * Every case below pins a bug that shipped because it lived INSIDE an action's
 * JS body, a flow node's field map, or a `visible`/recipient string — none of
 * which static metadata validation inspects, and none of which the unit tests
 * exercised. These assertions read the compiled stack metadata and fail if a
 * fix is reverted (by a human or an AI regeneration). They are intentionally
 * low-tech (structural assertions over the bundle), matching smoke.test.ts.
 *
 * NOTE: these are metadata-contract guards, not a running-kernel harness. A
 * full LiteKernel integration harness that actually executes the flows/hooks
 * against a driver is a worthwhile follow-up; these guards cover the specific
 * regressions cheaply in the meantime.
 */

type AnyRec = Record<string, any>;
const actions: AnyRec[] = (stack as any).actions ?? [];
const flows: AnyRec[] = (stack as any).flows ?? [];
const hooks: AnyRec[] = (stack as any).hooks ?? [];
const objects: AnyRec[] = (stack as any).objects ?? [];

const action = (name: string) => actions.find((a) => a.name === name);
const flow = (name: string) => flows.find((f) => f.name === name);
const nodeOf = (f: AnyRec | undefined, id: string) =>
  (f?.nodes ?? []).find((n: AnyRec) => n.id === id);
const fieldNames = (obj: string) => Object.keys(objects.find((o) => o.name === obj)?.fields ?? {});

describe('action body ↔ schema field-name contracts', () => {
  it('create_campaign inserts REAL crm_campaign_member fields, not the doc-example names', () => {
    const a = action('create_campaign');
    expect(a, 'create_campaign action missing').toBeTruthy();
    const src: string = a!.body?.source ?? '';
    // The real lookup fields on crm_campaign_member.
    const cmFields = fieldNames('crm_campaign_member');
    expect(cmFields).toContain('crm_campaign');
    expect(cmFields).toContain('crm_lead');
    // Body must write those, never the generic campaign_id/lead_id (which left
    // the required crm_campaign null → validation failure on every insert).
    expect(src).toMatch(/crm_campaign\s*:/);
    expect(src).toMatch(/crm_lead\s*:/);
    expect(src, 'body still writes the non-existent campaign_id column').not.toMatch(/campaign_id\s*:/);
    expect(src, 'body still writes the non-existent lead_id column').not.toMatch(/lead_id\s*:/);
  });

  it('create_campaign campaign param is field-backed so it renders a picker (not a paste-ID textbox)', () => {
    const p = (action('create_campaign')?.params ?? [])[0];
    expect(p, 'campaign param missing').toBeTruthy();
    // A field-backed param (`field` + `objectOverride`) is what makes the console
    // resolve the widget to a record picker. A bare { type:'lookup' } falls back
    // to a plain text input.
    expect(p.field, 'param must be field-backed').toBeTruthy();
    expect(p.objectOverride, 'param must name the object to resolve the field on').toBeTruthy();
    // And the body must read the value under the param's own key.
    const key = p.name ?? p.field;
    expect(action('create_campaign')!.body.source).toContain(`input.${key}`);
  });

  it('clone_opportunity copies the REQUIRED opportunity fields (not just name+stage)', () => {
    const src: string = action('clone_opportunity')?.body?.source ?? '';
    expect(src).toBeTruthy();
    // crm_account / amount / close_date are required on crm_opportunity; a
    // clone that omits them fails validation and creates nothing.
    for (const required of ['crm_account', 'amount', 'close_date']) {
      expect(src, `clone must set ${required}`).toMatch(new RegExp(`${required}\\s*:`));
    }
  });
});

describe('lead_conversion flow contracts', () => {
  const f = flow('lead_conversion');

  it('dedupes accounts: looks up an existing account before creating one', () => {
    const find = nodeOf(f, 'find_account');
    expect(find, 'find_account node missing — conversion would always create a duplicate account').toBeTruthy();
    expect(find.type).toBe('get_record');
    expect(find.config?.objectName).toBe('crm_account');
    expect(nodeOf(f, 'decision_account'), 'decision_account branch missing').toBeTruthy();
  });

  it('normalizes both account branches onto a bare {accountId} id (no {accountId.id})', () => {
    const contact = nodeOf(f, 'create_contact');
    expect(contact?.config?.fields?.crm_account).toBe('{accountId}');
    // Guard against the earlier full-record vs id confusion resurfacing.
    const json = JSON.stringify(f);
    expect(json, 'stale {accountId.id} ref — accountId is now a bare id string').not.toContain('{accountId.id}');
  });
});

describe('notify recipients resolve to real audiences', () => {
  it('no flow notify targets a bare position/role word (which the messaging service stores verbatim → nobody sees it)', () => {
    const offenders: string[] = [];
    for (const f of flows) {
      for (const n of f.nodes ?? []) {
        if (n.type !== 'notify') continue;
        const to: string[] = n.config?.to ?? n.config?.recipients ?? [];
        for (const spec of to) {
          const s = String(spec);
          const ok =
            s.includes('{') ||                       // template → a real user id / email
            /^(user|role|team|owner_of):/.test(s) ||  // explicit messaging audience selector
            s.includes('@');                          // email
          if (!ok) offenders.push(`${f.name}/${n.id}: "${s}"`);
        }
      }
    }
    expect(offenders, `bare-word notify recipients never reach an inbox:\n${offenders.join('\n')}`).toEqual([]);
  });
});

describe('opportunity amount rollup', () => {
  it('a hook keeps opportunity.amount in sync with its line items', () => {
    const h = hooks.find((x) => x.object === 'crm_opportunity_line_item');
    expect(h, 'no rollup hook on crm_opportunity_line_item').toBeTruthy();
    for (const ev of ['afterInsert', 'afterUpdate', 'afterDelete']) {
      expect(h.events, `rollup must fire on ${ev}`).toContain(ev);
    }
  });
});

describe('lead conversion is discoverable', () => {
  it('convert_lead is not gated to qualified-only (it was hidden on most leads)', () => {
    const vis = action('convert_lead')?.visible;
    const src = typeof vis === 'string' ? vis : (vis?.source ?? JSON.stringify(vis ?? ''));
    // The old gate required status=='qualified'. The fix shows Convert on any
    // open lead, so the predicate must NOT hard-require the qualified status.
    expect(src).not.toMatch(/status\s*==\s*["']qualified["']/);
  });
});
