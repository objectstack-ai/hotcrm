import { WebhookConfigSchema } from '@objectstack/spec/integration';
import type { z } from 'zod';

type WebhookConfig = z.infer<typeof WebhookConfigSchema>;

/**
 * Webhook fired when a new opportunity is created.
 */
export const newOpportunityWebhook: WebhookConfig = WebhookConfigSchema.parse({
  name: 'new_opportunity',
  url: '{{WEBHOOK_BASE_URL}}/hooks/opportunity/created',
  method: 'POST',
  events: ['record.created'],
  headers: {
    'X-Source': 'hotcrm',
    'X-Object': 'opportunity',
  },
  isActive: true,
  timeoutMs: 15000,
  signatureAlgorithm: 'hmac_sha256',
});

/**
 * Webhook fired when an opportunity stage changes.
 */
export const opportunityStageChangeWebhook: WebhookConfig =
  WebhookConfigSchema.parse({
    name: 'opportunity_stage_change',
    url: '{{WEBHOOK_BASE_URL}}/hooks/opportunity/stage-changed',
    method: 'POST',
    events: ['record.updated'],
    headers: {
      'X-Source': 'hotcrm',
      'X-Object': 'opportunity',
      'X-Event': 'stage_change',
    },
    isActive: true,
    timeoutMs: 15000,
    signatureAlgorithm: 'hmac_sha256',
  });

/**
 * Webhook fired when a support case is escalated.
 */
export const caseEscalationWebhook: WebhookConfig = WebhookConfigSchema.parse({
  name: 'case_escalation',
  url: '{{WEBHOOK_BASE_URL}}/hooks/case/escalated',
  method: 'POST',
  events: ['record.updated'],
  headers: {
    'X-Source': 'hotcrm',
    'X-Object': 'case',
    'X-Event': 'escalation',
  },
  isActive: true,
  timeoutMs: 10000,
  signatureAlgorithm: 'hmac_sha256',
});

export const crmWebhooks = {
  newOpportunityWebhook,
  opportunityStageChangeWebhook,
  caseEscalationWebhook,
};

export default crmWebhooks;
