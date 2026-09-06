// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import {
  DATA_ACTION_TO_API_OPERATION,
  isApiOperationAllowed,
  resolveEffectiveApiMethods,
} from '@objectstack/spec/data';
import stack from '../objectstack.config';

/**
 * Authorization-coverage guards (#488).
 *
 * Permission sets are **explicit-allow only**: an object that appears in no set
 * is permission-denied for every user, `system_admin` included, because the
 * object-level CRUD gate rejects the call before OWD, sharing rules or
 * `view_all_data` are ever consulted. Nothing in `os validate` or `os lint`
 * catches that — the platform's `security-master-detail-ungranted` warning only
 * fires for `master_detail` children, and every ungranted object in this app
 * reaches its parent through a `lookup`.
 *
 * The result shipped: "Knowledge" and "Forecasts" were nav items that 403'd for
 * everyone, the opportunity "Products" related list was denied for every
 * profile, quotes could not get line items, and `marketing_user` — the only
 * persona meant to run "Add to Campaign" — could not write the
 * `crm_campaign_member` rows that action inserts.
 *
 * These tests resolve the whole authorization surface (grants ↔ objects ↔
 * navigation ↔ pages ↔ sharing rules ↔ positions) so the next uncovered object
 * fails in CI instead of at a customer's first click.
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as any).objects ?? [];
const pages: AnyRec[] = (stack as any).pages ?? [];
const apps: AnyRec[] = (stack as any).apps ?? [];
const permissionSets: AnyRec[] = (stack as any).permissions ?? [];
const sharingRules: AnyRec[] = (stack as any).sharingRules ?? [];
const positions: AnyRec[] = (stack as any).positions ?? [];

const objectByName = new Map(objects.map((o) => [o.name as string, o]));
const positionNames = new Set(positions.map((p) => p.name as string));
const setByName = new Map(permissionSets.map((p) => [p.name as string, p]));

/** Business objects: everything this app authors (platform `sys_*` excluded). */
const businessObjects = objects
  .filter((o) => typeof o.name === 'string' && !o.name.startsWith('sys_'))
  .map((o) => o.name as string);

/** Audit/ownership columns the platform injects into every object at runtime. */
const SYSTEM_FIELDS = [
  'id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'owner_id', 'organization_id',
];

const fieldsOf = (objectName: string) => new Set([
  ...Object.keys(objectByName.get(objectName)?.fields ?? {}),
  ...SYSTEM_FIELDS,
]);

const owdOf = (objectName: string): string =>
  objectByName.get(objectName)?.sharingModel ?? 'private';

/** Does this grant open any door at all? Mirrors the platform's own check. */
const grantsAnyAccess = (perm: AnyRec = {}) =>
  perm.allowRead === true || perm.allowCreate === true || perm.allowEdit === true ||
  perm.allowDelete === true || perm.viewAllRecords === true || perm.modifyAllRecords === true;

/** Every (set, object, grant) triple, flattened. */
const grants = permissionSets.flatMap((ps) =>
  Object.entries((ps.objects ?? {}) as Record<string, AnyRec>).map(
    ([objectName, perm]) => ({ set: ps.name as string, objectName, perm: perm ?? {} }),
  ),
);

const setsGranting = (objectName: string, kind: 'any' | 'read' = 'any') =>
  grants
    .filter((g) => g.objectName === objectName)
    .filter((g) => (kind === 'read' ? g.perm.allowRead === true : grantsAnyAccess(g.perm)))
    .map((g) => g.set);

/** Walk an arbitrary metadata tree, yielding every node that has a `type`. */
function* walk(node: unknown): Generator<AnyRec> {
  if (Array.isArray(node)) {
    for (const item of node) yield* walk(item);
    return;
  }
  if (!node || typeof node !== 'object') return;
  const rec = node as AnyRec;
  if (typeof rec.type === 'string') yield rec;
  for (const value of Object.values(rec)) yield* walk(value);
}

/** Flatten the app's navigation tree to its leaf items. */
function* navItems(items: AnyRec[] = []): Generator<AnyRec> {
  for (const item of items) {
    if (Array.isArray(item.children)) yield* navItems(item.children);
    else yield item;
  }
}

