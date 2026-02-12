import { AuditConfigSchema } from '@objectstack/spec/system';
import type { z } from 'zod';

type AuditConfig = z.infer<typeof AuditConfigSchema>;

export const crmAuditConfig: AuditConfig = AuditConfigSchema.parse({
  name: 'crm_audit',
  label: 'CRM Audit Configuration',
  enabled: true,
  minimumSeverity: 'info',

  storage: {
    type: 'database',
    bufferEnabled: true,
    bufferSize: 500,
    flushIntervalSeconds: 10,
    compression: true,
  },

  retentionPolicy: {
    retentionDays: 365,
    archiveAfterRetention: true,
  },

  suspiciousActivityRules: [
    {
      id: 'crm_mass_export',
      name: 'Mass CRM Data Export',
      enabled: true,
      eventTypes: ['data.export'],
      condition: { threshold: 1000, windowSeconds: 3600 },
      actions: ['alert', 'log_critical'],
      alertSeverity: 'critical',
    },
    {
      id: 'crm_bulk_delete',
      name: 'Bulk Record Deletion',
      enabled: true,
      eventTypes: ['data.delete'],
      condition: { threshold: 100, windowSeconds: 600 },
      actions: ['alert', 'require_mfa'],
      alertSeverity: 'critical',
    },
    {
      id: 'crm_rapid_access',
      name: 'Rapid Record Access Pattern',
      enabled: true,
      eventTypes: ['data.read'],
      condition: { threshold: 500, windowSeconds: 60 },
      actions: ['alert', 'log_critical'],
      alertSeverity: 'warning',
    },
  ],

  includeSensitiveData: false,
  redactFields: [
    'password',
    'ssn',
    'credit_card',
    'api_key',
    'tax_id',
    'bank_account',
  ],

  logReads: true,
  readSamplingRate: 0.25,
  logSystemEvents: true,
});

export default crmAuditConfig;
