import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * Form Field Validation Trigger
 * 
 * Validates form configuration before insert/update:
 * 1. fields_json must be valid JSON
 * 2. Form must have at least one field defined
 * 3. Auto-set published_date when status changes to published
 */
const FormFieldValidationTrigger: Hook = {
  name: 'FormFieldValidationTrigger',
  object: 'form',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const doc = ctx.input.doc as Record<string, any>;

      // Validate fields_json is valid JSON
      if (doc.fields_json) {
        try {
          const fields = JSON.parse(doc.fields_json);
          if (!Array.isArray(fields) || fields.length === 0) {
            throw new Error('Form must have at least one field defined in fields_json.');
          }
        } catch (e) {
          if (e instanceof SyntaxError) {
            throw new Error('fields_json must contain valid JSON.');
          }
          throw e;
        }
      }

      // Auto-set published_date when status changes to published
      if (doc.status === 'published') {
        const previous = ctx.previous as Record<string, any> | undefined;
        if (!previous || previous.status !== 'published') {
          doc.published_date = new Date().toISOString();
          console.log(`📅 Form published date set: ${doc.published_date}`);
        }
      }

      // Validate redirect_url format if provided
      if (doc.redirect_url && doc.redirect_url.trim().length > 0) {
        try {
          new URL(doc.redirect_url);
        } catch {
          throw new Error('Redirect URL must be a valid URL format.');
        }
      }

      console.log(`✅ Form field validation passed: ${doc.name || 'unknown'}`);
    } catch (error) {
      console.error('❌ Form field validation failed:', error);
      throw error;
    }
  }
};

/**
 * Form Submission Tracking Trigger
 * 
 * After form update, recalculate conversion metrics:
 * - conversion_rate = total_submissions / total_views
 * - Log submission milestones
 */
const FormSubmissionTrackingTrigger: Hook = {
  name: 'FormSubmissionTrackingTrigger',
  object: 'form',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const form = ctx.result as Record<string, any>;
      const oldForm = ctx.previous as Record<string, any> | undefined;

      // Only process if submission or view counts changed
      if (oldForm &&
        oldForm.total_submissions === form.total_submissions &&
        oldForm.total_views === form.total_views) {
        return;
      }

      const totalViews = form.total_views || 0;
      const totalSubmissions = form.total_submissions || 0;
      const conversionRate = totalViews > 0 ? (totalSubmissions / totalViews) * 100 : 0;

      await (ctx.ql as any).doc.update('form', form._id || form.id, {
        conversion_rate: Math.round(conversionRate * 100) / 100,
        last_submission_date: totalSubmissions > (oldForm?.total_submissions || 0)
          ? new Date().toISOString()
          : form.last_submission_date
      });

      console.log(`📊 Form metrics updated - Views: ${totalViews}, Submissions: ${totalSubmissions}, Conversion: ${conversionRate.toFixed(1)}%`);
    } catch (error) {
      console.error('[form.hook] submission tracking failed:', error);
    }
  }
};

export { FormFieldValidationTrigger, FormSubmissionTrackingTrigger };
export default [FormFieldValidationTrigger, FormSubmissionTrackingTrigger] as Hook[];
