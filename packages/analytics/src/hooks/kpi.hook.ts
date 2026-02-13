import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * KPI Threshold Validation Trigger
 *
 * Validates that warning threshold is less than critical threshold.
 */
const KPIValidationTrigger: Hook = {
  name: 'KPIValidationTrigger',
  object: 'kpi',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const doc = ctx.input.doc as Record<string, any>;

      // Validate thresholds: warning should be greater than critical
      if (
        doc.threshold_warning != null &&
        doc.threshold_critical != null &&
        doc.threshold_warning <= doc.threshold_critical
      ) {
        throw new Error(
          'Warning threshold must be greater than critical threshold'
        );
      }

      // Validate target_value is positive if set
      if (doc.target_value != null && doc.target_value < 0) {
        throw new Error('Target value must be non-negative');
      }

    } catch (error) {
      console.error('❌ Error in KPIValidationTrigger:', error);
      throw error;
    }
  }
};

/**
 * KPI Threshold Alert Trigger
 *
 * Checks if current value breaches warning or critical thresholds after update.
 */
const KPIThresholdAlertTrigger: Hook = {
  name: 'KPIThresholdAlertTrigger',
  object: 'kpi',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const doc = ctx.result as Record<string, any>;
      const currentValue = doc.current_value;

      if (currentValue == null) return;

      if (doc.threshold_critical != null && currentValue <= doc.threshold_critical) {
        console.log(`🚨 KPI "${doc.name}" is CRITICAL: ${currentValue} (threshold: ${doc.threshold_critical})`);
      } else if (doc.threshold_warning != null && currentValue <= doc.threshold_warning) {
        console.log(`⚠️ KPI "${doc.name}" WARNING: ${currentValue} (threshold: ${doc.threshold_warning})`);
      } else {
        console.log(`✅ KPI "${doc.name}" is healthy: ${currentValue}`);
      }

    } catch (error) {
      console.error('❌ Error in KPIThresholdAlertTrigger:', error);
    }
  }
};

export { KPIValidationTrigger, KPIThresholdAlertTrigger };
export default KPIValidationTrigger;
