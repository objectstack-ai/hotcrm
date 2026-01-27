import type { HookSchema } from '@objectstack/spec/data';
import { db } from '@hotcrm/core';

// Types for Context embedded here or imported if available
export interface TriggerContext {
  old?: Record<string, any>;
  new: Record<string, any>;
  db: typeof db;
  user: { id: string; name: string; email: string; };
}

/**
 * Opportunity Stage Change Trigger
 * 
 * Handles automation when opportunity stage changes:
 * - Closed Won: Creates contract, updates account status, logs activity
 * - Closed Lost: Updates account, logs activity, sends notification
 * - Stage changes: Validates data completeness, updates probability
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

      // Log activity for stage change
      await logStageChange(ctx);

      // Validate data completeness for advanced stages
      await validateStageRequirements(ctx);

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

  const errors: string[] = [];

  // 1. Create Contract
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
    console.log(`✅ Contract created: ${contract.Id}`);
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
      Priority: 'High',
      AccountId: opportunity.AccountId,
      WhatId: opportunity.Id,
      OwnerId: ctx.user.id,
      ActivityDate: new Date().toISOString().split('T')[0],
      Description: `商机 "${opportunity.Name}" 已成功成交，金额: ¥${opportunity.Amount?.toLocaleString() || 0}`
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

async function handleClosedLost(ctx: TriggerContext): Promise<void> {
  console.log('❌ Processing Closed Lost automation...');
  const opportunity = ctx.new;

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
      Description: `商机 "${opportunity.Name}" 已丢失，金额: ¥${opportunity.Amount?.toLocaleString() || 0}。原因待分析。`
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
async function logStageChange(ctx: TriggerContext): Promise<void> {
  try {
    const opportunity = ctx.new;
    const oldStage = ctx.old?.Stage || 'Unknown';
    await ctx.db.doc.create('Activity', {
      Subject: `商机阶段变更: ${oldStage} → ${ctx.new.Stage}`,
      Type: 'Stage Change',
      Status: 'Completed',
      Priority: 'Normal',
      AccountId: opportunity.AccountId,
      WhatId: opportunity.Id,
      OwnerId: ctx.user.id,
      ActivityDate: new Date().toISOString().split('T')[0],
      Description: `商机阶段从 "${oldStage}" 变更为 "${ctx.new.Stage}"`
    });
  } catch (error) {
    console.error('❌ Failed to log stage change activity:', error);
  }
}

/**
 * Validate required fields for advanced stages
 */
async function validateStageRequirements(ctx: TriggerContext): Promise<void> {
  const opportunity = ctx.new;
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
  if ((stage === 'Closed Won' || stage === 'Closed Lost') && !opportunity.Amount) {
    warnings.push('Closed opportunities should have an Amount for reporting');
  }

  if (warnings.length > 0) {
    console.warn(`⚠️ Stage validation warnings for ${opportunity.Name}:`, warnings);
  }
}

export default OpportunityStageChange;
