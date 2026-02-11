import type { Hook, HookContext } from '@objectstack/spec/data';

const VALID_OPERATORS = ['=', '!=', '>', '<', '>=', '<=', 'contains', 'not_contains'];

/**
 * Assignment Rule Validation Trigger
 * 
 * Validates assignment rule data on create/update:
 * - Name must not be empty
 * - criteria_operator must be a valid operator
 * - Either assign_to or assign_to_queue must be provided
 */
const AssignmentRuleValidationTrigger: Hook = {
  name: 'AssignmentRuleValidationTrigger',
  object: 'assignment_rule',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const doc = ctx.input.doc as Record<string, any>;

      // Validate name is not empty
      if (!doc.name || doc.name.trim() === '') {
        throw new Error('Validation Error: Assignment rule name cannot be empty.');
      }

      // Validate criteria_operator
      if (doc.criteria_operator && !VALID_OPERATORS.includes(doc.criteria_operator)) {
        throw new Error(`Validation Error: Invalid criteria_operator "${doc.criteria_operator}". Must be one of: ${VALID_OPERATORS.join(', ')}`);
      }

      // Ensure either assign_to or assign_to_queue is provided
      if (!doc.assign_to && !doc.assign_to_queue) {
        throw new Error('Validation Error: Either assign_to or assign_to_queue must be provided.');
      }

      console.log(`📝 Assignment rule validated: ${doc.name}`);

    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Validation Error:')) {
        throw error;
      }
      console.error('❌ Error in AssignmentRuleValidationTrigger:', error);
    }
  }
};

/**
 * Assignment Rule Sort Order Trigger
 * 
 * Auto-assigns sort_order on insert if not provided:
 * - Finds max sort_order for the same object_name
 * - Sets sort_order to max + 10
 */
const AssignmentRuleSortOrderTrigger: Hook = {
  name: 'AssignmentRuleSortOrderTrigger',
  object: 'assignment_rule',
  events: ['beforeInsert'],
  handler: async (ctx: HookContext) => {
    try {
      const doc = ctx.input.doc as Record<string, any>;

      if (doc.sort_order !== undefined && doc.sort_order !== null) {
        return;
      }

      // Find max sort_order for same object_name
      const existingRules: any[] = await (ctx.ql as any).find('assignment_rule', {
        filters: [['object_name', '=', doc.object_name]],
        sort: 'sort_order',
        order: 'desc',
        limit: 1
      });

      if (existingRules && existingRules.length > 0) {
        doc.sort_order = (existingRules[0].sort_order || 0) + 10;
      } else {
        doc.sort_order = 10;
      }

      console.log(`✅ Auto-assigned sort_order=${doc.sort_order} for rule "${doc.name}"`);

    } catch (error) {
      console.error('❌ Error in AssignmentRuleSortOrderTrigger:', error);
    }
  }
};

// Export all hooks
export {
  AssignmentRuleValidationTrigger,
  AssignmentRuleSortOrderTrigger
};

export default AssignmentRuleValidationTrigger;
