import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * Automation Workflow Validation Trigger
 * 
 * Validates workflow configuration:
 * - If activating (status → 'active'), ensure trigger_type and entry_criteria are set
 * - Ensure start_date is not in the past when activating
 * - Calculate and set is_active based on status and dates
 */
const AutomationWorkflowValidationTrigger: Hook = {
  name: 'AutomationWorkflowValidationTrigger',
  object: 'automation_workflow',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const workflow = ctx.input.doc as Record<string, any>;
      const oldWorkflow = ctx.previous as Record<string, any> | undefined;

      // Check if activating
      const isActivating = workflow.status === 'active' &&
        (!oldWorkflow || oldWorkflow.status !== 'active');

      if (isActivating) {
        // Ensure trigger_type is set
        if (!workflow.trigger_type) {
          console.error(`❌ Cannot activate workflow without trigger_type`);
          workflow.status = oldWorkflow?.status || 'draft';
          return;
        }

        // Ensure entry_criteria is set
        if (!workflow.entry_criteria) {
          console.error(`❌ Cannot activate workflow without entry_criteria`);
          workflow.status = oldWorkflow?.status || 'draft';
          return;
        }

        // Ensure start_date is not in the past
        if (workflow.start_date) {
          const startDate = new Date(workflow.start_date);
          const now = new Date();
          if (startDate < now) {
            console.error(`❌ Cannot activate workflow with start_date in the past`);
            workflow.status = oldWorkflow?.status || 'draft';
            return;
          }
        }

        console.log(`🚀 Workflow "${workflow.name}" is being activated`);
      }

      // Calculate is_active based on status and dates
      const now = new Date();
      const startDate = workflow.start_date ? new Date(workflow.start_date) : null;
      const endDate = workflow.end_date ? new Date(workflow.end_date) : null;

      workflow.is_active = workflow.status === 'active' &&
        (!startDate || startDate <= now) &&
        (!endDate || endDate >= now);

      console.log(`📊 Workflow is_active: ${workflow.is_active}`);

    } catch (error) {
      console.error(`[automation_workflow.hook] validation failed:`, error);
    }
  }
};

/**
 * Automation Workflow Metrics Trigger
 * 
 * When enrolled_count or completed_count change, recalculate conversion_rate.
 * conversion_rate = (completed_count / enrolled_count) * 100
 */
const AutomationWorkflowMetricsTrigger: Hook = {
  name: 'AutomationWorkflowMetricsTrigger',
  object: 'automation_workflow',
  events: ['beforeUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const workflow = ctx.input.doc as Record<string, any>;
      const oldWorkflow = ctx.previous as Record<string, any> | undefined;

      // Check if enrolled_count or completed_count changed
      const enrolledChanged = oldWorkflow && oldWorkflow.enrolled_count !== workflow.enrolled_count;
      const completedChanged = oldWorkflow && oldWorkflow.completed_count !== workflow.completed_count;

      if (!enrolledChanged && !completedChanged) {
        return;
      }

      const enrolledCount = workflow.enrolled_count || 0;
      const completedCount = workflow.completed_count || 0;

      if (enrolledCount > 0) {
        workflow.conversion_rate = (completedCount / enrolledCount) * 100;
        console.log(`📊 Workflow conversion rate: ${workflow.conversion_rate.toFixed(2)}%`);
      } else {
        workflow.conversion_rate = 0;
      }

    } catch (error) {
      console.error(`[automation_workflow.hook] metrics calculation failed:`, error);
    }
  }
};

// Export all hooks
export {
  AutomationWorkflowValidationTrigger,
  AutomationWorkflowMetricsTrigger
};

export default [
  AutomationWorkflowValidationTrigger,
  AutomationWorkflowMetricsTrigger
] as Hook[];
