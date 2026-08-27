// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import stack from '../objectstack.config';
import { type AnyRec, localePacks, packFor } from './helpers/metadata-fixtures';
import * as sharedWidgets from '../src/dashboards/shared-widgets';

/**
 * Locale bundles must not re-fork the widgets `src/dashboards/shared-widgets.ts`
 * exists to state once.
 *
 * ## The hole this closes
 *
 * The pipeline funnel used to appear word-for-word in the CRM, Sales and
 * Executive dashboards — three copies of "what counts as open pipeline" that
 * could, and did, drift apart. #539 deleted the source-side copies by moving
 * the semantic definition into a factory each dashboard calls.
 *
 * The i18n side was never deduplicated. Every dashboard still carries its own
 * `dashboards.<dashboard>.widgets.<widget>.description` in every locale, so one
 * factory-owned sentence is still stored as (dashboards x locales) independently
 * editable strings. That is the exact shape #539 removed, one layer down, and
 * nothing was watching it: `pnpm lint --skip-i18n` skips the bundles, and
 * `test/i18n-references.test.ts` asserts key *coverage* — that every authored
 * surface is translated and every key resolves — never that two entries fed by
 * one source string still agree.
 *
 * It had already drifted when this guard was written: all four bundles gave the
 * Executive dashboard a different `pipeline_by_stage` description from the CRM
 * and Sales ones, in the same direction, in every language. Harmless as written
 * ("at each sales stage" against "by sales stage"), but the next drift under the
 * same structure could just as easily turn `open` into `closed` and no gate
 * would have said a word.
 *
 * ## What is asserted, and why it is not "all entries must be equal"
 *
 * A blunt "every dashboard's entry for a shared widget must be identical" rule
 * would be wrong here, and would have been red on landing for a legitimate
 * reason. `avgDealSizeMetricWidget` takes `overrides`, and Sales uses them: its
 * tile is pinned to the quarter, so its description ends "this quarter" while
 * CRM's does not. All four bundles already reflect that difference correctly.
 * A guard that failed it would be teaching authors to erase a real distinction.
 *
 * So the invariant is stated against the SOURCE, one level up from the strings:
 *
 *   **the way a locale groups dashboards by description must be the way the
 *   source groups them.**
 *
 * Two dashboards the factory gives one description to must read alike in every
 * language; two the source deliberately separates must stay separated in every
 * language. One rule, both failure directions — forking what the source unifies,
 * and merging what the source distinguishes.
 *
 * The second assertion anchors the baseline itself. English is not "one of the
 * translations" for a factory-owned widget: the factory's own literal is the
 * English copy, so the `en` bundle must reproduce it byte for byte. Without
 * this, a family of entries could agree with each other perfectly and still all
 * disagree with the code that renders them — the drift would simply move.
 *
 * ## Scope
 *
 * `description` only. `title` is uniform across these entries today and is left
 * to whatever guard eventually owns it; this suite exists for the field that
 * actually forked. Widget ids are discovered by calling every factory the shared
 * module exports rather than being listed here, so a factory added later is
 * covered the day it lands, with nothing to remember to update.
 */

const dashboards: AnyRec[] = (stack as any).dashboards ?? [];

/** Positional filler. Every factory takes a layout first; no assertion reads it. */
const PROBE_LAYOUT = { x: 0, y: 0, w: 1, h: 1 };

/**
 * Widget ids whose semantic definition is owned by the shared module —
 * derived by invoking the factories, not by transcribing their ids.
 */
const sharedWidgetIds = new Set<string>(
  (Object.values(sharedWidgets) as unknown[])
    .filter((value): value is (layout: AnyRec) => AnyRec => typeof value === 'function')
    .map((factory) => String(factory(PROBE_LAYOUT).id)),
);

type Occurrence = { dashboard: string; widget: string; sourceText: string };

/**
 * Every place a shared-factory widget lands, with the description the source
 * actually produces there — overrides applied, because that is what ships.
 *
 * Matched by widget id rather than by "was this line a factory call", so a
 * hand-inlined copy of a factory-owned widget is held to the same rule as a
 * call to the factory.
 */
const occurrences: Occurrence[] = dashboards.flatMap((d) =>
  ((d.widgets ?? []) as AnyRec[])
    .filter((w) => sharedWidgetIds.has(String(w.id)))
    .map((w) => ({
      dashboard: String(d.name),
      widget: String(w.id),
      sourceText: String(w.description),
    })),
);

