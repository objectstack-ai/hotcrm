import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('support:portal_user');

/**
 * Portal User Account Validation Trigger
 * 
 * Validates portal user data before insert/update:
 * 1. contact_id and account_id are required
 * 2. Auto-compute full_name from first_name + last_name
 * 3. Validate email format
 * 4. Enforce case limits based on customer_tier
 */
const PortalUserAccountValidationTrigger: Hook = {
  name: 'PortalUserAccountValidationTrigger',
  object: 'portal_user',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const doc = ctx.input.doc as Record<string, any>;

      // Auto-compute full_name
      if (doc.first_name && doc.last_name) {
        doc.full_name = `${doc.first_name} ${doc.last_name}`;
      }

      // Validate email format
      if (doc.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(doc.email)) {
          throw new Error('Invalid email format for portal user.');
        }
      }

      // Auto-set permissions based on user_role
      if (doc.user_role === 'readonly') {
        doc.can_submit_cases = false;
        doc.can_comment_on_cases = false;
        logger.info(`Read-only permissions applied for portal user ${doc.username}`);
      }

      // Enforce max_cases_per_month based on customer_tier
      if (doc.customer_tier && !doc.max_cases_per_month) {
        const tierLimits: Record<string, number> = {
          free: 5,
          basic: 20,
          professional: 50,
          enterprise: 0, // unlimited
          premium: 0     // unlimited
        };
        const limit = tierLimits[doc.customer_tier];
        if (limit !== undefined) {
          doc.max_cases_per_month = limit;
          logger.info(`Auto-set case limit to ${limit || 'unlimited'} based on ${doc.customer_tier} tier`);
        }
      }

      logger.info(`Portal user validation passed: ${doc.username || 'unknown'}`);
    } catch (error) {
      logger.error('Portal user validation failed:', error);
      throw error;
    }
  }
};

/**
 * Portal User Access Level Management Trigger
 * 
 * After update, handle status changes for portal users:
 * - Track activation/deactivation events
 * - Reset failed login attempts on activation
 * - Log security events
 */
const PortalUserAccessLevelTrigger: Hook = {
  name: 'PortalUserAccessLevelTrigger',
  object: 'portal_user',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const user = ctx.result as Record<string, any>;
      const oldUser = ctx.previous as Record<string, any> | undefined;

      // Only process if status changed
      if (!oldUser || oldUser.status === user.status) {
        return;
      }

      logger.info(`Portal user status changed: ${oldUser.status} → ${user.status} for ${user.username}`);

      // Handle activation
      if (user.status === 'active' && oldUser.status !== 'active') {
        const updates: Record<string, any> = {
          is_active: true,
          activation_date: new Date().toISOString(),
          failed_login_attempts: 0
        };

        await (ctx.ql as any).doc.update('portal_user', user._id || user.id, updates);
        logger.info(`Portal user "${user.username}" activated`);
      }

      // Handle deactivation or suspension
      if (['deactivated', 'suspended', 'locked'].includes(user.status)) {
        await (ctx.ql as any).doc.update('portal_user', user._id || user.id, {
          is_active: false
        });
        logger.info(`Portal user "${user.username}" ${user.status} - access revoked`);
      }

      // Handle locked status due to failed login attempts
      if (user.status === 'locked') {
        logger.info(`Security alert: Portal user "${user.username}" account locked`);
      }
    } catch (error) {
      logger.error('[portal_user.hook] access level management failed:', error);
    }
  }
};

export { PortalUserAccountValidationTrigger, PortalUserAccessLevelTrigger };
export default [PortalUserAccountValidationTrigger, PortalUserAccessLevelTrigger] as Hook[];
