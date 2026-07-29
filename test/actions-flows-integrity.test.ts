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

describe('line-item rollups keep parent totals in sync', () => {
  it('opportunity amount rollup fires on line-item insert/update/delete', () => {
    const h = hooks.find((x) => x.name === 'opportunity_amount_rollup');
    expect(h, 'no opportunity_amount_rollup hook').toBeTruthy();
    for (const ev of ['afterInsert', 'afterUpdate', 'afterDelete']) {
      expect(h.events, `rollup must fire on ${ev}`).toContain(ev);
    }
  });

  it('quote total rollup fires on line-item insert/update/delete', () => {
    const h = hooks.find((x) => x.name === 'quote_total_rollup');
    expect(h, 'no quote_total_rollup hook').toBeTruthy();
    for (const ev of ['afterInsert', 'afterUpdate', 'afterDelete']) {
      expect(h.events, `rollup must fire on ${ev}`).toContain(ev);
    }
  });

  it('line-item price-fill hooks default price from the product on write', () => {
    for (const name of ['opportunity_line_item_price_fill', 'quote_line_item_price_fill']) {
      const h = hooks.find((x) => x.name === name);
      expect(h, `no ${name} hook`).toBeTruthy();
      expect(h.events).toContain('beforeInsert');
    }
  });
});

describe('lead conversion dedupes the contact too', () => {
  it('looks up an existing contact before creating one', () => {
    const f = flow('lead_conversion');
    const find = nodeOf(f, 'find_contact');
    expect(find, 'find_contact node missing — conversion would always create a duplicate contact').toBeTruthy();
    expect(find.type).toBe('get_record');
    expect(find.config?.objectName).toBe('crm_contact');
    // Converge on a bare {contactId} id (no stale {contactId.id}).
    expect(JSON.stringify(f)).not.toContain('{contactId.id}');
  });
});

describe('lead auto-assignment', () => {
  it('a beforeInsert hook assigns ownerless leads', () => {
    const h = hooks.find((x) => x.name === 'lead_auto_assign');
    expect(h, 'no lead_auto_assign hook').toBeTruthy();
    expect(h.events).toContain('beforeInsert');
  });
});

