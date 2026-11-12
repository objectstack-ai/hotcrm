// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { CrmSeedData, SaasTenantSeedData } from '../objectstack.composition';

/**
 * Every date the demo seeds is an offset from the moment the seed is written
 * (#2431).
 *
 * The browser pass on staging read a demo that looked frozen in time: open
 * deals due weeks ago, most open cases past SLA, an activity chart that ended
 * a month back. The seeds were not frozen — every one of those dates is a
 * `daysAgo()` / `daysFromNow()` / `now() - duration()` expression the seed
 * loader resolves when it writes the rows, and the tenant had simply been
 * installed 26 days earlier. One dataset WAS frozen: the forecast periods were
 * computed in plain TS when the module loaded, and `objectstack build` loads
 * it, so the artifact a tenant installs carried the build day's calendar.
 *
 * A literal date in a seed row is that defect's shape whichever way it
 * arrives — typed by hand, or computed by the module. It means the same row
 * reads differently on every install day, and always wrong eventually. So no
 * seed row may hold one: a date is a CEL expression, resolved at seed time.
 * Re-basing a demo that has ALREADY aged is not something a seed can do; that
 * is a platform capability (reported on #2431), and an admin's route today is
 * a reseed of a fresh organization.
 */

type Rec = Record<string, unknown>;
type Dataset = { object: string; records: Rec[] };

/** An ISO date or date-time written as text: `2026-11-01`, `2026-11-01T09:00:00Z`. */
const ISO_DATE_TEXT = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

/** Every string value in `value`, with its path — nested objects and arrays included. */
function* strings(value: unknown, path: string): Generator<[string, string]> {
  if (typeof value === 'string') yield [path, value];
  else if (Array.isArray(value)) for (const [i, v] of value.entries()) yield* strings(v, `${path}[${i}]`);
  else if (value && typeof value === 'object') {
    // A CEL envelope's `source` is the expression itself, not a value.
    if ('dialect' in value && 'source' in value) return;
    for (const [k, v] of Object.entries(value)) yield* strings(v, `${path}.${k}`);
  }
}

const SETS: Record<string, Dataset[]> = {
  'the default composition (CrmSeedData)': CrmSeedData as unknown as Dataset[],
  'the SaaS tenant composition (SaasTenantSeedData)': SaasTenantSeedData as unknown as Dataset[],
};

describe('no seed row holds a literal date (#2431)', () => {
  it.each(Object.entries(SETS))('%s', (_name, datasets) => {
    expect(datasets.length, 'fixture: the composition seeds something').toBeGreaterThan(0);
    const literals: string[] = [];
    for (const d of datasets) {
      d.records.forEach((r, i) => {
        for (const [path, text] of strings(r, `${d.object}[${i}]`)) {
          if (ISO_DATE_TEXT.test(text)) literals.push(`${path} = "${text}"`);
        }
      });
    }
    expect(
      literals,
      `these seed values are literal dates, so they read differently on every install day:\n  ${literals.join('\n  ')}\n`
        + 'Write each one as a CEL expression the loader resolves at seed time (cel`daysAgo(n)`, cel`daysFromNow(n)`).',
    ).toEqual([]);
  });

  it('the dates the card names are expressions, row by row', () => {
    // The fields the #2431 browser pass read as frozen. A row may omit one
    // (a closed case has no open SLA story to tell), but a row that carries
    // it carries an expression.
    const FIELDS: Record<string, readonly string[]> = {
      crm_opportunity: ['close_date'],
      crm_case: ['created_at', 'sla_due_date'],
      crm_task: ['due_date'],
      crm_event: ['start_datetime', 'end_datetime'],
      crm_campaign: ['start_date', 'end_date'],
      crm_quote: ['quote_date', 'expiration_date'],
      crm_forecast: ['period_start', 'period_end'],
    };
    const all = SETS['the default composition (CrmSeedData)']!;
    const bad: string[] = [];
    for (const [object, fields] of Object.entries(FIELDS)) {
      const rows = all.filter((d) => d.object === object).flatMap((d) => d.records);
      expect(rows.length, `fixture: ${object} is seeded`).toBeGreaterThan(0);
      rows.forEach((r, i) => {
        for (const f of fields) {
          const v = r[f];
          if (v === undefined || v === null) continue;
          const isCel = typeof v === 'object' && (v as Rec).dialect === 'cel' && typeof (v as Rec).source === 'string';
          if (!isCel) bad.push(`${object}[${i}].${f} = ${JSON.stringify(v)}`);
        }
      });
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });
});
