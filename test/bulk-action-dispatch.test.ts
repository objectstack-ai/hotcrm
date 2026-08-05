// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import stack from '../objectstack.config';

/**
 * The bulk-dispatch contract: how a list view delivers a multi-row selection
 * to an action, and how that action reads it (#508).
 *
 * Split out of `metadata-references.test.ts`, which owns dangling-reference
 * guards and is one edit from the 100KB hygiene ceiling. The guard that used to
 * live there said the OPPOSITE of what this file says, and the inversion is the
 * point:
 *
 * Until #508 closed, that file forbade any view from naming `mass_update_stage`
 * in `bulkActions`, on the finding that the selection-bar button was a
 * client-side no-op — zero network requests, generic success toast. The premise
 * was disproven end to end by the platform (objectstack-ai/objectstack#5568,
 * closed works-as-declared): the console delivers a selection perfectly well,
 * through `bulkActionDefs` + `execution: 'aggregate'`, which makes the grid
 * renderer inject every selected id into the builtin `params._selectedIds`. The
 * button looked dead because the DECLARATION was missing (#588 had removed it),
 * and the no-op the old guard described is what a bare-string `bulkActions`
 * entry produces when the action behind it has no per-record dispatcher.
 *
 * So the guard is inverted, not deleted: the risk it protected against is real
 * and unchanged — a bulk button that reports success and writes nothing — but
 * its direction was wrong. What must not regress now is the declaration itself.
 *
 * These are METADATA pins: they assert the shape the renderer needs. The
 * execution half — that the shape actually moves rows — is
 * `test/action-sandbox.test.ts`, which runs the shipped body against a real
 * ObjectQL kernel with `_selectedIds` in the params bag.
 */

type AnyRec = Record<string, any>;

const views: AnyRec[] = (stack as any).views ?? [];
const actions: AnyRec[] = (stack as any).actions ?? [];
const actionNames = new Set(actions.map((a) => a.name));

const listsOf = (v: AnyRec): AnyRec[] =>
  [v.list, ...Object.values(v.listViews ?? {})].filter(Boolean) as AnyRec[];

describe('bulk dispatch is declared the way the renderer reads it', () => {
  it('the opportunity list dispatches mass_update_stage once for the whole selection', () => {
    const oppView = views.find((v) => (v.list?.data?.object ?? v.object) === 'crm_opportunity');
    expect(oppView, 'no crm_opportunity view').toBeTruthy();

    const defs = (oppView!.list?.bulkActionDefs ?? []) as AnyRec[];
    const massUpdate = defs.find((d) => d?.name === 'mass_update_stage');
    expect(
      massUpdate,
      'the opportunity list no longer declares a mass_update_stage bulk def — without it the '
      + 'renderer injects no `_selectedIds`, the toolbar button degrades to a single-record '
      + 'action, and a multi-row selection is refused client-side (#508)',
    ).toBeTruthy();
    // The two keys that CHOOSE the dispatch contract. `custom` says "dispatch
    // the action this def names"; `aggregate` says "once, for the whole
    // selection". Dropping the second is refused at parse time (#4457) — the
    // shape it leaves behind ticks green per row and does nothing.
    expect(massUpdate!.operation).toBe('custom');
    expect(massUpdate!.execution).toBe('aggregate');

    // …and NOT the bare-string form anywhere. That is the per-record fan-out —
    // a different contract (N dispatches, each carrying `recordId`), which this
    // body is not written for: it would re-enter the selection loop once per
    // row, and the all-or-nothing rejection would report per row rather than
    // per selection.
    const fanout: string[] = [];
    for (const v of views) {
      for (const list of listsOf(v)) {
        for (const name of list.bulkActions ?? []) {
          if (name === 'mass_update_stage') fanout.push(`view "${list.name ?? 'default'}"`);
        }
      }
    }
    expect(
      fanout,
      'mass_update_stage is wired as a per-record fan-out here, but its body is written for the '
      + `aggregate contract:\n  ${fanout.join('\n  ')}`,
    ).toEqual([]);
  });

  it('every custom bulk def names a real action', () => {
    // Coverage nothing else has. The guard in `metadata-references.test.ts`
    // ("every rowAction / bulkAction names a defined action") reads
    // `bulkActions` STRINGS only, and the spec schema cannot resolve a name
    // against THIS app's actions — `SnakeCaseIdentifierSchema` checks the
    // spelling, not the referent. An aggregate def naming an action that does
    // not exist gets no `actionDef` attached by the renderer, so the button
    // dispatches nothing: the silent no-op again, through a third door.
    //
    // What this test deliberately does NOT re-assert is `execution:
    // 'aggregate'` on a custom def. That was in the first draft and it was a
    // phantom: `defineView` parses through the spec at MODULE IMPORT time, so a
    // custom def without `execution` throws a ZodError carrying the whole
    // #4457 explanation before this file can collect a single test. The
    // assertion could never fail, because metadata in that state cannot be
    // imported at all — verified by making the edit and watching the suite fail
    // to load rather than fail an expectation. The schema owns that verdict and
    // states it better; re-stating it here would only look like coverage.
    const bad: string[] = [];
    for (const v of views) {
      for (const list of listsOf(v)) {
        for (const def of (list.bulkActionDefs ?? []) as AnyRec[]) {
          if (def?.operation !== 'custom') continue;
          if (!actionNames.has(def.name)) {
            bad.push(`view "${list.name ?? 'default'}" bulk "${def.name}": names no defined action`);
          }
        }
      }
    }
    expect(bad, `custom bulk defs that cannot dispatch:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  /**
   * The handler half of the same contract.
   *
   * The declaration only DELIVERS the selection; something has to read it, and
   * the key is `_selectedIds` with a leading underscore — a builtin of the
   * action-params gate, alongside `recordId` / `objectName`. #508 spent two
   * release candidates believing multi-select delivery did not exist because
   * every probe spelled the key without that underscore: a top-level
   * `selectedIds` (never merged into the params bag) and a `params.selectedIds`
   * (correctly refused by the strict gate as undeclared).
   */
  it('mass_update_stage reads the selection from the builtin `_selectedIds`', () => {
    const massUpdate = actions.find((a) => a.name === 'mass_update_stage');
    expect(massUpdate, 'mass_update_stage is not defined').toBeTruthy();
    const source = String(massUpdate!.body?.source ?? '');

    expect(
      source.includes('input._selectedIds'),
      'the body no longer reads `input._selectedIds` — the aggregate dispatch delivers the '
      + 'selection under exactly that builtin key and nothing else carries it',
    ).toBe(true);

    // The no-underscore spelling is not a synonym and not a fallback: nothing
    // can deliver it, so a limb reading it only ever sees `undefined`. Matched
    // with a boundary so `input._selectedIds` itself does not trip it.
    expect(
      /(?<![\w$])input\.selectedIds\b/.test(source),
      'the body reads `input.selectedIds` (no underscore) — an undeliverable key: the params '
      + 'gate refuses it as undeclared, and the renderer injects only `_selectedIds`',
    ).toBe(false);

    // `_selectedIds` is injected by the renderer and admitted by the gate as a
    // builtin. Declaring it as a param is not a supported authoring move, and
    // an author who tries is usually about to re-invent the channel.
    const declared = (massUpdate!.params ?? []).map((p: AnyRec) => p?.name);
    expect(declared, 'builtin keys must not be declared as action params')
      .not.toContain('_selectedIds');
  });
});
