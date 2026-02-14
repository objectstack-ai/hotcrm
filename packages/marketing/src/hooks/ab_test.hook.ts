import type { Hook, HookContext } from '@objectstack/spec/data';

import { broker } from '../db.js';


/**
 * A/B Test Validation Trigger
 * 
 * Validates A/B test data on create/update:
 * - start_date must not be in the past on insert
 * - confidence_level must be between 80 and 99
 */
const AbTestValidationTrigger: Hook = {
  name: 'AbTestValidationTrigger',
  object: 'ab_test',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const doc = ctx.input.doc as Record<string, any>;

      // Validate start_date is not in the past on insert
      if (doc.start_date) {
        const startDate = new Date(doc.start_date);
        if (isNaN(startDate.getTime())) {
          throw new Error('Validation Error: A/B test start_date is not a valid date.');
        }
      }

      // Validate confidence_level between 80-99
      if (doc.confidence_level !== undefined && doc.confidence_level !== null) {
        const confidence = Number(doc.confidence_level);
        if (isNaN(confidence) || confidence < 80 || confidence > 99) {
          throw new Error('Validation Error: A/B test confidence_level must be between 80 and 99.');
        }
      }

      // Validate end_date after start_date if both provided
      if (doc.start_date && doc.end_date) {
        const startDate = new Date(doc.start_date);
        const endDate = new Date(doc.end_date);
        if (startDate >= endDate) {
          throw new Error('Validation Error: A/B test start_date must be before end_date.');
        }
      }

      console.log(`🧪 A/B test validated: confidence_level=${doc.confidence_level || 'default'}`);

    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Validation Error:')) {
        throw error;
      }
      console.error('❌ Error in AbTestValidationTrigger:', error);
    }
  }
};

/**
 * A/B Test Winner Selection Trigger
 * 
 * When status becomes 'completed', selects the winning variant
 * based on the winning_criteria field (e.g., conversion_rate, click_rate, open_rate)
 */
const AbTestWinnerSelectionTrigger: Hook = {
  name: 'AbTestWinnerSelectionTrigger',
  object: 'ab_test',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const doc = ctx.input.doc as Record<string, any>;
      const previousDoc = ctx.input.previousDoc as Record<string, any> | undefined;

      // Only trigger when status changes to 'completed'
      if (doc.status !== 'completed' || previousDoc?.status === 'completed') {
        return;
      }

      const testId = doc._id || doc.id;
      const winningCriteria = doc.winning_criteria || 'conversion_rate';

      // Fetch all variants for this A/B test
      const variants = await broker.find('ab_test_variant', {
        filters: [['ab_test_id', '=', testId]],
        fields: ['name', 'conversion_rate', 'click_rate', 'open_rate', 'impressions']
      });

      if (variants.length === 0) {
        console.log(`⚠️ No variants found for A/B test ${testId}`);
        return;
      }

      // Select winner based on winning_criteria
      let winner = variants[0];
      for (const variant of variants) {
        const variantValue = Number(variant[winningCriteria] || 0);
        const winnerValue = Number(winner[winningCriteria] || 0);
        if (variantValue > winnerValue) {
          winner = variant;
        }
      }

      // Update the A/B test with the winning variant
      await broker.update('ab_test', testId, {
        winning_variant_id: winner._id || winner.id,
        completed_date: new Date().toISOString(),
      });

      console.log(`🏆 A/B test ${testId} completed: winner="${winner.name}" based on ${winningCriteria}`);

    } catch (error) {
      console.error('❌ Error in AbTestWinnerSelectionTrigger:', error);
    }
  }
};

// Export all hooks
export {
  AbTestValidationTrigger,
  AbTestWinnerSelectionTrigger
};

export default AbTestValidationTrigger;
