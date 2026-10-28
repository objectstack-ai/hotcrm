// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import stack, { packFor } from './helpers/composed-stack';
import { packageStacks } from '../objectstack.composition';

/**
 * The Metrics page says what each dashboard figure counts (#2329).
 *
 * `src/docs/crm_analytics_metrics.md` exists so a reader can check a number
 * instead of guessing at it, which makes a wrong definition worse than none.
 * A definition is prose about a machine fact — a measure's filter, a ratio's
 * two halves, a tile's window — so this file holds each one to the metadata it
 * describes, read from the compiled stack, the way
 * `test/docs-lifecycle-diagrams.test.ts` holds the state diagrams:
 *
 *  - every table row the page opens with a bold name is a definition, and the
 *    name must be a real figure: a dataset measure, a dashboard tile, a report
 *    or one of its blocks, or a formula field — in that order;
 *  - the row must name what the figure is built from: a ratio's two measures as
 *    `**A** ÷ **B**`, the field a sum or average reads, each filter value by
 *    its option label, each boolean filter by its field label, each date
 *    window by its field label and the window's phrase, and a tile's or
 *    report's measures by their labels. A changed filter, ratio or window
 *    turns the page red here;
 *  - every app-package measure that carries a filter or is derived — the ones
 *    a wrong denominator makes plausible and false — has a definition.
 *
 * Labels are read per locale: field and option labels from the object (English)
 * or the zh-CN pack (`.zh.md`); measure, tile and report names in English in
 * both, by AGENTS.md *Documentation discipline* rule 6. Polarity ("not at
 * Closed Won") is prose and not checked.
 */

type AnyRec = Record<string, any>;
const S = stack as AnyRec;

const PAGE = 'src/docs/crm_analytics_metrics';

const OBJECTS = new Map<string, AnyRec>((S.objects as AnyRec[]).map((o) => [o.name, o]));
const DATASETS = (S.datasets ?? []) as AnyRec[];
const WIDGETS = ((S.dashboards ?? []) as AnyRec[]).flatMap((d) => (d.widgets ?? []) as AnyRec[]);
const REPORTS = (S.reports ?? []) as AnyRec[];
const APP_DATASETS = ((packageStacks as AnyRec[]).find((s) => s.manifest.type === 'app')!.datasets ?? []) as AnyRec[];

interface Locale {
  suffix: string;
  field: (object: string, field: string) => string;
  option: (object: string, field: string, value: string) => string;
  /** The phrase a date-macro window is written as. Unknown macro ⇒ deliberate failure. */
  window: Record<string, string>;
}

const objectField = (object: string, field: string): AnyRec => {
  const f = OBJECTS.get(object)?.fields?.[field];
  if (!f) throw new Error(`${object}.${field} is not a field`);
  return f;
};

const zh = packFor('zh-CN');
const LOCALES: Locale[] = [
  {
    suffix: '.md',
    field: (o, f) => String(objectField(o, f).label),
    option: (o, f, v) => String((objectField(o, f).options as AnyRec[]).find((x) => x.value === v)?.label),
    window: {
      '{12_months_ago}': 'last 12 months', '{30_days_ago}': '30 days', '{60_days_ago}': '60 days',
      '{90_days_ago}': '90 days', '{current_quarter_start}': 'current quarter', '{current_year_start}': 'current year',
    },
  },
  {
    suffix: '.zh.md',
    field: (o, f) => String(zh?.objects?.[o]?.fields?.[f]?.label),
    option: (o, f, v) => String(zh?.objects?.[o]?.fields?.[f]?.options?.[v]),
    window: {
      '{12_months_ago}': '最近 12 个月', '{30_days_ago}': '30 天', '{60_days_ago}': '60 天',
      '{90_days_ago}': '90 天', '{current_quarter_start}': '本季度', '{current_year_start}': '本年',
    },
  },
];

const bold = (s: string): string => `**${s}**`;
const measureOf = (dataset: AnyRec, name: string): AnyRec => {
  const m = (dataset.measures as AnyRec[]).find((x) => x.name === name);
  if (!m) throw new Error(`${dataset.name} has no measure ${name}`);
  return m;
};
const datasetNamed = (name: string): AnyRec => {
  const d = DATASETS.find((x) => x.name === name);
  if (!d) throw new Error(`no dataset ${name}`);
  return d;
};

/** What a filter on `object` must be described by. `{today}` closes a window and is not written. */
const filterTokens = (object: string, filter: AnyRec | undefined, L: Locale): string[] =>
  Object.entries(filter ?? {}).flatMap(([key, value]): string[] => {
    const field = objectField(object, key);
    const options = (values: unknown[]) => values.map((v) => bold(L.option(object, key, String(v))));
    if (typeof value === 'boolean') return [bold(L.field(object, key))];
    if (typeof value === 'string') {
      if (value.startsWith('{')) {
        if (!(value in L.window)) throw new Error(`no ${L.suffix} phrase for the window ${value}`);
        return [L.window[value]];
      }
      if (!field.options) throw new Error(`${object}.${key} = "${value}" is not an option filter`);
      return options([value]);
    }
    if (value && typeof value === 'object') {
      return Object.entries(value as AnyRec).flatMap(([op, operand]): string[] => {
        if (op === '$in' || op === '$nin') return options(operand as unknown[]);
        if (['$gte', '$gt', '$lte', '$lt'].includes(op) && typeof operand === 'string' && operand.startsWith('{')) {
          if (operand === '{today}') return [];
          if (!(operand in L.window)) throw new Error(`no ${L.suffix} phrase for the window ${operand}`);
          return [bold(L.field(object, key)), L.window[operand]];
        }
        if (op === '$ne' && operand === null) return [bold(L.field(object, key))];
        throw new Error(`unsupported filter ${object}.${key} ${op}`);
      });
    }
    throw new Error(`unsupported filter ${object}.${key}`);
  });