describe('search works via explicit searchableFields', () => {
  it('objects with a formula nameField declare real searchableFields', () => {
    // The formula nameField (display_title/full_name) can't be searched; each
    // such object must list real columns or the picker/global search return 0.
    const offenders: string[] = [];
    for (const o of objects) {
      const nf = o.nameField;
      const nfType = nf ? o.fields?.[nf]?.type : undefined;
      if (nfType === 'formula') {
        const sf = o.searchableFields;
        if (!Array.isArray(sf) || sf.length === 0) offenders.push(o.name);
      }
    }
    expect(offenders, `formula-nameField objects missing searchableFields:\n${offenders.join(', ')}`).toEqual([]);
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

describe('demo data is demo-ready', () => {
  /**
   * A seed can't name a user (lookups resolve against the target's externalId,
   * which only works for objects in the app's own graph; `cel`os.user.id`` in a
   * seed evaluates to nothing), and a hook on `sys_user` is rejected at build
   * time. So ownership is claimed by a scheduled sweep — without which every
   * "My …" view is empty and owner-addressed notify reaches nobody.
   */
  it('demo_bootstrap claims every owner-scoped object', () => {
    const f = flow('demo_bootstrap');
    expect(f, 'demo_bootstrap flow missing').toBeTruthy();
    expect(f!.type).toBe('schedule');
    // System context: a scheduled run has no trigger user, and these writes
    // must bypass RLS to touch records nobody owns yet.
    expect(f!.runAs).toBe('system');

    const claimed = (f!.nodes ?? [])
      .filter((n: AnyRec) => n.type === 'get_record' && n.config?.filter?.owner === null)
      .map((n: AnyRec) => n.config.objectName);
    // The objects behind My Leads / My Deals / My Cases and the task queue.
    for (const objectName of ['crm_lead', 'crm_account', 'crm_opportunity', 'crm_case', 'crm_task']) {
      expect(claimed, `demo_bootstrap never claims ${objectName}`).toContain(objectName);
    }
  });

  it('every claim runs per-record inside a loop, not as a filtered mass update', () => {
    // The update_record node calls data.update() WITHOUT options.multi, so a
    // filter matching more than one row fails at runtime with "Update requires
    // an ID or options.multi=true" — invisible to build and validate.
    const f = flow('demo_bootstrap');
    const loops = (f!.nodes ?? []).filter((n: AnyRec) => n.type === 'loop');
    expect(loops.length).toBeGreaterThanOrEqual(5);
    for (const loop of loops) {
      const body = loop.config?.body?.nodes ?? [];
      const update = body.find((n: AnyRec) => n.type === 'update_record');
      expect(update, `loop ${loop.id} has no update_record`).toBeTruthy();
      // Keyed by the iterator's id — the only shape update_record supports.
      expect(String(update.config?.filter?.id ?? '')).toMatch(/^\{current_\w+\.id\}$/);
    }
  });

  it('open demo deals close in the future and settled ones in the past', () => {
    // The generator used to scatter close_date across ±180 days regardless of
    // stage, so the pipeline was full of open deals that "closed" six months
    // ago and won deals still to close — a book that reads as abandoned.
    const seeds: AnyRec[] = (stack as any).data ?? (stack as any).seeds ?? [];
    const opps = seeds.find((s) => s.object === 'crm_opportunity');
    expect(opps, 'opportunity seed missing').toBeTruthy();
    const demo = (opps!.records ?? []).filter((r: AnyRec) => String(r.name ?? '').startsWith('Demo Deal'));
    expect(demo.length).toBeGreaterThan(0);
    for (const r of demo) {
      const expr = String(r.close_date?.source ?? r.close_date ?? '');
      const closed = r.stage === 'closed_won' || r.stage === 'closed_lost';
      expect(expr, `${r.name} (${r.stage}) has the wrong close-date direction`)
        .toMatch(closed ? /daysAgo/ : /daysFromNow/);
    }
  });
});

describe('flow notification templates stay within what the engine interpolates', () => {
  /**
   * Flow templates interpolate `{var}` and `{var.field}` — one hop into the
   * loop/record variable. They can NOT traverse a lookup: `{caseRecord.owner.
   * manager}` and `{caseRecord.crm_account.name}` render the literal string
   * "undefined" (case-escalation.flow.ts documents this at its update node,
   * then did exactly that two nodes later in `notify`).
   */
  const DOT_WALK = /\{(?!\$)([A-Za-z_$][\w$]*)\.([\w$]+)\.([\w$]+)\}/;

  /** All nodes of a flow, including nodes nested inside loop bodies. */
  const allNodes = (f: AnyRec): AnyRec[] =>
    (f.nodes ?? []).flatMap(function expand(n: AnyRec): AnyRec[] {
      return [n, ...((n.config?.body?.nodes ?? []) as AnyRec[]).flatMap(expand)];
    });

  it('no notify node dot-walks a lookup in recipients, title, or body', () => {
    const bad: string[] = [];
    for (const f of flows) {
      for (const n of allNodes(f)) {
        if (n.type !== 'notify') continue;
        const texts: string[] = [
          ...(Array.isArray(n.config?.to) ? n.config.to : []),
          n.config?.title ?? '',
          n.config?.body ?? '',
        ];
        for (const t of texts) {
          const m = typeof t === 'string' ? t.match(DOT_WALK) : null;
          if (m) bad.push(`${f.name}/${n.id}: "${m[0]}" interpolates to "undefined"`);
        }
      }
    }
    expect(bad, `dot-walking notify templates:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});

describe('no action relies on the broken modal machinery', () => {
  it('no action is modal-typed', () => {
    // Verified against the running 16.1.0 console (2026-07-28): a modal
    // action's param dialog renders, but submit resolves `target` as an
    // OBJECT name (`GET /api/v1/meta/object/<target>` → 400, "Error loading
    // form") and the body is never executed. Script actions POST
    // /api/v1/actions/... and run; screen flows handle anything that needs
    // to UPDATE a sharing-ruled record (the sandbox api cannot).
    const modal = actions.filter((a) => a.type === 'modal').map((a) => a.name);
    expect(modal, `modal actions never execute in 16.1.0:\n  ${modal.join('\n  ')}`).toEqual([]);
  });

  it('escalate/close case actions delegate to registered screen flows', () => {
    for (const name of ['escalate_case', 'close_case']) {
      const a = action(name);
      expect(a?.type, `${name} must be flow-typed`).toBe('flow');
      const f = flow(a!.target);
      expect(f, `${name} targets missing flow "${a!.target}"`).toBeTruthy();
      expect(f!.type).toBe('screen');
    }
  });

  it('create_campaign skips leads already on the campaign', () => {
    // The body must check existing members before inserting — re-running the
    // action on the same selection must not double-count marketing touches.
    const a = action('create_campaign');
    const src: string = a?.body?.source ?? '';
    expect(src).toMatch(/find\(|findOne\(|existing/);
    // The dedupe read requires the read capability alongside the write.
    expect(a?.body?.capabilities).toContain('api.read');
  });
});

describe('case escalation trigger does not fight the close action', () => {
  it.each(['case_escalation', 'case_escalation_on_create'])(
    '%s suppresses on closed/resolved cases, not just escalated ones',
    (name) => {
      // With only the `status != "escalated"` guard, closing a critical case
      // (an afterUpdate) re-triggered this flow, which rewrote the case back
      // to "escalated" the moment close_case closed it — observed live.
      const start = nodeOf(flow(name), 'start');
      const condition: string = start?.config?.condition ?? '';
      expect(condition).toContain('record.status != "escalated"');
      expect(condition).toContain('record.status != "closed"');
      expect(condition).toContain('record.status != "resolved"');
    },
  );
});
