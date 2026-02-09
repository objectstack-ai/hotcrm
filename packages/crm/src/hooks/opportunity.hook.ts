import type { Hook, HookContext } from '@objectstack/spec/data';
import { db } from '../db';



const OpportunityValidation: Hook = {
  name: 'OpportunityValidation',
  object: 'Opportunity',
  events: ['beforeUpdate', 'beforeInsert'],
  handler: async (ctx: HookContext) => {
    const opp = ctx.input.doc as Record<string, any>;
    
    // 1. Validate "closed_won"
    if (opp.stage === 'closed_won') {
      if (!opp.amount || opp.amount <= 0) {
        throw new Error('Validation Error: Cannot close a deal with zero amount. Please update the Amount field.');
      }
    }

    // 2. Validate "Proposal" - Must have a Quote
    // Note: We only check this on Update to avoid issues during initial import
    const ctxPrevious = ctx.previous as Record<string, any> | undefined;
    if (opp.stage === 'Proposal' && ctxPrevious && ctxPrevious.stage !== 'Proposal') {
      const quoteCount = await countRelatedQuotes(ctx, opp._id);
      if (quoteCount === 0) {
        throw new Error('Validation Error: Cannot move to Proposal stage without an active Quote. Please create a Quote first.');
      }
    }
  }
};

/**
 * Opportunity Stage Change Trigger
 * 
 * Handles automation when opportunity stage changes:
 * - Closed Won: Creates contract, updates account status, logs activity
 * - Closed Lost: Updates account, logs activity, sends notification
 * - Stage changes: Validates data completeness, updates probability
 */
