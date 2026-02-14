import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * Scholarship Eligibility Verification
 *
 * Verifies applicant meets criteria before insert.
 */
const ScholarshipEligibilityVerification: Hook = {
  name: 'ScholarshipEligibilityVerification',
  object: 'scholarship',
  events: ['beforeInsert'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;

    if (!doc.name) {
      throw new Error('Scholarship name is required');
    }

    if (doc.amount !== undefined && doc.amount <= 0) {
      throw new Error('Scholarship amount must be greater than zero');
    }

    if (doc.min_gpa !== undefined && (doc.min_gpa < 0 || doc.min_gpa > 4)) {
      throw new Error('Minimum GPA must be between 0 and 4');
    }
  }
};

/**
 * Scholarship Fund Tracking
 *
 * Tracks fund balance after awards are updated.
 */
const ScholarshipFundTracking: Hook = {
  name: 'ScholarshipFundTracking',
  object: 'scholarship',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;
    const result = ctx.result as Record<string, any>;

    if (doc.recipients === undefined) return;

    const totalAwarded = (result?.recipients || 0) * (result?.amount || 0);
    const balance = (result?.fund_balance || 0) - totalAwarded;

    if (balance <= 0) {
      console.log(`💰 Scholarship ${result?._id} fund depleted — marking as depleted`);
      try {
        await (ctx.ql as any).doc.update('scholarship', result._id, { status: 'depleted' });
      } catch (error) {
        console.warn('⚠️ Failed to update scholarship status:', error);
      }
    } else {
      console.log(`💰 Scholarship ${result?._id} fund balance remaining: $${balance}`);
    }
  }
};

/**
 * Scholarship Auto Renewal
 *
 * Checks renewal eligibility for returning students after update.
 */
const ScholarshipAutoRenewal: Hook = {
  name: 'ScholarshipAutoRenewal',
  object: 'scholarship',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;
    const result = ctx.result as Record<string, any>;

    if (doc.status !== 'awarded' || !result?._id) return;

    const minGpa = result.min_gpa || 0;

    try {
      const students = await (ctx.ql as any).find('student', {
        filters: [['enrollment_status', '=', 'enrolled']],
        limit: 50
      });

      const eligible = students.filter((s: any) => s.gpa >= minGpa);
      console.log(`🔄 Scholarship ${result._id} renewal: ${eligible.length} students eligible`);
    } catch (error) {
      console.warn('⚠️ Failed to check renewal eligibility:', error);
    }
  }
};

export { ScholarshipEligibilityVerification, ScholarshipFundTracking, ScholarshipAutoRenewal };
export default ScholarshipEligibilityVerification;
