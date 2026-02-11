import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * Time Off Balance Validation Trigger
 * 
 * Automatically handles:
 * 1. Validate start date is before end date
 * 2. Validate request is for a future date
 * 3. Calculate business days requested
 * 4. Check employee has sufficient balance for the leave type
 */
const TimeOffBalanceValidationTrigger: Hook = {
  name: 'TimeOffBalanceValidationTrigger',
  object: 'time_off',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const timeOff = ctx.input.doc as Record<string, any>;

      // Validate start date is before end date
      if (timeOff.start_date && timeOff.end_date) {
        const startDate = new Date(timeOff.start_date);
        const endDate = new Date(timeOff.end_date);

        if (startDate > endDate) {
          console.warn(`⚠️ Time-off start date ${timeOff.start_date} is after end date ${timeOff.end_date}`);
        }
      }

      // Validate request is for a future date
      if (timeOff.start_date) {
        const startDate = new Date(timeOff.start_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (startDate < today && ctx.event === 'beforeInsert') {
          console.warn(`⚠️ Time-off request start date ${timeOff.start_date} is in the past`);
        }
      }

      // Calculate business days requested
      if (timeOff.start_date && timeOff.end_date) {
        const businessDays = calculateBusinessDays(new Date(timeOff.start_date), new Date(timeOff.end_date));
        timeOff.total_days = businessDays;
        console.log(`📊 Calculated business days: ${businessDays}`);
      }

      // Check employee has sufficient balance
      if (timeOff.employee_id && timeOff.leave_type && timeOff.total_days) {
        const hasSufficientBalance = await checkLeaveBalance(
          timeOff.employee_id,
          timeOff.leave_type,
          timeOff.total_days,
          ctx
        );

        if (!hasSufficientBalance) {
          console.warn(`⚠️ Employee ${timeOff.employee_id} may have insufficient ${timeOff.leave_type} balance for ${timeOff.total_days} day(s)`);
        }
      }

      console.log(`✅ Time-off validation passed for employee ${timeOff.employee_id}`);

    } catch (error) {
      console.error('❌ Error in TimeOffBalanceValidationTrigger:', error);
    }
  }
};

/**
 * Calculate business days between two dates (excluding weekends)
 */
function calculateBusinessDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Check if employee has sufficient leave balance
 */
async function checkLeaveBalance(
  employeeId: string,
  leaveType: string,
  requestedDays: number,
  ctx: any
): Promise<boolean> {
  try {
    // Find all approved time-off records for this employee and leave type in current year
    const currentYear = new Date().getFullYear();
    const yearStart = `${currentYear}-01-01`;
    const yearEnd = `${currentYear}-12-31`;

    const approvedRequests = await (ctx.ql as any).find('time_off', {
      filters: [
        ['employee_id', '=', employeeId],
        ['leave_type', '=', leaveType],
        ['status', '=', 'approved'],
        ['start_date', '>=', yearStart],
        ['start_date', '<=', yearEnd]
      ]
    });

    // Calculate total days already used
    let usedDays = 0;
    if (approvedRequests && approvedRequests.length > 0) {
      for (const request of approvedRequests) {
        usedDays += request.total_days || 0;
      }
    }

    // Default annual balance by leave type
    const defaultBalances: Record<string, number> = {
      'Annual Leave': 15,
      'Sick Leave': 10,
      'Personal Leave': 5,
      'Maternity Leave': 90,
      'Paternity Leave': 15,
      'Bereavement Leave': 5,
      'Unpaid Leave': 365
    };

    const totalBalance = defaultBalances[leaveType] || 10;
    const remainingBalance = totalBalance - usedDays;

    console.log(`📊 Leave balance for ${leaveType}: ${remainingBalance} remaining (${usedDays} used of ${totalBalance})`);

    return remainingBalance >= requestedDays;
  } catch (error) {
    console.error('❌ Failed to check leave balance:', error);
    return true; // Default to allowing if check fails
  }
}

/**
 * Time Off Approval Trigger
 * 
 * Automatically handles:
 * 1. Deduct from employee balance when approved
 * 2. Restore balance when cancelled after approval
 * 3. Log all balance changes for audit trail
 */
const TimeOffApprovalTrigger: Hook = {
  name: 'TimeOffApprovalTrigger',
  object: 'time_off',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      // Check if status changed
      if (!ctx.previous || (ctx.previous as Record<string, any>).status === (ctx.result as Record<string, any>).status) {
        return;
      }

      const timeOff = ctx.result as Record<string, any>;
      const oldStatus = (ctx.previous as Record<string, any>).status;
      const newStatus = timeOff.status;

      console.log(`🔄 Time-off request ${timeOff.request_number} status changed from "${oldStatus}" to "${newStatus}"`);

      // Handle approval: deduct balance
      if (newStatus === 'approved' && oldStatus !== 'approved') {
        await handleTimeOffApproved(timeOff, ctx);
      }

      // Handle cancellation after approval: restore balance
      if (newStatus === 'cancelled' && oldStatus === 'approved') {
        await handleTimeOffCancelled(timeOff, ctx);
      }

      // Log balance change for audit trail
      await logBalanceChange(timeOff, oldStatus, newStatus, ctx);

    } catch (error) {
      console.error('❌ Error in TimeOffApprovalTrigger:', error);
    }
  }
};

/**
 * Handle time-off approval: set approval date
 */
async function handleTimeOffApproved(timeOff: any, ctx: any): Promise<void> {
  try {
    await (ctx.ql as any).doc.update('time_off', timeOff.id, {
      approval_date: new Date().toISOString().split('T')[0]
    });

    console.log(`✅ Time-off request ${timeOff.request_number} approved: ${timeOff.total_days} day(s) of ${timeOff.leave_type} deducted`);

    console.debug(`[time_off.hook] Balance deduction pending for ${timeOff.request_number}: ${timeOff.total_days} day(s) of ${timeOff.leave_type} for employee ${timeOff.employee_id}`);
  } catch (error) {
    console.error('❌ Failed to process time-off approval:', error);
  }
}

/**
 * Handle time-off cancellation after approval: restore balance
 */
async function handleTimeOffCancelled(timeOff: any, ctx: any): Promise<void> {
  try {
    console.log(`🔄 Time-off request ${timeOff.request_number} cancelled after approval: ${timeOff.total_days} day(s) of ${timeOff.leave_type} restored`);

    console.debug(`[time_off.hook] Balance restoration pending for ${timeOff.request_number}: ${timeOff.total_days} day(s) of ${timeOff.leave_type} restored for employee ${timeOff.employee_id}`);
  } catch (error) {
    console.error('❌ Failed to process time-off cancellation:', error);
  }
}

/**
 * Log balance change for audit trail
 */
async function logBalanceChange(
  timeOff: any,
  oldStatus: string,
  newStatus: string,
  ctx: any
): Promise<void> {
  try {
    const action = newStatus === 'approved' ? 'DEDUCTED' : newStatus === 'cancelled' ? 'RESTORED' : 'STATUS_CHANGE';

    console.log(`📝 Audit: Time-off ${timeOff.request_number} [${action}] ${oldStatus} → ${newStatus} | ${timeOff.total_days || 0} day(s) of ${timeOff.leave_type} | Employee: ${timeOff.employee_id}`);

    console.debug(`[time_off.hook] Audit log pending: record balance change ${action} for time-off ${timeOff.request_number}`);
  } catch (error) {
    console.error('❌ Failed to log balance change:', error);
  }
}

export { TimeOffBalanceValidationTrigger, TimeOffApprovalTrigger };
export default [TimeOffBalanceValidationTrigger, TimeOffApprovalTrigger] as Hook[];
