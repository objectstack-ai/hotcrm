import type { Hook, HookContext } from '@objectstack/spec/data';



/**
 * Task Validation Trigger
 * 
 * Validates task data on create/update:
 * - Subject must not be empty
 * - due_date must be >= start_date if both present
 * - Auto-set status to 'not_started' on insert if not provided
 */
const TaskValidationTrigger: Hook = {
  name: 'TaskValidationTrigger',
  object: 'task',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const doc = ctx.input.doc as Record<string, any>;
      const isNew = !ctx.previous;

      // Validate subject is not empty
      if (!doc.subject || doc.subject.trim() === '') {
        throw new Error('Validation Error: Task subject cannot be empty.');
      }

      // Validate due_date >= start_date if both present
      if (doc.due_date && doc.start_date) {
        const dueDate = new Date(doc.due_date);
        const startDate = new Date(doc.start_date);
        if (dueDate < startDate) {
          throw new Error('Validation Error: Due date cannot be earlier than start date.');
        }
      }

      // Auto-set status to 'not_started' on insert if not provided
      if (isNew && !doc.status) {
        doc.status = 'not_started';
        console.log(`✅ Auto-set task status to 'not_started'`);
      }

      console.log(`📝 Task validated: ${doc.subject}`);

    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Validation Error:')) {
        throw error;
      }
      console.error('❌ Error in TaskValidationTrigger:', error);
    }
  }
};

/**
 * Task Completion Trigger
 * 
 * Handles task completion automation:
 * - When status changes to 'completed': set completed_date, set percent_complete to 100
 * - When status changes FROM 'completed': clear completed_date
 */
const TaskCompletionTrigger: Hook = {
  name: 'TaskCompletionTrigger',
  object: 'task',
  events: ['beforeUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const doc = ctx.input.doc as Record<string, any>;
      const oldDoc = ctx.previous as Record<string, any> | undefined;

      if (!oldDoc) {
        return;
      }

      // When status changes to 'completed'
      if (oldDoc.status !== 'completed' && doc.status === 'completed') {
        doc.completed_date = new Date().toISOString();
        doc.percent_complete = 100;
        console.log(`✅ Task completed: ${doc.subject}`);
      }

      // When status changes FROM 'completed'
      if (oldDoc.status === 'completed' && doc.status !== 'completed') {
        doc.completed_date = null;
        console.log(`🔄 Task reopened: ${doc.subject}, cleared completed_date`);
      }

    } catch (error) {
      console.error('❌ Error in TaskCompletionTrigger:', error);
    }
  }
};

/**
 * Task Overdue Trigger
 * 
 * Logs a warning when a task's due_date has passed
 * and its status is not 'completed' or 'cancelled'
 */
const TaskOverdueTrigger: Hook = {
  name: 'TaskOverdueTrigger',
  object: 'task',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const task = ctx.result as Record<string, any>;

      if (!task.due_date) {
        return;
      }

      const now = new Date();
      const dueDate = new Date(task.due_date);

      if (dueDate < now && task.status !== 'completed' && task.status !== 'cancelled') {
        console.warn(`⚠️ Task overdue: "${task.subject}" was due on ${task.due_date}`);
      }

    } catch (error) {
      console.error('❌ Error in TaskOverdueTrigger:', error);
    }
  }
};

// Export all hooks
export {
  TaskValidationTrigger,
  TaskCompletionTrigger,
  TaskOverdueTrigger
};

export default TaskValidationTrigger;