const measureTokens = (dataset: AnyRec, m: AnyRec, L: Locale): string[] => {
  if (m.derived) {
    if (m.derived.op !== 'ratio') throw new Error(`${dataset.name}.${m.name}: unsupported derived op ${m.derived.op}`);
    const [a, b] = (m.derived.of as string[]).map((n) => String(measureOf(dataset, n).label));
    return [`${bold(a)} ÷ ${bold(b)}`];
  }
  return [
    ...(m.field ? [bold(L.field(dataset.object, m.field))] : []),
    ...filterTokens(dataset.object, m.filter, L),
  ];
};

const valuesOf = (w: AnyRec): string[] => (w.values ?? w.measures ?? []) as string[];

/** Every reading of a name: the tokens a row naming it must carry. Empty ⇒ not a figure. */
const readingsOf = (name: string, L: Locale): { what: string; tokens: string[] }[] => {
  const measures = DATASETS.flatMap((d) =>
    (d.measures as AnyRec[]).filter((m) => m.label === name).map((m) => ({ d, m })));
  if (measures.length > 1) throw new Error(`"${name}" is the label of ${measures.length} measures — ambiguous`);
  if (measures.length === 1) {
    const { d, m } = measures[0];
    return [{ what: `measure ${d.name}.${m.name}`, tokens: measureTokens(d, m, L) }];
  }
  const widgets = WIDGETS.filter((w) => w.title === name);
  if (widgets.length > 0) {
    return widgets.map((w) => {
      const d = datasetNamed(w.dataset);
      return {
        what: `tile ${w.id ?? w.title}`,
        tokens: [...valuesOf(w).map((v) => bold(String(measureOf(d, v).label))), ...filterTokens(d.object, w.filter, L)],
      };
    });
  }
  const reportish = REPORTS.flatMap((r) => [r, ...((r.blocks ?? []) as AnyRec[])]).filter((r) => r.label === name);
  if (reportish.length > 0) {
    return reportish.map((r) => {
      const d = datasetNamed(r.dataset);
      return {
        what: `report ${r.name}`,
        tokens: [...valuesOf(r).map((v) => bold(String(measureOf(d, v).label))), ...filterTokens(d.object, r.runtimeFilter, L)],
      };
    });
  }
  const formulas = [...OBJECTS.values()].flatMap((o) =>
    Object.entries((o.fields ?? {}) as AnyRec)
      .filter(([f, def]) => def.type === 'formula' && L.field(o.name, f) === name)
      .map(([f, def]) => ({ o, f, def })));
  return formulas.map(({ o, f, def }) => ({
    what: `formula ${o.name}.${f}`,
    tokens: [...new Set([...String(def.expression).matchAll(/record\.([a-z_]+)/g)].map(([, ref]) => ref))]
      .map((ref) => bold(L.field(o.name, ref))),
  }));
};

/** `| **Name** | definition |` rows. */
const definitionsIn = (markdown: string): { name: string; text: string }[] =>
  [...markdown.matchAll(/^\| \*\*([^*]+)\*\* \| (.+) \|$/gm)].map(([, name, text]) => ({ name, text }));

describe('the Metrics page states what each figure really counts (#2329)', () => {
  for (const L of LOCALES) {
    const file = `${PAGE}${L.suffix}`;
    const rows = definitionsIn(readFileSync(join(REPO_ROOT, file), 'utf8'));

    it(`${file} defines figures`, () => {
      expect(rows.length, 'no `| **Name** | … |` rows found — the guard has gone vacuous').toBeGreaterThanOrEqual(20);
    });

    it(`${file} names only real figures, each by what it is built from`, () => {
      const problems: string[] = [];
      for (const { name, text } of rows) {
        const readings = readingsOf(name, L);
        if (readings.length === 0) {
          problems.push(`**${name}** is not a measure, tile, report or formula field this app ships`);
          continue;
        }
        for (const { what, tokens } of readings) {
          const missing = tokens.filter((t) => !text.includes(t));
          if (missing.length) problems.push(`**${name}** (${what}) does not mention ${missing.join(', ')}`);
        }
      }
      expect(problems).toEqual([]);
    });

    it(`${file} defines every filtered or derived measure of the app package`, () => {
      const named = new Set(rows.map((r) => r.name));
      const undefinedMeasures = APP_DATASETS.flatMap((d) =>
        (d.measures as AnyRec[]).filter((m) => m.filter || m.derived).filter((m) => !named.has(String(m.label)))
          .map((m) => `${d.name}.${m.name} (**${m.label}**)`));
      expect(undefinedMeasures).toEqual([]);
    });
  }
});
