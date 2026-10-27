// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { readdirSync, readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { cel } from '@objectstack/spec';
import stack from './helpers/composed-stack';
import { flowNodesDeep } from './helpers/flow-regions';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import { metadataFiles } from './helpers/src-roster';
import { offeredOptions } from './helpers/stack-picklists';

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
  /**
   * Add to Campaign, on both sides, is a FLOW action since #2167: the insert is
   * the target flow's `create_record`, run as the caller. The field-name
   * contract the script body used to carry now lives in that node's map.
   */
  const ADD_TO_CAMPAIGN = [
    { name: 'create_campaign', person: 'crm_lead' },
    { name: 'add_contact_to_campaign', person: 'crm_contact' },
  ] as const;
  const targetOf = (name: string): AnyRec => {
    const a = action(name);
    expect(a, `${name} action missing`).toBeTruthy();
    expect(a!.type, `${name} must be flow-typed`).toBe('flow');
    const f = flow(a!.target);
    expect(f, `${name} targets missing flow "${a!.target}"`).toBeTruthy();
    return f!;
  };
  const inputsOf = (f: AnyRec): string[] =>
    ((f.variables ?? []) as AnyRec[]).filter((v) => v.isInput).map((v) => v.name);

  it.each(ADD_TO_CAMPAIGN)('$name inserts REAL crm_campaign_member fields, not the doc-example names', ({ name, person }) => {
    const inserts = (targetOf(name).nodes as AnyRec[]).filter((n) => n.type === 'create_record');
    expect(inserts, `${name}'s flow must insert exactly one membership row`).toHaveLength(1);
    const [insert] = inserts;
    expect(insert!.config.objectName).toBe('crm_campaign_member');
    // The real lookup fields on crm_campaign_member — never the generic
    // campaign_id / lead_id (which left the required crm_campaign null →
    // validation failure on every insert).
    const cmFields = fieldNames('crm_campaign_member');
    const written = Object.keys(insert!.config.fields ?? {});
    expect(cmFields).toEqual(expect.arrayContaining(['crm_campaign', person]));
    expect(written).toEqual(expect.arrayContaining(['crm_campaign', person]));
    expect(written.filter((f) => !cmFields.includes(f)), 'writes a column crm_campaign_member does not have').toEqual([]);
  });

  it.each(ADD_TO_CAMPAIGN)('$name campaign param is field-backed so it renders a picker (not a paste-ID textbox)', ({ name }) => {
    const p = (action(name)?.params ?? [])[0];
    expect(p, 'campaign param missing').toBeTruthy();
    // A field-backed param (`field` + `objectOverride`) is what makes the console
    // resolve the widget to a record picker. A bare { type:'lookup' } falls back
    // to a plain text input.
    expect(p.field, 'param must be field-backed').toBeTruthy();
    expect(p.objectOverride, 'param must name the object to resolve the field on').toBeTruthy();
    // And the flow must declare an input under the param's own key: the door
    // sends the collected value under `name`, and an undeclared one never
    // reaches the insert.
    expect(inputsOf(targetOf(name))).toContain(p.name ?? p.field);
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
    expect(contact?.config?.fields?.crm_account).toEqual(cel`accountId`);
    // Guard against the earlier full-record vs id confusion resurfacing.
    const json = JSON.stringify(f);
    expect(json, 'stale {accountId.id} ref — accountId is now a bare id string').not.toContain('accountId.id');
  });

  it('every select value copied verbatim from the lead is legal on the target object (#531)', () => {
    // The flow transplants `{leadRecord.X}` onto the Account/Opportunity it
    // creates. When the two objects declared their own picklists, half the
    // Lead industries (`media`, `logistics`, …) were illegal enum values on
    // crm_account and conversion died in create_account (#490/#531). The
    // vocabularies are shared picklists since #2000 (`industry`, `lead_source`),
    // so the two sides offer one list; this pins the superset relation itself,
    // read through each field's offered options, so drift in either object —
    // a field moved back to an inline copy — re-fails CI.
    const leadFields = objects.find((o) => o.name === 'crm_lead')?.fields ?? {};
    const bad: string[] = [];
    let copies = 0;
    const checked: string[] = [];
    for (const node of f?.nodes ?? []) {
      if (node.type !== 'create_record') continue;
      const targetObject: string = node.config?.objectName ?? '';
      const targetFields = objects.find((o) => o.name === targetObject)?.fields ?? {};
      for (const [target, template] of Object.entries(node.config?.fields ?? {})) {
        // A copied lead field, in either spelling: the 17.x `{leadRecord.x}`
        // template, or since 18.0.0-next.0 a CEL envelope reading
        // `leadRecord.x` (guarded to null where the field is optional).
        const source = typeof template === 'string' ? template : (template as AnyRec | null)?.source;
        const src = typeof source === 'string'
          && (/^\{leadRecord\.(\w+)\}$/.exec(source)?.[1]
            ?? /^(?:has\(leadRecord\.(\w+)\) \? )?leadRecord\.(\w+)(?: : null)?$/.exec(source)?.[2]);
        if (!src) continue;
        copies++;
        const srcOptions = offeredOptions(leadFields[src]);
        const dstOptions = offeredOptions(targetFields[target]);
        // Only select→select copies carry enum constraints on both sides.
        if (!Array.isArray(srcOptions) || !Array.isArray(dstOptions)) continue;
        checked.push(`${targetObject}.${target}`);
        const legal = new Set(dstOptions.map((o: AnyRec) => o.value));
        for (const o of srcOptions) {
          if (!legal.has(o.value)) {
            bad.push(`${node.id}: crm_lead.${src} value "${o.value}" is not a ${targetObject}.${target} option`);
          }
        }
      }
    }
    // Non-vacuity: a spelling this reader no longer recognises would skip every
    // copy and pass over nothing.
    expect(copies, 'no lead field copy was recognised — the reader is stale').toBeGreaterThan(0);
    // Guard the guard: a resolution that stopped reading the shared lists would
    // skip every copy and pass over nothing.
    expect(checked, 'no select→select copy was checked').toEqual(
      expect.arrayContaining(['crm_account.industry', 'crm_opportunity.lead_source']),
    );
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
            (typeof spec === 'object' && (spec as AnyRec)?.dialect === 'cel') || // CEL envelope → a user id
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
    expect(JSON.stringify(f)).not.toContain('contactId.id');
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

  it.each([
    { name: 'create_campaign', person: 'crm_lead' },
    { name: 'add_contact_to_campaign', person: 'crm_contact' },
  ])('$name skips a person already on the campaign', ({ name, person }) => {
    // The flow must check existing members before inserting — re-running the
    // action on the same selection must not double-count marketing touches.
    // The read is scoped on the side's own lookup: a person enrolled as a lead
    // and again as a contact is two memberships, not a duplicate.
    const f = flow(action(name)!.target)!;
    const nodes = f.nodes as AnyRec[];
    const read = nodes.find((n) => n.type === 'get_record' && n.config?.objectName === 'crm_campaign_member');
    expect(read, `${name}'s flow has no dedupe read`).toBeTruthy();
    expect(Object.keys(read!.config.filter).sort()).toEqual(['crm_campaign', person].sort());
    // …and the insert is reached only through a conditional edge on its miss.
    const insert = nodes.find((n) => n.type === 'create_record')!;
    const into = (f.edges as AnyRec[]).filter((e) => e.target === insert.id);
    expect(into).toHaveLength(1);
    expect(into[0]!.type).toBe('conditional');
    expect(String(into[0]!.condition?.source)).toBe(`${read!.config.outputVariable} == null`);
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
 * a new record-change flow registered in a package's `flows/index.ts` is covered the
 * moment it is registered, which is the only way this guard cannot go stale.
 */
describe('record-change flows declare their execution identity (#684)', () => {
  const recordChangeFlows = flows.filter((f) => f.type === 'record_change');

  /**
   * The record-change flows that act as the TRIGGERING USER, each with the
   * reason it may (Metadata semantics rule 11: the deviation is written beside
   * the flow's `runAs` and here). The hazard above is a trigger write that
   * carries no session; a flow belongs here only when every write that can
   * fire it does carry one.
   */
  const USER_IDENTITY_FLOWS: Record<string, string> = {
    // Fired by the `sys_attachment` row the print service writes when it
    // archives a quote PDF, and the service prints for a signed-in user acting
    // for themselves only (it refuses a system, agent, service or guest
    // principal before it renders). So the trigger user is always the rep who
    // printed, and the status move is their own write, under their own rights
    // and every rule on the quote (rule 9: elevate as little as possible). A
    // session-less upload under the print's exact file name is refused in the
    // run history, which is the right answer for it.
    quote_print_presented: 'the print service writes its archive as the signed-in user only',
  };

  it('there are record-change flows to check (the filter still matches)', () => {
    // Cheap canary: if `type` were ever renamed or the flows re-typed, every
    // assertion below would pass vacuously over an empty list.
    expect(recordChangeFlows.length).toBeGreaterThanOrEqual(9);
  });

  it.each(recordChangeFlows.map((f) => f.name).filter((n) => !(n in USER_IDENTITY_FLOWS)))(
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

  it.each(Object.keys(USER_IDENTITY_FLOWS))('%s acts as the triggering user, by the roster above', (name) => {
    // The roster names shipped flows only, and each one really is on `user`:
    // an entry for a flow that moved to `system`, or left, is a stale excuse.
    expect(flow(name), `${name} is in USER_IDENTITY_FLOWS but not registered`).toBeDefined();
    expect(flow(name)!.type).toBe('record_change');
    expect(flow(name)!.runAs).toBe('user');
  });

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
    for (const rel of metadataFiles('flows', '.ts')) {
      const file = rel.split('/').pop()!;
      if (!file.endsWith('.flow.ts')) continue;
      const lines = readFileSync(join(REPO_ROOT, rel), 'utf8').split('\n');
      if (!lines.some((l) => /^\s*type:\s*'record_change'\s*,?\s*$/.test(l))) continue;
      // The DECLARATION line, not a mention of `runAs: 'system'` in prose —
      // these rationales cite each other and every scheduled precedent, so a
      // substring search lands inside a comment and reports the file as
      // undocumented (it did, on four of the seven, first run).
      const userAt = lines.findIndex((l) => /^\s*runAs:\s*'user'\s*,\s*$/.test(l));
      const exempt = Object.keys(USER_IDENTITY_FLOWS).some((n) => lines.some((l) => l.includes(`name: '${n}'`)));
      const at = exempt ? userAt : lines.findIndex((l) => /^\s*runAs:\s*'system'\s*,\s*$/.test(l));
      if (at < 0) { missing.push(`${file}: no runAs: '${exempt ? 'user' : 'system'}' declaration`); continue; }
      // Walk back over the contiguous comment block directly above it.
      let comment = 0;
      for (let i = at - 1; i >= 0 && /^\s*(\/\/|\*|\/\*)/.test(lines[i]); i--) comment++;
      if (comment < 3) {
        missing.push(`${file}: its runAs carries ${comment} line(s) of rationale above it, expected >= 3`);
      }
    }
    expect(missing, missing.join('\n')).toEqual([]);
  });
});
