import { JobSchema } from '@objectstack/spec/system';
import type { z } from 'zod';

type Job = z.infer<typeof JobSchema>;

/**
 * Recalculates sales forecasts daily at 2:00 AM UTC.
 */
export const dailyForecastRecalc: Job = JobSchema.parse({
  id: 'daily_forecast_recalc',
  name: 'daily_forecast_recalc',
  schedule: { type: 'cron', expression: '0 2 * * *', timezone: 'UTC' },
  handler: 'crm.recalculate_forecasts',
  enabled: true,
  retryPolicy: { maxRetries: 3, backoffMs: 5000 },
  timeout: 300000,
});

/**
 * Sends a weekly pipeline summary digest every Monday at 8:00 AM UTC.
 */
export const weeklyPipelineDigest: Job = JobSchema.parse({
  id: 'weekly_pipeline_digest',
  name: 'weekly_pipeline_digest',
  schedule: { type: 'cron', expression: '0 8 * * 1', timezone: 'UTC' },
  handler: 'crm.send_pipeline_digest',
  enabled: true,
  retryPolicy: { maxRetries: 3, backoffMs: 5000 },
  timeout: 300000,
});

/**
 * Rebalances sales territories on the first day of each month at midnight UTC.
 */
export const monthlyTerritoryRebalance: Job = JobSchema.parse({
  id: 'monthly_territory_rebalance',
  name: 'monthly_territory_rebalance',
  schedule: { type: 'cron', expression: '0 0 1 * *', timezone: 'UTC' },
  handler: 'crm.rebalance_territories',
  enabled: true,
  retryPolicy: { maxRetries: 3, backoffMs: 5000 },
  timeout: 600000,
});

export const crmJobs = {
  dailyForecastRecalc,
  weeklyPipelineDigest,
  monthlyTerritoryRebalance,
};

export default crmJobs;
