import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('crm:opportunity');



const OpportunityValidation: Hook = {
  name: 'OpportunityValidation',
  object: 'opportunity',
  events: ['beforeUpdate', 'beforeInsert'],
  handler: async (ctx: HookContext) => {
    const opp = ctx.input.doc as Record<string, any>;
    
    // 1. Validate "closed_won"
    if (opp.stage === 'closed_won') {
      if (!opp.amount || opp.amount <= 0) {
        throw new Error('Validation Error: Cannot close a deal with zero amount. Please update the Amount field.');
      }
    }

    // 2. Validate "proposal" - Must have a Quote
    // Note: We only check this on Update to avoid issues during initial import
    const ctxPrevious = ctx.previous as Record<string, any> | undefined;
    if (opp.stage === 'proposal' && ctxPrevious && ctxPrevious.stage !== 'proposal') {
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
  object: 'opportunity',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      // Defensive check
      if (!ctx.previous || !ctx.result) {
        logger.warn('Trigger called without previous/result context');
        return;
      }

      // Check if Stage actually changed
      const stageChanged = (ctx.previous as Record<string, any> | undefined)?.Stage !== (ctx.result as Record<string, any>)?.Stage;
      if (!stageChanged) {
        return;
      }

      logger.info(`Stage changed from "${(ctx.previous as Record<string, any> | undefined)?.Stage}" to "${(ctx.result as Record<string, any>)?.Stage}"`);

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
      logger.error('Error in OpportunityTrigger:', error);
      throw error;
    }
  }
};

/**
 * Handle Closed Won automation
 */
async function handleClosedWon(ctx: HookContext): Promise<void> {
  logger.info('Processing Closed Won automation...');
  const opportunity = ctx.result as Record<string, any>;

  if (!opportunity.AccountId) {
    logger.error('Cannot process: Opportunity has no AccountId');
    return;
  }

  const errors: string[] = [];

  // 1. Create Contract
  let contractId;
  try {
    const contract = await (ctx.ql as any).doc.create('contract', {
      AccountId: opportunity.AccountId,
      OpportunityId: opportunity.Id,
      Status: 'draft',
      ContractValue: opportunity.Amount || 0,
      StartDate: new Date().toISOString().split('T')[0],
      OwnerId: opportunity.OwnerId || ctx.user.id,
      Description: `Auto-generated from Opportunity: ${opportunity.Name}`
    });
    contractId = contract?.Id;
    if (contractId) {
      logger.info(`Contract created: ${contractId}`);
    } else {
      logger.warn('Contract created but no ID returned');
    }
  } catch (error) {
    logger.error('Failed to create Contract:', error);
    errors.push('Contract creation failed');
  }

  // 2. Update Account Status
  try {
    await (ctx.ql as any).doc.update('account', opportunity.AccountId, {
      CustomerStatus: 'active_customer'
    });
    logger.info('Account status updated to Active Customer');
  } catch (error) {
    logger.error('Failed to update Account status:', error);
    errors.push('Account update failed');
  }

  // 3. Log activity
  try {
    await (ctx.ql as any).doc.create('activity', {
      Subject: `Deal Won: ${opportunity.Name}`,
      Type: 'Milestone',
      Status: 'completed',
      Priority: 'high',
      AccountId: opportunity.AccountId,
      WhatId: opportunity.Id,
      OwnerId: ctx.user.id,
      ActivityDate: new Date().toISOString().split('T')[0],
      Description: `Opportunity "${opportunity.Name}" was successfully closed, amount: ${opportunity.Amount?.toLocaleString() || 0}`
    });
    logger.info('Activity logged for Closed Won');
  } catch (error) {
    logger.error('Failed to log activity:', error);
    errors.push('Activity logging failed');
  }

  // 4. Send notification (placeholder)
  try {
    logger.debug(`[opportunity.hook] Notification pending: notify ${ctx.user.email} about won opportunity ${opportunity.Id}`);
  } catch (error) {
    logger.error('Failed to send notification:', error);
  }

  if (errors.length > 0) {
    logger.warn(`Closed Won automation completed with errors: ${errors.join(', ')}`);
  } else {
    logger.info('Closed Won automation completed successfully');
  }
}

async function handleClosedLost(ctx: HookContext): Promise<void> {
  logger.info('Processing Closed Lost automation...');
  const opportunity = ctx.result as Record<string, any>;

  if (!opportunity.AccountId) {
    return;
  }

  // Log activity for lost opportunity
  try {
    await (ctx.ql as any).doc.create('activity', {
      Subject: `Deal Lost: ${opportunity.Name}`,
      Type: 'Milestone',
      Status: 'completed',
      Priority: 'normal',
      AccountId: opportunity.AccountId,
      WhatId: opportunity.Id,
      OwnerId: ctx.user.id,
      ActivityDate: new Date().toISOString().split('T')[0],
      Description: `Opportunity "${opportunity.Name}" was lost, amount: ${opportunity.Amount?.toLocaleString() || 0}. Reason pending analysis.`
    });
    logger.info('Activity logged for Closed Lost');
  } catch (error) {
    logger.error('Failed to log activity:', error);
  }

  logger.debug(`[opportunity.hook] Loss analysis workflow pending: analyze loss reasons for opportunity ${opportunity.Id}, amount: ${opportunity.Amount?.toLocaleString() || 0}`);
}

/**
 * Log activity when stage changes
 */
async function logStageChange(ctx: HookContext): Promise<void> {
  try {
    const opportunity = ctx.result as Record<string, any>;
    const oldStage = (ctx.previous as Record<string, any>)?.Stage || 'unknown';
    await (ctx.ql as any).doc.create('activity', {
      Subject: `Opportunity Stage Change: ${oldStage} → ${(ctx.result as Record<string, any>).Stage}`,
      Type: 'Stage Change',
      Status: 'completed',
      Priority: 'normal',
      AccountId: opportunity.AccountId,
      WhatId: opportunity.Id,
      OwnerId: ctx.user.id,
      ActivityDate: new Date().toISOString().split('T')[0],
      Description: `Opportunity stage changed from "${oldStage}" to "${(ctx.result as Record<string, any>).Stage}"`
    });
  } catch (error) {
    logger.error('Failed to log stage change activity:', error);
  }
}

/**
 * Validate required fields for advanced stages
 */
async function validateStageRequirements(ctx: HookContext): Promise<void> {
  const opportunity = ctx.result as Record<string, any>;
  const stage = opportunity.Stage;
  const warnings: string[] = [];

  // Validation for Proposal stage
  if (stage === 'proposal' && !opportunity.Amount) {
    warnings.push('Proposal stage should have an Amount specified');
  }

  // Validation for Negotiation stage
  if (stage === 'negotiation') {
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
    logger.warn(`Stage validation warnings for ${opportunity.Name}:`, warnings);
  }
}


/**
 * Helper: Count related quotes
 */
async function countRelatedQuotes(ctx: HookContext, opportunityId: string): Promise<number> {
  // Check if quote object exists first (it's in products package)
  try {
     // In a real monorepo with strict boundaries, we might use a decoupled service.
     // Here we assume the broker can find 'quote' across packages.
     // Mocking for now since we don't have the full runtime
     const quotes = await (ctx.ql as any).find('quote', { 
       filters: [['opportunity', '=', opportunityId]] 
     });
     return quotes.length;
  } catch (e) {
    logger.warn('Could not check quotes (Quote object might not be loaded):', e);
    return 1; // Bypass check if quote system is offline
  }
}

export { OpportunityStageChange, OpportunityValidation };
export default OpportunityValidation;

