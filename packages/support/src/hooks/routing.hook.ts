import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('support:routing');

/**
 * Case Routing Trigger
 * 
 * When a case is created without an owner, looks up routing rules matching
 * case criteria (type, priority, product). Finds available agents with
 * matching skills. Assigns to the agent with the lowest workload.
 */
const CaseRoutingTrigger: Hook = {
  name: 'CaseRoutingTrigger',
  object: 'case',
  events: ['beforeInsert'],
  handler: async (ctx: HookContext) => {
    try {
      const caseRec = ctx.input.doc as Record<string, any>;

      // Skip if case already has an owner assigned
      if (caseRec.owner_id) {
        logger.info('ℹ Case already has an owner. Skipping auto-routing.');
        return;
      }

      // 1. Find matching routing rules
      const routingRules = await (ctx.ql as any).find('routing_rule', {
        filters: [['is_active', '=', true]],
      });

      if (!routingRules || routingRules.length === 0) {
        logger.info('ℹ No active routing rules found. Skipping auto-routing.');
        return;
      }

      // Sort by priority (lower number = higher priority)
      routingRules.sort((a: any, b: any) => (a.priority || 999) - (b.priority || 999));

      // Find the first matching rule
      let matchedRule: any = null;
      for (const rule of routingRules) {
        const typeMatch = !rule.match_case_types || rule.match_case_types === caseRec.type;
        const priorityMatch = !rule.match_priorities || rule.match_priorities === caseRec.priority;
        const productMatch = !rule.match_product_ids || (caseRec.product_id && rule.match_product_ids.includes(caseRec.product_id));

        if (typeMatch && priorityMatch && productMatch) {
          matchedRule = rule;
          break;
        }
      }

      if (!matchedRule) {
        logger.info('ℹ No matching routing rule found for case criteria.');
        return;
      }

      // 2. If rule has a queue, find available agents in that queue
      if (matchedRule.queue_id) {
        caseRec.assigned_to_queue_id = matchedRule.queue_id;

        // Find active queue members who accept new cases
        const queueMembers = await (ctx.ql as any).find('queue_member', {
          filters: [
            ['queue_id', '=', matchedRule.queue_id],
            ['is_active', '=', true],
            ['accept_new_cases', '=', true],
          ],
        });

        if (queueMembers && queueMembers.length > 0) {
          // Filter members who haven't exceeded their max cases
          const availableMembers = queueMembers.filter((m: any) => {
            const maxCases = m.max_cases || 999;
            const currentCases = m.current_cases || 0;
            return currentCases < maxCases;
          });

          if (availableMembers.length > 0) {
            // Assign to agent with lowest current workload
            availableMembers.sort((a: any, b: any) => (a.current_cases || 0) - (b.current_cases || 0));
            const selectedMember = availableMembers[0];

            caseRec.owner_id = selectedMember.user_id;

            // Update queue member stats
            await (ctx.ql as any).doc.update('queue_member', selectedMember._id, {
              current_cases: (selectedMember.current_cases || 0) + 1,
              last_assigned_date: new Date().toISOString(),
              total_assignments: (selectedMember.total_assignments || 0) + 1,
            });

            logger.info(`Case routed to agent ${selectedMember.user_id} via rule "${matchedRule.name}" (workload: ${selectedMember.current_cases || 0} cases)`);
          } else {
            logger.info(`All agents in queue "${matchedRule.queue_id}" are at capacity. Case queued without owner.`);
          }
        }
      }

      // Update routing rule stats
      await (ctx.ql as any).doc.update('routing_rule', matchedRule._id, {
        cases_routed: (matchedRule.cases_routed || 0) + 1,
        last_match_date: new Date().toISOString(),
      });

    } catch (error) {
      logger.error('Error in case routing:', error);
    }
  }
};

/**
 * Case Escalation Trigger
 * 
 * When case priority changes to 'critical', or case age exceeds threshold,
 * looks up escalation rules, reassigns to escalation queue/manager,
 * and logs escalation reason.
 */
