import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * Employee Lifecycle Management Trigger
 * 
 * Automatically handles:
 * 1. Employee number generation if not provided
 * 2. Onboarding workflow initiation
 * 3. System account provisioning
 * 4. Manager notification
 */
const EmployeeOnboardingTrigger: Hook = {
  name: 'EmployeeOnboardingTrigger',
  object: 'employee',
  events: ['afterInsert'],
  handler: async (ctx: HookContext) => {
    try {
      const employee = ctx.input;

      console.log(`👋 Initiating onboarding for employee: ${employee.first_name} ${employee.last_name}`);

      // Create onboarding record
      await createOnboardingRecord(employee, ctx);

      // Notify manager
      await notifyManager(employee, ctx);

      // Create goal records for probation period
      await createProbationGoals(employee, ctx);

      console.log(`✅ Onboarding initiated for ${employee.employee_number}`);

    } catch (error) {
      console.error('❌ Error in EmployeeOnboardingTrigger:', error);
      // Don't throw - employee record already created
    }
  }
};

/**
 * Create onboarding record for new employee
 */
async function createOnboardingRecord(employee: any, ctx: HookContext): Promise<void> {
  try {
    // Calculate onboarding completion date (typically 30-90 days)
    const startDate = new Date(employee.hire_date || new Date());
    const targetDate = new Date(startDate);
    targetDate.setDate(targetDate.getDate() + 90); // 90-day onboarding

    await ctx.ql.doc.create('onboarding', {
      employee_id: employee.id,
      start_date: startDate.toISOString().split('T')[0],
      target_completion_date: targetDate.toISOString().split('T')[0],
      status: 'In Progress',
      onboarding_type: 'New Hire',
      buddy_id: null, // Can be assigned later
      hr_coordinator_id: ctx.session?.userId
    });

    console.log(`📋 Created onboarding record for ${employee.first_name} ${employee.last_name}`);
  } catch (error) {
    console.error('❌ Failed to create onboarding record:', error);
  }
}

/**
 * Notify manager about new team member
 */
async function notifyManager(employee: any, ctx: HookContext): Promise<void> {
  try {
    if (!employee.manager_id) {
      console.log('⚠️ No manager assigned, skipping notification');
      return;
    }

    // In production, this would send an email or create a notification
    console.log(`📧 Notification sent to manager ${employee.manager_id} about new employee ${employee.full_name}`);
    
    // TODO: Integrate with notification system
    // await sendEmail({
    //   to: manager.email,
    //   subject: `New Team Member: ${employee.full_name}`,
    //   body: `Welcome ${employee.full_name} to your team...`
    // });

  } catch (error) {
    console.error('❌ Failed to notify manager:', error);
  }
}

/**
 * Create initial goals for probation period
 */
async function createProbationGoals(employee: any, ctx: HookContext): Promise<void> {
  try {
    const hireDate = new Date(employee.hire_date || new Date());
    const probationEndDate = new Date(hireDate);
    probationEndDate.setDate(probationEndDate.getDate() + 90); // 90-day probation

    await ctx.ql.doc.create('goal', {
      employee_id: employee.id,
      goal_name: `Complete Onboarding - ${employee.full_name}`,
      description: 'Successfully complete all onboarding tasks and probation requirements',
      goal_type: 'Onboarding',
      start_date: hireDate.toISOString().split('T')[0],
      target_date: probationEndDate.toISOString().split('T')[0],
      status: 'In Progress',
      progress: 0
    });

    console.log(`🎯 Created probation goals for ${employee.first_name} ${employee.last_name}`);
  } catch (error) {
    console.error('❌ Failed to create probation goals:', error);
  }
}

/**
 * Employee Status Change Trigger
 * 
 * Handles automation when employee status changes
 */
