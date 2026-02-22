import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('support:queue');

/**
 * Queue Load Balancing Trigger
 * 
 * When queue membership changes, rebalances workload by calculating
 * current workload per member and ensuring even distribution.
 */
const QueueLoadBalancingTrigger: Hook = {
  name: 'QueueLoadBalancingTrigger',
  object: 'queue_member',
  events: ['afterInsert', 'afterUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const member = ctx.result as Record<string, any>;

      if (!member.queue_id) {
        return;
      }

      // Fetch all active members in the same queue
      const allMembers = await (ctx.ql as any).find('queue_member', {
        filters: [
          ['queue_id', '=', member.queue_id],
          ['is_active', '=', true],
          ['accept_new_cases', '=', true],
        ],
      });

      if (!allMembers || allMembers.length === 0) {
        return;
      }

      // Calculate total workload across all members
      const totalCases = allMembers.reduce((sum: number, m: any) => sum + (m.current_cases || 0), 0);
      const avgCases = Math.floor(totalCases / allMembers.length);

      // Identify imbalanced members (deviation > 2 cases from average)
      const overloaded = allMembers.filter((m: any) => (m.current_cases || 0) > avgCases + 2);
      const underloaded = allMembers.filter((m: any) => {
        const maxCases = m.max_cases || 999;
        return (m.current_cases || 0) < avgCases && (m.current_cases || 0) < maxCases;
      });

      if (overloaded.length > 0 && underloaded.length > 0) {
        logger.info(`Queue "${member.queue_id}" workload imbalance detected. Avg: ${avgCases} cases. Overloaded: ${overloaded.length}, Underloaded: ${underloaded.length}`);
      }

      // Update queue-level statistics
      const queues = await (ctx.ql as any).find('queue', {
        filters: [['_id', '=', member.queue_id]],
      });

      if (queues && queues.length > 0) {
        const activeMembers = allMembers.length;
        const totalActiveCases = totalCases;
        const avgResTime = allMembers.reduce((sum: number, m: any) => sum + (m.avg_resolution_time || 0), 0) / activeMembers;

        await (ctx.ql as any).doc.update('queue', member.queue_id, {
          total_members: activeMembers,
          active_cases: totalActiveCases,
          average_resolution_time: Math.round(avgResTime),
        });
      }

      logger.info(`Queue "${member.queue_id}" stats updated: ${allMembers.length} active members, ${totalCases} total cases`);

    } catch (error) {
      logger.error('Error in queue load balancing:', error);
    }
  }
};

/**
 * Queue Capacity Validation Trigger
 * 
 * Validates queue settings before update:
 * 1. max_cases_per_agent must be positive
 * 2. Queue must have at least one active member before activation
 */
const QueueCapacityValidationTrigger: Hook = {
  name: 'QueueCapacityValidationTrigger',
  object: 'queue',
  events: ['beforeUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const queue = ctx.input.doc as Record<string, any>;
      const oldQueue = ctx.previous as Record<string, any> | undefined;

      // Validate max_cases_per_agent is positive
      if (queue.max_cases_per_agent !== undefined && queue.max_cases_per_agent <= 0) {
        throw new Error('max_cases_per_agent must be a positive number.');
      }

      // Validate overflow_threshold is positive if overflow is enabled
      if (queue.enable_overflow && queue.overflow_threshold !== undefined && queue.overflow_threshold <= 0) {
        throw new Error('overflow_threshold must be a positive number when overflow is enabled.');
      }

      // Check that queue has at least one active member before activation
      const isBeingActivated = queue.is_active === true && oldQueue && oldQueue.is_active !== true;

      if (isBeingActivated) {
        const members = await (ctx.ql as any).find('queue_member', {
          filters: [
            ['queue_id', '=', queue._id],
            ['is_active', '=', true],
          ],
        });

        if (!members || members.length === 0) {
          throw new Error('Queue must have at least one active member before activation.');
        }
      }

      logger.info(`Queue validation passed: ${queue.name || 'unknown'}`);

    } catch (error) {
      logger.error('Queue validation failed:', error);
      throw error;
    }
  }
};

export { QueueLoadBalancingTrigger, QueueCapacityValidationTrigger };
export default [QueueLoadBalancingTrigger, QueueCapacityValidationTrigger] as Hook[];