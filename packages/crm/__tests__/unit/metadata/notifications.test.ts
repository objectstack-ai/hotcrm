import { describe, it, expect } from 'vitest';
import { EmailTemplateSchema, JobSchema } from '@objectstack/spec/system';
import {
  welcomeEmail,
  dealWonNotification,
  quoteApprovalRequest,
  meetingReminder,
} from '../../../src/crm_email_templates.notification';
import {
  dailyForecastRecalc,
  weeklyPipelineDigest,
  monthlyTerritoryRebalance,
} from '../../../src/crm_jobs.schedule';

describe('CRM Email Templates Metadata Compliance', () => {
  const templates = [
    { name: 'welcomeEmail', template: welcomeEmail },
    { name: 'dealWonNotification', template: dealWonNotification },
    { name: 'quoteApprovalRequest', template: quoteApprovalRequest },
    { name: 'meetingReminder', template: meetingReminder },
  ];

  describe.each(templates)('$name', ({ template }) => {
    it('should be defined', () => {
      expect(template).toBeDefined();
    });

    it('should validate against EmailTemplateSchema', () => {
      expect(() => EmailTemplateSchema.parse(template)).not.toThrow();
    });

    it('should have a subject', () => {
      expect(typeof template.subject).toBe('string');
      expect(template.subject.length).toBeGreaterThan(0);
    });

    it('should have a body', () => {
      expect(typeof template.body).toBe('string');
      expect(template.body.length).toBeGreaterThan(0);
    });
  });
});

describe('CRM Scheduled Jobs Metadata Compliance', () => {
  const jobs = [
    { name: 'dailyForecastRecalc', job: dailyForecastRecalc },
    { name: 'weeklyPipelineDigest', job: weeklyPipelineDigest },
    { name: 'monthlyTerritoryRebalance', job: monthlyTerritoryRebalance },
  ];

  describe.each(jobs)('$name', ({ job }) => {
    it('should be defined', () => {
      expect(job).toBeDefined();
    });

    it('should validate against JobSchema', () => {
      expect(() => JobSchema.parse(job)).not.toThrow();
    });

    it('should have a snake_case name', () => {
      expect(job.name).toMatch(/^[a-z][a-z0-9_]*$/);
    });

    it('should be enabled', () => {
      expect(job.enabled).toBe(true);
    });

    it('should have a valid schedule', () => {
      expect(job.schedule).toBeDefined();
      expect(['cron', 'interval']).toContain(job.schedule.type);
      if (job.schedule.type === 'cron') {
        expect(typeof job.schedule.expression).toBe('string');
      }
    });
  });
});
