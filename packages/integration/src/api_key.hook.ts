import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('integration:api_key');

/**
 * Key Generation
 *
 * Validates API key configuration and ensures key_hash is present
 * before creation.
 */
const KeyGeneration: Hook = {
  name: 'KeyGeneration',
  object: 'api_key',
  events: ['beforeInsert'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;

    if (!doc.key_hash) {
      throw new Error('Validation Error: key_hash is required');
    }

    if (doc.scopes) {
      try {
        const parsed = typeof doc.scopes === 'string' ? JSON.parse(doc.scopes) : doc.scopes;
        if (!Array.isArray(parsed)) {
          throw new Error('Validation Error: scopes must be a JSON array');
        }
      } catch (error) {
        if (error instanceof SyntaxError) {
          throw new Error('Validation Error: scopes contains invalid JSON');
        }
        throw error;
      }
    }
  }
};

/**
 * Expiry Alert
 *
 * Checks API key expiry on read and logs a warning if the key
 * is nearing expiration.
 */
const ExpiryAlert: Hook = {
  name: 'ApiKeyExpiryAlert',
  object: 'api_key',
  events: ['afterFind'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.result as Record<string, any>;
    if (!doc?._id || !doc.expires_at) return;

    const expiresAt = new Date(doc.expires_at);
    const now = new Date();
    const daysUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
      logger.info(`API key "${doc.name}" expires in ${Math.ceil(daysUntilExpiry)} day(s)`);
    } else if (daysUntilExpiry <= 0) {
      logger.info(`API key "${doc.name}" has expired`);
    }
  }
};

/**
 * Usage Tracking
 *
 * Increments usage_count and updates last_used when an API key is accessed.
 */
const UsageTracking: Hook = {
  name: 'UsageTracking',
  object: 'api_key',
  events: ['afterFind'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.result as Record<string, any>;
    if (!doc?._id || !doc.is_active) return;

    try {
      await (ctx.ql as any).doc.update('api_key', doc._id, {
        usage_count: (doc.usage_count || 0) + 1,
        last_used: new Date().toISOString()
      });
    } catch (error) {
      logger.warn('Failed to update API key usage tracking:', error);
    }
  }
};

export { KeyGeneration, ExpiryAlert, UsageTracking };
export default KeyGeneration;
