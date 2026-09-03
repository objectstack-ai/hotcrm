// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { isDateMacroToken } from '@objectstack/spec/data';
import stack from '../objectstack.config';
import { OPPORTUNITY_STAGE_OPTIONS } from '../src/objects/_picklists';
import {
  type AnyRec,
  objects,
  pages,
  views,
  objectNames,
  fieldsOf,
  walk,
} from './helpers/metadata-fixtures';

/**
 * Dangling-reference guards for the VIEW surface.
 *
 * Everything a list view or form view names — the fields it sections, sorts and
 * filters on, the option values it tints rows and kanban columns by, the stage
 * enumerations it draws, the navigation entries that reach it. `os validate`
 * checks that a view has the SHAPE of a view; nothing checked that the names
 * inside it resolve, and every guard here started as a defect found by clicking
 * through the app, where the bad name rendered as an empty column or a
 * silently untinted row rather than as an error.
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
 * surface they resolve against; this one owns views and list views.
 *
 * The derivations every one of them shares (`objects`, `views`, `walk`, the
 * locale packs, the platform-object allowlist) live in
 * `test/helpers/metadata-fixtures.ts`. No assertion, helper or fixture changed
 * in the split — see the reconciliation table on the PR.
 */

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

describe('filter template tokens are resolvable', () => {
  /**
   * Token support differs per data path — and the difference MOVED under us at
   * the 17.0 upgrade, so the shape of this rule changed with it (#730).
   *
   * - LIST-VIEW data path (`/api/v1/data/...`): resolves user tokens AND date
   *   macros. The date-macro half is new. Through 16.1.0 nothing on the server
   *   substituted placeholders on the read path, so a macro shipped as a
   *   literal string — and because `'2026-…' < '{…'` is lexicographically
   *   TRUE, a `< {180_days_ago}` filter matched freshly-reviewed articles
   *   (inverted semantics, not merely empty). That is why this rule used to
   *   read "user tokens ONLY", and why views were written as operator-only
   *   filters plus a sort.
   *
   *   `resolveFilterTokens()` was wired into the ObjectQL READ path in
   *   17.0.0-rc.0 (objectql `feat(filters): evaluate {filter-token}
   *   placeholders server-side`, #3582) — ahead of the middleware chain,
   *   covering `find`/`findOne`/`count`/`aggregate`, which is the one gate
   *   every server-side read passes through, saved-view filters included. The
   *   lexicographic hazard above is gone in BOTH directions now: a known token
   *   is substituted before the driver sees it, and an unknown one throws
   *   `Unresolvable filter placeholder` naming the near-miss fix instead of
   *   comparing as text.
   *
   *   Measured, not inferred from the changelog:
   *   `test/forecast-current-quarter-view.test.ts` runs a shipped view filter
   *   through a real engine and pins one quarter selected out of three, plus
   *   the throw on the retired `{this_quarter_start}` spelling. First taken on
   *   17.0.0-rc.2 and RE-RUN 2026-09-03 on the pinned 17.2.0 (#1467: the
   *   current pin since PR #1442), green both times.
   *
   *   What DID move between those two pins is WHICH spellings throw. The
   *   wrapped-token grammar widened at 17.0.0-rc.6 from
   *   `/^\$?\{([a-zA-Z0-9_]+)\}$/` to `/^\$?\{([^{}]+)\}$/`, so a spelling
   *   with parentheses — `{TODAY()}` — is now classified `kind: 'unknown'` and
   *   raises `FILTER_TOKEN_UNKNOWN` instead of reaching the driver as a
   *   literal (#1107; the reading is in `src/views/task.view.ts`). That makes
   *   the paragraph above STRONGER, not weaker: there is no longer a spelling
   *   the gate cannot see.
   *
   * - ANALYTICS path (dashboard widgets / dataset reports,
   *   `/api/v1/analytics/...`): resolves the DATE_MACRO_TOKENS vocabulary (the
   *   YTD revenue widget returns a non-zero sum, impossible with a literal
   *   token), but still NO user token — `{current_user}` and even
   *   `{current_user_id}` match no owner (see crm.app.ts's My Work note). That
   *   half is unchanged and tracked at #510, so the two rules below remain
   *   asymmetric — just not in the direction they were written for.
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

  it('list view and page filters only use user tokens or date macros', () => {
    const allowed = (t: string) => USER_TOKENS.has(t) || isDateMacroToken(t);
    const bad: string[] = [];
    for (const v of views) {
      const lists = [v.list, ...Object.values(v.listViews ?? {})].filter(Boolean) as AnyRec[];
      for (const list of lists) badTokensIn(`view "${list.name ?? 'default'}"`, list.filter, allowed, bad);
    }
    for (const p of pages) {
      badTokensIn(`page "${p.name}"`, p.interfaceConfig?.filterBy, allowed, bad);
      // Page COMPONENTS carry filters too, and did not used to be walked. Sales
      // Home now embeds `list-view` blocks whose filters come off the saved
      // views (#771) — those are checked above as views, but a hand-written
      // component filter would have reached the same data path unexamined.
      for (const c of [...walk(p.regions), ...walk(p.slots)]) {
        badTokensIn(`page "${p.name}"/${c.id ?? c.type}`, c.properties?.filter, allowed, bad);
        badTokensIn(`page "${p.name}"/${c.id ?? c.type}`, c.dataSource?.filter, allowed, bad);
      }
    }
    expect(bad, `unresolvable view/page filter tokens:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('the widened list-view rule still rejects what neither path resolves', () => {
    // Widening a rule is how a rule dies. `{this_quarter_start}` is the exact
    // spelling #515 removed from `this_quarter_forecasts`, and the engine now
    // throws on it — so it must stay rejected HERE too, at author time, rather
    // than being waved through by the new date-macro allowance. `{current_user}`
    // covers the other near-miss (the resolvable spelling is `{current_user_id}`).
    const allowed = (t: string) => USER_TOKENS.has(t) || isDateMacroToken(t);
    const bad: string[] = [];
    badTokensIn('probe', [
      { value: '{this_quarter_start}' },
      { value: '{current_user}' },
      { value: '{not_a_token}' },
    ], allowed, bad);
    expect(bad).toHaveLength(3);

    // …and still accepts both classes it is now supposed to accept.
    const good: string[] = [];
    badTokensIn('probe', [
      { value: '{current_user_id}' },
      { value: '{current_quarter_start}' },
      { value: '{30_days_ago}' },
    ], allowed, good);
    expect(good).toEqual([]);
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

/**
 * Stage enumerations are COMPLETE, not merely valid.
 *
 * The two guards above answer "is every value written here a real option?" —
 * a subset check. Nothing asked the converse, "is every real option written
 * here?", and that is the half that broke (#759): `needs_analysis` is one of
 * the seven canonical `OPPORTUNITY_STAGE_OPTIONS` and was absent from BOTH the
 * detail page's stage path and the Open Deals `rowColor` map. Six of seven
 * stages worked, so both surfaces looked fine on every deal that happened not
 * to be in Needs Analysis — the deal that WAS lit up no step on the path and
 * got no row tint, which reads to a user as corrupted data rather than as
 * missing metadata.
 *
 * The expectation is derived from `OPPORTUNITY_STAGE_OPTIONS` itself — the
 * single source `crm_opportunity.stage` and the `mass_update_stage` action are
 * both built from — so an EIGHTH stage cannot ship half-covered. A hand-copied
 * list here would need the same edit as the metadata it guards, and would
 * therefore be forgotten in the same commit.
 */
describe('every canonical opportunity stage reaches the UI that enumerates stages', () => {
  const canonical = OPPORTUNITY_STAGE_OPTIONS.map((o) => String(o.value));

  /** Every `record:path` bound to `crm_opportunity.stage`, as [pageName, values]. */
  const stagePaths = (): [string, string[]][] =>
    pages
      .filter((page) => page.object === 'crm_opportunity')
      .flatMap((page) =>
        [...walk(page.regions), ...walk(page.slots)]
          .filter((c) => c.type === 'record:path' && c.properties?.statusField === 'stage')
          .map((c): [string, string[]] => [
            `${page.name} / ${c.id}`,
            (c.properties?.stages ?? []).map((s: AnyRec) => String(s.value)),
          ]),
      );

  /** Every list `rowColor` keyed on `crm_opportunity.stage`, as [viewName, colors]. */
  const stageRowColors = (): [string, AnyRec][] =>
    views
      .filter((v) => (v.list?.data?.object ?? v.object) === 'crm_opportunity')
      .flatMap((v) =>
        ([v.list, ...Object.values(v.listViews ?? {})].filter(Boolean) as AnyRec[])
          .filter((list) => list.rowColor?.field === 'stage')
          .map((list): [string, AnyRec] => [
            `view "${list.name ?? 'default'}"`,
            list.rowColor?.colors ?? {},
          ]),
      );

  it('the canonical stage list is the set the object validates against', () => {
    // Guards the guard twice over: an empty or renamed constant would make
    // every assertion below pass by comparing against nothing, and a `stage`
    // field that stopped being built from this constant would leave the two
    // sites below chasing a list the runtime no longer enforces.
    expect(canonical.length, 'OPPORTUNITY_STAGE_OPTIONS is empty').toBeGreaterThan(0);
    const objDef = objects.find((o) => o.name === 'crm_opportunity');
    const fieldValues = (objDef?.fields?.stage?.options ?? []).map((o: AnyRec) => String(o.value));
    expect([...fieldValues].sort(), 'crm_opportunity.stage no longer mirrors OPPORTUNITY_STAGE_OPTIONS')
      .toEqual([...canonical].sort());
  });

  it('every stage has a step on the opportunity stage path', () => {
    const sites = stagePaths();
    // A renamed component type or statusField would silently empty this list
    // and turn the assertion below into a no-op — exactly how the navigation
    // guard in `test/action-references.test.ts` spent its life passing.
    expect(sites.length, 'no record:path bound to crm_opportunity.stage was found').toBeGreaterThan(0);

    const bad: string[] = [];
    for (const [site, values] of sites) {
      for (const stage of canonical) {
        if (!values.includes(stage)) bad.push(`${site}: no path step for stage "${stage}"`);
      }
      for (const value of values) {
        if (!canonical.includes(value)) bad.push(`${site}: path step "${value}" is not a canonical stage`);
      }
    }
    expect(bad, `incomplete stage paths:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('every stage has a row colour in the opportunity list views that tint by stage', () => {
    const sites = stageRowColors();
    expect(sites.length, 'no rowColor keyed on crm_opportunity.stage was found').toBeGreaterThan(0);

    const bad: string[] = [];
    for (const [site, colors] of sites) {
      const keys = Object.keys(colors);
      for (const stage of canonical) {
        if (!keys.includes(stage)) bad.push(`${site}: no rowColor entry for stage "${stage}"`);
      }
      for (const key of keys) {
        if (!canonical.includes(key)) bad.push(`${site}: rowColor key "${key}" is not a canonical stage`);
      }
    }
    expect(bad, `incomplete stage row colours:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('stage colours stay distinguishable from one another', () => {
    // The point of the map is that a rep can tell two stages apart at a
    // glance; two stages sharing a hex make the tint say nothing. (#759 was
    // nearly fixed by copying `needs_analysis`'s `#FFD700` out of
    // _picklists.ts, one hue step from proposal's `#f59e0b`.)
    const bad: string[] = [];
    for (const [site, colors] of stageRowColors()) {
      const seen = new Map<string, string>();
      for (const key of Object.keys(colors)) {
        const hex = String(colors[key]).toLowerCase();
        const owner = seen.get(hex);
        if (owner) bad.push(`${site}: "${key}" and "${owner}" are both ${hex}`);
        else seen.set(hex, key);
      }
    }
    expect(bad, `stages sharing a row colour:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});

/**
 * ── What actually reaches a named list view (#1307) ──────────────────────────
 *
 * This block used to assert that a `listViews` entry left out of its list's
 * `tabs` array was UNREACHABLE, and named seven working queues (renewals_due,
 * at_risk_accounts, stale_opportunities, closing_this_quarter, sla_at_risk,
 * todays_tasks, overdue_tasks) as having shipped "defined, tested,
 * unreachable". Both halves were false, and re-measuring the shipped renderer
 * (`@objectstack/console` 17.1.0) is what showed it: the object-view switcher
 * builds its strip from VIEW DESCRIPTORS and never reads `tabs` at all —
 *
 *   Dm({ definedViews: U.listViews ?? U.list_views ?? {}, primary: U.list,
 *        primaryId, savedViews, viewOverrides, fallbackTab })
 *
 * — one entry per `listViews` key plus the primary `list` (unshifted to the
 * front and marked default), each labelled with that view's own `label` and
 * iconed from a `viewTypeIcons` map the console hardcodes. So a `listViews`
 * entry was on the strip whether or not a tab named it: those seven queues
 * were reachable the whole time, and `tabs` curated nothing. The inert key is
 * gone from every view file; `test/view-tab-label-inert.test.ts` pins that it
 * stays gone.
 *
 * What is left to guard here is the direction that CAN still dangle. A view is
 * on its own object's strip by existing, but a NAVIGATION entry names a view
 * by string — `{ type: 'object', objectName, viewName }` — and that string is
 * resolved against the object's views at render time. A rename on either side
 * leaves an entry that opens on nothing, and no other suite checks it:
 * `app-navigation-shape.test.ts` asserts a view entry HAS a non-empty
 * `viewName`, never that the name resolves.
 */
describe('every named list view is reachable', () => {
  const apps: AnyRec[] = (stack as any).apps ?? [];

  /** Every `viewName` an app navigation entry pins, with its object and id. */
  const navViewTargets: { id: string; object: string; view: string }[] = apps.flatMap((app) =>
    [...walk(app.navigation ?? [])]
      .filter((n) => typeof n.viewName === 'string' && n.viewName)
      .map((n) => ({
        id: String(n.id ?? '(unnamed entry)'),
        object: String(n.objectName ?? ''),
        view: String(n.viewName),
      })),
  );

  /** The view names the switcher enumerates for an object: `list` + `listViews`. */
  const switcherViewsByObject = new Map<string, Set<string>>();
  for (const v of views) {
    const object = v.list?.data?.object;
    if (!object) continue;
    const names = switcherViewsByObject.get(object) ?? new Set<string>();
    if (v.list?.name) names.add(String(v.list.name));
    for (const [key, def] of Object.entries(v.listViews ?? {}) as [string, AnyRec][]) {
      names.add(String(def?.name ?? key));
    }
    switcherViewsByObject.set(object, names);
  }

  it('sees navigation entries that pin a view, and objects that define some', () => {
    // Guards the guard: either side coming back empty would make the rule
    // below pass by checking nothing — the exact failure the `tabs` model hid.
    expect(navViewTargets.length, 'no navigation entry pins a viewName at all').toBeGreaterThan(0);
    expect(switcherViewsByObject.size, 'no object defines a list view').toBeGreaterThan(0);
  });

  it('every navigation entry that pins a view names one its object defines', () => {
    const bad: string[] = [];
    for (const { id, object, view } of navViewTargets) {
      const known = switcherViewsByObject.get(object);
      if (!known) {
        bad.push(`${id}: object "${object}" has no view file, so "${view}" resolves to nothing`);
      } else if (!known.has(view)) {
        bad.push(
          `${id}: "${object}" defines no view "${view}" — the entry opens on nothing. ` +
            `It ships: ${[...known].sort().join(', ')}`,
        );
      }
    }
    expect(bad, `navigation entries pinning an undefined view:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});

/**
 * ── What curates a related list, when it is NOT a view (#944) ────────────────
 *
 * Four objects in this app are reached only through a parent's detail page —
 * the two junctions and the two line items. It is a standing temptation to
 * believe that panel renders the child's list view, and the header of
 * `src/views/event_attendee.view.ts` said so in as many words until #944.
 *
 * It does not. MEASURED against the shipped Console (17.0.0-rc.3): a
 * detail-page related list takes its columns from the CHILD's lookup field
 * (`relatedListColumns`, which this app authors nowhere), then falls back to
 * the child object's `highlightFields` minus the lookup the panel is scoped
 * by — capped at six, with columns empty on every fetched row dropped. Only
 * with neither of those does it reach a heuristic over the whole field map.
 * The child's `list` view is never consulted, which is why
 * `crm_campaign_member` ships no view at all and its panel on a campaign is
 * still curated (Lead / Contact / Status / Response Date), while
 * `crm_event_attendee` ships one whose columns that panel ignores.
 *
 * So the thing worth guarding here is not the views — it is `highlightFields`
 * on the objects that have no other way to be read. Delete it and the panel
 * drops to the heuristic, which leads with the autonumber these objects carry
 * as their `nameField`: `CM-00001`, `EA-00001`, one useless column where the
 * person's name should be. That is exactly the degradation #944 was filed
 * about, and deleting this metadata is the only way to reach it.
 *
 * Derived, not listed: an object qualifies when it holds a REQUIRED lookup to
 * another `crm_` object and has no navigation entry of its own. A fifth such
 * object added tomorrow is held to the same bar without anyone extending a
 * fixture.
 */
describe('objects reached only through a parent curate that related list', () => {
  const apps: AnyRec[] = (stack as any).apps ?? [];
  const navObjects = new Set(
    apps.flatMap((app) =>
      (app.navigation ?? []).flatMap(function walk(n: AnyRec): string[] {
        return [...(n.objectName ? [n.objectName] : []), ...(n.children ?? []).flatMap(walk)];
      })),
  );

  /** The required `crm_` lookups on an object — each one is a panel it appears in. */
  const parentLookupsOf = (obj: AnyRec): string[] =>
    Object.entries<AnyRec>(obj.fields ?? {})
      .filter(([, def]) =>
        (def?.type === 'lookup' || def?.type === 'master_detail') &&
        def?.required === true &&
        String(def?.reference_to ?? def?.reference ?? '').startsWith('crm_'))
      .map(([name]) => name);

  const parentOnly = objects.filter(
    (o) => String(o.name).startsWith('crm_') && !navObjects.has(o.name) && parentLookupsOf(o).length > 0,
  );

  it('the derivation finds the objects it is meant to cover', () => {
    // Guard the guard. Every assertion below iterates `parentOnly`, and all of
    // them would pass by checking nothing if the navigation walk stopped
    // yielding object names or the lookup filter stopped matching — the way
    // the navigation guard in `test/action-references.test.ts` spent its life
    // green. The two junctions are named because they are what #944 is about;
    // the count is a floor, not a roster.
    expect(navObjects.size, 'no navigation object entries parsed out of the app').toBeGreaterThan(5);
    const names = parentOnly.map((o) => o.name);
    expect(names).toContain('crm_campaign_member');
    expect(names).toContain('crm_event_attendee');
    expect(names.length).toBeGreaterThanOrEqual(4);
  });

  it.each(parentOnly.map((o) => o.name))('%s authors highlightFields', (name) => {
    const obj = objects.find((o) => o.name === name) as AnyRec;
    const highlight: string[] = Array.isArray(obj.highlightFields) ? obj.highlightFields : [];
    expect(
      highlight.length,
      `${name} authors no highlightFields — nothing curates its related list, and the ` +
        'fallback heuristic leads with whatever the field map offers first',
    ).toBeGreaterThan(0);

    const known = new Set(Object.keys(obj.fields ?? {}));
    const dangling = highlight.filter((f) => !known.has(f));
    expect(dangling, `${name}.highlightFields names fields that do not exist: ${dangling.join(', ')}`).toEqual([]);
  });

  it.each(parentOnly.map((o) => o.name))('%s still has columns once the parent lookup is dropped', (name) => {
    const obj = objects.find((o) => o.name === name) as AnyRec;
    const highlight: string[] = Array.isArray(obj.highlightFields) ? obj.highlightFields : [];
    const nameField = typeof obj.nameField === 'string' ? obj.nameField : undefined;
    const isAutonumber = !!nameField && obj.fields?.[nameField]?.type === 'autonumber';

    const bad: string[] = [];
    for (const parent of parentLookupsOf(obj)) {
      // What the panel on `parent`'s detail page is left with: the related list
      // drops the field it scoped the query by, since every row shows the same
      // value for it.
      const surviving = highlight.filter((f) => f !== parent);
      if (surviving.length === 0) {
        bad.push(
          highlight.length === 0
            ? `${name} in the ${parent} panel: no highlightFields at all — the panel falls to the heuristic`
            : `${name} in the ${parent} panel: every highlightField is the panel's own scope — no columns left`,
        );
      }
      if (isAutonumber && surviving.includes(nameField as string)) {
        bad.push(`${name} in the ${parent} panel: leads with the autonumber "${nameField}"`);
      }
    }
    expect(bad, `related lists with nothing to show:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});

/**
 * A list that offers the calendar switch must say which field dates it (#1445).
 *
 * `appearance.allowedVisualizations: [... 'calendar']` renders a calendar
 * toggle on that list. Nothing in the list itself said which field supplies the
 * event date, and the renderer's answer to that gap was to invent one
 * (`due_date`): every record without that field piled onto "today" — a
 * plausible-looking, fully wrong screen. Seven of this app's default lists were
 * in exactly that state, their `calendar:` blocks authored only on the sibling
 * NAMED view, which the toggle does not read.
 *
 * The platform now refuses the shape at parse
 * (objectstack-ai/objectstack#14075, ruled on #13748 option A) — but the
 * refusal ships in a framework newer than the `@objectstack/*` line pinned in
 * `package.json`, so `pnpm build` here still accepts it. Until that line moves,
 * this is the only thing standing between an author and a calendar that lies;
 * after it moves, it is the cheap local half that fails in seconds instead of
 * at publish.
 *
 * The date is the load-bearing key and the only required one: an absent title
 * falls back to the record display name (ADR-0079), an absent color to the
 * theme default. A date has no such fallback.
 */
describe('a list offering the calendar switch says which field dates it', () => {
  const viewObjectOf = (v: AnyRec): string | undefined =>
    v.list?.data?.object ?? v.form?.data?.object ?? v.object;

  /**
   * Every list on every view — the default `list` plus each named `listViews`
   * entry. `isDefault` is carried explicitly rather than derived from the name:
   * a default list has a `name` of its own (`all_campaigns`), so it is
   * indistinguishable from a named one once flattened.
   */
  const allLists: { object: string; view: string; isDefault: boolean; list: AnyRec }[] = views.flatMap((v) => {
    const objectName = viewObjectOf(v);
    if (!objectName || !objectNames.has(objectName)) return [];
    const entries: [AnyRec, boolean][] = [
      ...(v.list ? ([[v.list, true]] as [AnyRec, boolean][]) : []),
      ...Object.values(v.listViews ?? {}).map((l) => [l as AnyRec, false] as [AnyRec, boolean]),
    ];
    return entries.map(([list, isDefault]) => ({
      object: objectName,
      view: isDefault ? `default (${list.name ?? '-'})` : (list.name ?? '-'),
      isDefault,
      list,
    }));
  });

  /** A list renders a calendar if it IS one, or if the switcher can turn it into one. */
  const offersCalendar = (l: AnyRec): boolean =>
    l.type === 'calendar' || (l.appearance?.allowedVisualizations ?? []).includes('calendar');

  const calendarLists = allLists.filter((e) => offersCalendar(e.list));

  it('the derivation finds the lists it is meant to cover', () => {
    // Guard the guard: both junctions — the list walk and the `offersCalendar`
    // predicate — would turn every assertion below into a no-op by yielding
    // nothing, and a green suite is exactly what that failure looks like.
    expect(allLists.length, 'no lists parsed out of the view surface').toBeGreaterThan(20);
    const defaults = calendarLists.filter((e) => e.isDefault).map((e) => e.object);
    // The seven default lists #1445 is about, named so a later edit that drops
    // `calendar` from one of them has to say so here rather than silently
    // shrinking the population this suite measures.
    for (const name of [
      'crm_campaign', 'crm_case', 'crm_contract', 'crm_event',
      'crm_opportunity', 'crm_quote', 'crm_task',
    ]) {
      expect(defaults, `${name}'s default list no longer offers a calendar`).toContain(name);
    }
  });

  it.each(calendarLists.map((e) => [`${e.object} / ${e.view}`, e] as const))(
    '%s declares calendar.startDateField',
    (_label, entry) => {
      expect(
        entry.list.calendar?.startDateField,
        `${entry.object} list "${entry.view}" offers a calendar with no ` +
          '`calendar.startDateField` — the renderer would guess one and land every ' +
          'record without it on today. Declare the field, or drop \'calendar\' from ' +
          '`appearance.allowedVisualizations`.',
      ).toBeTruthy();
    },
  );

  it.each(calendarLists.map((e) => [`${e.object} / ${e.view}`, e] as const))(
    '%s dates its calendar with a real date field',
    (_label, entry) => {
      const fields: AnyRec = objects.find((o) => o.name === entry.object)?.fields ?? {};
      const known = fieldsOf(entry.object);
      const cal: AnyRec = entry.list.calendar ?? {};
      const bad: string[] = [];

      for (const key of ['startDateField', 'endDateField', 'titleField', 'colorField']) {
        const name = cal[key];
        if (name && !known.includes(name)) bad.push(`${key} names missing field "${name}"`);
      }
      // Only the two date keys are type-checked: a title or color may legitimately
      // read a select, a text or a lookup. A calendar dated by a non-date field
      // renders nothing at all.
      for (const key of ['startDateField', 'endDateField']) {
        const name = cal[key];
        const type = name ? fields[name]?.type : undefined;
        if (name && type && type !== 'date' && type !== 'datetime') {
          bad.push(`${key} "${name}" is a ${type}, not a date/datetime`);
        }
      }
      expect(bad, `${entry.object} list "${entry.view}":\n  ${bad.join('\n  ')}`).toEqual([]);
    },
  );
});
