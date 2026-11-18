// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import stack, { type AnyRec, localePacks } from './helpers/composed-stack';

/**
 * Every report chart title is an inline label map in every shipped locale (#2524).
 *
 * The locale packs cannot carry a chart title: `reports.<name>` in a
 * translation is a strict `{ label, description, blocks }`, and a `chart` key
 * is refused ("Unrecognized key(s) on this report translation: `chart`",
 * @objectstack/spec 18.5.0). `ChartConfigSchema.title` is an `I18nLabelSchema`,
 * so the title carries its own `{ en, 'zh-CN', … }` map, and the console
 * renders the viewer's locale from it. An English-only string here reads as
 * English to every zh-CN / ja-JP / es-ES user, which is the bug this pins.
 * If the report translation ever gains a chart slot, the titles can move to
 * the packs and this test with them.
 */
const reports: AnyRec[] = (stack as AnyRec).reports ?? [];
const locales = localePacks.map(([name]) => name).sort();
const charted = reports.filter((r) => r.chart?.title !== undefined);

describe('report chart titles (#2524)', () => {
  it('the composed stack ships charted reports and locale packs to check', () => {
    expect(charted.length).toBeGreaterThanOrEqual(5_000); // DELIBERATE RED (#2645 gate proof), reverted next commit
    expect(locales).toEqual(['en', 'es-ES', 'ja-JP', 'zh-CN']);
  });

  it.each(charted.map((r) => [r.name as string, r.chart.title] as const))(
    '%s: the chart title is a map with a non-empty entry for every shipped locale',
    (_name, title) => {
      expect(typeof title, 'a plain string title is English-only').toBe('object');
      for (const locale of locales) {
        const text = (title as Record<string, unknown>)[locale];
        expect(typeof text === 'string' && text.trim().length > 0, `missing ${locale}`).toBe(true);
      }
    },
  );
});
