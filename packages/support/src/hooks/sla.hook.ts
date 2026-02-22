import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('support:sla');

/**
 * SLA Policy Validation Trigger
 * 
 * Validates SLA policy data before insert or update:
 * 1. Response/resolution times must be positive
 * 2. Priority must be valid
 * 3. No overlapping active policies for the same object type
 */
const SLAPolicyValidationTrigger: Hook = {
  name: 'SLAPolicyValidationTrigger',
  object: 'sla_policy',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const policy = ctx.input.doc as Record<string, any>;

      // Validate response/resolution times are positive
      if (policy.first_response_minutes !== undefined && policy.first_response_minutes <= 0) {
        throw new Error('First response time must be a positive number.');
      }
      if (policy.next_response_minutes !== undefined && policy.next_response_minutes <= 0) {
        throw new Error('Next response time must be a positive number.');
      }
      if (policy.resolution_minutes !== undefined && policy.resolution_minutes <= 0) {
        throw new Error('Resolution time must be a positive number.');
      }
      if (policy.closure_minutes !== undefined && policy.closure_minutes <= 0) {
        throw new Error('Closure time must be a positive number.');
      }

      // Validate priority is a positive number
      if (policy.priority !== undefined && policy.priority < 0) {
        throw new Error('Priority must be a valid non-negative number.');
      }

      // Check for overlapping active policies for the same applies_to type
      if (policy.is_active && policy.applies_to) {
        const filters: any[] = [
          ['is_active', '=', true],
          ['applies_to', '=', policy.applies_to],
        ];

        // Exclude current record on update
        if (policy._id) {
          filters.push(['_id', '!=', policy._id]);
        }

        const overlapping = await (ctx.ql as any).find('sla_policy', { filters });

        if (overlapping && overlapping.length > 0) {
          // Check for matching priority/tier overlap
          for (const existing of overlapping) {
            if (existing.tier === policy.tier && existing.applicable_priorities === policy.applicable_priorities) {
              throw new Error(
                `An active SLA policy already exists for type "${policy.applies_to}" with the same tier and priority. Deactivate the existing policy first.`
              );
            }
          }
        }
      }

      logger.info(`SLA Policy validation passed: ${policy.policy_name || 'unknown'}`);

    } catch (error) {
      logger.error('SLA Policy validation failed:', error);
      throw error;
    }
  }
};

/**
 * SLA Milestone Creation Trigger
 * 
 * When a case is created, finds active SLA policies matching the case
 * priority/type and creates SLA milestone records with calculated target dates.
 */
const SLAMilestoneCreationTrigger: Hook = {
  name: 'SLAMilestoneCreationTrigger',
  object: 'case',
  events: ['afterInsert'],
  handler: async (ctx: HookContext) => {
    try {
      const caseRec = ctx.result as Record<string, any>;

      // Find active SLA policies matching the case
      const filters: any[] = [
        ['is_active', '=', true],
      ];

      const policies = await (ctx.ql as any).find('sla_policy', { filters });

      if (!policies || policies.length === 0) {
        logger.info('ℹ No active SLA policies found. Skipping milestone creation.');
        return;
      }

      // Find the best matching policy based on case priority and type
      const matchingPolicy = policies.find((p: any) => {
        const priorityMatch = !p.applicable_priorities || p.applicable_priorities === caseRec.priority;
        const typeMatch = !p.applicable_case_types || p.applicable_case_types === caseRec.type;
        return priorityMatch && typeMatch;
      }) || policies[0];

      const now = new Date();

      // Create first response milestone
      if (matchingPolicy.enable_first_response && matchingPolicy.first_response_minutes > 0) {
        const targetDate = new Date(now.getTime() + matchingPolicy.first_response_minutes * 60 * 1000);
        await (ctx.ql as any).doc.create('sla_milestone', {
          case_id: caseRec._id,
          milestone_type: 'first_response',
          name: 'First Response',
          target_date_time: targetDate.toISOString(),
          start_date_time: now.toISOString(),
          target_duration_minutes: matchingPolicy.first_response_minutes,
          status: 'in_progress',
          is_violated: false,
          business_hours_id: matchingPolicy.business_hours_id,
        });
      }

      // Create resolution milestone
      if (matchingPolicy.enable_resolution && matchingPolicy.resolution_minutes > 0) {
        const targetDate = new Date(now.getTime() + matchingPolicy.resolution_minutes * 60 * 1000);
        await (ctx.ql as any).doc.create('sla_milestone', {
          case_id: caseRec._id,
          milestone_type: 'resolution',
          name: 'Resolution',
          target_date_time: targetDate.toISOString(),
          start_date_time: now.toISOString(),
          target_duration_minutes: matchingPolicy.resolution_minutes,
          status: 'in_progress',
          is_violated: false,
          business_hours_id: matchingPolicy.business_hours_id,
        });
      }

      // Create next response milestone
      if (matchingPolicy.enable_next_response && matchingPolicy.next_response_minutes > 0) {
        const targetDate = new Date(now.getTime() + matchingPolicy.next_response_minutes * 60 * 1000);
        await (ctx.ql as any).doc.create('sla_milestone', {
          case_id: caseRec._id,
          milestone_type: 'next_response',
          name: 'Next Response',
          target_date_time: targetDate.toISOString(),
          start_date_time: now.toISOString(),
          target_duration_minutes: matchingPolicy.next_response_minutes,
          status: 'in_progress',
          is_violated: false,
          business_hours_id: matchingPolicy.business_hours_id,
        });
      }

      logger.info(`SLA milestones created for case ${caseRec.case_number || caseRec._id} using policy "${matchingPolicy.policy_name}"`);

    } catch (error) {
      logger.error('Error creating SLA milestones:', error);
    }
  }
};

