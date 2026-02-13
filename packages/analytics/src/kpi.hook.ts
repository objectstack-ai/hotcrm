import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * KPI Threshold Alert
 *
 * After a KPI is updated, checks whether current_value has crossed
 * the warning or critical threshold and triggers a notification.
 */
const KPIThresholdAlert: Hook = {
  name: 'KPIThresholdAlert',
  object: 'kpi',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    const kpi = ctx.result as Record<string, any>;
    const previous = ctx.previous as Record<string, any> | undefined;
    if (!kpi?._id) return;

    const currentValue = kpi.current_value;
    const prevValue = previous?.current_value;

    // Skip if value hasn't changed
    if (currentValue === prevValue) return;

    // Check critical threshold
    if (kpi.threshold_critical != null && currentValue != null) {
      const crossedCritical =
        (prevValue == null || prevValue >= kpi.threshold_critical) &&
        currentValue < kpi.threshold_critical;

      if (crossedCritical) {
        console.error(`🚨 CRITICAL: KPI "${kpi.name}" dropped below critical threshold (${currentValue} < ${kpi.threshold_critical})`);
        try {
          await ctx.ql.doc.create('activity', {
            Subject: `KPI Critical Alert: ${kpi.name}`,
            Type: 'Alert',
            Status: 'open',
            Priority: 'critical',
            OwnerId: kpi.owner_id,
            ActivityDate: new Date().toISOString().split('T')[0],
            Description: `KPI "${kpi.name}" current value (${currentValue}) has dropped below the critical threshold (${kpi.threshold_critical}).`
          });
        } catch (error) {
          console.warn('⚠️ Failed to create critical KPI alert:', error);
        }
        return;
      }
    }

    // Check warning threshold
    if (kpi.threshold_warning != null && currentValue != null) {
      const crossedWarning =
        (prevValue == null || prevValue >= kpi.threshold_warning) &&
        currentValue < kpi.threshold_warning;

      if (crossedWarning) {
        console.warn(`⚠️ WARNING: KPI "${kpi.name}" dropped below warning threshold (${currentValue} < ${kpi.threshold_warning})`);
        try {
          await ctx.ql.doc.create('activity', {
            Subject: `KPI Warning Alert: ${kpi.name}`,
            Type: 'Alert',
            Status: 'open',
            Priority: 'high',
            OwnerId: kpi.owner_id,
            ActivityDate: new Date().toISOString().split('T')[0],
            Description: `KPI "${kpi.name}" current value (${currentValue}) has dropped below the warning threshold (${kpi.threshold_warning}).`
          });
        } catch (error) {
          console.warn('⚠️ Failed to create warning KPI alert:', error);
        }
      }
    }
  }
};

/**
 * KPI Trend Calculation
 *
 * Before a KPI update is persisted, calculates the trend direction
 * (up / down / flat) by comparing the incoming value to the previous value.
 */
const KPITrendCalculation: Hook = {
  name: 'KPITrendCalculation',
  object: 'kpi',
  events: ['beforeUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;
    const previous = ctx.previous as Record<string, any> | undefined;

    if (doc.current_value == null || previous?.current_value == null) return;

    const delta = doc.current_value - previous.current_value;
    const threshold = Math.abs(previous.current_value) * 0.01; // 1% change threshold

    if (delta > threshold) {
      doc.trend = 'up';
    } else if (delta < -threshold) {
      doc.trend = 'down';
    } else {
      doc.trend = 'flat';
    }
  }
};

/**
 * KPI Auto-Refresh
 *
 * After a new KPI is created, schedules periodic refresh based on its period
 * (daily, weekly, monthly, etc.).
 */
const KPIAutoRefresh: Hook = {
  name: 'KPIAutoRefresh',
  object: 'kpi',
  events: ['afterInsert'],
  handler: async (ctx: HookContext) => {
    const kpi = ctx.result as Record<string, any>;
    if (!kpi?._id || !kpi.period) return;

    const frequencyMap: Record<string, string> = {
      daily: 'daily',
      weekly: 'weekly',
      monthly: 'monthly',
      quarterly: 'quarterly',
      yearly: 'quarterly' // refresh yearly KPIs quarterly
    };

    const frequency = frequencyMap[kpi.period] || 'daily';

    console.log(`⏰ Scheduling ${frequency} refresh for KPI "${kpi.name}"`);

    // Log a scheduling activity — report_schedule requires a report reference,
    // so KPI refresh scheduling is tracked via activity records instead.
    try {
      await ctx.ql.doc.create('activity', {
        Subject: `KPI Refresh Scheduled: ${kpi.name}`,
        Type: 'Schedule',
        Status: 'open',
        Priority: 'normal',
        OwnerId: kpi.owner_id,
        ActivityDate: new Date().toISOString().split('T')[0],
        Description: `Auto-refresh scheduled for KPI "${kpi.name}" with ${frequency} frequency.`
      });
    } catch (error) {
      console.warn('⚠️ Failed to schedule KPI auto-refresh:', error);
    }
  }
};

export { KPIThresholdAlert, KPITrendCalculation, KPIAutoRefresh };
export default KPIThresholdAlert;
