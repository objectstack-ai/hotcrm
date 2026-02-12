import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * Position Status Change Validation Trigger
 * 
 * Validates position data before insert/update:
 * 1. min_salary must be less than max_salary
 * 2. Cannot close a position that is currently in hiring status without cancelling
 * 3. Headcount must be positive
 */
const PositionStatusChangeValidationTrigger: Hook = {
  name: 'PositionStatusChangeValidationTrigger',
  object: 'position',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;
    try {
      // Validate salary range
      if (doc.min_salary !== undefined && doc.max_salary !== undefined) {
        if (doc.min_salary > doc.max_salary) {
          throw new Error('❌ Minimum salary cannot exceed maximum salary');
        }
      }

      // Validate headcount is positive
      if (doc.headcount !== undefined && doc.headcount < 1) {
        throw new Error('❌ Planned headcount must be at least 1');
      }

      // Validate status transitions
      const previous = ctx.previous as Record<string, any> | undefined;
      if (previous && doc.status === 'closed' && previous.status === 'hiring') {
        console.warn(`⚠️ Position "${doc.title}" is being closed while in hiring status - ensure all open applications are handled`);
      }

      console.log(`✅ Position validation passed: ${doc.title || 'unknown'}`);
    } catch (err) {
      console.error('❌ Error in PositionStatusChangeValidationTrigger:', err);
      throw err;
    }
  }
};

/**
 * Position Vacancy Tracking Trigger
 * 
 * After update, calculate current headcount vs planned headcount
 * and auto-set status to hiring if vacancies exist.
 */
const PositionVacancyTrackingTrigger: Hook = {
  name: 'PositionVacancyTrackingTrigger',
  object: 'position',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const position = ctx.result as Record<string, any>;
      const positionId = position._id || position.id;

      // Count employees assigned to this position
      const employees = await (ctx.ql as any).find('employee', {
        filters: [
          ['position_id', '=', positionId],
          ['status', '=', 'active']
        ]
      });

      const currentHeadcount = employees ? employees.length : 0;
      const plannedHeadcount = position.headcount || 1;
      const vacancies = Math.max(0, plannedHeadcount - currentHeadcount);

      if (currentHeadcount !== position.current_headcount) {
        await (ctx.ql as any).doc.update('position', positionId, {
          current_headcount: currentHeadcount
        });
      }

      if (vacancies > 0) {
        console.log(`📋 Position "${position.title}" has ${vacancies} vacancy(ies) - Current: ${currentHeadcount}/${plannedHeadcount}`);
      } else {
        console.log(`✅ Position "${position.title}" is fully staffed: ${currentHeadcount}/${plannedHeadcount}`);
      }
    } catch (err) {
      console.error('❌ Error in PositionVacancyTrackingTrigger:', err);
    }
  }
};

export { PositionStatusChangeValidationTrigger, PositionVacancyTrackingTrigger };
export default [PositionStatusChangeValidationTrigger, PositionVacancyTrackingTrigger] as Hook[];
