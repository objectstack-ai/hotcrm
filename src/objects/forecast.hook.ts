// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * Forecast lifecycle hook.
 *
 * Auto-derives the whole period family — `period_start`, `period_end` and
 * `period_label` — from `period` (+ `period_start`, when the caller supplies
 * one) so callers (UI, AI skill, the `forecast_snapshot` scheduled flow) don't
 * have to compute them. Also stamps `snapshot_date` to today on insert if
 * unset.
 *
 * Why `period_start` is derived here and nowhere else: a flow template can
 * express `{TODAY()}` and day offsets, but it has no way to say "the first day
 * of the calendar quarter containing today". If each writer computed its own
 * boundary we would get exactly the drift #530 pinned in the seeds — snapshots
 * labelled 'Q3 2026' whose `period_start` is some mid-quarter date, so every
 * "this quarter" equals-filter misses. One derivation, one definition: give
 * the object a `period` and it lands on a calendar-true boundary or not at all.
 *
 * NOTE: all helpers are inlined into `handler` because the build pipeline
 * lowers inline handlers — module-scope helpers would not survive lowering.
 */
const forecastDerive: Hook = {
  name: 'forecast_derive_period',
  object: 'crm_forecast',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 200,
  description: 'Derive period_start, period_end and period_label from period (+ snapshot_date).',
  handler: async (ctx: HookContext) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const isoDate = (d: Date) =>
      `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const endOfMonth = (start: Date) =>
      new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
    const endOfQuarter = (start: Date) =>
      new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 3, 0));
    // First day of the calendar period CONTAINING `d` — the inverse of the
    // two helpers above, and the piece a flow template cannot express.
    const startOfPeriod = (period: string, d: Date) =>
      new Date(Date.UTC(
        d.getUTCFullYear(),
        period === 'quarter' ? Math.floor(d.getUTCMonth() / 3) * 3 : d.getUTCMonth(),
        1,
      ));
    const labelFor = (period: string, start: Date) => {
      if (period === 'quarter') {
        const q = Math.floor(start.getUTCMonth() / 3) + 1;
        return `Q${q} ${start.getUTCFullYear()}`;
      }
      return `${MONTHS[start.getUTCMonth()]} ${start.getUTCFullYear()}`;
    };

    const { input } = ctx;
    const previous = ctx.previous;
    const period =
      (typeof input.period === 'string' && input.period) ||
      (typeof previous?.period === 'string' && (previous.period as string)) ||
      'month';
    let startStr =
      (typeof input.period_start === 'string' && input.period_start) ||
      (typeof previous?.period_start === 'string' && (previous.period_start as string)) ||
      undefined;

    // No period_start anywhere ⇒ snapshot the period that contains the
    // snapshot day (falling back to today). `period_start` is required +
    // notNull, so before this the write simply failed; deriving it is what
    // makes `{ period: 'quarter' }` a complete, calendar-true snapshot
    // request — the only shape an automated writer can express.
    if (!startStr) {
      const anchorStr =
        (typeof input.snapshot_date === 'string' && input.snapshot_date) ||
        (typeof previous?.snapshot_date === 'string' && (previous.snapshot_date as string)) ||
        isoDate(new Date());
      const anchor = new Date(`${anchorStr.slice(0, 10)}T00:00:00Z`);
      if (!Number.isNaN(anchor.getTime())) {
        startStr = isoDate(startOfPeriod(period, anchor));
        input.period_start = startStr;
      }
    }

    if (startStr) {
      const start = new Date(`${startStr}T00:00:00Z`);
      if (!Number.isNaN(start.getTime())) {
        const end = period === 'quarter' ? endOfQuarter(start) : endOfMonth(start);
        if (!input.period_end) input.period_end = isoDate(end);
        if (!input.period_label) input.period_label = labelFor(period, start);
      }
    }

    if (!input.snapshot_date && !previous?.snapshot_date) {
      input.snapshot_date = isoDate(new Date());
    }
  },
};

export default forecastDerive;
