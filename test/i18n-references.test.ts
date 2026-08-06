// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import stack from '../objectstack.config';
import {
  type AnyRec,
  objects,
  pages,
  views,
  stackActions,
  objectNames,
  localePacks,
  packFor,
  fieldsOf,
} from './helpers/metadata-fixtures';

/**
 * Translation-completeness guards: every authored surface is translated in
 * every locale, and every translation key resolves to something real.
 *
 * The two halves are one family because they fail the same way. A missing entry
 * does not error — the renderer falls back to the raw stored value, so a
 * fully-translated screen shows `not_a_fit` in the middle of it (#631) — and a
 * key that names nothing (an option keyed by English label instead of by value,
 * a `_views` row for a view the stack no longer ships) is a translation that
 * was written, shipped, and never rendered.
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
 * surface they resolve against; this one owns the four locale bundles.
 *
 * The derivations every one of them shares (`objects`, `views`, `walk`, the
 * locale packs, the platform-object allowlist) live in
 * `test/helpers/metadata-fixtures.ts`. No assertion, helper or fixture changed
 * in the split — see the reconciliation table on the PR.
 */

describe('picklist values never reach the UI unresolved', () => {
  /**
   * A select field stores a VALUE (`ms`, `waiting_customer`, `existing_upgrade`)
   * and the UI resolves it to the locale's label at render time. Every #461
   * defect was that resolution failing, in one of two ways — a lookup that
   * misses (the translation is keyed by something that is not an option value)
   * or a lookup that never happens (a formula splices the stored value straight
   * into a string). Both are invisible in review and only surface as English —
   * or worse, `closed_won` — sitting in an otherwise-translated screen.
   */
  const selectOptionsOf = (objDef: AnyRec, field: string): string[] | undefined => {
    const options = objDef.fields?.[field]?.options;
    return Array.isArray(options) && options.length
      ? options.map((o: AnyRec) => String(o.value))
      : undefined;
  };

  it('option translations are keyed by option VALUE, not by English label', () => {
    // Opportunity `type` was keyed by label ('Existing Customer - Upgrade':
    // '老客户升级'). The resolver matches by value, so deal type rendered in
    // English on every non-en locale while `stage`/`status` — keyed by value —
    // translated fine, which is exactly what made it hard to spot.
    const bad: string[] = [];
    for (const [locale, pack] of localePacks) {
      for (const [objName, objT] of Object.entries<AnyRec>(pack?.objects ?? {})) {
        const objDef = objects.find((o) => o.name === objName);
        if (!objDef) continue; // covered by the key-resolution test below
        for (const [fieldName, fieldT] of Object.entries<AnyRec>(objT?.fields ?? {})) {
          if (!fieldT?.options) continue;
          const values = selectOptionsOf(objDef, fieldName);
          if (!values) {
            bad.push(`${locale}: ${objName}.${fieldName} translates options but the field has none`);
            continue;
          }
          for (const key of Object.keys(fieldT.options)) {
            if (!values.includes(key)) {
              bad.push(`${locale}: ${objName}.${fieldName} option key "${key}" is not an option value`);
            }
          }
        }
      }
    }
    expect(bad, `option translations that resolve to nothing:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('translated object and field keys name real objects and fields', () => {
    // A translation keyed to a renamed/removed field is dead weight that reads
    // as coverage — the bundle looks complete while the screen stays English.
    const bad: string[] = [];
    for (const [locale, pack] of localePacks) {
      for (const [objName, objT] of Object.entries<AnyRec>(pack?.objects ?? {})) {
        if (!objectNames.has(objName)) {
          bad.push(`${locale}: translates "${objName}", which is not a defined object`);
          continue;
        }
        const known = fieldsOf(objName);
        for (const fieldName of Object.keys(objT?.fields ?? {})) {
          if (!known.includes(fieldName)) {
            bad.push(`${locale}: "${objName}" has no field "${fieldName}"`);
          }
        }
      }
    }
    expect(bad, `translations keyed to nothing:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('no formula renders a select field into its output string', () => {
    // `full_name` = joinNonEmpty([salutation, first_name, last_name]) printed
    // "ms Emily Davis"; opportunity `display_title` = name + " - " + stage
    // titled deals "Enterprise Deal - closed_won". The formula language has no
    // option-label lookup (only upper/lower), so a select simply cannot be
    // rendered from a formula — it has to stay its own field.
    //
    // Only RENDERING is flagged. Branching on a select (`record.stage ==
    // "closed_won" ? …`) never puts the value on screen and stays legal.
    const rendersSelect = (source: string, field: string): boolean => {
      const ref = `record\\.${field}\\b`;
      // joinNonEmpty([...]) — every element lands in the output string.
      for (const m of source.matchAll(/joinNonEmpty\(\s*\[([^\]]*)\]/g)) {
        if (new RegExp(ref).test(m[1])) return true;
      }
      // String concatenation on either side: `" - " + record.x` / `record.x + " - "`.
      return new RegExp(`(["']\\s*\\+\\s*${ref})|(${ref}\\s*\\+\\s*["'])`).test(source);
    };

    const bad: string[] = [];
    for (const objDef of objects) {
      for (const [fieldName, field] of Object.entries<AnyRec>(objDef.fields ?? {})) {
        // `expression` is `{ dialect, source }` once the F tag is evaluated.
        const source: unknown = field?.expression?.source ?? field?.expression;
        if (typeof source !== 'string') continue;
        for (const other of Object.keys(objDef.fields ?? {})) {
          if (!selectOptionsOf(objDef, other)) continue;
          if (rendersSelect(source, other)) {
            bad.push(`${objDef.name}.${fieldName} renders select "${other}": ${source}`);
          }
        }
      }
    }
    expect(bad, `formulas printing raw select values:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});

/**
 * Action labels are the most visible strings in the app — they render in row
 * menus, on detail-page headers and in list toolbars. They also had no guard,
 * so #494's i18n audit missed the whole class: three actions
 * (`enroll_leads`, `schedule_followup`, `generate_quote`) shipped with no label
 * entry in ANY locale pack, and `log_meeting` had one only in zh-CN.
 *
 * The gap only became visible as recent PRs surfaced those actions:
 * `generate_quote` moved onto the opportunity header (#515), `enroll_leads`
 * was introduced with the campaign-enrollment screen flow (#536), and
 * `schedule_followup` became the row menu's sole remaining entry once the dead
 * duplicate was removed (#537). A missing entry is not an error — it silently
 * falls back to the English `label` in code — which is exactly why it needs a
 * test rather than a warning.
 */
describe('action labels are translated in every locale', () => {
  it('every action has a label entry in every locale pack', () => {
    expect(localePacks.length, 'no locale packs found in stack.translations').toBeGreaterThan(0);
    const bad: string[] = [];
    for (const action of stackActions) {
      const { name, objectName } = action;
      if (!name || !objectName) continue;
      for (const [locale, pack] of localePacks) {
        const label = pack?.objects?.[objectName]?._actions?.[name]?.label;
        if (!label) bad.push(`${locale}: ${objectName}._actions.${name}.label`);
      }
    }
    expect(bad, `actions with no translated label:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('confirmText and successMessage are translated wherever the action declares them', () => {
    // A half-translated action is worse than an untranslated one: the menu item
    // reads Chinese and then the confirm dialog answers in English.
    const bad: string[] = [];
    for (const action of stackActions) {
      const { name, objectName } = action;
      if (!name || !objectName) continue;
      for (const key of ['confirmText', 'successMessage'] as const) {
        if (!action[key]) continue;
        for (const [locale, pack] of localePacks) {
          const entry = pack?.objects?.[objectName]?._actions?.[name];
          if (entry && !entry[key]) bad.push(`${locale}: ${objectName}._actions.${name}.${key}`);
        }
      }
    }
    expect(bad, `action strings declared in code but not translated:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});

/**
 * Select fields — the field's own label AND every option label — are translated
 * in every locale.
 *
 * The sibling guard above does this for action labels (#494). It was never
 * extended to select fields, and `crm_lead.disqualification_reason` (#631) is
 * what that costs: a `required` field on eight lead forms with no entry in ANY
 * of the four bundles, so the form rendered `not_a_fit` / `no_budget` /
 * `wrong_persona` as raw stored VALUES in the middle of an otherwise fully
 * translated screen.
 *
 * It stayed invisible for the same reason #494's did: a missing entry is not an
 * error. The resolver falls back to the English `label` in code, and in `en`
 * that fallback is indistinguishable from a correct translation — so the only
 * locale a reviewer is likely to open is the one locale where the bug cannot be
 * seen. That is a class a test catches and an eyeball does not.
 *
 * The two neighbouring guards in `picklist values never reach the UI unresolved`
 * check that the entries which DO exist point at something real. This one checks
 * the other direction: that they exist at all. Both are needed — a bundle can be
 * perfectly well-formed and still be empty.
 */
describe('select fields are translated in every locale', () => {
  /**
   * There is no exemption list any more, and re-introducing one is a regression.
   *
   * This guard shipped with a `PENDING_SELECT_LABELS` ledger: 34 fields over 12
   * objects, 111 (locale, field) pairs, ~380 option labels of pre-existing debt
   * that #631 could not fix without burying the one field its PR was about. The
   * ledger was allowed to shrink and never grow, and #645 emptied it. It is gone
   * rather than left behind as an empty object, along with the two assertions
   * that existed only to keep it honest (stale rows, ghost rows) — an empty
   * ledger is an invitation to add a row, and the assertions below say what the
   * ledger was always converging on: every select field, every option value,
   * every locale, no exceptions.
   *
   * A field added or extended from here on therefore fails on the PR that
   * introduces it, which is the whole point.
   */

  /** Every authored select field, with its option VALUES (what the DB stores). */
  const selectFields = objects.flatMap((obj) =>
    Object.entries<AnyRec>(obj.fields ?? {})
      .filter(([, f]) => Array.isArray(f?.options) && f.options.length)
      .map(([fieldName, f]) => ({
        key: `${obj.name}.${fieldName}`,
        objectName: obj.name as string,
        fieldName,
        values: (f.options as AnyRec[]).map((o) => String(o.value)),
      })),
  );

  /** The translation entry for one select field in one locale pack. */
  const entryFor = (pack: AnyRec, objectName: string, fieldName: string): AnyRec | undefined =>
    pack?.objects?.[objectName]?.fields?.[fieldName];

  it('sees a non-trivial set of select fields and locales', () => {
    // Guards the guard: `stack.objects` returning [] (or the translations
    // bundle failing to flatten) would make every assertion below pass by
    // checking nothing — which is exactly how the navigation guard in
    // `test/action-references.test.ts` spent its life green.
    expect(selectFields.length, 'no select fields discovered').toBeGreaterThanOrEqual(40);
    expect(localePacks.length, 'no locale packs found in stack.translations').toBeGreaterThan(0);
  });

  it('every select field has a translated label in every locale', () => {
    const bad: string[] = [];
    for (const { objectName, fieldName } of selectFields) {
      for (const [locale, pack] of localePacks) {
        if (!entryFor(pack, objectName, fieldName)?.label) {
          bad.push(`${locale}: ${objectName}.fields.${fieldName}.label`);
        }
      }
    }
    expect(
      bad,
      `select fields with no translated label:\n  ${bad.join('\n  ')}\n` +
        'Add the entry to src/translations/<locale>.ts — a missing one silently ' +
        'falls back to the English label in code.',
    ).toEqual([]);
  });

  it('every option value has a translated label in every locale', () => {
    // The half of the defect users actually notice. A missing field label reads
    // as an odd column heading; a missing OPTION label puts the raw stored value
    // (`not_a_fit`, `waiting_customer`) into a picklist a rep has to choose from.
    const bad: string[] = [];
    for (const { objectName, fieldName, values } of selectFields) {
      for (const [locale, pack] of localePacks) {
        const options = entryFor(pack, objectName, fieldName)?.options ?? {};
        const missing = values.filter((v) => !options[v]);
        if (missing.length) {
          bad.push(`${locale}: ${objectName}.${fieldName} — ${missing.join(', ')}`);
        }
      }
    }
    expect(
      bad,
      `option values with no translated label:\n  ${bad.join('\n  ')}\n` +
        'These render as the raw stored value in the picklist.',
    ).toEqual([]);
  });

});

/**
 * EVERY locale is complete on every translatable surface, not just on select
 * options.
 *
 * The guard above covers ONE surface — picklist option labels. It says nothing
 * about the other four an authored bundle owns (field labels/help, page header
 * copy, dashboard widget titles, list-view empty states), and those are exactly
 * where the gaps sat: every page in the app rendered its header, nav label and
 * breadcrumb in English in three of four locales, and the Sales-dashboard
 * win/loss widgets did the same.
 *
 * Nothing in CI could have caught that. `pnpm lint` runs with `--skip-i18n`,
 * and `objectstack lint` exits 0 on warnings regardless — so the i18n rules
 * that DO find these gaps are switched off in the one place that would fail a
 * PR. This suite is the only gate, which is why the assertions live here rather
 * than in a lint config.
 *
 * This started as a zh-CN-only guard, because zh-CN was completed first ahead
 * of a customer trial while `en` / `ja-JP` / `es-ES` still carried the debt in
 * #645 and #494. That debt is now paid, so the guard covers all four — which
 * was always the stated finish line, and is the only version of it that stops
 * the next locale from drifting.
 *
 * Derived from `localePacks` rather than a hard-coded list: a fifth locale
 * added to the bundle is held to the same bar the day it appears, instead of
 * silently enjoying an exemption nobody wrote down.
 *
 * ### The surface list is derived from the METADATA, never from lint's categories
 *
 * The `_sections` assertion below was missing from the first version of this
 * guard, and its absence is the lesson the rest of the file should be read
 * against. The surfaces were chosen by reading off `objectstack lint`'s warning
 * categories — missing-option / -field / -navigation / -page / -action / -view
 * / -widget / -object. There is no `_sections` category, so sections were never
 * considered, and the guard inherited the linter's blind spot while reporting
 * that every locale was complete.
 *
 * What that cost: 83 of 85 section headings were untranslated in `ja-JP` and
 * `es-ES`, so a Japanese user read "Basic Information" and "Ownership & Status"
 * on every record page under an otherwise fully Japanese UI — while lint
 * reported zero i18n warnings for that locale (#683).
 *
 * A tool's warning list is a record of what someone thought to check, not of
 * what exists. Every assertion here therefore walks the metadata itself and
 * asks what it declares; none of them asks a linter what it noticed.
 */
describe('every locale is complete on every authored surface', () => {
  const packs = (): [string, AnyRec][] => {
    // Guards the guard: an empty list would make every assertion below pass by
    // checking nothing — how the navigation guard in
    // `test/action-references.test.ts` spent its life.
    expect(localePacks.length, 'no locale packs found in stack.translations').toBeGreaterThan(0);
    return localePacks;
  };

  it('every authored field label and help string is translated', () => {
    const bad: string[] = [];
    for (const [locale, pack] of packs()) {
      for (const obj of objects) {
        const fields = pack.objects?.[obj.name]?.fields ?? {};
        for (const [name, f] of Object.entries<AnyRec>(obj.fields ?? {})) {
          // `help` mirrors the authored `description` — the field-level spelling
          // differs between the two surfaces (spec: FieldTranslationSchema).
          if (f?.label && !fields[name]?.label) bad.push(`${locale}: ${obj.name}.${name}.label`);
          if (f?.description && !fields[name]?.help) bad.push(`${locale}: ${obj.name}.${name}.help`);
        }
      }
    }
    expect(bad, `fields with no translation:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('every page has translated nav copy and header copy', () => {
    const bad: string[] = [];
    for (const [locale, pack] of packs()) {
      for (const page of pages) {
        const t = pack.pages?.[page.name];
        if (page.label && !t?.label) bad.push(`${locale}: ${page.name}.label`);
        if (page.description && !t?.description) bad.push(`${locale}: ${page.name}.description`);

        // A page's header copy is addressed by the PAGE name: `page:header`
        // instances carry no stable id, so `pages.<name>.title` / `.subtitle` are
        // the only keys that reach them. `title` legitimately falls back to
        // `label`, so it is only required when the two differ.
        const header = (page.regions ?? [])
          .flatMap((r: AnyRec) => r.components ?? [])
          .find((c: AnyRec) => c?.type === 'page:header');
        const title = header?.properties?.title;
        const subtitle = header?.properties?.subtitle;
        if (title && title !== page.label && !t?.title) bad.push(`${locale}: ${page.name}.title`);
        if (subtitle && !t?.subtitle) bad.push(`${locale}: ${page.name}.subtitle`);
      }
    }
    expect(bad, `pages with untranslated copy:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('every dashboard widget has a translated title and description', () => {
    const dashboards: AnyRec[] = (stack as any).dashboards ?? [];
    const bad: string[] = [];
    for (const [locale, pack] of packs()) {
      for (const d of dashboards) {
        const widgets = pack.dashboards?.[d.name]?.widgets ?? {};
        for (const w of d.widgets ?? []) {
          if (!w?.id) continue;
          if (w.title && !widgets[w.id]?.title) bad.push(`${locale}: ${d.name}.${w.id}.title`);
          if (w.description && !widgets[w.id]?.description) {
            bad.push(`${locale}: ${d.name}.${w.id}.description`);
          }
        }
      }
    }
    expect(bad, `widgets with no translated copy:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('every view empty state is translated', () => {
    // The empty state is the ONE string a view shows when it has no rows — the
    // exact moment a trial user is most likely to be reading it.
    const bad: string[] = [];
    for (const [locale, pack] of packs()) {
      for (const record of views) {
        const containers: [string, AnyRec][] = [
          ...(record.list ? [['list', record.list] as [string, AnyRec]] : []),
          ...Object.entries<AnyRec>(record.listViews ?? {}),
        ];
        for (const [key, view] of containers) {
          const empty = view?.emptyState;
          if (!empty?.title && !empty?.message) continue;
          const objectName = view?.data?.object ?? record.list?.data?.object ?? record.object;
          const name = view?.name ?? key;
          const t = pack.objects?.[objectName]?._views?.[name]?.emptyState;
          if (empty.title && !t?.title) bad.push(`${locale}: ${objectName}.${name}.emptyState.title`);
          if (empty.message && !t?.message) {
            bad.push(`${locale}: ${objectName}.${name}.emptyState.message`);
          }
        }
      }
    }
    expect(bad, `empty states with no translated copy:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  /**
   * ── View LABELS, the surface with no gate at all (#783, #767) ────────────
   *
   * The empty-state guard above covers the string a view shows when it has NO
   * rows. Its label — the tab caption a user reads on every visit — had no
   * guard of any kind, and two separate reviews found gaps by comparing the
   * four bundles column by column with human eyes.
   *
   * Nothing mechanical could have found them:
   *
   *  - `pnpm lint` hard-codes `--skip-i18n`. Dropping the flag does not report
   *    these either — the run emits one line, `platform built-ins: 2298 i18n
   *    issue(s) hidden`, because app-authored `_views` completeness is not in
   *    the set the linter checks at all. So this is NOT the #494 family (real
   *    warnings suppressed by a flag); it is a surface nobody was checking.
   *  - Every gap was in `en`, and in the source locale a missing key is
   *    invisible: the resolver falls back to the metadata `label`, which is
   *    already correct English. #679 wrote this down for select options, page
   *    copy and empty states — "a missing key and a correct one render
   *    identically" — and ruled it a defect anyway, because every other bundle
   *    is authored by mirroring this one's shape: a view with no slot in `en`
   *    is a view the next translator has nowhere to put.
   *
   * The requirement is therefore the same one the select-field guard states,
   * applied to view labels: every canonical view, every locale, no exemptions.
   * No ledger is introduced here — the nine rows this guard was born red on
   * (`crm_task.todays_tasks` / `overdue_tasks` from #783, `crm_lead.hot_leads`
   * / `crm_account.renewals_due` / `at_risk_accounts` from #767, and the four
   * `crm_case` / `crm_opportunity` rows the derivation turned up beside them)
   * were closed in the same PR. An empty ledger is an invitation to add a row.
   */

  /**
   * Every canonical list view in the stack, as `{ object, name }`.
   *
   * Derived from the compiled stack rather than from a hand-kept list, which
   * is the whole point: a view added tomorrow is held to the bar on the PR
   * that adds it, without anyone remembering to extend a fixture. Same
   * container walk as the empty-state guard above — a view record carries one
   * default `list` plus a `listViews` map, and both are user-visible tabs.
   */
  const canonicalViews = (): Array<{ object: string; name: string; label?: string }> =>
    views.flatMap((record) => {
      const containers: [string, AnyRec][] = [
        ...(record.list ? [['list', record.list] as [string, AnyRec]] : []),
        ...Object.entries<AnyRec>(record.listViews ?? {}),
      ];
      return containers.map(([key, view]) => ({
        object: view?.data?.object ?? record.list?.data?.object ?? record.object,
        name: view?.name ?? key,
        label: view?.label,
      }));
    });

  it('sees a non-trivial set of canonical views and a _views table in every locale', () => {
    // Guards the guard. The three assertions below iterate derived collections,
    // and all would pass by checking nothing if `stack.views` came back empty, if
    // the container walk stopped yielding, or if a bundle's `_views` tables
    // failed to flatten — the exact way the navigation guard in
    // `test/action-references.test.ts` spent its life green.
    const derived = canonicalViews();
    expect(derived.length, 'no canonical list views discovered').toBeGreaterThanOrEqual(50);
    expect(
      new Set(derived.map((v) => v.object)).size,
      'canonical views collapsed onto too few objects — derivation is broken',
    ).toBeGreaterThanOrEqual(10);
    expect(
      derived.filter((v) => typeof v.object === 'string' && typeof v.name === 'string').length,
      'some canonical view resolved no object or no name',
    ).toBe(derived.length);

    for (const [locale, pack] of packs()) {
      const tables = Object.values<AnyRec>(pack.objects ?? {}).filter((o) => o?._views);
      expect(tables.length, `${locale}: no _views table parsed out of the bundle`).toBeGreaterThan(0);
    }
  });

  it('every canonical view label is translated in every locale', () => {
    const bad: string[] = [];
    for (const [locale, pack] of packs()) {
      for (const { object, name } of canonicalViews()) {
        if (!pack.objects?.[object]?._views?.[name]?.label) {
          bad.push(`${locale}: ${object}._views.${name}.label`);
        }
      }
    }
    expect(
      bad,
      `canonical views with no translated label:\n  ${bad.join('\n  ')}\n` +
        'Add the entry to src/translations/<locale>.ts. In en the gap is ' +
        'invisible — the resolver falls back to the metadata label — which is ' +
        'why it needs a test rather than a reviewer.',
    ).toEqual([]);
  });

  it('no locale carries a _views entry for a view the stack does not ship', () => {
    // The other direction of the same parity. A renamed or deleted view leaves
    // four orphan entries behind, and an orphan is worse than a gap: it reads
    // as coverage while translating nothing, and the next person to add a view
    // by that name inherits a stale label.
    const shipped = new Set(canonicalViews().map(({ object, name }) => `${object}.${name}`));
    const bad: string[] = [];
    for (const [locale, pack] of packs()) {
      for (const [object, entry] of Object.entries<AnyRec>(pack.objects ?? {})) {
        for (const name of Object.keys(entry?._views ?? {})) {
          if (!shipped.has(`${object}.${name}`)) bad.push(`${locale}: ${object}._views.${name}`);
        }
      }
    }
    expect(bad, `_views entries naming no shipped view:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('the en view label is the canonical label verbatim, so a rename cannot pass silently', () => {
    // What the parity assertion above CANNOT catch, and #767's actual concern:
    // the key exists in all four bundles and the metadata label is then edited.
    // Before this pin, `en` tracked the rename for free (its entry is a copy of
    // the same English string, and where it was missing the resolver fell back),
    // while zh-CN / ja-JP / es-ES kept translating the OLD name — four bundles
    // describing two different views, with nothing red.
    //
    // Holding `en` byte-identical to the metadata label is what converts that
    // into a build failure: rename `⏰ Open Tasks · Most Overdue First` and this
    // goes red, which puts the author in the translations file with all four
    // locales in front of them. Be honest about the limit — it proves the
    // ENGLISH pair agrees, and nothing here can verify that a human then
    // re-translated the other three. It makes the rename loud; it does not make
    // it correct.
    //
    // This is not a new rule so much as the one the bundle already followed:
    // all 61 `en` view labels that existed when this landed were already
    // byte-identical to their metadata label, because #679 extracted them
    // programmatically from `objectstack.config` rather than transcribing them.
    // If English ever genuinely wants to read differently from the metadata,
    // the fix is contract-first — correct the `label` in `*.view.ts`, the one
    // place every locale is derived from — not to let two English strings drift.
    const en = packFor('en');
    expect(en, 'no en pack in stack.translations').toBeTruthy();
    const bad: string[] = [];
    for (const { object, name, label } of canonicalViews()) {
      if (typeof label !== 'string') continue;
      const translated = en?.objects?.[object]?._views?.[name]?.label;
      if (typeof translated === 'string' && translated !== label) {
        bad.push(`${object}.${name}: metadata "${label}" vs en "${translated}"`);
      }
    }
    expect(bad, `en view labels that drifted from the metadata label:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('every action parameter label is translated', () => {
    // A param label is the field caption inside an action's modal — untranslated,
    // it is a bare English word on an otherwise localized form.
    const bad: string[] = [];
    for (const [locale, pack] of packs()) {
      for (const action of stackActions) {
        if (!action.objectName) continue;
        const params = pack.objects?.[action.objectName]?._actions?.[action.name]?.params ?? {};
        for (const p of action.params ?? []) {
          const key = p?.name ?? p?.field;
          if (key && p?.label && !params[key]?.label) {
            bad.push(`${locale}: ${action.objectName}.${action.name}.params.${key}.label`);
          }
        }
      }
    }
    expect(bad, `action params with no translated label:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  /**
   * Section headings — the surface `objectstack lint` cannot see (#683).
   *
   * A section is named in two independent places, and both must be collected or
   * the requirement is understated:
   *
   *  1. Every distinct `group` on an object's fields. `fieldGroups` declares the
   *     English heading for each, but a group used by a field and absent from
   *     `fieldGroups` still renders a heading, so the FIELDS are the authority
   *     for which sections exist.
   *  2. Every `sections[].name` in the page and view tree — at ANY depth. Detail
   *     pages nest them inside `page:tabs` → components → `properties.sections`,
   *     and a shallow walk silently misses exactly those, which is how a first
   *     pass at this derivation under-counted by nine.
   */
  const sectionsByObject = (): Map<string, Set<string>> => {
    const need = new Map<string, Set<string>>();
    const add = (objectName?: string, name?: string) => {
      if (!objectName || !name) return;
      if (!need.has(objectName)) need.set(objectName, new Set());
      need.get(objectName)!.add(name);
    };

    for (const obj of objects) {
      for (const f of Object.values<AnyRec>(obj.fields ?? {})) add(obj.name, f?.group);
    }

    const walk = (node: AnyRec | AnyRec[] | undefined, bound?: string): void => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) { for (const x of node) walk(x, bound); return; }
      const here = node.object ?? node.properties?.object ?? node.data?.object ?? bound;
      for (const arr of [node.sections, node.properties?.sections]) {
        if (Array.isArray(arr)) for (const s of arr) add(here, s?.name);
      }
      // `fields` is skipped: it is a map of field definitions, not layout, and
      // descending into it would attribute a field named `sections` as layout.
      for (const [key, value] of Object.entries(node)) {
        if (key !== 'fields' && value && typeof value === 'object') walk(value as AnyRec, here);
      }
    };
    for (const page of pages) walk(page, page.object);
    for (const view of views) walk(view, view.object ?? view.list?.data?.object);

    return need;
  };

  it('sees a non-trivial set of sections to check', () => {
    // Without this, a derivation that silently returned nothing would make the
    // assertion below pass while checking nothing — the failure mode this whole
    // describe block exists to rule out.
    const need = sectionsByObject();
    const total = [...need.values()].reduce((n, s) => n + s.size, 0);
    expect(need.size, 'no objects declare sections — derivation is broken').toBeGreaterThan(10);
    expect(total, 'suspiciously few sections found — derivation is broken').toBeGreaterThan(60);
  });

  it('every form and detail-page section heading is translated', () => {
    const need = sectionsByObject();
    const bad: string[] = [];
    for (const [locale, pack] of packs()) {
      for (const [objectName, names] of need) {
        const translated = pack.objects?.[objectName]?._sections ?? {};
        for (const name of names) {
          if (!translated[name]?.label) bad.push(`${locale}: ${objectName}.${name}`);
        }
      }
    }
    expect(bad, `section headings with no translation:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});
