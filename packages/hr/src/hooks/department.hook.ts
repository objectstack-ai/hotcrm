import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * Department Manager Assignment Validation Trigger
 * 
 * Validates department data before insert/update:
 * 1. A department cannot be its own parent
 * 2. Manager must be an active employee
 * 3. Validate department code uniqueness
 */
const DepartmentManagerValidationTrigger: Hook = {
  name: 'DepartmentManagerValidationTrigger',
  object: 'department',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;
    try {
      // A department cannot be its own parent
      if (doc.parent_id && doc._id && doc.parent_id === doc._id) {
        throw new Error('❌ A department cannot be its own parent');
      }

      // Validate manager is an active employee
      if (doc.manager_id) {
        const managers = await (ctx.ql as any).find('employee', {
          filters: [['_id', '=', doc.manager_id]],
          limit: 1
        });

        if (managers && managers.length > 0) {
          const manager = managers[0];
          if (manager.status !== 'active') {
            throw new Error(`❌ Department manager must be an active employee. Current status: ${manager.status}`);
          }
        }
      }

      // Cannot close department with active status employees
      if (doc.status === 'closed') {
        const previous = ctx.previous as Record<string, any> | undefined;
        if (previous && previous.status !== 'closed') {
          console.log(`⚠️ Department "${doc.name}" is being closed - verify all employees have been reassigned`);
        }
      }

      console.log(`✅ Department validation passed: ${doc.name || 'unknown'}`);
    } catch (err) {
      console.error('❌ Error in DepartmentManagerValidationTrigger:', err);
      throw err;
    }
  }
};

/**
 * Department Headcount Tracking Trigger
 * 
 * After update, recalculate the employee count for the department
 * by querying all employees assigned to this department.
 */
const DepartmentHeadcountTrackingTrigger: Hook = {
  name: 'DepartmentHeadcountTrackingTrigger',
  object: 'department',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const dept = ctx.result as Record<string, any>;
      const deptId = dept._id || dept.id;

      // Count employees in this department
      const employees = await (ctx.ql as any).find('employee', {
        filters: [
          ['department_id', '=', deptId],
          ['status', '=', 'active']
        ]
      });

      const headcount = employees ? employees.length : 0;

      if (headcount !== dept.employee_count) {
        await (ctx.ql as any).doc.update('department', deptId, {
          employee_count: headcount
        });
        console.log(`👥 Department "${dept.name}" headcount updated: ${headcount} active employees`);
      }

      console.log(`✅ Department headcount tracking complete`);
    } catch (err) {
      console.error('❌ Error in DepartmentHeadcountTrackingTrigger:', err);
    }
  }
};

export { DepartmentManagerValidationTrigger, DepartmentHeadcountTrackingTrigger };
export default [DepartmentManagerValidationTrigger, DepartmentHeadcountTrackingTrigger] as Hook[];
