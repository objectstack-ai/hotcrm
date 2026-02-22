import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('healthcare:hipaa_audit');

/**
 * HIPAA Audit Trail
 *
 * Automatic audit logging for all PHI access after insert.
 */
const HipaaAuditTrail: Hook = {
  name: 'HipaaAuditTrail',
  object: 'hipaa_audit',
  events: ['afterInsert'],
  handler: async (ctx: HookContext) => {
    const audit = ctx.result as Record<string, any>;
    if (!audit?._id) return;

    logger.info(`HIPAA Audit: User ${audit.user_id} performed ${audit.action} on ${audit.record_type}:${audit.record_id} at ${audit.timestamp}`);
  }
};

/**
 * HIPAA Anomaly Detection
 *
 * Flags unusual access patterns such as high volume or after-hours access.
 */
const HipaaAnomalyDetection: Hook = {
  name: 'HipaaAnomalyDetection',
  object: 'hipaa_audit',
  events: ['afterInsert'],
  handler: async (ctx: HookContext) => {
    const audit = ctx.result as Record<string, any>;
    if (!audit?._id || !audit?.user_id) return;

    try {
      // Check for high-volume access
      const recentAccess = await (ctx.ql as any).find('hipaa_audit', {
        filters: [['user_id', '=', audit.user_id]],
        limit: 100
      });

      if (recentAccess.length >= 50) {
        logger.warn(`HIPAA Alert: High-volume access detected for user ${audit.user_id} (${recentAccess.length} records accessed)`);
      }

      // Check for after-hours access
      if (audit.timestamp) {
        const hour = new Date(audit.timestamp).getHours();
        if (hour < 6 || hour > 22) {
          logger.warn(`HIPAA Alert: After-hours access by user ${audit.user_id} at ${audit.timestamp}`);
        }
      }
    } catch (error) {
      logger.warn('Failed to detect anomalies:', error);
    }
  }
};

export { HipaaAuditTrail, HipaaAnomalyDetection };
export default HipaaAuditTrail;