/**
 * SLA Breach Detection Trigger
 * 
 * When a milestone is updated, checks if the target_date has passed.
 * If breached, sets status to 'breached', logs breach time,
 * and triggers escalation by updating case priority.
 */
const SLABreachDetectionTrigger: Hook = {
  name: 'SLABreachDetectionTrigger',
  object: 'sla_milestone',
  events: ['beforeUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const milestone = ctx.input.doc as Record<string, any>;
      const oldMilestone = ctx.previous as Record<string, any> | undefined;

      // Skip if already breached
      if (oldMilestone && oldMilestone.status === 'breached') {
        return;
      }

      // Skip if milestone is completed
      if (milestone.status === 'completed') {
        return;
      }

      const now = new Date();
      const targetDate = milestone.target_date_time ? new Date(milestone.target_date_time) : null;

      if (targetDate && now > targetDate) {
        // SLA has been breached
        milestone.status = 'breached';
        milestone.is_violated = true;
        milestone.violation_minutes = Math.round((now.getTime() - targetDate.getTime()) / (60 * 1000));

        logger.info(`SLA milestone breached: ${milestone.name || milestone.milestone_type}. Violation: ${milestone.violation_minutes} minutes.`);

        // Trigger escalation by updating the associated case priority
        if (milestone.case_id) {
          const cases = await (ctx.ql as any).find('case', {
            filters: [['_id', '=', milestone.case_id]],
          });

          if (cases && cases.length > 0) {
            const caseRec = cases[0];
            const currentPriority = caseRec.priority;

            // Escalate priority if not already critical
            let newPriority = currentPriority;
            if (currentPriority === 'low') {
              newPriority = 'medium';
            } else if (currentPriority === 'medium') {
              newPriority = 'high';
            } else if (currentPriority === 'high') {
              newPriority = 'critical';
            }

            if (newPriority !== currentPriority) {
              await (ctx.ql as any).doc.update('case', milestone.case_id, {
                priority: newPriority,
                is_sla_violated: true,
                sla_violation_type: milestone.milestone_type,
                is_escalated: true,
                escalated_date: now.toISOString(),
                escalation_reason: `SLA ${milestone.milestone_type} breached by ${milestone.violation_minutes} minutes`,
              });

              logger.info(`⬆ Case ${caseRec.case_number} escalated from "${currentPriority}" to "${newPriority}" due to SLA breach.`);
            }
          }
        }
      } else if (targetDate) {
        // Check for warning threshold
        const warningDate = milestone.warning_threshold_date_time
          ? new Date(milestone.warning_threshold_date_time)
          : null;

        if (warningDate && now > warningDate && !milestone.is_warning) {
          milestone.is_warning = true;
          logger.info(`SLA milestone approaching breach: ${milestone.name || milestone.milestone_type}`);
        }
      }

    } catch (error) {
      logger.error('Error in SLA breach detection:', error);
    }
  }
};

export { SLAPolicyValidationTrigger, SLAMilestoneCreationTrigger, SLABreachDetectionTrigger };
export default [SLAPolicyValidationTrigger, SLAMilestoneCreationTrigger, SLABreachDetectionTrigger] as Hook[];
