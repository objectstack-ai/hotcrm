import type { Hook, HookContext } from '@objectstack/spec/data';



/**
 * Note Validation Trigger
 * 
 * Validates note data on create/update:
 * - At least title or body must be provided
 * - Auto-calculate word_count from body
 * - Generate searchable_text from title + body
 */
const NoteValidationTrigger: Hook = {
  name: 'NoteValidationTrigger',
  object: 'note',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const doc = ctx.input.doc as Record<string, any>;

      // Validate that at least title or body is provided
      const hasTitle = doc.title && doc.title.trim() !== '';
      const hasBody = doc.body && doc.body.trim() !== '';

      if (!hasTitle && !hasBody) {
        throw new Error('Validation Error: Note must have at least a title or body.');
      }

      // Auto-calculate word_count from body
      if (doc.body && doc.body.trim() !== '') {
        doc.word_count = doc.body.trim().split(/\s+/).length;
      } else {
        doc.word_count = 0;
      }

      // Generate searchable_text from title + body
      const titleText = doc.title || '';
      const bodyText = doc.body || '';
      doc.searchable_text = `${titleText} ${bodyText}`.trim().toLowerCase();

      console.log(`📝 Note validated: word_count=${doc.word_count}`);

    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Validation Error:')) {
        throw error;
      }
      console.error('❌ Error in NoteValidationTrigger:', error);
    }
  }
};

/**
 * Note Edit Tracking Trigger
 * 
 * Tracks edit metadata on update:
 * - Set last_edited_date to now
 * - Set last_edited_by_id from session userId
 */
const NoteEditTrackingTrigger: Hook = {
  name: 'NoteEditTrackingTrigger',
  object: 'note',
  events: ['beforeUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const doc = ctx.input.doc as Record<string, any>;

      doc.last_edited_date = new Date().toISOString();
      doc.last_edited_by_id = ctx.session?.userId || null;

      console.log(`✏️ Note edit tracked: edited by ${doc.last_edited_by_id} at ${doc.last_edited_date}`);

    } catch (error) {
      console.error('❌ Error in NoteEditTrackingTrigger:', error);
    }
  }
};

// Export all hooks
export {
  NoteValidationTrigger,
  NoteEditTrackingTrigger
};

export default NoteValidationTrigger;
