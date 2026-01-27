import type { HookSchema } from '@objectstack/spec/data';
import { db } from '../engine/objectql';

// Types for Context embedded here or imported if available
export interface TriggerContext {
  old?: Record<string, any>;
  new: Record<string, any>;
  db: typeof db;
  user: { id: string; name: string; email: string; };
}

/**
 * Opportunity Stage Change Trigger
 */
const OpportunityStageChange: HookSchema = {
  name: 'OpportunityStageChange',
  object: 'Opportunity',
  events: ['afterUpdate'],
  handler: async (ctx: TriggerContext) => {
    try {
      // Defensive check
      if (!ctx.old || !ctx.new) {
        console.warn('⚠️ Trigger called without old/new context');
        return;
      }

      // Check if Stage actually changed
      const stageChanged = ctx.old.Stage !== ctx.new.Stage;
      if (!stageChanged) {
        return;
      }

      console.log(`🔄 Stage changed from "${ctx.old.Stage}" to "${ctx.new.Stage}"`);

      // Handle "Closed Won" scenario
      if (ctx.new.Stage === 'Closed Won') {
        await handleClosedWon(ctx);
      }

      // Handle "Closed Lost" scenario
      if (ctx.new.Stage === 'Closed Lost') {
        await handleClosedLost(ctx);
      }

    } catch (error) {
      console.error('❌ Error in OpportunityTrigger:', error);
      throw error;
    }
  }
};

/**
 * Handle Closed Won automation
 */
async function handleClosedWon(ctx: TriggerContext): Promise<void> {
  console.log('✅ Processing Closed Won automation...');
  const opportunity = ctx.new;

  if (!opportunity.AccountId) {
    console.error('❌ Cannot process: Opportunity has no AccountId');
    return;
  }

  // 1. Create Contract
  try {
    await ctx.db.doc.create('Contract', {
      AccountId: opportunity.AccountId,
      OpportunityId: opportunity.Id,
      Status: 'Draft',
      ContractValue: opportunity.Amount || 0,
      StartDate: new Date().toISOString().split('T')[0],
      OwnerId: opportunity.OwnerId || ctx.user.id,
      Description: `Auto-generated from Opportunity: ${opportunity.Name}`
    });
  } catch (error) {
    console.error('❌ Failed to create Contract:', error);
  }

  // 2. Update Account Status
  try {
    await ctx.db.doc.update('Account', opportunity.AccountId, {
      CustomerStatus: 'Active Customer'
    });
  } catch (error) {
    console.error('❌ Failed to update Account status:', error);
  }
}

async function handleClosedLost(ctx: TriggerContext): Promise<void> {
  console.log('❌ Processing Closed Lost automation...');
  // Logic here
}

export default OpportunityStageChange;
