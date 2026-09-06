// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import stack from '../objectstack.config';
import {
  type AnyRec,
  objects,
  pages,
  views,
  objectNames,
  packFor,
  PLATFORM_OBJECTS,
} from './helpers/metadata-fixtures';

/**
 * Dangling-reference guards for the surfaces that DISPATCH — navigation,
 * actions and dashboards.
 *
 * These are the references whose failure is invisible rather than loud: a nav
 * entry pointing at an object nobody registered renders an empty page, a
 * dashboard header action links to a route that 404s only once someone clicks
 * it, a `rowAction` names an action that does not exist and the menu item
 * simply does nothing. None of it errors at build time, so none of it was
 * noticed until a demo.
 *
 * ---
 *
 * Split out of `test/metadata-references.test.ts` by family (#814).
 *
 * That file had grown to 99,872 bytes against the 100KB ceiling in
 * `scripts/check-source-hygiene.mjs` — 97.5% of the quota — so the next PR to
 * add a guard anywhere in it would have been failed by `pnpm hygiene` before
 * it was reviewed. #815 had already been forced into an unplanned split for
 * exactly that reason. The four files now split the guards by the metadata
 * surface they resolve against; this one owns navigation, actions and
 * dashboards.
 *
 * The derivations every one of them shares (`objects`, `views`, `walk`, the
 * locale packs, the platform-object allowlist) live in
 * `test/helpers/metadata-fixtures.ts`. No assertion, helper or fixture changed
 * in the split — see the reconciliation table on the PR.
 */

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
        // reached on their own. `_attendee` joined the list with `crm_event`
        // (#592): an attendee row is reached through the meeting it belongs to,
        // and it is `controlled_by_parent`, so a nav entry would offer a list
        // whose every row derives its visibility from a record you got to some
        // other way. `_feedback` joined it with `crm_article_feedback` (#601)
        // on exactly that reasoning: a vote is reached through the article it
        // is about, it is `controlled_by_parent` too, and "Article Feedback" as
        // a top-level destination would be a list of verdicts detached from the
        // things they are verdicts on.
        !/_line_item$|_member$|_attendee$|_feedback$/.test(name) && !reachable.has(name));
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
    const zh = packFor('zh-CN');
    // Assert, don't skip: the old lookup used the wrong bundle shape, found no
    // pack, and returned early — a green test that checked nothing.
    expect(zh, 'no zh-CN locale pack found in stack.translations').toBeTruthy();
    const bad: string[] = [];
    for (const app of apps) {
      const nav = zh?.apps?.[app.name]?.navigation ?? {};
      for (const n of navNodes(app)) {
        if (n.id && !nav[n.id]?.label) bad.push(`${app.name}/${n.id}`);
      }
    }
    expect(bad, `navigation nodes with no zh-CN label:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});

describe('dashboard actions land on real routes', () => {
  /**
   * A widget/header action with `actionType: 'url'` is pushed into the router
   * verbatim (pushState, no normalisation). The 16.1.0 console serves in-app
   * pages ONLY under `/apps/:appName/…` with these children (verified against
   * the router in @objectstack/console):
   *   :objectName | :objectName/view/:viewId | :objectName/record/:recordId |
   *   dashboard/:dashboardName | report/:reportName | page/:pageName
   * There is no top-level `/objects/…` or `/reports/…` route — 16 KPI tiles
   * navigated to dead pages that way (issue #527).
   */
  const apps: AnyRec[] = (stack as any).apps ?? [];
  const dashboards: AnyRec[] = (stack as any).dashboards ?? [];
  const reports: AnyRec[] = (stack as any).reports ?? [];
  const appNames = new Set(apps.map((a) => a.name));
  const reportNames = new Set(reports.map((r) => r.name));
  const dashboardNames = new Set(dashboards.map((d) => d.name));
  const pageNames = new Set(pages.map((p) => p.name));

  /** List-view names per object (the default list plus every named listView). */
  const viewNamesByObject = new Map<string, Set<string>>();
  for (const v of views) {
    const objectName = v.list?.data?.object;
    if (!objectName) continue;
    const known = viewNamesByObject.get(objectName) ?? new Set<string>();
    if (v.list?.name) known.add(v.list.name);
    for (const lv of Object.values(v.listViews ?? {}) as AnyRec[]) {
      if (lv?.name) known.add(lv.name);
    }
    viewNamesByObject.set(objectName, known);
  }

  /** Returns undefined when the URL resolves, else why it doesn't. */
  const routeError = (url: string): string | undefined => {
    if (/^https?:\/\//.test(url) || url.startsWith('//')) return undefined; // external
    const [path] = url.split(/[?#]/);
    const seg = path.split('/').filter(Boolean);
    if (seg[0] !== 'apps') return 'in-app URLs must start with /apps/<appName>/';
    if (!appNames.has(seg[1])) return `app "${seg[1]}" is not defined`;
    const [head, second, third] = seg.slice(2);
    if (head === 'dashboard') {
      return dashboardNames.has(second) ? undefined : `dashboard "${second}" is not defined`;
    }
    if (head === 'report') {
      return reportNames.has(second) ? undefined : `report "${second}" is not defined`;
    }
    if (head === 'page') {
      return pageNames.has(second) ? undefined : `page "${second}" is not defined`;
    }
    // `<objectName>` optionally followed by `view/<viewId>` (record deep links
    // carry ids, not metadata — dashboards don't author those).
    const objectOk = objectNames.has(head) || PLATFORM_OBJECTS.has(head);
    if (!objectOk) return `object "${head}" is not defined`;
    if (second === undefined) return undefined;
    if (second !== 'view') return `unknown object sub-route "${second}"`;
    return viewNamesByObject.get(head)?.has(third)
      ? undefined
      : `object "${head}" has no list view "${third}"`;
  };

  it('every url-type widget and header action resolves', () => {
    const bad: string[] = [];
    for (const d of dashboards) {
      const actions = [
        ...(d.header?.actions ?? []),
        ...(d.widgets ?? []),
      ] as AnyRec[];
      for (const a of actions) {
        if (!a.actionUrl || (a.actionType ?? 'url') !== 'url') continue;
        const err = routeError(a.actionUrl);
        if (err) bad.push(`${d.name}/${a.id ?? a.label}: ${a.actionUrl} — ${err}`);
      }
    }
    expect(bad, `dashboard actions navigating to dead routes:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  /**
   * The rule above currently iterates nothing: no dashboard declares a
   * widget-level or header action any more, because the console renders no
   * drill-through for a dataset-bound widget (measured on 16.1.0 — a KPI tile
   * emits no link, no button and no icon, its cursor stays `auto`, and clicking
   * it does not navigate). Removing the config was the point of this PR.
   *
   * A guard that iterates an empty list is a guard that passes without checking
   * anything — the exact failure the navigation rule above was written to fix.
   * So the checker is exercised directly here: it must still reject the two
   * shapes #527 found in the wild, and still accept a real one. If someone
   * re-adds an action later, the rule above resumes covering it for real.
   */
  it('the route checker still rejects the shapes #527 found', () => {
    expect(routeError('/objects/opportunity?filter=open')).toBeTruthy();
    expect(routeError('/reports/revenue')).toBeTruthy();
    expect(routeError('/apps/no_such_app/crm_lead')).toBeTruthy();
    expect(routeError('/apps/crm_enterprise/crm_lead/view/no_such_view')).toBeTruthy();
    expect(routeError('/apps/crm_enterprise/crm_lead')).toBeUndefined();
    expect(routeError('https://example.com/anything')).toBeUndefined();
  });
});