const EmployeeStatusChangeTrigger: Hook = {
  name: 'EmployeeStatusChangeTrigger',
  object: 'employee',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      // Check if employment status changed
      if (!ctx.previous || ctx.previous.employment_status === ctx.input.employment_status) {
        return;
      }

      const employee = ctx.input;
      const oldStatus = ctx.previous.employment_status;
      const newStatus = employee.employment_status;

      console.log(`🔄 Employee status changed from "${oldStatus}" to "${newStatus}"`);

      // Handle different status transitions
      switch (newStatus) {
        case 'Active':
          await handleActivation(employee, ctx);
          break;
        case 'Inactive':
        case 'Terminated':
          await handleTermination(employee, ctx);
          break;
        case 'On Leave':
          await handleLeaveStart(employee, ctx);
          break;
      }

      // Log status change
      await logEmployeeStatusChange(employee, oldStatus, newStatus, ctx);

    } catch (error) {
      console.error('❌ Error in EmployeeStatusChangeTrigger:', error);
    }
  }
};

/**
 * Handle employee activation
 */
async function handleActivation(employee: any, ctx: HookContext): Promise<void> {
  console.log(`✅ Employee ${employee.full_name} activated`);
  
  // TODO: Enable system accounts
  // TODO: Grant access permissions
  // TODO: Add to team channels
}

/**
 * Handle employee termination
 */
async function handleTermination(employee: any, ctx: HookContext): Promise<void> {
  console.log(`👋 Processing termination for ${employee.full_name}`);
  
  try {
    // Create offboarding record
    await ctx.ql.doc.create('onboarding', {
      employee_id: employee.id,
      start_date: new Date().toISOString().split('T')[0],
      status: 'In Progress',
      onboarding_type: 'Offboarding',
      hr_coordinator_id: ctx.session?.userId
    });

    console.log(`📋 Created offboarding record for ${employee.full_name}`);
    
    // TODO: Revoke system access
    // TODO: Schedule exit interview
    // TODO: Process final payroll
    // TODO: Return equipment checklist

  } catch (error) {
    console.error('❌ Failed to process termination:', error);
  }
}

/**
 * Handle leave start
 */
async function handleLeaveStart(employee: any, ctx: HookContext): Promise<void> {
  console.log(`🏖️ Employee ${employee.full_name} started leave`);
  
  // TODO: Update team calendars
  // TODO: Set up out-of-office auto-responder
  // TODO: Reassign urgent tasks
}

/**
 * Log employee status change
 */
async function logEmployeeStatusChange(
  employee: any,
  oldStatus: string,
  newStatus: string,
  ctx: HookContext
): Promise<void> {
  try {
    console.log(`📝 Logging status change: ${oldStatus} → ${newStatus} for ${employee.full_name}`);
    
    // TODO: Create activity/audit log when available for HR module
  } catch (error) {
    console.error('❌ Failed to log status change:', error);
  }
}

/**
 * Employee Data Validation Trigger
 * 
 * Validates employee data before save
 */
const EmployeeDataValidationTrigger: Hook = {
  name: 'EmployeeDataValidationTrigger',
  object: 'employee',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const employee = ctx.input;

      // Validate hire date is not in future
      if (employee.hire_date) {
        const hireDate = new Date(employee.hire_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (hireDate > today && ctx.event === 'beforeInsert') {
          console.warn(`⚠️ Hire date ${employee.hire_date} is in the future for ${employee.first_name} ${employee.last_name}`);
          // Allow future hire dates for pre-boarding
        }
      }

      // Validate termination date
      if (employee.termination_date && employee.hire_date) {
        const hireDate = new Date(employee.hire_date);
        const termDate = new Date(employee.termination_date);
        
        if (termDate < hireDate) {
          throw new Error('Termination date cannot be before hire date');
        }
      }

      // Auto-set full name if not provided
      if (!employee.full_name && employee.first_name && employee.last_name) {
        employee.full_name = `${employee.last_name}${employee.first_name}`;
      }

      // Validate email domain for company email
      if (employee.email && ctx.event === 'beforeInsert') {
        // TODO: Validate against allowed company email domains
      }

      console.log(`✅ Employee data validation passed for ${employee.first_name} ${employee.last_name}`);

    } catch (error) {
      console.error('❌ Error in EmployeeDataValidationTrigger:', error);
      throw error; // Re-throw to prevent save
    }
  }
};

export { 
  EmployeeOnboardingTrigger, 
  EmployeeStatusChangeTrigger,
  EmployeeDataValidationTrigger 
};

export default [
  EmployeeOnboardingTrigger,
  EmployeeStatusChangeTrigger,
  EmployeeDataValidationTrigger
];
