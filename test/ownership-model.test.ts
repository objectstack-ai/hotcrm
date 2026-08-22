// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectQL } from '@objectstack/objectql';
import { InMemoryDriver } from '@objectstack/driver-memory';
import stack from '../objectstack.config';
import { hookNamed } from './helpers/hook-harness';
import leadHooks from '../src/objects/lead.hook';

/**
 * ═══ HotCRM has ONE owner, and it is the platform's (#548) ════════════════
 *
 * Every business object used to author its own `owner` lookup while the
 * platform kept a separate `owner_id` beside it. Only `owner_id` was ever read
 * by OWD, sharing rules, owner-scope widening or the `is_private` row filter —
 * so "Owner" on a form was a label, not a permission, and reassigning it moved
 * the record in every list and report while moving no access at all. #548
 * deleted the second column.
 *
 * Collapsing to one column moves ownership writes UNDER the platform's transfer
 * gate: `owner_id` is system-managed for non-privileged writers, and a write
 * that plants a record under another user (insert) or reassigns one (update) is
 * denied without `allowTransfer` — enforced today through the ordinary
 * insert/update door, not merely declared (`@objectstack/spec`
 * `security/permission.zod.ts`, the #3004 guard; implemented in
 * `@objectstack/plugin-security`'s operation middleware).
 *
 * That gate is a PLATFORM behaviour with platform tests of its own. What this
 * file pins is the part the app's correctness actually rests on, and which no
 * platform test can answer: **which of HotCRM's own writers the gate can even
 * see**. The answer is not uniform, and getting it wrong in either direction is
 * expensive — assume the gate applies where it does not and the round-robin
 * gets a grant it never needed; assume it does not where it does and case
 * escalation 403s in production.
 *
 * Three seams, three different answers, each measured below against a real
 * ObjectQL rather than reasoned about:
 *
 *   1. a `beforeInsert` hook mutating `input` — INVISIBLE to the gate, because
 *      the gate is an operation middleware wrapping the whole call and the hook
 *      phase runs inside it. This is why `lead_auto_assign` can round-robin a
 *      lead onto another rep with no transfer grant.
 *   2. a hook's `ctx.api` write — a NEW operation carrying the SAME context, so
 *      the gate does see it. This is why `case.hook.ts` opening an escalation
 *      task under the account owner needs `service_agent.crm_task.allowTransfer`.
 *   3. an insert that leaves `owner_id` empty — stamped to the acting user by
 *      the same middleware, which is what makes "new records belong to their
 *      creator" survive the deletion of the old `defaultValue: os.user.id`.
 *
 * The middleware itself is not installed here (`@objectstack/plugin-security` is
 * not a dependency of this app, and standing one up would test the platform's
 * code, not ours). Seams 1 and 2 are therefore measured through a RECORDING
 * middleware registered on the same `registerMiddleware` seam the security
 * plugin uses: what that recorder can see, the guard can see, and what it
 * cannot see, the guard cannot either. Seam 3 is asserted on the app's metadata
 * — that nothing in the schema fills `owner_id`, so the middleware stamp is the
 * only thing that can.
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as any).objects ?? [];
const permissionSets: AnyRec[] = (stack as any).permissions ?? [];
const objectByName = new Map(objects.map((o) => [o.name as string, o]));
const setByName = new Map(permissionSets.map((p) => [p.name as string, p]));

/** Business objects: everything this app authors (platform `sys_*` excluded). */
const businessObjects = objects
  .filter((o) => typeof o.name === 'string' && !o.name.startsWith('sys_'))
  .map((o) => o.name as string);

// ─────────────────────────────────────────── the model, in the metadata ──

