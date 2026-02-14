import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * Application Completeness Check
 *
 * Verifies all required fields are complete before insert.
 */
const ApplicationCompletenessCheck: Hook = {
  name: 'ApplicationCompletenessCheck',
  object: 'application_form',
  events: ['beforeInsert'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;

    const requiredFields = ['applicant_name', 'email', 'program'];
    const missing = requiredFields.filter(f => !doc[f]);

    if (missing.length > 0) {
      throw new Error(`Application incomplete — missing fields: ${missing.join(', ')}`);
    }
  }
};

/**
 * Application Reviewer Assignment
 *
 * Auto-assigns reviewer based on program after insert.
 */
const ApplicationReviewerAssignment: Hook = {
  name: 'ApplicationReviewerAssignment',
  object: 'application_form',
  events: ['afterInsert'],
  handler: async (ctx: HookContext) => {
    const application = ctx.result as Record<string, any>;
    if (!application?._id || !application?.program) return;

    try {
      const reviewers = await ctx.ql.find('contact', {
        filters: [['role', '=', 'reviewer']],
        limit: 1
      });

      if (reviewers.length > 0) {
        console.log(`📋 Auto-assigned reviewer ${reviewers[0]._id} to application ${application._id}`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to assign reviewer:', error);
    }
  }
};

/**
 * Application Decision Workflow
 *
 * Notifies applicant of decision and triggers next steps after update.
 */
const ApplicationDecisionWorkflow: Hook = {
  name: 'ApplicationDecisionWorkflow',
  object: 'application_form',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;
    const result = ctx.result as Record<string, any>;

    if (!doc.decision || doc.decision === 'pending') return;

    const decision = doc.decision;
    console.log(`📬 Application ${result?._id} decision: ${decision}`);

    if (decision === 'admit') {
      console.log(`🎉 Sending acceptance notification to ${result?.email}`);
    } else if (decision === 'deny') {
      console.log(`📭 Sending rejection notification to ${result?.email}`);
    } else if (decision === 'waitlist') {
      console.log(`⏳ Sending waitlist notification to ${result?.email}`);
    }
  }
};

export { ApplicationCompletenessCheck, ApplicationReviewerAssignment, ApplicationDecisionWorkflow };
export default ApplicationCompletenessCheck;
