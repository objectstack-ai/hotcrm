// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { readdirSync, readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import stack from '../objectstack.config';
import { nodesUnder, flowNodesDeep } from './helpers/flow-regions';

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
/**
 * A hook by name, or a thrown error naming the miss.
 *
 * The `const h = hooks.find(...)` / `expect(h).toBeTruthy()` / `h.events` shape
 * these call sites used reads fine but does not narrow `h` for the compiler —
 * something nothing noticed while `test/` sat outside tsconfig's `include`.
 * Throwing keeps the diagnostic and gives the rest of the test a real value.
 */
const hookNamed = (name: string): AnyRec => {
  const h = hooks.find((x) => x.name === name);
  if (!h) throw new Error(`no ${name} hook registered`);
  return h;
};
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

  it('every select value copied verbatim from the lead is legal on the target object (#531)', () => {
    // The flow transplants `{leadRecord.X}` onto the Account/Opportunity it
    // creates. When the two objects declared their own picklists, half the
    // Lead industries (`media`, `logistics`, …) were illegal enum values on
    // crm_account and conversion died in create_account (#490/#531). The
    // vocabularies are unified in src/objects/_picklists.ts; this pins the
    // superset relation itself so drift in either object re-fails CI.
    const leadFields = objects.find((o) => o.name === 'crm_lead')?.fields ?? {};
    const bad: string[] = [];
    for (const node of f?.nodes ?? []) {
      if (node.type !== 'create_record') continue;
      const targetObject: string = node.config?.objectName ?? '';
      const targetFields = objects.find((o) => o.name === targetObject)?.fields ?? {};
      for (const [target, template] of Object.entries(node.config?.fields ?? {})) {
        const src = typeof template === 'string' && /^\{leadRecord\.(\w+)\}$/.exec(template)?.[1];
        if (!src) continue;
        const srcOptions = leadFields[src]?.options;
        const dstOptions = targetFields[target]?.options;
        // Only select→select copies carry enum constraints on both sides.
        if (!Array.isArray(srcOptions) || !Array.isArray(dstOptions)) continue;
        const legal = new Set(dstOptions.map((o: AnyRec) => o.value));
        for (const o of srcOptions) {
          if (!legal.has(o.value)) {
            bad.push(`${node.id}: crm_lead.${src} value "${o.value}" is not a ${targetObject}.${target} option`);
          }
        }
      }
    }
    expect(bad, bad.join('\n')).toEqual([]);
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
    const h = hookNamed('opportunity_amount_rollup');
    for (const ev of ['afterInsert', 'afterUpdate', 'afterDelete']) {
      expect(h.events, `rollup must fire on ${ev}`).toContain(ev);
    }
  });

  it('quote total rollup fires on line-item insert/update/delete', () => {
    const h = hookNamed('quote_total_rollup');
    for (const ev of ['afterInsert', 'afterUpdate', 'afterDelete']) {
      expect(h.events, `rollup must fire on ${ev}`).toContain(ev);
    }
  });

  it('line-item price-fill hooks default price from the product on write', () => {
    for (const name of ['opportunity_line_item_price_fill', 'quote_line_item_price_fill']) {
      const h = hookNamed(name);
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
    const h = hookNamed('lead_auto_assign');
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
   * which only works for objects in the app's own graph), and a hook on
   * `sys_user` is rejected at build time. Seed writes are also `isSystem`, so
   * the middleware's insert-time `owner_id` stamp never fires for them. So
   * ownership is claimed by a scheduled sweep — without which every "My …"
   * view is empty and owner-addressed notify reaches nobody (#548).
   */
  it('demo_bootstrap claims every owner-scoped object', () => {
    const f = flow('demo_bootstrap');
    expect(f, 'demo_bootstrap flow missing').toBeTruthy();
    expect(f!.type).toBe('schedule');
    // System context: a scheduled run has no trigger user, and these writes
    // must bypass RLS to touch records nobody owns yet.
    expect(f!.runAs).toBe('system');

    const claimed = (f!.nodes ?? [])
      .filter((n: AnyRec) => n.type === 'get_record' && n.config?.filter?.owner_id === null)
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
      // Regions included: the body is one `try_catch` guard since
      // `src/flows/_guarded-iteration.ts`, and the stamp is inside its `try`.
      const body = nodesUnder(loop);
      const update = body.find((n: AnyRec) => n.type === 'update_record');
      expect(update, `loop ${loop.id} has no update_record`).toBeTruthy();
      // Keyed by the iterator's id — the only shape update_record supports.
      expect(String(update?.config?.filter?.id ?? '')).toMatch(/^\{current_\w+\.id\}$/);
    }
  });

  it('open opportunities close in the future and settled ones in the past', () => {
    // A pipeline that holds open deals with past close dates, or closed deals
    // scheduled in the future, reads as abandoned. This covers the whole
    // curated demo book rather than tying the invariant to a placeholder name.
    const seeds: AnyRec[] = (stack as any).data ?? (stack as any).seeds ?? [];
    const opps = seeds.find((s) => s.object === 'crm_opportunity');
    expect(opps, 'opportunity seed missing').toBeTruthy();
    const records = (opps!.records ?? []) as AnyRec[];
    expect(records.length).toBeGreaterThan(0);
    for (const r of records) {
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

  /** All nodes of a flow, including every node nested inside a control-flow region. */
  const allNodes = (f: AnyRec): AnyRec[] => flowNodesDeep(f);

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
      // Conditions are `Expression` envelopes ({ dialect, source }), not bare
      // strings — see the flow-condition guard in metadata-references.test.ts.
      const condition: string = start?.config?.condition?.source ?? '';
      expect(condition).toContain('record.status != "escalated"');
      expect(condition).toContain('record.status != "closed"');
      expect(condition).toContain('record.status != "resolved"');
    },
  );
});

/**
 * Execution identity of the RECORD-CHANGE flows (#684).
 *
 * `runAs` decides who a run's data operations execute as. Under the schema
 * default `'user'` a run that resolved NO trigger user has no identity to
 * scope to, so the engine REFUSES its data operations rather than letting them
 * run unscoped — the fail-open ADR-0049 forbids (#1888, #3760).
 *
 * The trap this guard exists for is that "no trigger user" is NOT a
 * schedule-only condition. A record-change flow is fired by a WRITE, and a
 * write made without a session — seed loading, an integration, a webhook, or
 * another `runAs:'system'` flow's own write — carries no user into the run it
 * triggers. Ten scheduled flows had already been given `runAs:'system'`, each
 * with an authored comment saying so; every record-change flow was left on the
 * default, and on the 17.0 GA acceptance sweep that cost 12 failed runs on one
 * boot plus a demonstrated approval bypass (a $150K renewal created by the
 * contract_renewal sweep never opened its approval request).
 *
 * The platform's build-time lint (`flow-runas-unscoped`) rejects the
 * statically-decidable shapes — schedule, time-relative, api — but explicitly
 * NOT this one, because whether a record-change trigger carries a user is only
 * knowable at run time. So the app owns the invariant, and this is it.
 *
 * Enumerated from the COMPILED STACK, not from a hand-maintained import list:
 * a new record-change flow registered in `src/flows/index.ts` is covered the
 * moment it is registered, which is the only way this guard cannot go stale.
 */
describe('record-change flows declare their execution identity (#684)', () => {
  const recordChangeFlows = flows.filter((f) => f.type === 'record_change');

  it('there are record-change flows to check (the filter still matches)', () => {
    // Cheap canary: if `type` were ever renamed or the flows re-typed, every
    // assertion below would pass vacuously over an empty list.
    expect(recordChangeFlows.length).toBeGreaterThanOrEqual(9);
  });

  it.each(recordChangeFlows.map((f) => f.name))(
    '%s declares runAs:"system"',
    (name) => {
      const f = flow(name)!;
      expect(
        f.runAs,
        `flow '${name}' is record-change but leaves runAs at the default 'user'. ` +
          'A write that carries no session (seed, integration, webhook, or another ' +
          "runAs:'system' flow) fires it with no trigger user, and its data operations " +
          'are then REFUSED at run time — silently, in the server log. Declare ' +
          "runAs:'system' to make the elevation explicit, or, if this flow genuinely " +
          "must act as the triggering user, exempt it here with the reasoning written down.",
      ).toBe('system');
    },
  );

  it('the insert-time twins inherit the parent’s identity rather than restating it', () => {
    // Both twins are built by spreading their parent, so `runAs` rides along.
    // Pinning it keeps a future refactor from turning the spread into an
    // explicit field list that quietly drops it.
    for (const [twin, parent] of [
      ['case_escalation_on_create', 'case_escalation'],
      ['opportunity_approval_on_create', 'opportunity_approval'],
    ] as const) {
      expect(flow(twin)!.runAs, `${twin} drifted from ${parent}`).toBe(flow(parent)!.runAs);
    }
  });

  it('every record-change flow explains its elevation in the source', () => {
    // The ten scheduled flows each carry an authored rationale beside their
    // `runAs`. An undocumented `runAs:'system'` is indistinguishable from a
    // copy-paste, and elevation is exactly the decision that must not be made
    // by copy-paste: it applies to the USER-driven runs too, which today
    // execute scoped to the triggering user.
    const missing: string[] = [];
    for (const file of readdirSync(new URL('../src/flows/', import.meta.url))) {
      if (!file.endsWith('.flow.ts')) continue;
      const lines = readFileSync(new URL(`../src/flows/${file}`, import.meta.url), 'utf8').split('\n');
      if (!lines.some((l) => /^\s*type:\s*'record_change'\s*,?\s*$/.test(l))) continue;
      // The DECLARATION line, not a mention of `runAs: 'system'` in prose —
      // these rationales cite each other and every scheduled precedent, so a
      // substring search lands inside a comment and reports the file as
      // undocumented (it did, on four of the seven, first run).
      const at = lines.findIndex((l) => /^\s*runAs:\s*'system'\s*,\s*$/.test(l));
      if (at < 0) { missing.push(`${file}: no runAs: 'system' declaration`); continue; }
      // Walk back over the contiguous comment block directly above it.
      let comment = 0;
      for (let i = at - 1; i >= 0 && /^\s*(\/\/|\*|\/\*)/.test(lines[i]); i--) comment++;
      if (comment < 3) {
        missing.push(`${file}: runAs: 'system' carries ${comment} line(s) of rationale above it, expected >= 3`);
      }
    }
    expect(missing, missing.join('\n')).toEqual([]);
  });
});
