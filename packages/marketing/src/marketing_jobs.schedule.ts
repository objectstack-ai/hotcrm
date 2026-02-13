import { JobSchema } from '@objectstack/spec/system';
import type { z } from 'zod';

type Job = z.infer<typeof JobSchema>;

/**
 * Refreshes lead scores daily at 3:00 AM UTC.
 */
export const dailyLeadScoring: Job = JobSchema.parse({
  id: 'daily_lead_scoring',
  name: 'daily_lead_scoring',
  schedule: { type: 'cron', expression: '0 3 * * *', timezone: 'UTC' },
  handler: 'marketing.refresh_lead_scores',
  enabled: true,
  retryPolicy: { maxRetries: 3, backoffMs: 5000 },
  timeout: 300000,
});

/**
 * Generates weekly campaign performance reports every Monday at 8:00 AM UTC.
 */
export const weeklyCampaignReport: Job = JobSchema.parse({
  id: 'weekly_campaign_report',
  name: 'weekly_campaign_report',
  schedule: { type: 'cron', expression: '0 8 * * 1', timezone: 'UTC' },
  handler: 'marketing.generate_campaign_report',
  enabled: true,
  retryPolicy: { maxRetries: 3, backoffMs: 5000 },
  timeout: 300000,
});

/**
 * Processes the outbound email queue every hour.
 */
export const hourlyEmailQueue: Job = JobSchema.parse({
  id: 'hourly_email_queue',
  name: 'hourly_email_queue',
  schedule: { type: 'interval', intervalMs: 3600000 },
  handler: 'marketing.process_email_queue',
  enabled: true,
  retryPolicy: { maxRetries: 3, backoffMs: 5000 },
  timeout: 120000,
});

export const marketingJobs = {
  dailyLeadScoring,
  weeklyCampaignReport,
  hourlyEmailQueue,
};

export default marketingJobs;
