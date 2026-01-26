/**
 * Opportunity Stage Change Trigger
 * 
 * This trigger handles business automation when an Opportunity's stage changes.
 * 
 * Key behaviors:
 * 1. When stage changes to "Closed Won":
 *    - Automatically create a Contract record
 *    - Update Account status to "Active Customer"
 *    - Send notification to sales director
 * 
 * 2. Defensive programming:
 *    - Null/undefined checks
 *    - Error handling
 *    - Logging for debugging
 */

import { db } from '../engine/objectql';

export interface TriggerContext {
  /** The old version of the record (before update) */
  old?: Record<string, any>;
  
  /** The new version of the record (after update) */
  new: Record<string, any>;
  
  /** Database interface for querying and manipulation */
  db: typeof db;
  
  /** Current user information */
  user: {
    id: string;
    name: string;
    email: string;
  };
  
  /** Trigger metadata */
  trigger: {
    object: string;
    event: 'beforeInsert' | 'afterInsert' | 'beforeUpdate' | 'afterUpdate' | 'beforeDelete' | 'afterDelete';
  };
}

export interface NotificationPayload {
  to: string[];
  subject: string;
  body: string;
  priority: 'low' | 'medium' | 'high';
}

/**
 * Send notification to sales director
 */
async function sendNotification(payload: NotificationPayload): Promise<void> {
  console.log('📧 Sending notification:', payload);
  // In production, this would integrate with email service or notification system
}

/**
 * Main trigger handler for Opportunity stage changes
 */
export async function onOpportunityStageChange(ctx: TriggerContext): Promise<void> {
  try {
    // Defensive check: ensure we have both old and new records
    if (!ctx.old || !ctx.new) {
      console.warn('⚠️ Trigger called without old/new context');
      return;
    }

    // Check if Stage actually changed
    const stageChanged = ctx.old.Stage !== ctx.new.Stage;
    if (!stageChanged) {
      console.log('ℹ️ Stage did not change, skipping trigger');
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
    // In production, this would be logged to error tracking system
    throw error;
  }
}

/**
 * Handle Closed Won automation
 */
async function handleClosedWon(ctx: TriggerContext): Promise<void> {
  console.log('✅ Processing Closed Won automation...');

  const opportunity = ctx.new;

  // Defensive checks
  if (!opportunity.AccountId) {
    console.error('❌ Cannot process: Opportunity has no AccountId');
    return;
  }

  if (!opportunity.Amount || opportunity.Amount <= 0) {
    console.warn('⚠️ Warning: Opportunity Amount is zero or negative');
  }

  // 1. Create Contract
  try {
    const contract = await ctx.db.doc.create('Contract', {
      AccountId: opportunity.AccountId,
      OpportunityId: opportunity.Id,
      Status: 'Draft',
      ContractValue: opportunity.Amount || 0,
      StartDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
      OwnerId: opportunity.OwnerId || ctx.user.id,
      Description: `Auto-generated from Opportunity: ${opportunity.Name}`
    });

    console.log('📄 Contract created:', contract.Id);

  } catch (error) {
    console.error('❌ Failed to create Contract:', error);
    // Don't throw - allow other automation to continue
  }

  // 2. Update Account Status
  try {
    await ctx.db.doc.update('Account', opportunity.AccountId, {
      CustomerStatus: 'Active Customer'
    });

    console.log('🏢 Account status updated to "Active Customer"');

  } catch (error) {
    console.error('❌ Failed to update Account status:', error);
  }

  // 3. Send notification to sales director
  try {
    // Get Account details for personalized notification
    const account = await ctx.db.doc.get('Account', opportunity.AccountId, {
      fields: ['Name', 'Industry', 'OwnerId']
    });

    await sendNotification({
      to: ['sales-director@company.com'], // In production, this would be dynamic
      subject: `🎉 Deal Closed: ${opportunity.Name}`,
      body: `
Great news! A new deal has been closed.

**Opportunity:** ${opportunity.Name}
**Account:** ${account?.Name || 'Unknown'}
**Amount:** $${(opportunity.Amount || 0).toLocaleString()}
**Owner:** ${ctx.user.name}
**Close Date:** ${opportunity.CloseDate || 'Not set'}

A contract has been automatically created and is ready for review.
      `.trim(),
      priority: 'high'
    });

    console.log('📨 Notification sent to sales director');

  } catch (error) {
    console.error('❌ Failed to send notification:', error);
  }
}

/**
 * Handle Closed Lost automation
 */
async function handleClosedLost(ctx: TriggerContext): Promise<void> {
  console.log('❌ Processing Closed Lost automation...');

  const opportunity = ctx.new;

  // Log loss reason for analytics
  if (opportunity.LossReason) {
    console.log(`📊 Loss Reason: ${opportunity.LossReason}`);
  }

  // In production, could trigger:
  // - Analytics/reporting
  // - Follow-up task creation
  // - Notification to manager for review
}

/**
 * Export default handler
 */
export default onOpportunityStageChange;
