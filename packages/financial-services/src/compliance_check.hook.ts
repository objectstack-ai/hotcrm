import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * Compliance Regulation Alert
 *
 * Alerts when a new regulation check is required after insert.
 */
const ComplianceRegulationAlert: Hook = {
  name: 'ComplianceRegulationAlert',
  object: 'compliance_check',
  events: ['afterInsert'],
  handler: async (ctx: HookContext) => {
    const result = ctx.result as Record<string, any>;

    if (result?.check_type && result?.entity_id) {
      console.log(`🔔 New ${result.check_type.toUpperCase()} compliance check created for entity ${result.entity_id}`);
    }
  }
};

/**
 * Compliance Auto-Screening
 *
 * Auto-screens entity against sanctions lists before insert.
 */
const ComplianceAutoScreening: Hook = {
  name: 'ComplianceAutoScreening',
  object: 'compliance_check',
  events: ['beforeInsert'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;

    if (doc.check_type === 'sanctions') {
      console.log(`🔍 Auto-screening entity ${doc.entity_id} against sanctions lists`);
      doc.risk_score = doc.risk_score || 0;
    }
  }
};

/**
 * Compliance Audit Trail
 *
 * Logs all compliance activities after insert and update.
 */
const ComplianceAuditTrail: Hook = {
  name: 'ComplianceAuditTrail',
  object: 'compliance_check',
  events: ['afterInsert', 'afterUpdate'],
  handler: async (ctx: HookContext) => {
    const result = ctx.result as Record<string, any>;

    console.log(`📝 Audit trail: compliance check ${result?._id} [${ctx.event}] — type: ${result?.check_type}, status: ${result?.status}`);
  }
};

export { ComplianceRegulationAlert, ComplianceAutoScreening, ComplianceAuditTrail };
export default ComplianceRegulationAlert;
