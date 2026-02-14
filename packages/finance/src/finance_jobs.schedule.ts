import { JobSchema } from '@objectstack/spec/system';
import type { Job } from '@objectstack/spec/system';

/**
 * Processes daily revenue recognition entries at 1:00 AM UTC.
 */
export const dailyRevenueRecognition: Job = JobSchema.parse({
  id: 'daily_revenue_recognition',
  name: 'daily_revenue_recognition',
  schedule: { type: 'cron', expression: '0 1 * * *', timezone: 'UTC' },
  handler: 'finance.recognize_revenue',
  enabled: true,
  retryPolicy: { maxRetries: 3, backoffMs: 5000 },
  timeout: 300000,
});

/**
 * Updates accounts receivable aging reports every Monday at 6:00 AM UTC.
 */
export const weeklyArAgingUpdate: Job = JobSchema.parse({
  id: 'weekly_ar_aging_update',
  name: 'weekly_ar_aging_update',
  schedule: { type: 'cron', expression: '0 6 * * 1', timezone: 'UTC' },
  handler: 'finance.update_ar_aging',
  enabled: true,
  retryPolicy: { maxRetries: 3, backoffMs: 5000 },
  timeout: 300000,
});

/**
 * Generates month-end close tasks on the first day of each month at midnight UTC.
 */
export const monthlyCloseTasks: Job = JobSchema.parse({
  id: 'monthly_close_tasks',
  name: 'monthly_close_tasks',
  schedule: { type: 'cron', expression: '0 0 1 * *', timezone: 'UTC' },
  handler: 'finance.generate_close_tasks',
  enabled: true,
  retryPolicy: { maxRetries: 3, backoffMs: 5000 },
  timeout: 600000,
});

export const financeJobs = {
  dailyRevenueRecognition,
  weeklyArAgingUpdate,
  monthlyCloseTasks,
};

export default financeJobs;