const descriptionIn = (
  pack: AnyRec | undefined,
  dashboard: string,
  widget: string,
): string | undefined => pack?.dashboards?.[dashboard]?.widgets?.[widget]?.description;

/** Dashboards bucketed by the text they were given; `undefined` = no entry at all. */
const groupsOf = (
  pairs: Array<[string, string | undefined]>,
): Array<[string | undefined, string[]]> => {
  const byText = new Map<string | undefined, string[]>();
  for (const [dashboard, text] of pairs) {
    const bucket = byText.get(text);
    if (bucket) bucket.push(dashboard);
    else byText.set(text, [dashboard]);
  }
  return [...byText.entries()].map(
    ([text, group]) => [text, [...group].sort()] as [string | undefined, string[]],
  );
};

/**
 * A partition rendered as a comparable string — which dashboards share a
 * description, never which words they share. Two partitions of the same
 * dashboards compare equal exactly when they group them the same way.
 */
const shapeOf = (groups: Array<[string | undefined, string[]]>): string =>
  groups
    .map(([, group]) => group.join('+'))
    .sort()
    .join(' | ');

const show = (text: string | undefined) => (text === undefined ? '(no entry)' : JSON.stringify(text));

describe('shared-factory widgets read the same way in every locale', () => {
  it('has something to check', () => {
    expect(sharedWidgetIds.size, 'no shared widget factories found — this suite is vacuous').toBeGreaterThan(0);
    expect(localePacks.length, 'no locale packs loaded — this suite is vacuous').toBeGreaterThan(0);
    const reused = [...sharedWidgetIds].filter(
      (widget) => occurrences.filter((o) => o.widget === widget).length > 1,
    );
    expect(
      reused,
      'no shared-factory widget is used by more than one dashboard — nothing here can fork, ' +
        'so the parity assertion below would pass without reading anything',
    ).not.toEqual([]);
  });

  it('groups dashboards exactly the way the source groups them', () => {
    const failures: string[] = [];

    for (const widget of [...sharedWidgetIds].sort()) {
      const uses = occurrences.filter((o) => o.widget === widget);
      if (uses.length < 2) continue; // one home, nothing to compare it against

      const sourceShape = shapeOf(groupsOf(uses.map((o) => [o.dashboard, o.sourceText])));

      for (const [locale, pack] of localePacks) {
        const localeShape = shapeOf(
          groupsOf(uses.map((o) => [o.dashboard, descriptionIn(pack, o.dashboard, o.widget)])),
        );
        if (localeShape === sourceShape) continue;

        failures.push(
          `${locale} · ${widget}: source groups these dashboards as [${sourceShape}], ` +
            `${locale} groups them as [${localeShape}]\n` +
            uses
              .map(
                (o) =>
                  `      ${o.dashboard}\n` +
                  `        source: ${show(o.sourceText)}\n` +
                  `        ${locale}: ${show(descriptionIn(pack, o.dashboard, o.widget))}`,
              )
              .join('\n'),
        );
      }
    }

    expect(
      failures,
      'a locale forked (or merged) a description the shared factory owns — ' +
        'align the locale entry to the grouping the source states, in ' +
        'src/translations/*.ts:\n\n  ' +
        failures.join('\n\n  '),
    ).toEqual([]);
  });

  it('reproduces the factory literal verbatim in the English bundle', () => {
    const en = packFor('en');
    expect(en, 'no `en` locale pack — the anchor for every other bundle is missing').toBeTruthy();

    const failures = occurrences
      .map((o) => ({ ...o, bundleText: descriptionIn(en, o.dashboard, o.widget) }))
      .filter((o) => o.bundleText !== o.sourceText)
      .map(
        (o) =>
          `${o.dashboard} · ${o.widget}\n` +
          `        src/dashboards/shared-widgets.ts: ${show(o.sourceText)}\n` +
          `        src/translations/en.ts:           ${show(o.bundleText)}`,
      );

    expect(
      failures,
      'the English bundle is not a translation of a factory-owned widget — it is the same ' +
        'sentence, so it must match the factory literal byte for byte:\n\n  ' +
        failures.join('\n\n  '),
    ).toEqual([]);
  });
});
