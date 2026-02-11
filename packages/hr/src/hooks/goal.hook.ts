import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * Goal Progress Tracking Trigger
 * 
 * Automatically handles:
 * 1. Auto-update status based on progress_percent: 0='not_started', 1-99='in_progress', 100='completed'
 * 2. Set completed_date when progress reaches 100
 */
const GoalProgressTrackingTrigger: Hook = {
  name: 'GoalProgressTrackingTrigger',
  object: 'goal',
  events: ['beforeUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;
    try {
      if (doc.progress_percent === undefined) {
        return;
      }

      const previousProgress = ctx.previous ? (ctx.previous as Record<string, any>).progress_percent : undefined;
      if (previousProgress === doc.progress_percent) {
        return;
      }

      // Auto-update status based on progress_percent
      if (doc.progress_percent === 0) {
        doc.status = 'not_started';
        console.log(`📊 Goal status set to "not_started" (progress: 0%)`);
      } else if (doc.progress_percent > 0 && doc.progress_percent < 100) {
        doc.status = 'in_progress';
        console.log(`📊 Goal status set to "in_progress" (progress: ${doc.progress_percent}%)`);
      } else if (doc.progress_percent === 100) {
        doc.status = 'completed';
        doc.completed_date = new Date().toISOString().split('T')[0];
        console.log(`🎉 Goal completed! completed_date set to ${doc.completed_date}`);
      }

      console.log(`✅ Goal progress tracking updated`);
    } catch (err) {
      console.error('❌ Error in GoalProgressTrackingTrigger:', err);
      throw err;
    }
  }
};

/**
 * Goal Alignment Validation Trigger
 * 
 * Automatically handles:
 * 1. If parent_goal is set, validate it exists
 * 2. Log alignment hierarchy
 */
const GoalAlignmentValidationTrigger: Hook = {
  name: 'GoalAlignmentValidationTrigger',
  object: 'goal',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;
    try {
      if (!doc.parent_goal) {
        return;
      }

      // Validate parent_goal exists
      const parentGoal = await (ctx.ql as any).doc.get('goal', doc.parent_goal);

      if (!parentGoal) {
        throw new Error(`❌ Parent goal "${doc.parent_goal}" does not exist`);
      }

      console.log(`🔗 Goal aligned to parent: ${parentGoal.goal_name || parentGoal.name || doc.parent_goal}`);
      console.debug(`[goal.hook] Alignment hierarchy: ${doc.parent_goal} → ${doc.id || '(new goal)'}`);

      console.log(`✅ Goal alignment validation passed`);
    } catch (err) {
      console.error('❌ Error in GoalAlignmentValidationTrigger:', err);
      throw err;
    }
  }
};

export { GoalProgressTrackingTrigger, GoalAlignmentValidationTrigger };
export default [GoalProgressTrackingTrigger, GoalAlignmentValidationTrigger] as Hook[];
