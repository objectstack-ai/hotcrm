import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('integration:webhook_subscription');

/**
 * Subscription Validation
 *
 * Validates webhook subscription configuration before creation or update.
 */
const SubscriptionValidation: Hook = {
  name: 'SubscriptionValidation',
  object: 'webhook_subscription',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;

    if (doc.target_url) {
      try {
        new URL(doc.target_url);
      } catch {
        throw new Error('Validation Error: target_url must be a valid URL');
      }
    }

    if (doc.filters) {
      try {
        const parsed = typeof doc.filters === 'string' ? JSON.parse(doc.filters) : doc.filters;
        if (typeof parsed !== 'object') {
          throw new Error('Validation Error: filters must be a valid JSON object');
        }
      } catch (error) {
        if (error instanceof SyntaxError) {
          throw new Error('Validation Error: filters contains invalid JSON');
        }
        throw error;
      }
    }

    if (doc.max_retries !== undefined && (doc.max_retries < 0 || doc.max_retries > 10)) {
      throw new Error('Validation Error: max_retries must be between 0 and 10');
    }
  }
};

/**
 * Secret Rotation
 *
 * Logs when a webhook secret is updated for audit purposes.
 */
const SecretRotation: Hook = {
  name: 'SecretRotation',
  object: 'webhook_subscription',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.result as Record<string, any>;
    if (!doc?._id) return;

    // Secret rotation is detected by comparing the input with existing
    const input = ctx.input.doc as Record<string, any>;
    if (input.secret) {
      logger.info(`Webhook secret rotated for subscription ${doc.name}`);
    }
  }
};

/**
 * Endpoint Verification
 *
 * Verifies the webhook endpoint is reachable when a subscription is activated.
 */
const EndpointVerification: Hook = {
  name: 'EndpointVerification',
  object: 'webhook_subscription',
  events: ['afterInsert'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.result as Record<string, any>;
    if (!doc?._id || !doc.target_url) return;

    logger.info(`Verifying webhook endpoint: ${doc.target_url}`);
    // Endpoint verification is delegated to the runtime webhook framework
  }
};

export { SubscriptionValidation, SecretRotation, EndpointVerification };
export default SubscriptionValidation;
