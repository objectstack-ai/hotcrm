// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { AgentSchema } from '@objectstack/spec/ai';
import { ComponentPropsMap, RecordActivityProps, RecordRelatedListProps } from '@objectstack/spec/ui';
import stack from '../objectstack.config';
import {
  type AnyRec,
  objects,
  pages,
  views,
  objectNames,
  profileNames,
  PLATFORM_OBJECTS,
  fieldsOf,
  walk,
} from './helpers/metadata-fixtures';

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
 *
 * ---
 *
 * SPLIT BY FAMILY (#814) — where the other guards went.
 *
 * This file reached 99,872 bytes against the 100KB ceiling in
 * `scripts/check-source-hygiene.mjs`, so the next PR to add a guard would have
 * been failed by `pnpm hygiene` before review (#815 had already been forced
 * into one unplanned split for that reason). It now keeps the PAGE, FORM and
 * cross-surface guards; three siblings own the rest, and each holds the whole
 * family so a reader lands on the guard in one hop:
 *
 *   `test/view-references.test.ts`
 *     view field references resolve · priority queues sort by urgency, not
 *     alphabetically · filter template tokens are resolvable · row colors and
 *     kanban groups key off real option values · every canonical opportunity
 *     stage reaches the UI that enumerates stages · every named list view is
 *     reachable
 *
 *   `test/action-references.test.ts`
 *     navigation reaches everything the app ships · dashboard actions land on
 *     real routes · list-level action references resolve · dashboard date
 *     ranges window a field the query layer can actually compare
 *
 *   `test/i18n-references.test.ts`
 *     picklist values never reach the UI unresolved · action labels are
 *     translated in every locale · select fields are translated in every
 *     locale · every locale is complete on every authored surface
 *
 *   `test/bulk-action-dispatch.test.ts` (split earlier, by #815)
 *     the `bulkActionDefs` / `execution: 'aggregate'` dispatch contract
 *
 * The derivations all four share live in `test/helpers/metadata-fixtures.ts`.
 * The split moved text only: no assertion, helper or fixture changed, and the
 * suite runs the same 70 tests it ran before.
 */

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

  /**
   * A related list's `filter` is authored in ONE shape, and the component
   * accepts only that one (#1248).
   *
   * `RecordRelatedListProps.filter` (`ComponentPropsMap`, `@objectstack/spec/ui`)
   * is an array of rule OBJECTS — `{ field, operator, value }`, `operator` drawn
   * from a closed vocabulary. Two other spellings look plausible and reached
   * `main` anyway, one of them three times over:
   *
   *   filter: [{ field: 'status', op: 'neq', value: 'completed' }]  // `op`/`neq`
   *   filter: [['status', '!=', 'completed']]                        // AST array
   *
   * Neither is a second dialect. The AST array is the spelling a `*.flow.ts`
   * node `config` takes and `op:` is nothing's spelling at all, and both were
   * authored here because a nearby surface reads that way — which is exactly
   * why a grep for one of them misses the other.
   *
   * What made all three survive review is that NOTHING red went off. The props
   * bag is `z.record(z.string(), z.unknown())` on `PageComponent`, so a rejected
   * rule is dropped, not refused: `objectstack build` prints an advisory
   * `component-props-invalid` / `component-props-unknown-key` warning among ~80
   * others and still exits 0, the artifact still writes, and the list still
   * renders — unfiltered. A heading reading "Open Tasks" over every task,
   * completed ones included, is the whole symptom.
   *
   * So the legal shape comes from the contract itself, never from a list copied
   * into this file — the same discipline the `record:activity` guard below
   * states, applied to the prop next to it.
   */
  const relatedLists = components.filter((c) => c.type === 'record:related_list');

  it('every record:related_list filter is in the shape the props contract accepts', () => {
    const filtered = relatedLists.filter((c) => c.properties?.filter !== undefined);
    expect(
      filtered.length,
      'no related list authors a filter — this guard would be vacuous',
    ).toBeGreaterThan(0);

    const bad: string[] = [];
    for (const c of filtered) {
      const parsed = RecordRelatedListProps.shape.filter.safeParse(c.properties.filter);
      if (parsed.success) continue;
      for (const issue of parsed.error.issues) {
        bad.push(`${c.id}: filter.${issue.path.join('.')} ${issue.message}`);
      }
    }
    expect(bad, `related-list filters the component drops:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  /**
   * The other half: a filter that PARSES can still be missing.
   *
   * Every `crm_task` related list in this app is an open-tasks surface — the
   * promise is authored on two different nodes (`opp_tasks` and `case_tasks`
   * inherit it from their tab's `label: 'Open Tasks'`; `related_tasks` carries
   * its own `title: 'Open Tasks'`), so this guard keys off the object the list
   * shows rather than off where the heading happens to sit. All three shipped
   * unfiltered for as long as the shapes above were wrong, and deleting the
   * `filter` key entirely would restore exactly that symptom while leaving the
   * shape guard green.
   *
   * A future task list that deliberately shows completed work is fine — it just
   * has to say so here, which is the point of pinning the promise and not the
   * bytes.
   */
  it('every crm_task related list actually excludes completed tasks', () => {
    const taskLists = relatedLists.filter((c) => c.properties?.objectName === 'crm_task');
    expect(taskLists.length, 'no crm_task related list found — this guard would be vacuous').toBe(3);

    const excludesCompleted = (rule: AnyRec) =>
      rule?.field === 'status' &&
      ((rule.operator === 'not_equals' && rule.value === 'completed') ||
        (rule.operator === 'not_in' && (rule.value as unknown[])?.includes?.('completed')));

    const bad = taskLists
      .filter((c) => !((c.properties?.filter ?? []) as AnyRec[]).some(excludesCompleted))
      .map((c) => `${c.id}: no filter rule excludes status "completed" — the list is headed "Open Tasks"`);
    expect(bad, `task lists that promise open tasks and show every task:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  /**
   * `record:reference_rail` entries are the one page reference the dangling-name
   * guards above never reached. An entry is a bare object inside
   * `properties.entries` — it carries no `type`, so `walk` does not yield it —
   * and the platform declares no schema for it either: `record:reference_rail`
   * has no row in the spec's `ComponentPropsMap`, and a page component's
   * `properties` is `z.record(z.string(), z.unknown())`. Nothing between the
   * authored file and the browser reads these names before the rail queries
   * them, so a typo is a card that silently comes back empty and — because
   * `hideEmpty` defaults on — folds itself away.
   */
  const railEntries = components
    .filter((c) => c.type === 'record:reference_rail')
    .flatMap((c) => ((c.properties?.entries ?? []) as AnyRec[]).map((e) => ({ id: c.id, entry: e })));

  it('every record:reference_rail entry names a real object and a real relationship field', () => {
    expect(railEntries.length, 'no rail entries found — this guard would be vacuous').toBeGreaterThan(0);
    const bad: string[] = [];
    for (const { id, entry } of railEntries) {
      const objectName = entry.objectName;
      if (!objectNames.has(objectName)) {
        bad.push(`${id}: objectName "${objectName}" is not a defined object`);
        continue;
      }
      const relField = entry.relationshipField;
      if (relField && !fieldsOf(objectName).includes(relField)) {
        bad.push(`${id}: "${objectName}" has no field "${relField}"`);
      }
    }
    expect(bad, `dangling reference-rail references:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  /**
   * A rail card's heading resolves as
   * `entry.title || i18n.objectLabel({ name: objectName, … })`. A literal
   * `title` does not supply a default — it wins outright, and the locale bundle
   * is never consulted, so one English string overrides all four locale packs
   * at once (#972). Nor can the literal itself be translated: the rail renders
   * `entry.title` as a raw React child, unlike `record:alert`, which runs its
   * `title` through the inline translation-map resolver.
   *
   * So: until the rail gains a translated-title channel, "declares a title" and
   * "is untranslatable" are the same fact, and the only correct number of
   * literals is zero. The other half of this guard — that dropping the literal
   * lands on a *translation* rather than on a humanized object name — is
   * `test/i18n-references.test.ts`, which requires `objects.<name>.label` in
   * every locale for exactly these objects.
   */
  it('no record:reference_rail entry declares a literal title', () => {
    const bad = railEntries
      .filter(({ entry }) => entry.title !== undefined)
      .map(({ id, entry }) => `${id}: "${entry.objectName}" declares title ${JSON.stringify(entry.title)}`);
    expect(
      bad,
      `reference-rail titles override the localized object label:\n  ${bad.join('\n  ')}`,
    ).toEqual([]);
  });

  /**
   * The same rail entry has no filter channel either: the rail issues
   * `find(objectName, { $filter: { [relationshipField]: parentId }, $top: limit,
   * $count: true })` and reads nothing else off the entry. Because `properties`
   * is an unvalidated `z.record`, a `filter` written here would parse, ship, and
   * do nothing — the card would keep counting every related record while the
   * source claimed otherwise. That is the trap this guard exists to spring: an
   * author reaching for the *Related* tab's `status neq completed` and putting
   * it on a rail entry gets a red test instead of a silent lie.
   */
  it('no record:reference_rail entry declares a filter the rail cannot apply', () => {
    const bad = railEntries
      .filter(({ entry }) => entry.filter !== undefined)
      .map(({ id, entry }) => `${id}: "${entry.objectName}" declares a filter; the rail queries on the relationship alone`);
    expect(bad, `inert reference-rail filters:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  /**
   * `record:activity`'s `types` is keyed on FEED ITEM KIND, not on object name
   * (#1209).
   *
   * The guard that used to stand here asserted the opposite — that every entry
   * resolves to an object this app defines — and so it held the lead page's
   * `types: ['crm_task']` in place, green, for as long as it existed. Nothing
   * else could catch it: the page schema's `properties` is an open bag
   * (`z.record(z.string(), z.unknown())`), so an illegal value is stored
   * verbatim rather than rejected, and `build` says exactly that beside its
   * warning ("the props bag is not parsed on the storage path either, so
   * nothing rejects this today", objectstack#5068). Downstream, the console
   * renderer sanitises the array itself: it drops members outside the enum and
   * then reads the EMPTY remainder as "no filter authored". Measured against
   * the shipped bundle, `types: ['crm_task']`, `types: []` and omitting `types`
   * render byte-identical unfiltered streams — which is why the lead's Activity
   * tab showed `Created Lead` / `Updated Lead` audit rows.
   *
   * So the legal values come from the contract itself — `RecordActivityProps`
   * in `@objectstack/spec/ui` — never from a list copied into this file, which
   * is how the old guard drifted from the prop it claimed to check.
   */
  it('record:activity filters on feed-item kinds the props contract accepts, never on object names', () => {
    const bad: string[] = [];
    for (const c of components) {
      if (c.type !== 'record:activity') continue;
      const types = c.properties?.types;
      if (types === undefined) continue; // absent = show every kind, always legal
      const parsed = RecordActivityProps.shape.types.safeParse(types);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          bad.push(`${c.id}: types[${issue.path.join('.')}] ${issue.message}`);
        }
        continue;
      }
      // Legal but inert: the renderer's sanitiser turns an empty list back into
      // "no filter", so an author asking for nothing is served everything.
      if (Array.isArray(types) && types.length === 0) {
        bad.push(`${c.id}: types is [] — the renderer reads that as "unfiltered", not "empty". Omit the key or name the kinds.`);
      }
    }
    expect(bad, `record:activity type filters that cannot do what they say:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  /**
   * The `task` kind is unreachable without `showCompleted` (#1209).
   *
   * `sys_activity.type: 'completed'` is the row HotCRM's own `log_call`,
   * `log_meeting` and `send_email` bodies write, and the renderer maps it to
   * feed kind `task`. But its `showCompleted` gate strips every `task` item
   * BEFORE the `types` filter runs, so `types: ['task']` with the default
   * `showCompleted: false` renders a guaranteed-empty tab — the same "success
   * receipt for configuration that does nothing" shape as the bug above, one
   * prop over, and invisible to `build` because both values are individually
   * legal.
   */
  it('record:activity filtering to "task" turns showCompleted on, or it renders nothing', () => {
    const bad: string[] = [];
    for (const c of components) {
      if (c.type !== 'record:activity') continue;
      const types = c.properties?.types;
      if (!Array.isArray(types) || !types.includes('task')) continue;
      if (c.properties?.showCompleted !== true) {
        bad.push(`${c.id}: types includes "task" but showCompleted is ${JSON.stringify(c.properties?.showCompleted)} — the renderer drops every task item before the filter runs`);
      }
    }
    expect(bad, `guaranteed-empty activity timelines:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  /**
   * ── The general form of the two guards above (#1269) ──────────────────────
   *
   * EVERY page component's `properties` bag, parsed against ITS OWN entry in
   * the spec's `ComponentPropsMap`. The two guards above pin one prop each
   * (`record:related_list.filter`, `record:activity.types`) because those were
   * the props somebody had already got wrong; this one closes the class they
   * belong to, and it does not depend on anyone noticing the next instance.
   *
   * WHY A GUARD AND NOT A BUILD CHECK. `PageComponent.properties` is
   * `z.record(z.string(), z.unknown())`, so a key the component does not
   * declare is DROPPED, not refused: the page builds, the artifact writes, the
   * component renders — minus whatever the key was meant to configure.
   * `objectstack build` does report each one as an advisory
   * `component-props-invalid` / `component-props-unknown-key` warning and still
   * exits 0, and its printer caps the detail list at 50 entries with no
   * "…and N more" line (objectstack#11529), so the visible count is a floor,
   * never a total. 75 of these had accumulated across all eight pages by the
   * time anyone counted. Zero printed warnings is corroboration; THIS is the
   * measurement.
   *
   * WHAT COUNTS AS A PAGE COMPONENT. `walk` yields every object carrying a
   * string `type`, which on these pages includes things that are not
   * components at all: the ActionDefs inlined into `page:header.actions`
   * (`type: 'script'` / `'flow'`) and their params (`type: 'text'`,
   * `'lookup'`, `'date'`, …). A page component also carries an `id`; an
   * ActionDef and an action param carry a `name` and no `id`. That is the
   * split used below — measured, not assumed: every one of the 18 component
   * types these pages author has an `id`, and none of the 8 action-shaped
   * types does.
   */
  const PAGE_COMPONENTS = components.filter((c) => typeof c.id === 'string');

  /**
   * Component types this app authors that the spec declares NO props contract
   * for, so nothing can parse them. Shrink-only: adding a line needs a reason.
   *
   *   list-view — the embedded saved-view panel `home.page.ts` builds for each
   *   Sales Home tab. `ComponentPropsMap` has no `list-view` row, so its
   *   `properties` (objectName / viewType / columns / filter / sort) are
   *   checked by the field- and view-reference guards in this file and in
   *   `test/view-references.test.ts`, and by nothing schema-shaped.
   *
   * The staleness half matters as much as the list: when the spec grows a row
   * for one of these, the exemption must go so the type joins the parse below.
   */
  const NO_PROPS_CONTRACT = new Set(['list-view']);

  it('every page component type has a props contract to parse against', () => {
    expect(
      PAGE_COMPONENTS.length,
      'no page components were found — this guard and the one below would be vacuous',
    ).toBeGreaterThan(0);

    const map = ComponentPropsMap as Record<string, unknown>;
    const uncovered = [
      ...new Set(
        PAGE_COMPONENTS.filter((c) => !map[c.type] && !NO_PROPS_CONTRACT.has(c.type)).map(
          (c) => c.type as string,
        ),
      ),
    ];
    expect(
      uncovered,
      `page component types with no ComponentPropsMap row — the guard below cannot check these:\n  ${uncovered.join('\n  ')}`,
    ).toEqual([]);

    // An exemption outlives its reason only if nobody checks. Both directions:
    // a type that gained a contract must be parsed, and a type this app no
    // longer authors must not keep its line.
    const stale = [...NO_PROPS_CONTRACT].filter(
      (t) => !!map[t] || !PAGE_COMPONENTS.some((c) => c.type === t),
    );
    expect(
      stale,
      `NO_PROPS_CONTRACT entries that gained a contract or are no longer authored — delete these lines:\n  ${stale.join('\n  ')}`,
    ).toEqual([]);
  });

  /**
   * Props the components drop, that are NOT this card's to fix — each named,
   * dated and owned, so the debt is visible instead of invisible.
   *
   * Keyed `page.name/component.id :: prop`, where `prop` is the issue path
   * with array indices collapsed to `[]` (so a finding survives its list being
   * reordered, and the five rejected entries of one `actions` array are one
   * line rather than five).
   *
   *   …/*_header :: actions[] — the spec and the renderer disagree about this
   *   key, and the source can only satisfy one of them. `PageHeaderProps.actions`
   *   is `z.array(z.string())` ("Action IDs"), but objectui's canonical
   *   `page:header` renderer consumes ActionDef OBJECTS: it filters the array
   *   through `actionRendersAt(a, 'record_header')`, reads `a.requiredPermissions`
   *   / `a.visible` / `a.name` / `a.order`, and every test it ships authors
   *   objects. A string has no `.locations`, so rewriting these four arrays as
   *   ids would turn this guard green and delete every header button from four
   *   record pages — Convert Lead, Generate Quote, Escalate Case, and the
   *   activity trio #592 put there. Deciding which side moves is a product
   *   call, not a conformance edit. Filed as #1279, which carries the
   *   renderer evidence and the three ways out.
   *
   *   …/*_details :: sections[].collapsible — the same disagreement pointing
   *   the other way. `RecordDetailsProps`' section shape is strict
   *   `{ name?, label?, columns?, fields }`, but objectui's record-details
   *   renderer spreads the authored section through (`...s`) into
   *   `DetailSection`, which reads `section.collapsible` and renders a
   *   `<Collapsible>` card with a chevron. So this key WORKS today: deleting it
   *   to satisfy the schema would remove a working affordance from both
   *   Description sections. The spec's own rule (#5611/#6276 — the delivered
   *   shape is the contract, which is how `alwaysShowStrip`, `maxVisible`,
   *   `inlineEdit` and `hideFields` came to be declared) says the declaration
   *   is what should move — and that is already filed upstream, with the same
   *   measurement plus its `hideEmpty` sibling, as
   *   objectstack-ai/objectstack#11289 (via #1249).
   *
   *   sales_home_page/ai_briefing :: description — `page:card` does not declare
   *   `description`, so the paragraph renders nowhere; the fix is to move the
   *   copy into an `element:text` child. It is pinned where it is by the #1002
   *   persona guard at the bottom of this file, which reads
   *   `properties.description` and encodes a maintainer ruling, so relocating
   *   it means rewriting a ruling-backed guard. Filed as #1216.
   */
  const KNOWN_UNCONFORMING = new Set([
    'account_detail_page/account_header_slotted :: actions[]',
    'case_detail_page/case_header :: actions[]',
    'lead_detail_page/lead_header :: actions[]',
    'opportunity_detail_page/opp_header :: actions[]',
    'case_detail_page/case_details :: sections[].collapsible',
    'opportunity_detail_page/opp_details :: sections[].collapsible',
    'sales_home_page/ai_briefing :: description',
  ]);

  it("every page component's properties parse against its own ComponentPropsMap entry", () => {
    const map = ComponentPropsMap as Record<string, { safeParse: (v: unknown) => any }>;

    /** Issue path → prop label: numeric segments collapse to `[]`. */
    const propLabel = (path: readonly unknown[], key?: string): string => {
      const parts = path.map((p) => (typeof p === 'number' ? '[]' : String(p)));
      const joined = parts.reduce<string>(
        (acc, p) => (p === '[]' ? `${acc}[]` : acc ? `${acc}.${p}` : p),
        '',
      );
      if (!key) return joined || '<component>';
      return joined ? `${joined}.${key}` : key;
    };

    const found = new Set<string>();
    const bad: string[] = [];
    const pagesSeen = new Set<string>();
    const parsedTypes = new Set<string>();
    let parsed = 0;

    for (const page of pages) {
      for (const c of [...walk(page.regions), ...walk(page.slots)] as AnyRec[]) {
        if (typeof c.id !== 'string') continue;
        const schema = map[c.type];
        if (!schema) continue; // covered by the guard above
        parsed++;
        pagesSeen.add(page.name);
        parsedTypes.add(c.type as string);
        const result = schema.safeParse(c.properties ?? {});
        if (result.success) continue;
        for (const issue of result.error.issues) {
          // `unrecognized_keys` reports every rejected key of one object in a
          // single issue, so it expands to one finding per key.
          const keys: (string | undefined)[] =
            issue.code === 'unrecognized_keys' ? (issue.keys as string[]) : [undefined];
          for (const key of keys) {
            const where = `${page.name}/${c.id} :: ${propLabel(issue.path, key)}`;
            found.add(where);
            if (KNOWN_UNCONFORMING.has(where)) continue;
            bad.push(`${where} [${c.type}] ${issue.message}`);
          }
        }
      }
    }

    // ── Non-vacuity ──────────────────────────────────────────────────────
    // Three ways a later refactor could empty this rule while it kept
    // reporting clean, each closed by a check that does not read the same
    // expression the loop above does.
    //
    // 1. Nothing parsed at all.
    expect(parsed, 'no page component was parsed — the walk found nothing').toBeGreaterThan(0);

    // 2. A whole page stops being reached. The expectation is derived
    //    STRUCTURALLY — a page composes components iff it declares regions or
    //    slots — so it stays true if the walk itself breaks. `account_workbench`
    //    is correctly absent: an ADR-0047 interface page carries no components
    //    at all (`regions: []`), its list surface being generated from
    //    `interfaceConfig`. `account_detail` is the case this catches: it is
    //    slots-only (`regions: []`), so a walk that stopped descending into
    //    `slots` would drop it and nothing else would notice.
    const composes = pages.filter((p) => (p.regions?.length ?? 0) > 0 || !!p.slots);
    expect(
      composes.map((p) => p.name).filter((n) => !pagesSeen.has(n)),
      'pages that declare regions or slots but contributed no parsed component — the walk no longer reaches them',
    ).toEqual([]);

    // 3. The walk stops DESCENDING and only enumerates each region's top
    //    level — which would still parse a dozen components and report clean.
    //    Every `record:related_list` in this app sits three levels down (tab
    //    item → accordion item → children), so its presence is the proof that
    //    nested components are still being reached.
    expect(
      parsedTypes.has('record:related_list'),
      'no nested record:related_list was parsed — the walk is no longer descending into tab/accordion children',
    ).toBe(true);

    expect(bad, `props the component drops:\n  ${bad.join('\n  ')}`).toEqual([]);

    // Keyed on still being BROKEN, not on still existing: a header that starts
    // conforming must drop its line, or the next bad prop inherits the cover.
    const stale = [...KNOWN_UNCONFORMING].filter((k) => !found.has(k));
    expect(
      stale,
      `exemptions whose prop now conforms — delete these lines:\n  ${stale.join('\n  ')}`,
    ).toEqual([]);
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

  /**
   * Container types that render only what they are given.
   *
   * Hoisted out of the two rules below so the pin test at the end exercises
   * the SAME predicate the live rules run. It used to be declared once per
   * `it`, which meant the pin was pinning a copy: a refactor that turned the
   * real `hasContent` into a pass-through would have left the pin green.
   */
  const CONTAINERS = new Set(['page:section', 'page:card', 'page:accordion']);

  /**
   * Keys a container carries its content under.
   *
   * `body` is @objectstack/spec 17.0.0's RETIRED spelling of `children` on
   * `page:card` (#5775, ADR-0087 D2) and this repo no longer authors it — it
   * stays in the list because the renderer still reads both, so a card that
   * authors `body` renders content and this rule must not call it empty.
   */
  const CONTENT_KEYS = ['body', 'children', 'items', 'components'];

  const hasContent = (c: AnyRec): boolean => {
    if (!CONTAINERS.has(c.type)) return true; // a real block renders itself
    const props = c.properties ?? {};
    return CONTENT_KEYS.some((k) => {
      const v = (c as AnyRec)[k] ?? props[k];
      return Array.isArray(v) ? v.length > 0 : !!v;
    });
  };

  /**
   * A tab whose name promises content must render content (#771).
   *
   * Sales Home's three tabs — My Leads / My Opportunities / My Tasks — each
   * held one `{ type: 'page:section', properties: {} }`. That is a legal page
   * schema and it validates, builds and renders: as `<section></section>`,
   * literally nothing, measured in the browser. Three tab names over three
   * blank panels, and no diagnostic anywhere, because there is no dangling
   * reference to catch — the defect is the ABSENCE of one.
   *
   * The other tests in this block ask "does this reference resolve?". This one
   * asks the prior question: is there a reference at all? A layout container
   * (`page:section` / `page:card` / `page:accordion`) is a box; it shows what
   * you put in it. Put nothing in it inside a tab and the tab is a lie.
   *
   * #771 scoped this to TAB children, deliberately, and #734 is the card that
   * widens it: the sidebar rule below now covers every region, so the two
   * together answer for the whole page.
   */
  it('no page tab renders an empty container', () => {
    const bad: string[] = [];
    let tabsSeen = 0;
    for (const page of pages) {
      for (const c of [...walk(page.regions), ...walk(page.slots)]) {
        if (c.type !== 'page:tabs') continue;
        for (const item of c.properties?.items ?? []) {
          tabsSeen++;
          const children: AnyRec[] = item.children ?? [];
          if (children.length === 0) {
            bad.push(`${page.name}/${c.id}: tab "${item.label}" has no children`);
            continue;
          }
          if (!children.some(hasContent)) {
            bad.push(
              `${page.name}/${c.id}: tab "${item.label}" holds only empty containers ` +
                `(${children.map((k) => k.type).join(', ')}) — it renders blank`,
            );
          }
        }
      }
    }
    // Without this the rule dies silently the day the walk stops finding tabs.
    expect(tabsSeen, 'no page tabs were inspected — the walk found nothing').toBeGreaterThan(0);
    expect(bad, `tabs that render blank:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  /**
   * The same rule, everywhere else on the page (#734).
   *
   * The tab rule above covers panels behind a tab strip. Sales Home shipped
   * the identical defect in its SIDEBARS, where nothing is hidden behind a
   * click: `my_recent_items` and `upcoming_events` were `page:card`s with a
   * title and no body, so the landing page of every `sales_rep` /
   * `sales_manager` carried bordered boxes reading "Recent Items" and
   * "Today's Schedule" with nothing under them. A third, `ai_briefing`, looked
   * bound but was not — its paragraph was authored as `properties.description`,
   * a key `page:card` does not declare, so the props schema stripped it and
   * the card rendered as a title too.
   *
   * That last one is why this rule reads DECLARED content keys rather than
   * "does the props bag have something in it": `PageComponent.properties` is
   * an open bag, so an undeclared key is a success receipt for configuration
   * that renders nothing. A container is full when it holds components.
   *
   * # The exemption list is the honest half
   *
   * #771 declined to widen its rule to sidebars because a rule that goes red
   * on things the PR is not fixing gets suppressed rather than fixed. The way
   * out is not a narrower rule, it is a rule that covers everything with the
   * known-open cases named, dated and owned — so the debt is visible instead
   * of invisible. Each entry needs an issue, and the assertion below fails
   * when an entry is no longer reachable, so a fixed defect cannot leave its
   * exemption behind to cover the next one.
   */
  it('no page region renders an empty container', () => {
    /**
     * `page.name/component.id` of containers that are known-empty and NOT this
     * card's to fix. Shrink-only: adding a line needs an issue and a reason.
     *
     *   utility_bar_page/quick_notes — an empty `page:card` on a page #734
     *   deliberately does not touch (that page is the reproduction of an
     *   upstream renderer gap for `global:*` component types, and editing it
     *   would destroy the evidence). Filed as #1215.
     *
     *   sales_home_page/ai_briefing — carries its copy under
     *   `properties.description`, which `page:card` does not declare, so it
     *   renders as a title too. The fix is to move that copy into an
     *   `element:text` child — but the copy is pinned where it is by the
     *   #1002 persona guard below, which reads `properties.description` and
     *   encodes a maintainer ruling, so moving it is its own card rather than
     *   a rider on this one. Filed as #1216.
     */
    const KNOWN_EMPTY = new Set(['utility_bar_page/quick_notes', 'sales_home_page/ai_briefing']);

    const bad: string[] = [];
    const emptyFound = new Set<string>();
    let containersSeen = 0;
    for (const page of pages) {
      for (const c of [...walk(page.regions), ...walk(page.slots)] as AnyRec[]) {
        if (!CONTAINERS.has(c.type)) continue;
        containersSeen++;
        if (hasContent(c)) continue;
        const where = `${page.name}/${c.id}`;
        emptyFound.add(where);
        if (KNOWN_EMPTY.has(where)) continue;
        bad.push(`${where}: ${c.type} "${c.properties?.title ?? c.label ?? ''}" has no body — it renders as a title over nothing`);
      }
    }

    // Same reason as `tabsSeen` above: the rule must not pass by finding nothing.
    expect(containersSeen, 'no page containers were inspected — the walk found nothing').toBeGreaterThan(0);
    expect(bad, `containers that render blank:\n  ${bad.join('\n  ')}`).toEqual([]);

    // An exemption outlives its defect only if nobody checks. Keyed on still
    // being EMPTY, not on still existing: a `quick_notes` that gets a body
    // must drop its line here, or the next empty card inherits the cover.
    const stale = [...KNOWN_EMPTY].filter((k) => !emptyFound.has(k));
    expect(stale, `exemptions whose container is no longer empty — delete these lines:\n  ${stale.join('\n  ')}`).toEqual([]);
  });

  /**
   * The rule above, exercised against the shape it exists to reject — so a
   * later refactor of `hasContent` cannot quietly turn it into a pass-through.
   */
  it('the empty-tab rule still rejects the shape #771 found', () => {
    // What Sales Home shipped: rejected.
    expect(hasContent({ type: 'page:section', properties: {} })).toBe(false);
    expect(hasContent({ type: 'page:card', properties: { title: 'Recent Items' } })).toBe(false);
    // The #734 shape: a card whose only copy is under a key `page:card` does
    // not declare. The props schema strips `description`, so this renders as a
    // title over nothing and must not read as full.
    expect(
      hasContent({ type: 'page:card', properties: { title: 'Ask the AI Assistant', description: 'Open the panel…' } }),
    ).toBe(false);
    // What it ships now, and the shapes that must stay accepted.
    expect(hasContent({ type: 'list-view', properties: { objectName: 'crm_lead' } })).toBe(true);
    expect(hasContent({ type: 'page:card', properties: { children: [{ type: 'object-metric' }] } })).toBe(true);
    // The retired `body` spelling still renders, so it still counts as content.
    expect(hasContent({ type: 'page:card', properties: { body: [{ type: 'object-metric' }] } })).toBe(true);
    expect(hasContent({ type: 'page:section', properties: { components: [{ type: 'text' }] } })).toBe(true);
  });
});

describe('formula fields are never used as query predicates', () => {
  /**
   * A `formula` field is not a column. The engine evaluates it in JS over the
   * rows a query already returned (`applyFormulaPlan`), so naming one in a
   * `filter` or a `sort` addresses something the data engine cannot see — the
   * predicate is silently dropped or, worse, inverted.
   *
   * This is exactly how `opportunity_stagnation` came to fire on nothing
   * (#489): `days_in_stage > 14` looked right and matched only the rows the
   * seed had hardcoded. Filter and sort on the STORED column the formula reads
   * from (`stage_entry_date`) and let the formula stay a display value.
   */
  const formulaFieldsOf = (obj: string): Set<string> => {
    const fields = objects.find((o) => o.name === obj)?.fields ?? {};
    return new Set(Object.entries(fields).filter(([, f]) => (f as AnyRec)?.type === 'formula').map(([n]) => n));
  };

  const viewObjectOf = (v: AnyRec): string | undefined =>
    v.list?.data?.object ?? v.form?.data?.object ?? v.object;

  it('no list view filters or sorts on a formula field', () => {
    const bad: string[] = [];
    for (const v of views) {
      const objectName = viewObjectOf(v);
      if (!objectName || !objectNames.has(objectName)) continue;
      const formulas = formulaFieldsOf(objectName);
      if (formulas.size === 0) continue;
      const lists = [v.list, ...Object.values(v.listViews ?? {})].filter(Boolean) as AnyRec[];
      for (const list of lists) {
        const where = `${objectName} view "${list.name ?? 'default'}"`;
        for (const f of list.filter ?? []) {
          if (f?.field && formulas.has(f.field)) bad.push(`${where}: filters on formula "${f.field}"`);
        }
        for (const s of list.sort ?? []) {
          if (s?.field && formulas.has(s.field)) bad.push(`${where}: sorts on formula "${s.field}"`);
        }
      }
    }
    expect(bad, `formula fields used as query predicates:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('no flow data node filters on a formula field', () => {
    const flows: AnyRec[] = (stack as any).flows ?? [];
    const bad: string[] = [];
    for (const flow of flows) {
      for (const node of walk(flow.nodes)) {
        const objectName = node.config?.objectName ?? node.config?.object;
        const filter = node.config?.filter;
        if (typeof objectName !== 'string' || !filter || typeof filter !== 'object') continue;
        const formulas = formulaFieldsOf(objectName);
        for (const key of Object.keys(filter)) {
          if (formulas.has(key)) bad.push(`flow "${flow.name}" node "${node.id}": filters ${objectName}.${key} (formula)`);
        }
      }
    }
    expect(bad, `formula fields used as flow filters:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});

describe('flow conditions reach the CEL engine', () => {
  /**
   * `AutomationEngine.evaluateCondition` only routes an `Expression` envelope
   * (`{ dialect, source }`) to the CEL engine. A bare string falls through to a
   * legacy template path that substitutes `{var}` braces and then compares both
   * sides as STRINGS — so `existingStallTask == null` evaluates
   * `'existingStallTask' === 'null'` (always false) and `record.rating >= 4`
   * evaluates `'record.rating' >= '4'` (always TRUE, because `'r' > '4'`).
   *
   * Neither errors. The first silently closes an idempotency gate forever; the
   * second silently pins a branch open. That is #562, and it went unnoticed
   * because the sweep reports success either way.
   *
   * Author conditions with the `P` tagged template from `@objectstack/spec`.
   * Note that `defineFlow()` alone is NOT sufficient: it normalizes the typed
   * edge `condition`, but a node's `config` is `z.record(z.unknown())`, so a
   * start-node trigger gate would stay a bare string.
   */
  const conditionSites = (flow: AnyRec): { where: string; value: unknown }[] => {
    const sites: { where: string; value: unknown }[] = [];
    for (const rec of walk(flow)) {
      // Edges carry `condition` directly; nodes carry it inside `config`.
      const at = rec.id ? `"${rec.id}"` : `<${rec.type}>`;
      if ('condition' in rec && rec.condition !== undefined) {
        sites.push({ where: `flow "${flow.name}" edge/node ${at}`, value: rec.condition });
      }
      if (rec.config && typeof rec.config === 'object' && rec.config.condition !== undefined) {
        sites.push({ where: `flow "${flow.name}" node ${at} config`, value: rec.config.condition });
      }
    }
    return sites;
  };

  it('no flow condition is a bare string', () => {
    const flows: AnyRec[] = (stack as any).flows ?? [];
    const bad: string[] = [];
    let seen = 0;

    for (const flow of flows) {
      for (const { where, value } of conditionSites(flow)) {
        seen++;
        if (typeof value === 'string') {
          bad.push(`${where}: bare string \`${value}\` — wrap in P\`…\``);
          continue;
        }
        const env = value as AnyRec;
        if (env?.dialect !== 'cel') bad.push(`${where}: dialect "${env?.dialect}", expected "cel"`);
        if (typeof env?.source !== 'string' || env.source.trim() === '') {
          bad.push(`${where}: envelope carries no source`);
        }
      }
    }

    // Guard the guard: a walker that silently stops matching would make this
    // test pass by asserting nothing.
    expect(seen, 'no flow conditions found — the walker stopped matching').toBeGreaterThan(20);
    expect(bad, `flow conditions that never reach the CEL engine:\n  ${bad.join('\n  ')}`).toEqual([]);
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
    // account views filter on type/health_score, but the account form never
    // offered them — the views could never match anything a user created
    // through the UI. (The `next_renewal_date` filter this guard was also born
    // on went away with the field itself, #1181.)
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

/**
 * `form.data` is a data provider the form renderer never reads: a form binds to
 * its object and record through the route context, so the block only *looked*
 * like it was wiring the form to an object. The platform's own liveness rule
 * (`liveness-dead-property`) flagged twelve of them, one per view file.
 *
 * Verified before removing them, rather than taken on the validator's word —
 * the same validator reports false positives elsewhere (it cannot see view
 * names inside the twelve grouped `views` exports, so it calls live routes
 * dead). With every `form.data` deleted, opening a lead record's edit form on
 * 16.1.0 still binds correctly: 8 inputs, 7 populated from the record
 * (`first_name: "Mira"`, `company: "Atlas Construction"`, `status: "contacted"`,
 * …), no console errors.
 *
 * Scope note: named forms under `formViews` (`quick_create`,
 * `lead_conversion_wizard`, …) still carry `data` blocks. The liveness rule does
 * NOT flag those and they have not been measured — a create form has no record
 * in the route context, so the same reasoning may not hold. They are left alone
 * deliberately; measure first if you plan to remove them.
 */
describe('form views do not declare a dead data provider', () => {
  it('no view sets form.data', () => {
    const bad: string[] = [];
    for (const v of views) {
      if (!v.form?.data) continue;
      const objectName = v.list?.data?.object ?? v.object ?? '(unknown object)';
      bad.push(`${objectName}: form.data = ${JSON.stringify(v.form.data)}`);
    }
    expect(
      bad,
      `form.data is not consumed — a form binds via the route context:\n  ${bad.join('\n  ')}`,
    ).toEqual([]);
  });

  it('every view still resolves its object without the form.data fallback', () => {
    // objectOf() used to fall back to `form.data.object`. With those blocks gone
    // the list provider is the only source, so a view that lost both would make
    // every rule keyed on objectOf() silently skip it.
    const unresolved = views
      .filter((v) => !(v.list?.data?.object ?? v.object))
      .map((v) => v.list?.name ?? v.form?.type ?? '(unnamed view)');
    expect(unresolved, `views whose object no longer resolves:\n  ${unresolved.join('\n  ')}`).toEqual([]);
  });
});

/**
 * `App.defaultAgent` is a SURFACE BINDING, not a custom-agent slot.
 *
 * ADR-0063 §1/§2: the kernel ships exactly two agents — `ask` (the data
 * surface, the implicit default) and `build` (authoring surfaces such as
 * Studio). Tenant/app-package custom agents were withdrawn, and HotCRM's own
 * app-authored agents were retired in #512; the app's AI capability now ships
 * as skills, which attach to a platform agent by `surface` affinity.
 *
 * Nothing caught the dangling binding this replaces. `App.defaultAgent` is
 * typed `SnakeCaseIdentifierSchema` — any well-formed snake_case name parses —
 * so `os validate`, `pnpm build` and the platform's agent lint (which only
 * walks `stack.agents`) all stayed green while `defaultAgent: 'sales_copilot'`
 * pointed at an agent that had not existed for months. The failure is silent
 * and late: `loadAgent()` refuses the non-platform record at chat time, so the
 * only symptom is the ambient chatbot not answering in a demo.
 *
 * The platform set is READ FROM THE SPEC (`AgentSchema.shape.surface`), not
 * transcribed here — the agent names and the surface names are the same two
 * tokens, so this guard tracks the contract instead of drifting from it.
 */
describe('app AI bindings resolve to a platform agent', () => {
  const apps: AnyRec[] = (stack as any).apps ?? [];

  /** `['ask', 'build']` — straight off the spec's own surface enum. */
  const PLATFORM_AGENTS: string[] = (() => {
    const surface = (AgentSchema as AnyRec).shape.surface;
    const enumSchema = typeof surface.removeDefault === 'function' ? surface.removeDefault() : surface;
    return enumSchema.options as string[];
  })();

  it('the spec still exposes exactly the two platform agents', () => {
    // Guard the guard: if this introspection ever returns [] the checks below
    // would pass by asserting nothing (or fail for the wrong reason).
    expect(PLATFORM_AGENTS).toEqual(['ask', 'build']);
  });

  it('every app defaultAgent names a platform agent', () => {
    expect(apps.length, 'no apps found in the stack — the guard is vacuous').toBeGreaterThan(0);
    const bad: string[] = [];
    for (const app of apps) {
      const agent = app.defaultAgent;
      if (agent === undefined) continue; // omitting the key is legal — `ask` is implicit
      if (!PLATFORM_AGENTS.includes(agent)) {
        bad.push(
          `${app.name}: defaultAgent "${agent}" is not a platform agent ` +
            `(${PLATFORM_AGENTS.join(' | ')}) — it will not resolve at chat time`,
        );
      }
    }
    expect(bad, `dangling app agent bindings:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('the app authors no agents of its own — the surface is skills-only', () => {
    // ADR-0063 §2. Re-introducing an app agent is what makes a name like
    // `sales_copilot` look plausible in `defaultAgent` again; skills are the
    // supported way to deepen an app's AI capability.
    const agents: AnyRec[] = (stack as any).agents ?? [];
    expect(
      agents.map((a) => a.name),
      'app-authored agents were retired in #512 — author skills instead (ADR-0063 §2)',
    ).toEqual([]);
    expect(((stack as any).skills ?? []).length, 'no skills registered').toBeGreaterThan(0);
  });
});

/**
 * The home page's AI card does not name a retired persona (#1002).
 *
 * The two guards above check agent BINDINGS — `defaultAgent`, `stack.agents` —
 * because those are keys a schema can be pointed at. This one checks a
 * paragraph, and that is the whole point: the card below said
 * "Ask the Sales Copilot" for months while every gate stayed green. `os
 * validate` and `pnpm lint` walk authored metadata and treat a card's `title` /
 * `description` as free text; PR #1001's persona rule is deliberately scoped to
 * `content/docs/**` (the range the maintainer drew for #612), so it never
 * opened a `.page.ts`. A retired persona in `src/` had no guard at all — and
 * this one was live UI copy, visible to a user today, not documentation.
 *
 * Two drifts were fixed here, both from the maintainer's 2026-08-04 ruling on
 * #612 (Option A) and the architecture note that followed it:
 *
 * - **The persona.** `sales_copilot` was retired in #512 and ADR-0063 §2 made
 *   the surface skills-only. AI capability is implemented by agents in
 *   `objectstack-ai/cloud`; HotCRM contributes domain skills. So the copy names
 *   the platform's assistant, never an app-owned one.
 * - **The entry point.** The card sent users to "the floating Copilot
 *   (bottom-right)"; `content/docs/ai-copilot/index.mdx` documents "the chat
 *   panel the platform opens from the right edge of every page" (#611 / PR
 *   #1001). Two descriptions of one entry point is drift whichever is right, so
 *   the card now uses the documented one.
 *
 * SCOPE — read before extending. This pins the ONE card this PR rewrote. It is
 * not the general rule, and it cannot catch the same persona reappearing in a
 * different card, view, or skill description: that is a scan-surface question
 * over every user-visible string in `src/` (`title` / `label` / `description` /
 * `help`), which touches the public wording surface and needs its own ruling.
 * Filed as #1003 for that reason — do not quietly grow this into it.
 *
 * Reverse verification: predicted red-before / green-after, the ordinary
 * direction for a forbidden-string pin over copy that plainly contained the
 * string. Measured by restoring the old three lines: 2 of 3 assertions fail
 * ("Ask the Sales Copilot" on `title`, "Today with Copilot" on `label`, and the
 * floating/bottom-right entry point), then green once rewritten.
 */
describe('live UI copy does not name a retired copilot persona (#1002)', () => {
  const homePage = pages.find((p) => p.name === 'sales_home_page');

  /** The card carries the app's only AI-facing home-page copy. */
  const card = [...walk(homePage?.regions), ...walk(homePage?.slots)].find(
    (c: AnyRec) => c.id === 'ai_briefing',
  );

  it('the card this rule reads is still on the home page', () => {
    // Guard the guard: renamed away, every assertion below would pass by
    // reading `undefined` — the empty-pass failure mode a copy rule dies of.
    expect(homePage, 'sales_home_page is no longer registered in the stack').toBeDefined();
    expect(card, 'no component with id "ai_briefing" on sales_home_page').toBeDefined();
    expect(typeof card?.properties?.title).toBe('string');
    expect(typeof card?.properties?.description).toBe('string');
  });

  it('no retired persona name in the card copy', () => {
    const copy = [card?.label, card?.properties?.title, card?.properties?.description]
      .filter((s): s is string => typeof s === 'string')
      .join('\n');
    // The bare word is included on purpose: "Copilot" alone reads as an
    // app-owned assistant in UI copy, even though the DOCS keep *AI Copilot* as
    // a section name (#611's line, which applies to a docs nav, not to a card).
    const found = ['Sales Copilot', 'Service Copilot', 'Copilot'].filter((name) =>
      copy.includes(name),
    );
    expect(found, `retired persona named in home-page card copy: ${found.join(', ')}`).toEqual([]);
  });

  it('the card points at the documented assistant entry point', () => {
    const description: string = card?.properties?.description ?? '';
    // The stale spelling, not a paraphrase of the new one: pinning the exact
    // sentence would fail on any harmless rewording, while "floating" /
    // "bottom-right" is precisely the claim that contradicts the docs.
    expect(description.toLowerCase()).not.toContain('floating');
    expect(description.toLowerCase()).not.toContain('bottom-right');
    expect(description).toContain('right edge');
  });
});
