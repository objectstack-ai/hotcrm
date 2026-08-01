// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
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

  it('controlled_by_parent objects expose a parent the engine can resolve', () => {
    const bad: string[] = [];
    for (const name of businessObjects) {
      if (owdOf(name) !== 'controlled_by_parent') continue;
      const fields = Object.entries((objectByName.get(name)?.fields ?? {}) as Record<string, AnyRec>);
      const parent = fields.find(([, f]) => f?.type === 'master_detail')
        ?? fields.find(([, f]) => f?.type === 'lookup' && f?.required === true);
      if (!parent) {
        bad.push(`${name}: no master_detail and no REQUIRED lookup — ADR-0055 derivation denies all rows`);
        continue;
      }
      const [fieldName, def] = parent;
      const ref = def.reference ?? def.reference_to ?? def.referenceTo;
      if (!ref) bad.push(`${name}.${fieldName}: parent relation has no reference target`);
    }
    expect(bad, `unresolvable parent derivation:\n  ${bad.join('\n  ')}`).toEqual([]);
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
 * `modifyAllRecords` substitutes. Unset DENIES, at both bulk-egress doors —
 * the list views' built-in `exportOptions`, and `assertExportAllowed`, which
 * fails a report export closed with `EXPORT_NOT_PERMITTED`.
 *
 * That makes an unauthored export bit a SILENT outage: `os validate`, `os
 * build` and every metadata test still pass while the Export button 403s for
 * every user, admins included. Nothing else in this suite would catch it,
 * because the grant is well-formed — it just isn't there.
 *
 * The rule these guards pin (canonical note: `src/profiles/index.ts`):
 * a profile grants `allowExport` on an object IFF it already holds `allowRead`
 * there AND the app ships an export surface for it. Both directions matter —
 * a surface nobody can use is the outage, and a grant behind no surface is
 * bulk egress nobody asked for.
 */
describe('allowExport tracks the app’s real export surfaces', () => {
  const datasetByName = new Map<string, AnyRec>(
    ((stack as any).datasets ?? []).map((d: AnyRec) => [d.name as string, d] as [string, AnyRec]),
  );
  const views: AnyRec[] = (stack as any).views ?? [];
  const reports: AnyRec[] = (stack as any).reports ?? [];

  /** Every `dataset:` reference anywhere in a report, including `blocks[]`. */
  const datasetRefsIn = (node: unknown, out: string[] = []): string[] => {
    if (Array.isArray(node)) node.forEach((n) => datasetRefsIn(n, out));
    else if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node as AnyRec)) {
        if (k === 'dataset' && typeof v === 'string') out.push(v);
        else datasetRefsIn(v, out);
      }
    }
    return out;
  };

  /**
   * Objects with a bulk-egress door: a list view declaring `exportOptions`,
   * or a report whose dataset is built on them.
   */
  const exportSurfaces = new Set<string>();
  for (const v of views) {
    const defaultObject = v.list?.data?.object;
    for (const list of [v.list, ...Object.values(v.listViews ?? {})].filter(Boolean) as AnyRec[]) {
      if (!(list.exportOptions ?? []).length) continue;
      const objectName = list.data?.object ?? defaultObject;
      if (typeof objectName === 'string') exportSurfaces.add(objectName);
    }
  }
  for (const r of reports) {
    for (const ref of datasetRefsIn(r)) {
      const objectName = datasetByName.get(ref)?.object;
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
      'no exportOptions view and no report dataset resolved — this guard has gone blind',
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
});
