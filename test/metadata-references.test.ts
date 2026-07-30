// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { isDateMacroToken } from '@objectstack/spec/data';
import stack from '../objectstack.config';

/**
 * Dangling-reference guards for UI metadata.
 *
 * `os validate` / `build` check metadata SHAPE — that a page declares a
 * `relationshipField`, that a view section lists `fields` — but never that the
 * named field, object, or profile actually exists. Every reference below was a
 * real defect found by clicking through the app, and each failed silently: the
 * related list rendered "0", the form section rendered blank, the profile
 * assignment matched nobody. Nothing errored, so nothing was noticed.
 *
 * These tests resolve every UI reference against the objects/profiles the app
 * really defines, so the next bad name fails in CI instead of in a demo.
 */

type AnyRec = Record<string, any>;
const objects: AnyRec[] = (stack as any).objects ?? [];
const pages: AnyRec[] = (stack as any).pages ?? [];
const views: AnyRec[] = (stack as any).views ?? [];
const profiles: AnyRec[] = (stack as any).permissions ?? [];

const objectNames = new Set(objects.map((o) => o.name));
const profileNames = new Set(profiles.map((p) => p.name));

/**
 * Audit columns the platform adds to every object. They are real at runtime
 * (`?sort=created_at desc` works) but never appear in the authored `fields`
 * map, so a reference to one is legitimate.
 */
const SYSTEM_FIELDS = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by'];

/**
 * System objects the installed platform plugins actually register, verified
 * against the 16.1.0 bundles in node_modules:
 *   - @objectstack/platform-objects — sys_user, sys_email, sys_file, … (the
 *     large core set; only the ones app metadata references are listed here)
 *   - @objectstack/plugin-approvals — sys_approval, sys_approval_request,
 *     sys_approval_action, … (note: there is NO `sys_approval_process`)
 *   - the activity/comment timeline objects used by `record:activity` and the
 *     log_call / log_meeting actions
 * A reference to a `sys_*` name outside this set matches nothing at runtime.
 */
const PLATFORM_OBJECTS = new Set([
  'sys_user',
  'sys_organization',
  'sys_team',
  'sys_email',
  'sys_email_template',
  'sys_file',
  'sys_attachment',
  'sys_notification',
  'sys_inbox_message',
  'sys_activity',
  'sys_comment',
  'sys_approval',
  'sys_approval_request',
  'sys_approval_action',
  'sys_approval_approver',
  'sys_approval_delegation',
]);

const fieldsOf = (obj: string) => [
  ...Object.keys(objects.find((o) => o.name === obj)?.fields ?? {}),
  ...SYSTEM_FIELDS,
];

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

