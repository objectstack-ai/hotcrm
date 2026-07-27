// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
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
      // The default `form` plus every named form under `forms`.
      const forms = [v.form, ...Object.values(v.forms ?? {})].filter(Boolean) as AnyRec[];
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
      const lists = [v.list, ...Object.values(v.views ?? {})].filter(Boolean) as AnyRec[];
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
      const lists = [v.list, ...Object.values(v.views ?? {})].filter(Boolean) as AnyRec[];
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
      // `sys_*` are platform objects the app legitimately links to (the
      // approval inbox and process list); those nodes carry their own
      // `requiresObject` guard for installs where the plugin is absent.
      if (n.objectName && !n.objectName.startsWith('sys_') && !objectNames.has(n.objectName)) {
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