const CaseEscalationTrigger: Hook = {
  name: 'CaseEscalationTrigger',
  object: 'case',
  events: ['beforeUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const caseRec = ctx.input.doc as Record<string, any>;
      const oldCase = ctx.previous as Record<string, any> | undefined;

      // Determine if escalation is needed
      const priorityEscalated = oldCase && oldCase.priority !== 'critical' && caseRec.priority === 'critical';
      const alreadyEscalated = caseRec.is_escalated === true;

      // Skip if already escalated and priority hasn't changed to critical
      if (alreadyEscalated && !priorityEscalated) {
        return;
      }

      // Check if escalation should trigger
      let shouldEscalate = false;
      let escalationReason = '';

      // Condition 1: Priority changed to critical
      if (priorityEscalated) {
        shouldEscalate = true;
        escalationReason = `Priority escalated to critical (was "${oldCase!.priority}")`;
      }

      // Condition 2: Case age exceeds threshold (check created_at age)
      if (!shouldEscalate && oldCase && oldCase.created_at) {
        const caseAge = Date.now() - new Date(oldCase.created_at).getTime();
        const caseAgeHours = caseAge / (1000 * 60 * 60);

        // Escalate if case is older than 48 hours and still open
        if (caseAgeHours > 48 && caseRec.status !== 'resolved' && caseRec.status !== 'closed') {
          shouldEscalate = true;
          escalationReason = `Case age exceeded 48 hours (${Math.round(caseAgeHours)} hours)`;
        }
      }

      if (!shouldEscalate) {
        return;
      }

      // Find matching escalation rules
      const escalationRules = await (ctx.ql as any).find('escalation_rule', {
        filters: [['is_active', '=', true]],
      });

      if (!escalationRules || escalationRules.length === 0) {
        logger.info('ℹ No active escalation rules found.');
        return;
      }

      // Find the best matching escalation rule
      const currentLevel = caseRec.escalation_level || 0;
      const matchingRule = escalationRules.find((rule: any) => {
        const levelMatch = rule.escalation_level === currentLevel + 1;
        const typeMatch = !rule.applicable_case_types || rule.applicable_case_types === caseRec.type;
        const priorityMatch = !rule.applicable_priorities || rule.applicable_priorities === caseRec.priority;
        return levelMatch && typeMatch && priorityMatch;
      }) || escalationRules[0];

      // Apply escalation
      const now = new Date();
      caseRec.is_escalated = true;
      caseRec.escalated_date = now.toISOString();
      caseRec.escalation_reason = escalationReason;
      caseRec.escalation_level = currentLevel + 1;

      // Reassign based on escalation rule target
      if (matchingRule.escalate_to_type === 'user' && matchingRule.escalate_to_user_id) {
        caseRec.escalated_to_id = matchingRule.escalate_to_user_id;
        caseRec.owner_id = matchingRule.escalate_to_user_id;
      } else if (matchingRule.escalate_to_type === 'queue' && matchingRule.escalate_to_queue_id) {
        caseRec.assigned_to_queue_id = matchingRule.escalate_to_queue_id;
      }

      // Update priority if rule specifies
      if (matchingRule.update_priority && matchingRule.new_priority) {
        caseRec.priority = matchingRule.new_priority;
      }

      // Update escalation rule stats
      await (ctx.ql as any).doc.update('escalation_rule', matchingRule._id, {
        times_triggered: (matchingRule.times_triggered || 0) + 1,
        last_triggered_date: now.toISOString(),
      });

      logger.info(`⬆ Case ${caseRec.case_number || caseRec._id} escalated (Level ${caseRec.escalation_level}): ${escalationReason}`);

    } catch (error) {
      logger.error('Error in case escalation:', error);
    }
  }
};

export { CaseRoutingTrigger, CaseEscalationTrigger };
export default [CaseRoutingTrigger, CaseEscalationTrigger] as Hook[];