describe('page component references resolve', () => {
  const components = pages.flatMap((p) => [...walk(p.regions), ...walk(p.slots)]);

  it('every record:related_list names a real object and a real relationship field', () => {
    const bad: string[] = [];
    for (const c of components) {
      if (c.type !== 'record:related_list') continue;
      const objectName = c.properties?.objectName;
      const relField = c.properties?.relationshipField;
      if (!objectNames.has(objectName)) {
        bad.push(`${c.id}: objectName "${objectName}" is not a defined object`);
        continue;
      }
      if (relField && !fieldsOf(objectName).includes(relField)) {
        bad.push(`${c.id}: "${objectName}" has no field "${relField}"`);
      }
    }
    expect(bad, `dangling related-list references:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('every related-list column is a real field on its object', () => {
    const bad: string[] = [];
    for (const c of components) {
      if (c.type !== 'record:related_list') continue;
      const objectName = c.properties?.objectName;
      if (!objectNames.has(objectName)) continue; // covered by the test above
      const known = fieldsOf(objectName);
      for (const col of c.properties?.columns ?? []) {
        const name = typeof col === 'string' ? col : col?.field;
        if (name && !known.includes(name)) {
          bad.push(`${c.id}: "${objectName}" has no column "${name}"`);
        }
      }
    }
    expect(bad, `dangling related-list columns:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('record:activity only lists object types this app defines', () => {
    const bad: string[] = [];
    for (const c of components) {
      if (c.type !== 'record:activity') continue;
      for (const t of c.properties?.types ?? []) {
        if (!objectNames.has(t)) bad.push(`${c.id}: activity type "${t}" is not a defined object`);
      }
    }
    expect(bad, `dangling activity types:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('record:details / record:highlights / record:path only name real fields on the page object', () => {
    const bad: string[] = [];
    for (const page of pages) {
      if (!page.object || !objectNames.has(page.object)) continue;
      const known = fieldsOf(page.object);
      for (const c of [...walk(page.regions), ...walk(page.slots)]) {
        const named: string[] = [];
        if (c.type === 'record:highlights') named.push(...(c.properties?.fields ?? []));
        if (c.type === 'record:details') {
          for (const s of c.properties?.sections ?? []) named.push(...(s.fields ?? []));
        }
        if (c.type === 'record:path' && c.properties?.statusField) {
          named.push(c.properties.statusField);
        }
        for (const f of named) {
          if (typeof f === 'string' && !known.includes(f)) {
            bad.push(`${page.name} / ${c.id}: "${page.object}" has no field "${f}"`);
          }
        }
      }
    }
    expect(bad, `dangling record-component fields:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('record:path stages are real options of the status field', () => {
    const bad: string[] = [];
    for (const page of pages) {
      if (!page.object || !objectNames.has(page.object)) continue;
      const objDef = objects.find((o) => o.name === page.object);
      for (const c of [...walk(page.regions), ...walk(page.slots)]) {
        if (c.type !== 'record:path') continue;
        const statusField = c.properties?.statusField;
        const options = objDef?.fields?.[statusField]?.options ?? [];
        if (!options.length) continue;
        const values = new Set(options.map((o: AnyRec) => o.value));
        for (const stage of c.properties?.stages ?? []) {
          if (!values.has(stage.value)) {
            bad.push(`${page.name}: path stage "${stage.value}" is not an option of ${statusField}`);
          }
        }
      }
    }
    expect(bad, `dangling path stages:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('assignedProfiles name real profiles', () => {
    const bad: string[] = [];
    for (const page of pages) {
      for (const p of page.assignedProfiles ?? []) {
        if (!profileNames.has(p)) bad.push(`${page.name}: profile "${p}" is not defined`);
      }
    }
    expect(bad, `dangling profile assignments:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});

describe('view field references resolve', () => {
  /** Views are keyed by object; `defineView` output carries the object on its data provider. */
  const viewObjectOf = (v: AnyRec): string | undefined =>
    v.list?.data?.object ?? v.form?.data?.object ?? v.object;

  it('every form section field is a real field on the view object', () => {
    const bad: string[] = [];
    for (const v of views) {
      const objectName = viewObjectOf(v);
      if (!objectName || !objectNames.has(objectName)) continue;
      const known = fieldsOf(objectName);
      // The default `form` plus every named form under `formViews`. (The
      // container key is `formViews` — iterating a non-existent `forms` key
      // silently skipped every named form view.)
      const forms = [v.form, ...Object.values(v.formViews ?? {})].filter(Boolean) as AnyRec[];
      for (const form of forms) {
        for (const section of form.sections ?? []) {
          for (const f of section.fields ?? []) {
            const name = typeof f === 'string' ? f : f?.field;
            if (name && !known.includes(name)) {
              bad.push(`${objectName} form "${form.name ?? 'default'}": no field "${name}"`);
            }
          }
        }
      }
    }
    expect(bad, `dangling form fields:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('every list sort targets a real field', () => {
    const bad: string[] = [];
    for (const v of views) {
      const objectName = viewObjectOf(v);
      if (!objectName || !objectNames.has(objectName)) continue;
      const known = fieldsOf(objectName);
      // The container key is `listViews` — iterating a non-existent `views`
      // key silently skipped every named list view.
      const lists = [v.list, ...Object.values(v.listViews ?? {})].filter(Boolean) as AnyRec[];
      for (const list of lists) {
        for (const s of list.sort ?? []) {
          if (s.field && !known.includes(s.field)) {
            bad.push(`${objectName} view "${list.name ?? 'default'}": sorts on missing "${s.field}"`);
          }
        }
      }
    }
    expect(bad, `dangling sort fields:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});

describe('priority queues sort by urgency, not alphabetically', () => {
  /**
   * `priority desc` on the select itself compares the raw option strings, so
   * cases came back medium > low > high > critical — the exact inversion of
   * urgency. Queue views must sort on the materialised `priority_rank`.
   */
  const rankedObjects = ['crm_case', 'crm_task'];

  it.each(rankedObjects)('%s defines a numeric priority_rank', (objectName) => {
    const field = objects.find((o) => o.name === objectName)?.fields?.priority_rank;
    expect(field, `${objectName}.priority_rank missing`).toBeTruthy();
    expect(field.type).toBe('number');
  });

  it('no view sorts on the raw priority select', () => {
    const bad: string[] = [];
    for (const v of views) {
      const lists = [v.list, ...Object.values(v.listViews ?? {})].filter(Boolean) as AnyRec[];
      for (const list of lists) {
        for (const s of list.sort ?? []) {
          if (s.field === 'priority') {
            bad.push(`view "${list.name ?? list.label ?? 'default'}" sorts on raw priority`);
          }
        }
      }
    }
    expect(bad, `${bad.join('\n  ')}`).toEqual([]);
  });
});

describe('navigation reaches everything the app ships', () => {
  const apps: AnyRec[] = (stack as any).apps ?? [];
  const dashboards: AnyRec[] = (stack as any).dashboards ?? [];
  const reports: AnyRec[] = (stack as any).reports ?? [];

  /** Flatten the (possibly nested) navigation tree. */
  const navNodes = (app: AnyRec): AnyRec[] =>
    (app.navigation ?? []).flatMap(function walk(n: AnyRec): AnyRec[] {
      return [n, ...(n.children ?? []).flatMap(walk)];
    });
  const allNodes = apps.flatMap(navNodes);

  it('every nav entry points at something that exists', () => {
    const dashboardNames = new Set(dashboards.map((d) => d.name));
    const reportNames = new Set(reports.map((r) => r.name));
    const bad: string[] = [];
    for (const n of allNodes) {
      // `sys_*` are platform objects the app legitimately links to, but only
      // ones an installed plugin actually registers. A `requiresObject` guard
      // hides the item gracefully when a plugin is absent — it does not
      // legitimise pointing at an object NO installed plugin ever registers
      // (`sys_approval_process` was permanent dead weight: the guard hid it on
      // every install, forever).
      if (n.objectName && n.objectName.startsWith('sys_')) {
        if (!PLATFORM_OBJECTS.has(n.objectName)) {
          bad.push(`${n.id}: system object "${n.objectName}" is not registered by any installed plugin`);
        }
      } else if (n.objectName && !objectNames.has(n.objectName)) {
        bad.push(`${n.id}: object "${n.objectName}" is not defined`);
      }
      if (n.dashboardName && !dashboardNames.has(n.dashboardName)) {
        bad.push(`${n.id}: dashboard "${n.dashboardName}" is not defined`);
      }
      if (n.reportName && !reportNames.has(n.reportName)) {
        bad.push(`${n.id}: report "${n.reportName}" is not defined`);
      }
    }
    expect(bad, `dangling navigation targets:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('no user-facing object is stranded without a way to reach it', () => {
    // Campaigns, Contracts, Products, Forecasts and Tasks each shipped with
    // views, seed data and automation — and no entry point. The only way to
    // see a task was to open the record it hung off.
    const reachable = new Set(allNodes.map((n) => n.objectName).filter(Boolean));
    const stranded = objects
      .map((o) => o.name)
      .filter((name: string) =>
        // Line items and junctions are edited inside their parent, never
        // reached on their own.
        !/_line_item$|_member$/.test(name) && !reachable.has(name));
    expect(stranded, `objects with no navigation entry:\n  ${stranded.join('\n  ')}`).toEqual([]);
  });

  it('every dashboard is reachable', () => {
    const reachable = new Set(allNodes.map((n) => n.dashboardName).filter(Boolean));
    const stranded = dashboards.map((d) => d.name).filter((n: string) => !reachable.has(n));
    expect(stranded, `dashboards nobody can open:\n  ${stranded.join('\n  ')}`).toEqual([]);
  });

  it('widgets that window the dateRange field opt out of the injected date range', () => {
    // The runtime injects the dashboard-level dateRange into every widget
    // query (framework#2501) unless the widget opts out via `filterBindings`.
    // A widget that carries its OWN window on the same field gets the two
    // ANDed: the Executive "Total Revenue (YTD)" tile silently showed
    // this-quarter revenue (781k instead of the year's 2.6M), and the
    // "last 12 months" trend chart collapsed to the current quarter's points.
    // Self-described windows ("YTD", "QTD", "last 12 months") must not follow
    // the picker — their titles don't.
    const bad: string[] = [];
    for (const d of dashboards) {
      const rangeField = d.dateRange?.field;
      if (!rangeField) continue;
      for (const w of d.widgets ?? []) {
        if (w.filter?.[rangeField] === undefined) continue;
        if (w.filterBindings?.dateRange !== false) {
          bad.push(`${d.name}/${w.id}: filters on "${rangeField}" but still binds the dashboard dateRange`);
        }
      }
    }
    expect(bad, `widgets fighting the dashboard date picker:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('every navigation node has a zh-CN label', () => {
    // The groups were translated and the leaves were not, so the sidebar read
    // half Chinese, half English.
    const translations: AnyRec[] = (stack as any).translations ?? [];
    const zh = translations.find((t) => t.locale === 'zh-CN' || t.name === 'zh-CN');
    if (!zh) return; // no zh bundle in this build — nothing to assert
    const bad: string[] = [];
    for (const app of apps) {
      const nav = zh.data?.apps?.[app.name]?.navigation ?? zh.apps?.[app.name]?.navigation ?? {};
      for (const n of navNodes(app)) {
        if (n.id && !nav[n.id]?.label) bad.push(`${app.name}/${n.id}`);
      }
    }
    expect(bad, `navigation nodes with no zh-CN label:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});

describe('filter template tokens are resolvable', () => {
  /**
   * Token support differs per data path, verified empirically against the
   * running 16.1.0 console (2026-07-28):
   *
   * - LIST-VIEW data path (`/api/v1/data/...`): resolves ONLY the user tokens
   *   (`{current_user_id}`). Date macros ship to the server as literal
   *   strings — and because `'2026-…' < '{…'` is lexicographically TRUE, a
   *   `< {180_days_ago}` filter matched freshly-reviewed articles (inverted
   *   semantics, not just empty results). Use operator-only filters + sort.
   *
   * - ANALYTICS path (dashboard widgets / dataset reports,
   *   `/api/v1/analytics/...`): resolves the DATE_MACRO_TOKENS vocabulary
   *   (the YTD revenue widget returns a non-zero sum, impossible with a
   *   literal token), but NO user token — `{current_user}` and even
   *   `{current_user_id}` match no owner (see crm.app.ts's My Work note).
   */
  const dashboards: AnyRec[] = (stack as any).dashboards ?? [];
  const reports: AnyRec[] = (stack as any).reports ?? [];

  const USER_TOKENS = new Set(['current_user_id', 'current_org_id']);

  /** Yield every string inside an arbitrarily nested filter value. */
  function* filterStrings(node: unknown): Generator<string> {
    if (typeof node === 'string') { yield node; return; }
    if (Array.isArray(node)) { for (const item of node) yield* filterStrings(item); return; }
    if (node && typeof node === 'object') {
      for (const value of Object.values(node)) yield* filterStrings(value);
    }
  }

  const badTokensIn = (
    where: string,
    filter: unknown,
    allowed: (token: string) => boolean,
    bad: string[],
  ) => {
    for (const s of filterStrings(filter)) {
      for (const m of s.matchAll(/\{([^{}]+)\}/g)) {
        if (!allowed(m[1])) bad.push(`${where}: unresolvable token "{${m[1]}}"`);
      }
    }
  };

  it('list view and page filters only use user tokens', () => {
    const allowed = (t: string) => USER_TOKENS.has(t);
    const bad: string[] = [];
    for (const v of views) {
      const lists = [v.list, ...Object.values(v.listViews ?? {})].filter(Boolean) as AnyRec[];
      for (const list of lists) badTokensIn(`view "${list.name ?? 'default'}"`, list.filter, allowed, bad);
    }
    for (const p of pages) {
      badTokensIn(`page "${p.name}"`, p.interfaceConfig?.filterBy, allowed, bad);
    }
    expect(bad, `unresolvable view/page filter tokens:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('dashboard widget and report filters only use date macros', () => {
    const allowed = (t: string) => isDateMacroToken(t);
    const bad: string[] = [];
    for (const d of dashboards) {
      for (const w of d.widgets ?? []) badTokensIn(`${d.name}/${w.id}`, w.filter, allowed, bad);
    }
    for (const r of reports) badTokensIn(`report "${r.name}"`, r.runtimeFilter, allowed, bad);
    expect(bad, `unresolvable analytics filter tokens:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});

describe('object references outside views resolve', () => {
  const dashboards: AnyRec[] = (stack as any).dashboards ?? [];
  const actions: AnyRec[] = (stack as any).actions ?? [];
  const knownObject = (name: string) => objectNames.has(name) || PLATFORM_OBJECTS.has(name);

  it('bulk-action lookup params reference registered objects', () => {
    // The platform registers `sys_user`, not `user` — a lookup param bound to
    // an unregistered object renders an empty picker.
    const bad: string[] = [];
    for (const v of views) {
      const lists = [v.list, ...Object.values(v.listViews ?? {})].filter(Boolean) as AnyRec[];
      for (const list of lists) {
        for (const def of list.bulkActionDefs ?? []) {
          for (const p of def.params ?? []) {
            if (p.object && !knownObject(p.object)) {
              bad.push(`view "${list.name}" bulk "${def.name}": param object "${p.object}" is not registered`);
            }
          }
        }
      }
    }
    expect(bad, `dangling bulk-action lookups:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('dashboard global filters reference registered objects', () => {
    const bad: string[] = [];
    for (const d of dashboards) {
      for (const f of d.globalFilters ?? []) {
        const target = f.optionsFrom?.object;
        if (target && !knownObject(target)) {
          bad.push(`${d.name} filter "${f.field}": optionsFrom object "${target}" is not registered`);
        }
      }
    }
    expect(bad, `dangling dashboard filter sources:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('action params objectOverride references registered objects', () => {
    const bad: string[] = [];
    for (const a of actions) {
      for (const p of a.params ?? []) {
        if (p.objectOverride && !knownObject(p.objectOverride)) {
          bad.push(`action "${a.name}": objectOverride "${p.objectOverride}" is not registered`);
        }
      }
    }
    expect(bad, `dangling action param objects:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});

describe('list-level action references resolve', () => {
  const actions: AnyRec[] = (stack as any).actions ?? [];
  const actionNames = new Set(actions.map((a) => a.name));
  // Row/bulk affordances the list renderer provides without an Action def.
  const BUILTIN = new Set(['edit', 'delete', 'view']);

  it('every rowAction / bulkAction names a defined action', () => {
    const bad: string[] = [];
    for (const v of views) {
      const lists = [v.list, ...Object.values(v.listViews ?? {})].filter(Boolean) as AnyRec[];
      for (const list of lists) {
        for (const name of [...(list.rowActions ?? []), ...(list.bulkActions ?? [])]) {
          if (typeof name === 'string' && !BUILTIN.has(name) && !actionNames.has(name)) {
            bad.push(`view "${list.name ?? 'default'}": action "${name}" is not defined`);
          }
        }
      }
    }
    expect(bad, `dangling list action references:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});

describe('row colors and kanban groups key off real option values', () => {
  const viewObjectOf = (v: AnyRec): string | undefined =>
    v.list?.data?.object ?? v.form?.data?.object ?? v.object;

  it('rowColor keys on select fields are actual option values', () => {
    // Task rows were colored by `critical`/`medium` — Case values. Task
    // priority is low/normal/high/urgent, so urgent rows rendered uncolored.
    const bad: string[] = [];
    for (const v of views) {
      const objectName = viewObjectOf(v);
      const objDef = objects.find((o) => o.name === objectName);
      if (!objDef) continue;
      const lists = [v.list, ...Object.values(v.listViews ?? {})].filter(Boolean) as AnyRec[];
      for (const list of lists) {
        const rc = list.rowColor;
        if (!rc?.field) continue;
        const options = objDef.fields?.[rc.field]?.options;
        if (!Array.isArray(options) || !options.length) continue; // not a select — booleans/numbers are fine
        const values = new Set(options.map((o: AnyRec) => String(o.value)));
        for (const key of Object.keys(rc.colors ?? {})) {
          if (!values.has(key)) {
            bad.push(`view "${list.name ?? 'default'}": rowColor key "${key}" is not an option of ${objectName}.${rc.field}`);
          }
        }
      }
    }
    expect(bad, `dangling rowColor keys:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('kanban groupByField is a select field with options', () => {
    const bad: string[] = [];
    for (const v of views) {
      const objectName = viewObjectOf(v);
      const objDef = objects.find((o) => o.name === objectName);
      if (!objDef) continue;
      const lists = [v.list, ...Object.values(v.listViews ?? {})].filter(Boolean) as AnyRec[];
      for (const list of lists) {
        const groupBy = list.kanban?.groupByField;
        if (!groupBy) continue;
        const field = objDef.fields?.[groupBy];
        if (!field) bad.push(`view "${list.name}": kanban groups by missing field "${groupBy}"`);
        else if (!Array.isArray(field.options) || !field.options.length) {
          bad.push(`view "${list.name}": kanban groupByField "${groupBy}" has no options`);
        }
      }
    }
    expect(bad, `broken kanban groupings:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});

describe('every named list view is reachable', () => {
  const apps: AnyRec[] = (stack as any).apps ?? [];
  const navViewNames = new Set(
    apps.flatMap((app) =>
      (app.navigation ?? []).flatMap(function walk(n: AnyRec): string[] {
        return [...(n.viewName ? [n.viewName] : []), ...(n.children ?? []).flatMap(walk)];
      })),
  );

  it('every listViews entry is referenced by the switcher tabs or app navigation', () => {
    // With no `tabs` declared, the data-mode switcher lists every saved view
    // automatically (ADR-0047) — nothing to check. But once a view curates a
    // `tabs` array, only the listed views render: seven working queues
    // (renewals_due, at_risk_accounts, stale_opportunities,
    // closing_this_quarter, sla_at_risk, todays_tasks, overdue_tasks) shipped
    // outside their list's tabs — defined, tested, unreachable.
    const bad: string[] = [];
    for (const v of views) {
      const tabs = v.list?.tabs;
      if (!Array.isArray(tabs) || !tabs.length) continue;
      const tabViews = new Set(tabs.map((t: AnyRec) => t.view).filter(Boolean));
      for (const [key, def] of Object.entries(v.listViews ?? {}) as [string, AnyRec][]) {
        const name = def.name ?? key;
        if (!tabViews.has(name) && !navViewNames.has(name)) {
          bad.push(`list view "${name}" (${def.data?.object}) is excluded from its list's tabs and has no navigation entry`);
        }
      }
    }
    expect(bad, `unreachable list views:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('every switcher tab points at a defined view', () => {
    const bad: string[] = [];
    for (const v of views) {
      const defined = new Set([
        v.list?.name,
        ...Object.entries(v.listViews ?? {}).map(([key, def]: [string, AnyRec]) => def.name ?? key),
      ].filter(Boolean));
      for (const t of v.list?.tabs ?? []) {
        if (t.view && !defined.has(t.view)) {
          bad.push(`tab "${t.name}" targets undefined view "${t.view}"`);
        }
      }
    }
    expect(bad, `dangling tabs:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});

describe('forms can actually author the data the views depend on', () => {
  const viewObjectOf = (v: AnyRec): string | undefined =>
    v.list?.data?.object ?? v.form?.data?.object ?? v.object;

  /** Field names present in the default form + all named form views. */
  const formFieldsOf = (v: AnyRec): Set<string> => {
    const names = new Set<string>();
    for (const form of [v.form, ...Object.values(v.formViews ?? {})].filter(Boolean) as AnyRec[]) {
      for (const section of form.sections ?? []) {
        for (const f of section.fields ?? []) {
          const name = typeof f === 'string' ? f : f?.field;
          if (name) names.add(name);
        }
      }
    }
    return names;
  };

  const isAuthorable = (field: AnyRec | undefined): boolean =>
    !!field && !field.readonly && !['formula', 'autonumber', 'summary'].includes(field.type) && !field.expression;

  it('every hard-required field is on the default form', () => {
    // crm_quote.name is required with no default — a create form omitting it
    // cannot pass validation, so quote creation via the form was impossible.
    const bad: string[] = [];
    for (const v of views) {
      const objectName = viewObjectOf(v);
      const objDef = objects.find((o) => o.name === objectName);
      if (!objDef || !v.form) continue;
      const formFields = new Set<string>();
      for (const section of v.form.sections ?? []) {
        for (const f of section.fields ?? []) {
          const name = typeof f === 'string' ? f : f?.field;
          if (name) formFields.add(name);
        }
      }
      for (const [name, field] of Object.entries(objDef.fields ?? {}) as [string, AnyRec][]) {
        if (!field.required || field.defaultValue !== undefined || !isAuthorable(field)) continue;
        if (!formFields.has(name)) {
          bad.push(`${objectName}: required field "${name}" is missing from the default form`);
        }
      }
    }
    expect(bad, `required fields no form can supply:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('fields the list views filter on are editable in some form', () => {
    // account views filter on type/health_score/next_renewal_date, but the
    // account form never offered them — the views could never match anything
    // a user created through the UI.
    const bad: string[] = [];
    for (const v of views) {
      const objectName = viewObjectOf(v);
      const objDef = objects.find((o) => o.name === objectName);
      if (!objDef) continue;
      const editable = formFieldsOf(v);
      const lists = [v.list, ...Object.values(v.listViews ?? {})].filter(Boolean) as AnyRec[];
      const filtered = new Set<string>();
      for (const list of lists) {
        for (const f of list.filter ?? []) if (f.field) filtered.add(f.field);
      }
      for (const name of filtered) {
        const field = objDef.fields?.[name];
        if (!isAuthorable(field)) continue; // readonly/derived fields are hook-stamped, not typed in
        if (!editable.has(name)) {
          bad.push(`${objectName}: views filter on "${name}" but no form lets a user set it`);
        }
      }
    }
    expect(bad, `filter fields no form can populate:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('bulk update params name real writable fields', () => {
    const bad: string[] = [];
    for (const v of views) {
      const objectName = viewObjectOf(v);
      const objDef = objects.find((o) => o.name === objectName);
      if (!objDef) continue;
      const lists = [v.list, ...Object.values(v.listViews ?? {})].filter(Boolean) as AnyRec[];
      for (const list of lists) {
        for (const def of list.bulkActionDefs ?? []) {
          if (def.operation !== 'update') continue;
          for (const p of def.params ?? []) {
            if (p.name && !objDef.fields?.[p.name]) {
              bad.push(`view "${list.name}" bulk "${def.name}": writes missing field "${p.name}"`);
            }
          }
        }
      }
    }
    expect(bad, `bulk updates writing missing fields:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});

describe('page templates and record components stay inside their record context', () => {
  it('page:header {field} tokens resolve on the page object', () => {
    // `{account}` matched no field (the lookup is `crm_account`), so detail
    // headers rendered a blank subtitle.
    const bad: string[] = [];
    for (const page of pages) {
      if (!page.object || !objectNames.has(page.object)) continue;
      const known = fieldsOf(page.object);
      for (const c of [...walk(page.regions), ...walk(page.slots)]) {
        if (c.type !== 'page:header') continue;
        for (const key of ['title', 'subtitle'] as const) {
          const template = c.properties?.[key];
          if (typeof template !== 'string') continue;
          for (const m of template.matchAll(/\{([^{}]+)\}/g)) {
            const token = m[1];
            if (token.includes('.') || token.includes('(')) continue; // context vars / expressions
            if (!known.includes(token)) {
              bad.push(`${page.name} ${key}: "{${token}}" is not a field of ${page.object}`);
            }
          }
        }
      }
    }
    expect(bad, `unresolvable page header tokens:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('record:* components only appear on pages bound to an object', () => {
    // The home page rendered a `record:highlights` KPI card over four fields
    // that exist on no object — there is no record on a home page, so the
    // component had nothing to resolve against and rendered blank.
    const bad: string[] = [];
    for (const page of pages) {
      if (page.object) continue;
      for (const c of [...walk(page.regions), ...walk(page.slots)]) {
        if (typeof c.type === 'string' && c.type.startsWith('record:')) {
          bad.push(`${page.name}: "${c.type}" (${c.id}) on a page with no bound object`);
        }
      }
    }
    expect(bad, `record components with no record context:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});


describe('dashboard date ranges window a field the query layer can actually compare', () => {
  /**
   * A dashboard `dateRange` is ANDed into EVERY widget query, so if the
   * comparison cannot match, the whole dashboard renders zeros. That is #460:
   * the Service dashboard windowed `crm_case.created_date` — a
   * `Field.datetime()` — and opened with every KPI at 0 and every chart empty,
   * with 38 cases in the system.
   *
   * The mechanism is a storage disagreement, not a bad preset. On SQLite,
   * `driver-sql` 16.1.0 coerces datetime filter values to epoch-millisecond
   * INTEGERs (`coerceFilterValue`), documenting the assumption that datetime
   * columns hold INTEGER ms. In this app they hold ISO TEXT — including the
   * platform's own `created_at`/`updated_at`. SQLite orders every INTEGER
   * before every TEXT, so `datetime_col >= <int>` is true for all rows and
   * `datetime_col <= <int>` is true for none. Measured against the running
   * 16.1.0 console: `$gte` alone → all 38 cases, `$lte` alone → 0, both → 0,
   * in every date format tried.
   *
   * `Field.date()` is unaffected (TEXT `YYYY-MM-DD` on both sides), which is
   * why the CRM/Sales/Executive dashboards — all windowing `close_date` — show
   * data. So the rule is about the FIELD TYPE, not the preset: a dashboard may
   * only window a `date` field. Note this deliberately fails if someone
   * restores the Service dashboard's `dateRange` before the driver is fixed.
   */
  const dashboards: AnyRec[] = (stack as any).dashboards ?? [];
  const datasets: AnyRec[] = (stack as any).datasets ?? [];

  /** Objects the dashboard's widgets aggregate over, via their datasets. */
  const objectsBehind = (d: AnyRec): string[] => {
    const names = new Set<string>();
    for (const w of d.widgets ?? []) {
      const ds = datasets.find((x) => x.name === w.dataset);
      if (ds?.object) names.add(ds.object);
    }
    return [...names];
  };

  const fieldType = (objectName: string, field: string): string | undefined =>
    objects.find((o) => o.name === objectName)?.fields?.[field]?.type;

  it('no dashboard windows a datetime field', () => {
    const bad: string[] = [];
    for (const d of dashboards) {
      const field = d.dateRange?.field;
      if (!field) continue;
      for (const obj of objectsBehind(d)) {
        const type = fieldType(obj, field);
        if (type === 'datetime') {
          bad.push(
            `${d.name}: dateRange windows ${obj}.${field}, a datetime field — ` +
            `the $lte bound matches no rows, so every widget renders empty`,
          );
        }
      }
    }
    expect(bad, `dashboards that will render empty:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('every dashboard dateRange field exists on the objects its widgets aggregate', () => {
    // A range field that no underlying object defines is silently dropped or
    // errors per widget — either way the picker cannot do what it claims.
    const bad: string[] = [];
    for (const d of dashboards) {
      const field = d.dateRange?.field;
      if (!field) continue;
      const behind = objectsBehind(d);
      if (!behind.length) continue;
      const resolves = behind.filter((obj) => fieldType(obj, field) !== undefined);
      if (!resolves.length) {
        bad.push(`${d.name}: dateRange field "${field}" exists on none of ${behind.join(', ')}`);
      }
    }
    expect(bad, `dangling dashboard date-range fields:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});
