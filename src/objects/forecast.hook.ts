// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * Forecast lifecycle hook.
 *
 * Auto-derives `period_end` and `period_label` from `period` + `period_start`
 * so callers (UI, AI skill, scheduled snapshot job) don't have to compute
 * them. Also stamps `snapshot_date` to today on insert if unset.
 */

const pad = (n: number) => String(n).padStart(2, '0');
const isoDate = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function endOfMonth(start: Date): Date {
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
}
function endOfQuarter(start: Date): Date {
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 3, 0));
}
function labelFor(period: string, start: Date): string {
  if (period === 'quarter') {
    const q = Math.floor(start.getUTCMonth() / 3) + 1;
    return `Q${q} ${start.getUTCFullYear()}`;
  }
  return `${MONTHS[start.getUTCMonth()]} ${start.getUTCFullYear()}`;
}

const forecastDerive: Hook = {
  name: 'forecast_derive_period',
  object: 'forecast',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 200,
  description: 'Derive period_end and period_label from period + period_start.',
  handler: async (ctx: HookContext) => {
    const { input } = ctx;
    const previous = ctx.previous;
    const period =
      (typeof input.period === 'string' && input.period) ||
      (typeof previous?.period === 'string' && (previous.period as string)) ||
      'month';
    const startStr =
      (typeof input.period_start === 'string' && input.period_start) ||
      (typeof previous?.period_start === 'string' && (previous.period_start as string)) ||
      undefined;

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