describe('list-level action references resolve', () => {
  const actions: AnyRec[] = (stack as any).actions ?? [];

  it('no rowAction repeats an action that already declares list_item placement', () => {
    // An Action with `locations: ['list_item']` auto-injects its row-menu
    // entry. Naming it AGAIN as a rowActions string goes through objectui's
    // legacy path, which dispatches the string as an action TYPE — producing
    // a second, dead menu item (issue #535 / objectstack-ai/objectui#2960).
    const listItemActions = new Set(
      actions.filter((a) => (a.locations ?? []).includes('list_item')).map((a) => a.name),
    );
    const bad: string[] = [];
    for (const v of views) {
      const lists = [v.list, ...Object.values(v.listViews ?? {})].filter(Boolean) as AnyRec[];
      for (const list of lists) {
        for (const name of list.rowActions ?? []) {
          if (typeof name === 'string' && listItemActions.has(name)) {
            bad.push(`view "${list.name ?? 'default'}": "${name}" duplicates its list_item auto-injection`);
          }
        }
      }
    }
    expect(bad, `redundant string rowActions:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  /**
   * Bulk dispatch (`bulkActionDefs` / `bulkActions`) is pinned in
   * `test/bulk-action-dispatch.test.ts`.
   *
   * A guard forbidding `mass_update_stage` on any list used to live here: the
   * selection-bar button was found to be a client-side no-op (#588), so the
   * wiring was treated as the defect. #508 disproved that premise — the console
   * delivers a selection through `bulkActionDefs` + `execution: 'aggregate'`
   * (objectstack-ai/objectstack#5568), and the button was inert because the
   * DECLARATION had been removed. The guard is inverted rather than deleted,
   * and moved: `test/metadata-references.test.ts`, which then held this guard
   * too, was one edit from the 100KB hygiene ceiling. #814 has since split the
   * rest of that file by family, which is how this guard came to sit here.
   */
});

describe('dashboard date ranges window a field the query layer can actually compare', () => {
  /**
   * A dashboard `dateRange` is ANDed into EVERY widget query, so if the
   * comparison cannot match, the whole dashboard renders zeros. That is #460:
   * the Service dashboard windowed `crm_case.created_date` — a
   * `Field.datetime()` — and opened with every KPI at 0 and every chart empty,
   * with 38 cases in the system. `driver-sql` 16.1.0 coerced a datetime bound
   * to an epoch-millisecond INTEGER against ISO TEXT storage, and SQLite orders
   * every INTEGER before every TEXT: `>= <int>` matched every row, `<= <int>`
   * matched none.
   *
   * This block used to carry a second rule — **no dashboard may window a
   * `datetime` field at all** — and #1157 removed it rather than relaxing its
   * wording, because a field-type ban is the wrong instrument for that claim:
   * it is equally green whether the window works or not, so it could never
   * report the fix landing (objectstack#3912 and objectstack#3777 are both
   * released as of 17.0.0 GA) and could never catch a re-regression either.
   *
   * Its replacement EXECUTES the window against a real SQLite database and
   * compares every widget to a ground truth computed in the same run:
   * `test/dashboard-date-range-window.test.ts`. Restoring a datetime window is
   * therefore still gated — on evidence now, not on a ban. What stays here is
   * the half that is genuinely a metadata question: a range field the objects
   * behind the dashboard do not define.
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