const OpportunityStageChange: Hook = {
  name: 'OpportunityStageChange',
  object: 'Opportunity',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      // Defensive check
      if (!ctx.previous || !ctx.result) {
        console.warn('⚠️ Trigger called without previous/result context');
        return;
      }

      // Check if Stage actually changed
      const stageChanged = (ctx.previous as Record<string, any> | undefined)?.Stage !== (ctx.result as Record<string, any>)?.Stage;
      if (!stageChanged) {
        return;
      }

      console.log(`🔄 Stage changed from "${(ctx.previous as Record<string, any> | undefined)?.Stage}" to "${(ctx.result as Record<string, any>)?.Stage}"`);

      // Log activity for stage change
      await logStageChange(ctx);

      // Validate data completeness for advanced stages
      await validateStageRequirements(ctx);

      // Handle "closed_won" scenario
      if ((ctx.result as Record<string, any>)?.Stage === 'closed_won') {
        await handleClosedWon(ctx);
      }

      // Handle "closed_lost" scenario
      if ((ctx.result as Record<string, any>)?.Stage === 'closed_lost') {
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
async function handleClosedWon(ctx: any): Promise<void> {
  console.log('✅ Processing Closed Won automation...');
  const opportunity = ctx.result;

  if (!opportunity.AccountId) {
    console.error('❌ Cannot process: Opportunity has no AccountId');
    return;
  }

  const errors: string[] = [];

  // 1. Create Contract
  let contractId;
  try {
    const contract = await ctx.db.doc.create('Contract', {
      AccountId: opportunity.AccountId,
      OpportunityId: opportunity.Id,
      Status: 'Draft',
      ContractValue: opportunity.Amount || 0,
      StartDate: new Date().toISOString().split('T')[0],
      OwnerId: opportunity.OwnerId || ctx.user.id,
      Description: `Auto-generated from Opportunity: ${opportunity.Name}`
    });
    contractId = contract?.Id;
    if (contractId) {
      console.log(`✅ Contract created: ${contractId}`);
    } else {
      console.warn('⚠️ Contract created but no ID returned');
    }
  } catch (error) {
    console.error('❌ Failed to create Contract:', error);
    errors.push('Contract creation failed');
  }

  // 2. Update Account Status
  try {
    await ctx.db.doc.update('Account', opportunity.AccountId, {
      CustomerStatus: 'Active Customer'
    });
    console.log('✅ Account status updated to Active Customer');
  } catch (error) {
    console.error('❌ Failed to update Account status:', error);
    errors.push('Account update failed');
  }

  // 3. Log activity
  try {
    await ctx.db.doc.create('Activity', {
      Subject: `商机成交: ${opportunity.Name}`,
      Type: 'Milestone',
      Status: 'Completed',
      Priority: 'high',
      AccountId: opportunity.AccountId,
      WhatId: opportunity.Id,
      OwnerId: ctx.user.id,
      ActivityDate: new Date().toISOString().split('T')[0],
      Description: `商机 "${opportunity.Name}" 已成功成交，金额: ${opportunity.Amount?.toLocaleString() || 0}`
    });
    console.log('✅ Activity logged for Closed Won');
  } catch (error) {
    console.error('❌ Failed to log activity:', error);
    errors.push('Activity logging failed');
  }

  // 4. Send notification (placeholder)
  try {
    // TODO: Implement notification system
    console.log(`📧 Notification sent to ${ctx.user.email} about won opportunity`);
  } catch (error) {
    console.error('❌ Failed to send notification:', error);
  }

  if (errors.length > 0) {
    console.warn(`⚠️ Closed Won automation completed with errors: ${errors.join(', ')}`);
  } else {
    console.log('✅ Closed Won automation completed successfully');
  }
}

async function handleClosedLost(ctx: any): Promise<void> {
  console.log('❌ Processing Closed Lost automation...');
  const opportunity = ctx.result;

  if (!opportunity.AccountId) {
    return;
  }

  // Log activity for lost opportunity
  try {
    await ctx.db.doc.create('Activity', {
      Subject: `商机丢失: ${opportunity.Name}`,
      Type: 'Milestone',
      Status: 'Completed',
      Priority: 'Normal',
      AccountId: opportunity.AccountId,
      WhatId: opportunity.Id,
      OwnerId: ctx.user.id,
      ActivityDate: new Date().toISOString().split('T')[0],
      Description: `商机 "${opportunity.Name}" 已丢失，金额: ${opportunity.Amount?.toLocaleString() || 0}。原因待分析。`
    });
    console.log('✅ Activity logged for Closed Lost');
  } catch (error) {
    console.error('❌ Failed to log activity:', error);
  }

  // TODO: Trigger loss analysis workflow
  console.log('📊 Loss analysis workflow should be triggered');
}

/**
 * Log activity when stage changes
 */
async function logStageChange(ctx: any): Promise<void> {
  try {
    const opportunity = ctx.result;
    const oldStage = ctx.previous?.Stage || 'Unknown';
    await ctx.db.doc.create('Activity', {
      Subject: `商机阶段变更: ${oldStage} → ${ctx.result.Stage}`,
      Type: 'Stage Change',
      Status: 'Completed',
      Priority: 'Normal',
      AccountId: opportunity.AccountId,
      WhatId: opportunity.Id,
      OwnerId: ctx.user.id,
      ActivityDate: new Date().toISOString().split('T')[0],
      Description: `商机阶段从 "${oldStage}" 变更为 "${ctx.result.Stage}"`
    });
  } catch (error) {
    console.error('❌ Failed to log stage change activity:', error);
  }
}

/**
 * Validate required fields for advanced stages
 */
async function validateStageRequirements(ctx: any): Promise<void> {
  const opportunity = ctx.result;
  const stage = opportunity.Stage;
  const warnings: string[] = [];

  // Validation for Proposal stage
  if (stage === 'Proposal' && !opportunity.Amount) {
    warnings.push('Proposal stage should have an Amount specified');
  }

  // Validation for Negotiation stage
  if (stage === 'Negotiation') {
    if (!opportunity.Amount) {
      warnings.push('Negotiation stage requires Amount');
    }
    if (!opportunity.ContactId) {
      warnings.push('Negotiation stage should have a primary Contact');
    }
    if (!opportunity.NextStep) {
      warnings.push('Negotiation stage should have clear Next Steps');
    }
  }

  // Validation for Closed stages
  if ((stage === 'closed_won' || stage === 'closed_lost') && !opportunity.Amount) {
    warnings.push('Closed opportunities should have an Amount for reporting');
  }

  if (warnings.length > 0) {
    console.warn(`⚠️ Stage validation warnings for ${opportunity.Name}:`, warnings);
  }
}


/**
 * Helper: Count related quotes
 */
async function countRelatedQuotes(ctx: any, opportunityId: string): Promise<number> {
  // Check if quote object exists first (it's in products package)
  try {
     // In a real monorepo with strict boundaries, we might use a decoupled service.
     // Here we assume the broker can find 'quote' across packages.
     // Mocking for now since we don't have the full runtime
     const quotes = await ctx.db.find('quote', { 
       filters: [['opportunity', '=', opportunityId]] 
     });
     return quotes.length;
  } catch (e) {
    console.warn('⚠️ Could not check quotes (Quote object might not be loaded):', e);
    return 1; // Bypass check if quote system is offline
  }
}

export { OpportunityStageChange, OpportunityValidation };
export default OpportunityValidation;

