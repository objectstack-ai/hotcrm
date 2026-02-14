import { JobSchema, type Job } from '@objectstack/spec/system';

/**
 * Checks SLA compliance for all open cases every hour.
 */
export const hourlySlaCheck: Job = JobSchema.parse({
  id: 'hourly_sla_check',
  name: 'hourly_sla_check',
  schedule: { type: 'interval', intervalMs: 3600000 },
  handler: 'support.check_sla_compliance',
  enabled: true,
  retryPolicy: { maxRetries: 3, backoffMs: 5000 },
  timeout: 120000,
});

/**
 * Rebalances case assignments across agents daily at 7:00 AM UTC.
 */
export const dailyCaseRebalance: Job = JobSchema.parse({
  id: 'daily_case_rebalance',
  name: 'daily_case_rebalance',
  schedule: { type: 'cron', expression: '0 7 * * *', timezone: 'UTC' },
  handler: 'support.rebalance_case_assignments',
  enabled: true,
  retryPolicy: { maxRetries: 3, backoffMs: 5000 },
  timeout: 300000,
});

/**
 * Sends a weekly CSAT summary digest every Monday at 9:00 AM UTC.
 */
export const weeklyCsatDigest: Job = JobSchema.parse({
  id: 'weekly_csat_digest',
  name: 'weekly_csat_digest',
  schedule: { type: 'cron', expression: '0 9 * * 1', timezone: 'UTC' },
  handler: 'support.send_csat_digest',
  enabled: true,
  retryPolicy: { maxRetries: 3, backoffMs: 5000 },
  timeout: 300000,
});

export const supportJobs = {
  hourlySlaCheck,
  dailyCaseRebalance,
  weeklyCsatDigest,
};

export default supportJobs;