describe('one ownership column, and it is `owner_id`', () => {
  it('no business object authors an `owner` lookup any more', () => {
    // The whole defect in one assertion. A re-introduced `owner` field would
    // recreate the two-column split silently: forms and views would keep
    // working, and access would quietly stop following the name on them.
    const offenders = businessObjects.filter(
      (name) => (objectByName.get(name)?.fields ?? {}).owner != null,
    );
    expect(
      offenders,
      'these objects author an `owner` field beside the platform `owner_id`.\n' +
        'Reassigning it moves the record in every list and report and moves NO\n' +
        'record access at all (#548). Ownership is `owner_id`:\n  ' +
        offenders.join('\n  '),
    ).toEqual([]);
  });

  it('every owner-scoped object declares `owner_id` as a sys_user lookup', () => {
    // Declared rather than left to registry injection, and that is load-bearing
    // rather than stylistic: an injected column is invisible to every
    // author-time rule, so `os validate` reported `highlightFields: ['owner_id']`
    // as "not a field on this object — silently skipped by every consumer" and
    // rejected a CEL predicate reading `record.owner_id` outright.
    //
    // The objects that surface no owner, each for a stated reason. The registry
    // still injects `owner_id` into them at runtime — it records whoever created
    // the row — but nothing in the app reads or shows it, so declaring one would
    // put a picker on a form where ownership means nothing.
    const NO_SURFACED_OWNER = new Map([
      // controlled_by_parent: access derives from the master, never from a
      // column of their own (ADR-0055).
      ['crm_opportunity_line_item', 'controlled_by_parent'],
      ['crm_quote_line_item',       'controlled_by_parent'],
      ['crm_campaign_member',       'controlled_by_parent'],
      ['crm_event_attendee',        'controlled_by_parent'],
      // A shared catalog. It never had an app-level owner either — "who added
      // this SKU" is not a permission boundary, and the dashboards that group
      // by owner opt out of it by name.
      ['crm_product',               'shared catalog, public_read'],
    ]);
    // Guard the guard: an exemption for an object that no longer exists is an
    // exemption that silently covers nothing.
    for (const name of NO_SURFACED_OWNER.keys()) {
      expect(businessObjects, `exempt object "${name}" no longer exists — drop it`).toContain(name);
    }

    const bad: string[] = [];
    let checked = 0;
    for (const name of businessObjects) {
      const obj = objectByName.get(name)!;
      const field = (obj.fields ?? {}).owner_id;
      if (!field) {
        if (!NO_SURFACED_OWNER.has(name)) bad.push(`${name}: no owner_id declared`);
        continue;
      }
      checked++;
      if (field.type !== 'lookup') bad.push(`${name}.owner_id: type is "${field.type}", not lookup`);
      if (field.reference !== 'sys_user') bad.push(`${name}.owner_id: references "${field.reference}", not sys_user`);
      // `system: true` keeps the marker the platform's own tooling reads — the
      // clone path strips system columns so a copy is stamped to the cloner
      // instead of inheriting (and then being denied as) the source's owner.
      if (field.system !== true) bad.push(`${name}.owner_id: not marked system:true`);
      if (field.readonly === true) bad.push(`${name}.owner_id: readonly — ownership is transferable`);
      // A `defaultValue` here would be the old model's mistake: it evaluated to
      // nothing on every user-less write (#620) while looking like a guarantee.
      // The middleware stamp is the guarantee.
      if (field.defaultValue != null) {
        bad.push(`${name}.owner_id: carries a defaultValue — the insert-time stamp owns this`);
      }
    }
    expect(checked, 'no object declared owner_id — this guard stopped guarding').toBeGreaterThan(10);
    expect(bad, `owner_id declarations that disagree with the platform column:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('nothing in the schema fills `owner_id` — the middleware stamp is the only filler', () => {
    // The PM's question, pinned: "does a new record still belong to its
    // creator?". It does, and NOT because of anything in this repo — the
    // security middleware stamps the acting user onto any insert that leaves
    // `owner_id` empty. Asserting the absence of a schema-level filler is what
    // keeps that single mechanism single: a `defaultValue` re-added here would
    // reintroduce a second answer that disagrees on exactly the writes the
    // stamp is skipped for (system / seed), which is the #620 shape.
    //
    // The complementary negative — a SYSTEM insert comes back with no
    // `owner_id` key at all — is measured end-to-end in
    // `test/flow-condition-totality.test.ts`.
    const withDefault = businessObjects.filter(
      (n) => (objectByName.get(n)?.fields ?? {}).owner_id?.defaultValue != null,
    );
    expect(withDefault, 'owner_id must have no schema default').toEqual([]);
  });
});

// ──────────────────────────────────── which writers the gate can see ──

describe('the transfer gate sees a hook’s ctx.api write, and not a beforeInsert mutation', () => {
  let ql: AnyRec;
  /** Every `insert` the middleware seam observed, with the payload as it was THEN. */
  let seen: { object: string; data: AnyRec }[];

  beforeAll(async () => {
    seen = [];
    ql = (await ObjectQL.create({
      datasources: { default: new InMemoryDriver({ persistence: false }) },
      objects: {
        crm_lead: {
          name: 'crm_lead',
          fields: {
            id: { type: 'text' },
            company: { type: 'text' },
            is_converted: { type: 'boolean' },
            owner_id: { type: 'lookup', reference: 'sys_user' },
          },
        },
        crm_task: {
          name: 'crm_task',
          fields: {
            id: { type: 'text' },
            subject: { type: 'text' },
            owner_id: { type: 'lookup', reference: 'sys_user' },
          },
        },
      } as never,
    })) as never;

    // The SAME seam `@objectstack/plugin-security` registers its guard on. It
    // reads `opCtx.data` and passes everything through — a recorder, not a gate,
    // because what is being measured is VISIBILITY, not the verdict.
    ql.registerMiddleware(async (opCtx: AnyRec, next: () => Promise<void>) => {
      if (opCtx.operation === 'insert') {
        seen.push({
          object: opCtx.object,
          data: JSON.parse(JSON.stringify(opCtx.data ?? {})) as AnyRec,
        });
      }
      return next();
    });
  });

  afterAll(async () => {
    await ql?.close();
  });

  it('a beforeInsert hook’s owner_id stamp never reaches the middleware', async () => {
    // Seam 1. `lead_auto_assign` assigns a FOREIGN rep — the whole point of a
    // round-robin — which the #3004 guard denies without `allowTransfer`. It
    // works anyway because the hook phase runs INSIDE the operation the
    // middleware already wrapped: by the time the hook writes, the guard has
    // read and released the payload.
    //
    // Predicted direction, stated before running: the middleware sees NO
    // `owner_id`, and the STORED row has the hook's rep. If a future platform
    // release moves the guard downstream of the hook phase, the first
    // expectation flips and this test goes red — which is the signal to give
    // the sales_rep / public-form paths a transfer grant, or to stop
    // round-robining in a hook.
    ql.registerHook?.('beforeInsert', async (ctx: AnyRec) => {
      if (ctx.object !== 'crm_lead') return;
      const data = ctx.input?.data ?? ctx.data;
      if (data && !data.owner_id) data.owner_id = 'rep_round_robin';
    }, { object: 'crm_lead' });

    const api = ql.createContext({ userId: 'usr_actor' });
    const row = await api.object('crm_lead').insert({ company: 'NewCo', is_converted: false });

    const observed = seen.filter((s) => s.object === 'crm_lead').pop();
    expect(observed, 'the middleware seam never fired for the insert').toBeTruthy();
    expect(
      observed!.data.owner_id,
      'the guard COULD see the hook-assigned owner — round-robin now needs allowTransfer',
    ).toBeUndefined();

    const stored = await api.object('crm_lead').findOne({ where: { id: row.id } });
    expect(stored?.owner_id, 'the hook’s assignment did not survive to storage').toBe('rep_round_robin');
  });

  it('a hook’s ctx.api insert is a fresh operation the middleware does see', async () => {
    // Seam 2, and the asymmetry that decides a permission grant. `ctx.api` is
    // built from the ORIGINAL operation's context (objectql `buildHookApi` →
    // `new ScopedContext(execCtx)`), so a side-effect insert is a new trip
    // through the whole chain, carrying the caller's identity. `case.hook.ts`
    // opens its escalation task under the ACCOUNT OWNER through exactly this
    // path — a foreign owner_id the guard reads — which is why
    // `service_agent` carries `allowTransfer` on `crm_task` and nothing else.
    const before = seen.filter((s) => s.object === 'crm_task').length;

    const api = ql.createContext({ userId: 'usr_agent' });
    await api.object('crm_task').insert({ subject: 'Escalated case', owner_id: 'rep_account_owner' });

    const observed = seen.filter((s) => s.object === 'crm_task');
    expect(observed.length, 'the middleware did not see the task insert').toBe(before + 1);
    expect(
      observed.pop()!.data.owner_id,
      'the guard cannot see this owner — the service_agent transfer grant would be dead weight',
    ).toBe('rep_account_owner');
  });
});

// ─────────────────────────────────────────────── the grants, pinned ──

describe('allowTransfer is granted deliberately', () => {
  const objectsOf = (set: string) => (setByName.get(set)?.objects ?? {}) as Record<string, AnyRec>;
  const transfersIn = (set: string) =>
    Object.entries(objectsOf(set)).filter(([, p]) => p?.allowTransfer === true).map(([o]) => o).sort();

  it('never grants transfer without edit — it is an ownership WRITE', () => {
    const bad: string[] = [];
    for (const ps of permissionSets) {
      for (const [objectName, perm] of Object.entries((ps.objects ?? {}) as Record<string, AnyRec>)) {
        if (perm?.allowTransfer !== true) continue;
        if (perm.allowEdit !== true) bad.push(`${ps.name}.${objectName}: allowTransfer without allowEdit`);
      }
    }
    expect(bad, `transfer granted where the set cannot even edit:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('system_admin can reassign every business object', () => {
    // The persona that reassigns a book when someone leaves. Authored rather
    // than inherited from `modifyAllRecords` (which implies it) for the same
    // reason `allowExport` is authored: a capability a persona is meant to have
    // should be readable in the profile, and must survive a future narrowing of
    // `modifyAllRecords` instead of disappearing with it.
    const granted = new Set(transfersIn('system_admin'));
    const missing = businessObjects.filter((o) => !granted.has(o));
    expect(missing, `system_admin cannot transfer:\n  ${missing.join('\n  ')}`).toEqual([]);
  });

  it('sales_manager can reassign exactly the book it owns the number for', () => {
    // The rule: transfer follows `modifyAllRecords` on this set — the sales
    // stack, and nothing beyond it. Contracts, campaigns, cases and the product
    // catalog are edit-only for a manager and stay untransferable.
    const modifyAll = Object.entries(objectsOf('sales_manager'))
      .filter(([, p]) => p?.modifyAllRecords === true).map(([o]) => o).sort();
    expect(modifyAll.length, 'sales_manager holds modifyAllRecords nowhere — rule vacuous').toBeGreaterThan(4);
    expect(transfersIn('sales_manager')).toEqual(modifyAll);
  });

  it('service_agent may assign a TASK and nothing else', () => {
    // Narrow and load-bearing. Escalating a case fires
    // `case_status_side_effects`, which opens the follow-up task owned by the
    // ACCOUNT owner through `ctx.api` — the seam the gate sees (above), so
    // without this bit the case update itself fails. It is "assign work to a
    // colleague", NOT "reassign the ticket": the agent holds no transfer grant
    // on `crm_case` or any customer record.
    //
    // #1070 hands an escalated case to the `service_manager` pool and this list
    // still reads `['crm_task']` — that is the point, not an oversight. The
    // hand-off runs on the `beforeUpdate` seam, which the gate cannot see (seam
    // 1 above, measured for `crm_case` update in `test/case-assignment.test.ts`
    // with its own negative control). Had it been written as a `ctx.api` write
    // from `afterUpdate` — seam 2 — the gate WOULD see it and this expectation
    // would have had to grow `crm_case`, handing every agent the ability to
    // reassign any case they can edit. If this line ever needs that entry, it
    // is a permission-model decision for the maintainer, not a test fix.
    expect(transfersIn('service_agent')).toEqual(['crm_task']);
  });

  it('a rep holds no transfer grant at all — ownership is assigned to them, not taken', () => {
    for (const set of ['sales_rep', 'marketing_user', 'guest_portal']) {
      expect(transfersIn(set), `${set} may transfer ownership`).toEqual([]);
    }
  });
});

// ───────────────────────────────────────────── the app-side surfaces ──

describe('every owner-facing surface points at the one column', () => {
  const views: AnyRec[] = (stack as any).views ?? [];
  const flows: AnyRec[] = (stack as any).flows ?? [];

  /** Walk an arbitrary metadata tree, yielding every plain object node. */
  function* walk(node: unknown): Generator<AnyRec> {
    if (Array.isArray(node)) {
      for (const item of node) yield* walk(item);
      return;
    }
    if (!node || typeof node !== 'object') return;
    const rec = node as AnyRec;
    yield rec;
    for (const value of Object.values(rec)) yield* walk(value);
  }

  it('no view filters, sorts or groups on a bare `owner`', () => {
    // The "My …" views are the surface users read ownership off. A filter left
    // on the retired column matches nothing at all — an empty list, no error.
    const bad: string[] = [];
    for (const v of views) {
      for (const node of walk(v)) {
        for (const key of ['field', 'groupByField'] as const) {
          if (node[key] === 'owner') bad.push(`${v.object ?? v.name}: ${key}: 'owner'`);
        }
      }
    }
    expect(bad, `view bindings on the retired column:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('no flow writes or addresses a bare `owner`', () => {
    // A `notify` addressed to `{record.owner}` resolves to nothing and reaches
    // nobody — the exact silent failure `demo_bootstrap` exists to prevent.
    const bad: string[] = [];
    for (const f of flows) {
      for (const node of walk(f)) {
        if (Object.prototype.hasOwnProperty.call(node, 'owner')) {
          bad.push(`${f.name}: writes an \`owner\` key`);
        }
      }
      const json = JSON.stringify(f);
      // `{x.owner}` — a template read of the retired column. `{x.owner_id}` and
      // `owner_id` do not match: the closing brace is required.
      const reads = json.match(/\{[A-Za-z_$][\w$]*\.owner\}/g);
      if (reads) bad.push(`${f.name}: reads ${[...new Set(reads)].join(', ')}`);
    }
    expect(bad, `flow references to the retired column:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('dashboard drill-down column lists name real record columns, not the dataset alias', () => {
    // A drill-down drawer lists RECORDS, so its `columns` are object fields —
    // unlike the widget's `dimensions`, which are dataset dimension NAMES and
    // legitimately still read `owner` (the semantic layer resolves that alias
    // onto the `owner_id` column). The two live inches apart in the same widget
    // and a blanket rename would have broken the analytics binding while a
    // blanket skip left a dead column in the drawer.
    const dashboards: AnyRec[] = (stack as any).dashboards ?? [];
    const datasets: AnyRec[] = (stack as any).datasets ?? [];
    const objectOfDataset = new Map(datasets.map((d) => [d.name as string, d.object as string]));

    const bad: string[] = [];
    let checked = 0;
    for (const d of dashboards) {
      for (const w of (d.widgets ?? []) as AnyRec[]) {
        const columns = w.options?.drillDown?.columns as string[] | undefined;
        if (!Array.isArray(columns)) continue;
        const objectName = objectOfDataset.get(String(w.dataset));
        const fields = objectByName.get(String(objectName))?.fields ?? {};
        for (const col of columns) {
          checked++;
          if (col.includes('.')) continue; // traversal — resolved by the query engine
          if (!(col in fields)) bad.push(`${d.name}/${w.id}: drill-down column "${col}" is not a field on ${objectName}`);
        }
      }
    }
    expect(checked, 'no drill-down columns found — this guard stopped guarding').toBeGreaterThan(0);
    expect(bad, `drill-down columns that resolve to nothing:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('the RLS predicates that mean “its owner” key on owner_id', () => {
    // #547's `is_private` filter was deliberately written against the VISIBLE
    // field for form consistency, which is precisely how it came to disagree
    // with the OWD owner-match it sits beside. One column, one answer.
    const seen: string[] = [];
    for (const ps of permissionSets) {
      for (const rule of (ps.rowLevelSecurity ?? []) as AnyRec[]) {
        const using = String(rule.using ?? '');
        if (!/owner/.test(using)) continue;
        seen.push(`${ps.name}/${rule.name}`);
        expect(using, `${ps.name}/${rule.name} still keys on the retired column`)
          .not.toMatch(/(^|[^_\w])owner(?!_id)/);
        expect(using).toMatch(/owner_id/);
      }
    }
    expect(seen.length, 'no owner-scoped RLS rule found — this guard stopped guarding')
      .toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────── the round-robin, end to end ──

describe('lead_auto_assign assigns the platform column', () => {
  const assign = hookNamed(leadHooks, 'lead_auto_assign');

  const makeApi = (leads: AnyRec[], reps: string[]): AnyRec => ({
    object: (name: string) => ({
      async find() {
        return name === 'sys_user_position' ? reps.map((user_id) => ({ user_id })) : leads;
      },
      async count(q: AnyRec = {}) {
        const where = (q.where ?? {}) as AnyRec;
        return leads.filter((l) =>
          Object.entries(where).every(([k, v]) => l[k] === v)).length;
      },
    }),
  });

  it('writes owner_id, not a second column', async () => {
    const input: AnyRec = { company: 'NewCo' };
    await assign.handler({
      event: 'beforeInsert',
      input,
      api: makeApi(
        [
          { id: 'x1', owner_id: 'repA', is_converted: false },
          { id: 'x2', owner_id: 'repA', is_converted: false },
          { id: 'x3', owner_id: 'repB', is_converted: false },
        ],
        ['repA', 'repB'],
      ),
    } as never);
    expect(input.owner_id, 'did not assign the least-loaded rep on owner_id').toBe('repB');
    expect('owner' in input, 'wrote a second, unread ownership column').toBe(false);
  });

  it('stands down when the middleware already stamped an owner', async () => {
    // On any write that carries a user, `owner_id` is already the creator by
    // the time this hook runs — which is what keeps the round-robin scoped to
    // genuinely ownerless intake (import, web-to-lead, API capture).
    const input: AnyRec = { company: 'NewCo', owner_id: 'usr_creator' };
    await assign.handler({
      event: 'beforeInsert',
      input,
      api: makeApi([], ['repA', 'repB']),
    } as never);
    expect(input.owner_id).toBe('usr_creator');
  });
});