describe('object-level CRUD coverage', () => {
  it('every business object is granted in at least one permission set', () => {
    const ungranted = businessObjects.filter((name) => setsGranting(name).length === 0);
    expect(
      ungranted,
      'objects with no grant in any permission set — denied for EVERY user, admins included:\n  ' +
        `${ungranted.join('\n  ')}`,
    ).toEqual([]);
  });

  it('system_admin covers every business object with full CRUD', () => {
    const admin = setByName.get('system_admin');
    expect(admin, 'the system_admin permission set is missing').toBeTruthy();
    const bad: string[] = [];
    for (const name of businessObjects) {
      const perm = (admin!.objects ?? {})[name];
      if (!perm) {
        bad.push(`${name}: not granted`);
        continue;
      }
      for (const flag of ['allowCreate', 'allowRead', 'allowEdit', 'allowDelete'] as const) {
        if (perm[flag] !== true) bad.push(`${name}: ${flag} is not true`);
      }
    }
    expect(bad, `system_admin gaps:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('every granted object name is a real object', () => {
    const bad = grants
      .filter((g) => !g.objectName.startsWith('sys_') && g.objectName !== '*')
      .filter((g) => !objectByName.has(g.objectName))
      .map((g) => `${g.set}: "${g.objectName}" is not a defined object`);
    expect(bad, `dangling grants:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});

describe('reachable UI is reachable for someone', () => {
  it('every object nav item is readable by at least one permission set', () => {
    const bad: string[] = [];
    for (const app of apps) {
      for (const item of navItems(app.navigation)) {
        if (item.type !== 'object') continue;
        const objectName = item.objectName as string;
        if (!objectName || objectName.startsWith('sys_')) continue;
        if (setsGranting(objectName, 'read').length === 0) {
          bad.push(`${app.name} / ${item.id}: "${objectName}" is readable by no permission set`);
        }
      }
    }
    expect(bad, `dead navigation (permission-denied for every user):\n  ${bad.join('\n  ')}`)
      .toEqual([]);
  });

  it('every related list is readable by every profile its page is assigned to', () => {
    const bad: string[] = [];
    for (const page of pages) {
      const assigned: string[] = page.assignedProfiles ?? [];
      if (assigned.length === 0) continue;
      for (const c of [...walk(page.regions), ...walk(page.slots)]) {
        if (c.type !== 'record:related_list') continue;
        const objectName = c.properties?.objectName as string;
        if (!objectName || objectName.startsWith('sys_')) continue;
        const readers = new Set(setsGranting(objectName, 'read'));
        for (const profile of assigned) {
          if (!readers.has(profile)) {
            bad.push(`${page.name} / ${c.id}: "${objectName}" is not readable by "${profile}"`);
          }
        }
      }
    }
    expect(bad, `related lists denied to their own page audience:\n  ${bad.join('\n  ')}`)
      .toEqual([]);
  });
});

describe('record-level scope is authored, not implied', () => {
  it('a private object granted read declares a readScope or viewAllRecords', () => {
    const bad = grants
      .filter((g) => objectByName.has(g.objectName) && owdOf(g.objectName) === 'private')
      .filter((g) => g.perm.allowRead === true)
      .filter((g) => g.perm.readScope == null && g.perm.viewAllRecords !== true)
      .map((g) => `${g.set}.${g.objectName}: private OWD, allowRead, no readScope`);
    expect(
      bad,
      'under-specified grants — holders silently see only records they own:\n  ' +
        `${bad.join('\n  ')}`,
    ).toEqual([]);
  });

  it('every allowTransfer grant is a real, enforced capability — not decoration', () => {
    // `allowTransfer` is the one lifecycle bit the platform enforces TODAY,
    // through the ordinary insert/update door rather than a future `transfer`
    // operation (`@objectstack/spec` permission.zod.ts, the #3004 owner_id
    // guard). Since #548 it is what stands between "reassign Owner" and
    // "silently move a record in the lists while moving no access", so the
    // grants are authored deliberately and pinned.
    //
    // The full per-persona ledger — who may transfer WHAT, and why the rep
    // personas hold none — lives in `test/ownership-model.test.ts` beside the
    // rest of the ownership model. Here it is checked as an authorization
    // invariant: a transfer grant is an ownership WRITE, so it is meaningless
    // (and misleading, because it reads as a capability) on an object the set
    // cannot write at all.
    const bad = grants
      .filter((g) => g.perm.allowTransfer === true)
      .filter((g) => g.perm.allowEdit !== true && g.perm.modifyAllRecords !== true)
      .map((g) => `${g.set}.${g.objectName}: allowTransfer with no write grant`);
    expect(bad, `transfer grants that can never fire:\n  ${bad.join('\n  ')}`).toEqual([]);

    // Guard the guard: if the grants ever vanish this test must not pass by
    // checking an empty list.
    const holders = grants.filter((g) => g.perm.allowTransfer === true);
    expect(holders.length, 'no set grants allowTransfer — ownership cannot be reassigned at all').toBeGreaterThan(0);
  });

  it('the lifecycle bits nobody enforces yet are not authored', () => {
    // `allowRestore` / `allowPurge` are RBAC-gated but their operations do not
    // exist yet, so authoring one grants nothing while reading as a capability
    // the persona has. `allowTransfer` is deliberately NOT in this list — it is
    // the documented exception (#3004), enforced now.
    const bad = grants
      .filter((g) => g.perm.allowRestore === true || g.perm.allowPurge === true)
      .map((g) => `${g.set}.${g.objectName}`);
    expect(bad, `declared-but-unenforced lifecycle grants:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('controlled_by_parent grants do not author an inert readScope', () => {
    // The sharing service applies owner scope to `private` objects only, so a
    // readScope on a parent-derived object is never enforced — it documents a
    // restriction the engine will not apply.
    const bad = grants
      .filter((g) => objectByName.has(g.objectName) && owdOf(g.objectName) === 'controlled_by_parent')
      .filter((g) => g.perm.readScope != null || g.perm.writeScope != null)
      .map((g) => `${g.set}.${g.objectName}: scope authored on a parent-derived object`);
    expect(bad, `inert scopes:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});

describe('field-level security resolves', () => {
  const flsEntries = permissionSets.flatMap((ps) =>
    Object.entries((ps.fields ?? {}) as Record<string, AnyRec>).map(
      ([key, perm]) => ({ set: ps.name as string, key, perm: perm ?? {} }),
    ),
  );

  it('every FLS key is object-qualified and names a real field', () => {
    const bad: string[] = [];
    for (const { set, key } of flsEntries) {
      // A bare key is silently ignored at runtime (the mask never enforces).
      if (!key.includes('.')) {
        bad.push(`${set}: "${key}" is not object-qualified`);
        continue;
      }
      const [objectName, fieldName] = key.split('.');
      if (!objectByName.has(objectName)) {
        bad.push(`${set}: "${key}" names unknown object "${objectName}"`);
        continue;
      }
      if (!fieldsOf(objectName).has(fieldName)) {
        bad.push(`${set}: "${key}" names unknown field "${fieldName}"`);
      }
    }
    expect(bad, `dangling field permissions:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('FLS is only authored for objects the same set can read', () => {
    const bad = flsEntries
      .filter(({ key }) => key.includes('.') && objectByName.has(key.split('.')[0]))
      .filter(({ set, key }) => !setsGranting(key.split('.')[0], 'read').includes(set))
      .map(({ set, key }) => `${set}: "${key}" — the set cannot read this object at all`);
    expect(bad, `orphan field permissions:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('a masked (unreadable) field is never filtered or sorted on by a view', () => {
    // Querying a hidden field throws `field_predicate_denied` (the filter-oracle
    // guard), so a masked field in a view's filter/sort breaks the whole list.
    const hidden = new Set(
      flsEntries.filter(({ perm }) => perm.readable === false).map(({ key }) => key),
    );
    if (hidden.size === 0) return;
    const views: AnyRec[] = (stack as any).views ?? [];
    const bad: string[] = [];
    for (const v of views) {
      const objectName = v.list?.data?.object ?? v.form?.data?.object ?? v.object;
      if (!objectName) continue;
      for (const node of walk(v)) {
        for (const f of node.filters ?? []) {
          const field = typeof f === 'string' ? f : f?.field;
          if (field && hidden.has(`${objectName}.${field}`)) {
            bad.push(`${v.name}: filters on masked field "${objectName}.${field}"`);
          }
        }
        for (const s of node.sort ?? []) {
          const field = typeof s === 'string' ? s : s?.field;
          if (field && hidden.has(`${objectName}.${field}`)) {
            bad.push(`${v.name}: sorts on masked field "${objectName}.${field}"`);
          }
        }
      }
    }
    expect(bad, `views that query a masked field:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});

describe('row-level security policies are enforceable', () => {
  const policies = permissionSets.flatMap((ps) =>
    ((ps.rowLevelSecurity ?? []) as AnyRec[]).map((policy) => ({ set: ps.name as string, policy })),
  );

  /**
   * The RLS compiler pre-resolves exactly these `current_user.*` variables; an
   * unknown one compiles to nothing and the policy fails CLOSED — every holder
   * of the set loses the object entirely.
   */
  const USER_VARS = new Set(['id', 'organization_id', 'positions', 'org_user_ids', 'email']);
  /** Operators the CEL → FilterCondition pushdown supports. */
  const CLAUSE = /^\s*([a-z_][a-z0-9_]*)\s*(==|!=|>=|<=|>|<|in)\s+(.+?)\s*$/;

  it('every policy targets an object the same set grants', () => {
    const bad = policies
      .filter(({ set, policy }) => !setsGranting(policy.object as string).includes(set))
      .map(({ set, policy }) => `${set}: policy "${policy.name}" targets ungranted "${policy.object}"`);
    expect(bad, `orphan RLS policies:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('every predicate is pushdownable and names real fields', () => {
    const bad: string[] = [];
    for (const { set, policy } of policies) {
      const objectName = policy.object as string;
      if (!objectByName.has(objectName)) {
        bad.push(`${set}/${policy.name}: unknown object "${objectName}"`);
        continue;
      }
      const known = fieldsOf(objectName);
      for (const raw of [policy.using, policy.check]) {
        if (!raw) continue;
        for (const clause of String(raw).split(/&&|\|\|/)) {
          const m = clause.trim().replace(/^\(+|\)+$/g, '').match(CLAUSE);
          if (!m) {
            bad.push(`${set}/${policy.name}: clause "${clause.trim()}" is not a pushdownable comparison`);
            continue;
          }
          const [, field, , rhs] = m;
          if (!known.has(field)) {
            bad.push(`${set}/${policy.name}: "${objectName}" has no field "${field}"`);
          }
          const userRef = rhs.match(/current_user\.([a-z_]+)/);
          if (userRef && !USER_VARS.has(userRef[1])) {
            bad.push(`${set}/${policy.name}: current_user.${userRef[1]} is not pre-resolved — fails closed`);
          }
        }
      }
    }
    expect(bad, `uncompilable RLS predicates (these DENY, they do not warn):\n  ${bad.join('\n  ')}`)
      .toEqual([]);
  });

  it('the first field of a `using` predicate exists (the engine drops the policy otherwise)', () => {
    // `extractTargetField` reads the leading `field ==|in` token; a field it
    // cannot find on the object drops the policy and the layer denies all rows.
    const bad: string[] = [];
    for (const { set, policy } of policies) {
      const target = String(policy.using ?? '').match(/^\s*([a-z_][a-z0-9_]*)\s*(?:==|=|IN|in)(?=\s|\()/);
      if (!target) continue;
      if (!fieldsOf(policy.object as string).has(target[1])) {
        bad.push(`${set}/${policy.name}: leading field "${target[1]}" is not on "${policy.object}"`);
      }
    }
    expect(bad, `policies the engine would drop (→ deny-all):\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});

describe('sharing rules and positions line up', () => {
  it('every sharing rule names a real object, position and fields', () => {
    const bad: string[] = [];
    for (const rule of sharingRules) {
      const objectName = rule.object as string;
      if (!objectByName.has(objectName)) {
        bad.push(`${rule.name}: unknown object "${objectName}"`);
        continue;
      }
      if (rule.sharedWith?.type === 'position' && !positionNames.has(rule.sharedWith.value)) {
        bad.push(`${rule.name}: unknown position "${rule.sharedWith.value}"`);
      }
      const source: string = rule.condition?.source ?? '';
      const known = fieldsOf(objectName);
      for (const [, field] of source.matchAll(/record\.([a-z_][a-z0-9_]*)/g)) {
        if (!known.has(field)) bad.push(`${rule.name}: "${objectName}" has no field "${field}"`);
      }
    }
    expect(bad, `dangling sharing-rule references:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('a sharing rule only targets an object whose OWD lets shares apply', () => {
    // What a share can add depends on the baseline it sits on:
    //   private     → read is owner-only, writes are owner-only → both apply.
    //   public_read → read is already open, but writes stay owner-or-share
    //                 gated → only edit/full shares add anything.
    //   public_read_write / controlled_by_parent → the sharing service treats
    //                 them as fully open and never consults a share row.
    const bad: string[] = [];
    for (const rule of sharingRules) {
      if (!objectByName.has(rule.object)) continue;
      const owd = owdOf(rule.object as string);
      const level = rule.accessLevel ?? 'read';
      if (owd === 'private') continue;
      if (owd === 'public_read' && level !== 'read') continue;
      bad.push(
        `${rule.name}: a '${level}' share on ${owd} "${rule.object}" adds nothing — the engine never reads it`,
      );
    }
    expect(bad, `inert sharing rules:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  /**
   * The triage grant is AUTHORED, not implied (#1096).
   *
   * `service_agent` holds `crm_case` with `readScope: 'own'`, and an unowned row
   * matches nobody's own-scope — so the `Unassigned — triage` view #596 pinned
   * in every Cases list returned zero rows for the persona it was built for.
   * `case_unassigned_triage_sharing` is the ruled fix, and this block is the
   * reason the widening cannot be lost silently: a permission grant nobody
   * asserts is a grant nobody notices losing.
   *
   * What is pinned here is the DECLARED shape — the object, the criteria, the
   * access level and the recipient. What it delivers on a running engine, on
   * both the sparse (absent-key) and column-complete (NULL) row shapes, is
   * measured in `test/unassigned-case-triage-reach.test.ts`; that it survives
   * `plugin-sharing`'s CEL→filter compiler at all is pinned in
   * `test/sharing-seeding.test.ts`.
   */
  describe('#1096: unowned open cases reach the agents who triage them', () => {
    const rule = () => sharingRules.find((r) => r.name === 'case_unassigned_triage_sharing');

    it('the rule exists, on crm_case, granting edit to the service_agent position', () => {
      const r = rule();
      expect(
        r,
        'case_unassigned_triage_sharing is gone — the Unassigned — triage tab is empty again ' +
          'for the only persona it is pinned for (#1096)',
      ).toBeDefined();
      expect(r!.object).toBe('crm_case');
      expect(r!.type).toBe('criteria');
      // `edit`, not `read`: triage is a pull queue, and an agent who cannot
      // write the row cannot work it.
      expect(r!.accessLevel).toBe('edit');
      expect(r!.sharedWith).toEqual({ type: 'position', value: 'service_agent' });
    });

    it('its criteria is exactly "unowned AND live work" — both halves, and nothing wider', () => {
      // Asserted verbatim, because every token is load-bearing and each fails
      // differently: drop `owner_id == null` and the rule shares the whole case
      // table with every agent (option C by accident); drop the status clause
      // and finished work joins the backlog, so the tab's row count stops
      // meaning "work waiting for a human"; and `!= null` in place of
      // `== null` inverts the grant into precisely the leak acceptance #2
      // forbids.
      //
      // ⚠️ The second half is `status`, not `is_closed` (#1145), and that made
      // this grant NARROWER: `is_closed` is derived as `status === 'closed'`
      // and never flips on `resolved`, so the old spelling handed every agent
      // `edit` on every resolved ownerless case forever. The set is
      // `CLOSED_CASE_STATUSES`, shared with the load-balancing hooks and
      // `case_sla_monitor`; `test/live-work-predicate-parity.test.ts` holds all
      // five consumers to it by name.
      //
      // The `!=` chain rather than `!(record.status in [...])` is measured, not
      // stylistic — the membership form lowers to a top-level `$not` wrapping
      // an `$in`, which is not in the operator matrix at the head of
      // `test/sharing-seeding.test.ts`, and an uncompilable or unexecutable
      // sharing condition is DROPPED silently rather than failing loudly.
      expect(String(rule()!.condition?.source ?? '')).toBe(
        'record.owner_id == null && record.status != "resolved" && record.status != "closed"',
      );
    });

    it('carries NO has() guard — one would make it untranslatable and silently unseeded', () => {
      // ⚠️ The inverse of the house rule, and deliberate. AGENTS.md's totality
      // rule (#630) governs the INTERPRETED CEL surfaces; a sharing condition is
      // compiled to a pushdown filter instead, and `compileCelToFilter` rejects
      // the whole function-call class — so a guard here would make the rule
      // undeployable rather than safe (#621's defect, reintroduced). Totality is
      // answered by the operator: `== null` lowers to `{ $null: true }`, which
      // reads an absent key and a NULL column alike.
      expect(String(rule()!.condition?.source ?? '')).not.toMatch(/\bhas\s*\(/);
    });

    it('the widening is a SHARING rule — the profile stays own-scoped', () => {
      // The other half of "authored, not implied": option C (`viewAllRecords`
      // on the profile) was rejected on sight and stays rejected, so if it ever
      // arrives this fails rather than passing quietly alongside the rule.
      const perm = (setByName.get('service_agent')?.objects ?? {}).crm_case ?? {};
      expect(perm.readScope, 'service_agent.crm_case stopped being own-scoped').toBe('own');
      expect(
        perm.viewAllRecords,
        'service_agent gained viewAllRecords on crm_case — that is #1096 option C, which hands ' +
          "every agent every customer's entire case history to solve a null-owner problem",
      ).toBe(false);
      expect(perm.modifyAllRecords).toBe(false);
    });
  });

  it('every position is referenced by a sharing rule or a permission set', () => {
    const referenced = new Set<string>();
    for (const rule of sharingRules) {
      if (rule.sharedWith?.type === 'position') referenced.add(rule.sharedWith.value);
      if (rule.ownedBy?.type === 'position') referenced.add(rule.ownedBy.value);
    }
    for (const ps of permissionSets) {
      for (const policy of (ps.rowLevelSecurity ?? []) as AnyRec[]) {
        for (const p of policy.positions ?? []) referenced.add(p);
      }
      // A set whose name matches a position is bound to it at install time.
      if (positionNames.has(ps.name)) referenced.add(ps.name);
    }
    const orphans = [...positionNames].filter((p) => !referenced.has(p));
    expect(
      orphans,
      `positions nothing references — they grant nothing to whoever holds them:\n  ${orphans.join('\n  ')}`,
    ).toEqual([]);
  });
});

describe('#488 regressions stay fixed', () => {
  const canRead = (set: string, objectName: string) =>
    (setByName.get(set)?.objects ?? {})[objectName]?.allowRead === true;
  const canWrite = (set: string, objectName: string) => {
    const perm = (setByName.get(set)?.objects ?? {})[objectName] ?? {};
    return perm.allowCreate === true && perm.allowEdit === true;
  };

  it('Knowledge is readable by service agents and authored by them', () => {
    expect(canRead('service_agent', 'crm_knowledge_article')).toBe(true);
    expect(canWrite('service_agent', 'crm_knowledge_article')).toBe(true);
  });

  it('Forecasts are readable by reps (own) and by sales managers (org-wide)', () => {
    expect(canRead('sales_rep', 'crm_forecast')).toBe(true);
    expect((setByName.get('sales_rep')!.objects as AnyRec).crm_forecast.readScope).toBe('own');
    expect(canRead('sales_manager', 'crm_forecast')).toBe(true);
    expect((setByName.get('sales_manager')!.objects as AnyRec).crm_forecast.viewAllRecords).toBe(true);
  });

  it('reps can build opportunity and quote line items', () => {
    expect(canWrite('sales_rep', 'crm_opportunity_line_item')).toBe(true);
    expect(canWrite('sales_rep', 'crm_quote_line_item')).toBe(true);
  });

  it('"Add to Campaign" is writable by the profile that owns the action', () => {
    // src/actions/lead.actions.ts inserts crm_campaign_member rows.
    expect(canWrite('marketing_user', 'crm_campaign_member')).toBe(true);
  });

  it('guests still read nothing, including the newly granted objects', () => {
    const guest = setByName.get('guest_portal')!;
    const readable = Object.entries(guest.objects as Record<string, AnyRec>)
      .filter(([, perm]) => perm.allowRead === true || perm.viewAllRecords === true)
      .map(([name]) => name);
    expect(readable, 'the guest set must stay INSERT-only').toEqual([]);
  });
});

/**
 * `allowExport` coverage — the opt-in bulk-egress axis (@objectstack 17, #3544).
 *
 * 17.0 inverted this bit's default: unset used to inherit read, so the axis
 * only hid a button; now `resolveUserExportAllowed` (plugin-security) demands
 * an explicit `allowExport: true` and neither `viewAllRecords` nor
 * `modifyAllRecords` substitutes. Unset DENIES.
 *
 * The gate sits on ONE route — `GET /api/v1/data/:object/export`, via
 * `enforceExportPermission` → `security.canExport` (`@objectstack/rest`).
 * Measured on a dev server in #798: 200 + rows for a principal holding the
 * grant, 403 `EXPORT_NOT_PERMITTED` for one without it. A list view's
 * `exportOptions` is not a separate door — the toolbar's Export button calls
 * that same route, so the bit is object-wide and `curl`-reachable.
 * `ReportService.assertExportAllowed` is a second gate, but it lives in the
 * `reports` capability this app does not require (`/api/v1/reports` → 501),
 * so no grant here lands on it.
 *
 * That makes an unauthored export bit a SILENT outage: `os validate`, `os
 * build` and every metadata test still pass while the Export button 403s for
 * every user, admins included. Nothing else in this suite would catch it,
 * because the grant is well-formed — it just isn't there.
 *
 * The rule these guards pin (canonical note: `src/profiles/index.ts`):
 * a profile grants `allowExport` on an object IFF it already holds `allowRead`
 * there AND a list view for that object declares `exportOptions`. Both
 * directions matter — a surface nobody can use is the outage, and a grant
 * behind no surface is bulk egress nobody asked for. That union is an
 * authoring discipline about the affordances this app ships; whether the grant
 * can be exercised at all is the separate `enable` question, pinned by the
 * last guard below.
 *
 * #817 made the surface side one-to-one: `exportOptions` on a list view is now
 * the ONLY thing that counts as a surface. It used to also count "a report
 * over a dataset built on the object", which named a door that #798 measured
 * shut — see the note on `exportSurfaces` below.
 */
describe('allowExport tracks the app’s real export surfaces', () => {
  const views: AnyRec[] = (stack as any).views ?? [];

  /**
   * Objects with a bulk-egress door: a list view declaring `exportOptions`.
   *
   * A report is NOT one, and this used to say it was. #798 measured the
   * Console's report page on a running server: it renders a chart and a data
   * table and offers no download at all, and `ReportService`'s own export gate
   * belongs to the `reports` capability this app does not require. So the
   * report leg named surfaces that do not exist — and it named them in the
   * direction that hurts, because the guard below turns a surface into a
   * REQUIRED grant: a new report over, say, `crm_task` would have made this
   * suite demand bulk egress on `crm_task`, which is precisely the
   * over-granting the axis exists to prevent.
   *
   * Dropping the leg costs no coverage: `crm_case` was the only object it
   * carried alone, and #817 gave the Cases list its own `exportOptions`, so
   * the union is unchanged at `crm_account`, `crm_case`, `crm_contact`,
   * `crm_lead`, `crm_opportunity` — now every one of them by an affordance a
   * user can actually click.
   */
  const exportSurfaces = new Set<string>();
  for (const v of views) {
    const defaultObject = v.list?.data?.object;
    for (const list of [v.list, ...Object.values(v.listViews ?? {})].filter(Boolean) as AnyRec[]) {
      // `.formats`, not the value itself. `exportOptions` is the OBJECT form
      // `{ formats: [...] }` at @objectstack/spec 17.0.0 (#8010, maintainer
      // ruling 2026-08-12); the bare array this app authored through
      // 17.0.0-rc.6 is the legacy `z.input` spelling and LIFTS to the object
      // at parse, so `z.output` — which is what `stack.views` hands us here —
      // is the object on both spellings.
      //
      // Reading the old way is not a stale assertion, it is a BLIND one, and
      // silently: `({ formats: [...] }).length` is `undefined`, `??` never
      // fires because the object is not nullish, and every surface in the app
      // fell out of this set at once. Both guards below invert on an empty
      // set — "no surface" makes every `allowExport` grant look gratuitous —
      // so the 17.0.0 bump turned a bulk-egress guard into 23 false accusals
      // rather than into silence. Only the `not.toEqual([])` canary above
      // separates the two, which is exactly why it is written.
      if (!(list.exportOptions?.formats ?? []).length) continue;
      const objectName = list.data?.object ?? defaultObject;
      if (typeof objectName === 'string') exportSurfaces.add(objectName);
    }
  }

  /** `[setName, objectName]` for every grant carrying the export bit. */
  const exportGrants: Array<[string, string, AnyRec]> = permissionSets.flatMap((ps) =>
    Object.entries((ps.objects ?? {}) as Record<string, AnyRec>)
      .filter(([, perm]) => perm.allowExport === true)
      .map(([objectName, perm]) => [ps.name as string, objectName, perm] as [string, string, AnyRec]),
  );

  it('the app actually has export surfaces (the guard is wired to real metadata)', () => {
    expect(
      [...exportSurfaces].sort(),
      'no list view declares exportOptions — this guard has gone blind',
    ).not.toEqual([]);
  });

  it('every export surface is reachable by at least one profile', () => {
    const stranded = [...exportSurfaces]
      .filter((objectName) => !exportGrants.some(([, granted]) => granted === objectName))
      .map((objectName) => `${objectName}: has an export surface, but no permission set grants allowExport`);
    expect(stranded, `export surfaces nobody can use:\n  ${stranded.join('\n  ')}`).toEqual([]);
  });

  it('no profile grants export on an object with no export surface', () => {
    const gratuitous = exportGrants
      .filter(([, objectName]) => !exportSurfaces.has(objectName))
      .map(([set, objectName]) => `${set}.${objectName}: allowExport with no export surface behind it`);
    expect(gratuitous, `undeclared bulk egress:\n  ${gratuitous.join('\n  ')}`).toEqual([]);
  });

  it('export never outruns read — the axis widens egress, never visibility', () => {
    const bad = exportGrants
      .filter(([, , perm]) => perm.allowRead !== true)
      .map(([set, objectName]) => `${set}.${objectName}: allowExport without allowRead`);
    expect(bad, `export grants with no read behind them:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('the guest set carries no export bit (ADR-0090 D9 anchor rule)', () => {
    // `allowExport` is high-privilege: a set holding it cannot bind to the
    // `everyone` or `guest` anchors at all, so granting it here would break the
    // binding on top of handing anonymous visitors bulk table egress.
    const guestExports = exportGrants.filter(([set]) => set === 'guest_portal').map(([, o]) => o);
    expect(guestExports, 'the guest set must never carry allowExport').toEqual([]);
  });

  /**
   * Reachability, which the three guards above deliberately do not answer.
   *
   * They pin the AUTHORING discipline — grant export only where the app ships
   * an affordance for it. This one pins that the grant can be exercised at
   * all: the object's own `enable` block must leave `export` on the API, or
   * `GET /api/v1/data/:object/export` answers 405 `OBJECT_API_METHOD_NOT_ALLOWED`
   * before `security.canExport` is ever consulted, and the grant is inert no
   * matter how well authored.
   *
   * Decided with the platform's own resolver rather than a hand-rolled reading
   * of `apiMethods`, because the two disagree in a way that matters: an
   * `apiMethods: ['get','list','create','update','delete']` whitelist reads as
   * "no export", but `resolveEffectiveApiMethods` expands a restricted CRUD
   * list to include `export`/`import`/`aggregate`/`search`/`upsert` — which is
   * why `crm_account` and `crm_opportunity` export fine today despite the
   * whitelist. A guard that judged the raw array would fail four objects for a
   * hazard that does not exist, so it asks the same functions the REST layer
   * calls (`@objectstack/rest` `apiAccessDenialFromEnable`).
   *
   * #798 is why this exists: the issue reasoned that `crm_case`'s grant landed
   * on a surface that was not there, and nothing in this suite could answer.
   * Measured on a dev server, the grant is live (200 with it, 403 without) —
   * but the question was a fair one to ask and now has a guard behind it.
   */
  it('every object carrying allowExport actually exposes export on the API', () => {
    const inert = exportGrants
      .filter(([, objectName]) => {
        const enable = objectByName.get(objectName)?.enable;
        if (!enable) return false; // no `enable` block ⇒ unrestricted
        if (enable.apiEnabled === false) return true;
        const effective = resolveEffectiveApiMethods(enable);
        const canonical = DATA_ACTION_TO_API_OPERATION.export ?? 'export';
        return !isApiOperationAllowed(effective, canonical);
      })
      .map(([set, objectName]) => `${set}.${objectName}: allowExport granted, but the object's enable block blocks the export route`);
    expect(
      inert,
      `export grants the API can never serve:\n  ${inert.join('\n  ')}`,
    ).toEqual([]);
  });
});
