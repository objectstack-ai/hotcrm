import type { Hook, HookContext } from '@objectstack/spec/data';
import { db } from '../db';



/**
 * Quote Pricing Calculation and Approval Routing Hook
 * 
 * Handles automation for quotes:
 * - Calculate pricing: subtotal, discount, tax, total
 * - Route for approval based on discount percentage
 * - Validate pricing rules and margin protection
 * - Auto-apply price rules based on customer/product
 * - Track quote status changes
 */
const QuotePricingHook: Hook = {
  name: 'QuotePricingHook',
  object: 'quote',
  events: ['beforeInsert', 'beforeUpdate', 'afterInsert', 'afterUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const event = ctx.event || (ctx.previous ? 'afterUpdate' : 'afterInsert');
      const isInsert = !ctx.previous;
      const isUpdate = !!ctx.previous;
      const quote = ctx.input?.doc || ctx.result;

      // Before Insert/Update: Calculate pricing
      if (event === 'beforeInsert' || event === 'beforeUpdate') {
        await calculateQuotePricing(ctx);
        await determineApprovalRequirements(ctx);
        await validateMarginProtection(ctx);
      }

      // After Insert: Initialize quote
      if (event === 'afterInsert') {
        await initializeQuote(ctx);
      }

      // After Update: Handle status changes
      if (event === 'afterUpdate') {
        await handleQuoteStatusChange(ctx);
        await handleApprovalStatusChange(ctx);
      }

    } catch (error) {
      console.error('❌ Error in QuotePricingHook:', error);
      throw error;
    }
  }
};

/**
 * Calculate quote pricing based on line items and discounts
 */
async function calculateQuotePricing(ctx: any): Promise<void> {
  const quote = ctx.input?.doc || ctx.result;
  
  try {
    // Calculate Discount Amount from Percent or vice versa
    // Only calculate if one is provided and the other is not
    if (quote.Subtotal) {
      if (quote.DiscountPercent && !quote.DiscountAmount) {
        quote.DiscountAmount = quote.Subtotal * quote.DiscountPercent;
      } else if (quote.DiscountAmount && !quote.DiscountPercent) {
        quote.DiscountPercent = quote.DiscountAmount / quote.Subtotal;
      } else if (quote.DiscountPercent && quote.DiscountAmount) {
        // Both provided - recalculate DiscountAmount from DiscountPercent for consistency
        quote.DiscountAmount = quote.Subtotal * quote.DiscountPercent;
      }
    }

    // Calculate Tax Amount
    const afterDiscount = (quote.Subtotal || 0) - (quote.DiscountAmount || 0);
    if (quote.TaxPercent) {
      quote.TaxAmount = afterDiscount * quote.TaxPercent;
    }

    // Calculate Total Price
    quote.TotalPrice = afterDiscount + (quote.TaxAmount || 0) + (quote.ShippingHandling || 0);

    console.log(`💰 Quote pricing calculated: Subtotal=${quote.Subtotal}, Discount=${quote.DiscountAmount}, Tax=${quote.TaxAmount}, Total=${quote.TotalPrice}`);
  } catch (error) {
    console.error('❌ Error calculating quote pricing:', error);
  }
}

/**
 * Determine approval requirements based on discount percentage
 */
async function determineApprovalRequirements(ctx: any): Promise<void> {
  const quote = ctx.input?.doc || ctx.result;
  const discountPercent = quote.DiscountPercent || 0;

  try {
    // Approval matrix based on discount percentage
    let approvalLevel = 0;
    
    if (discountPercent > 0.40) {
      // >40% discount requires VP or C-level approval
      approvalLevel = 5;
    } else if (discountPercent > 0.30) {
      // >30% discount requires Director approval
      approvalLevel = 4;
    } else if (discountPercent > 0.20) {
      // >20% discount requires Manager approval
      approvalLevel = 3;
    } else if (discountPercent > 0.10) {
      // >10% discount requires Team Lead approval
      approvalLevel = 2;
    } else if (discountPercent > 0.05) {
      // >5% discount requires basic approval
      approvalLevel = 1;
    }

    if (approvalLevel > 0) {
      quote.ApprovalLevel = approvalLevel;
      
      // Set approval status to Pending if discount increased
      if (ctx.previous) {
        const oldDiscount = ctx.previous.DiscountPercent || 0;
        if (discountPercent > oldDiscount && quote.ApprovalStatus !== 'Approved' && quote.ApprovalStatus !== 'Pending') {
          quote.ApprovalStatus = 'Pending';
          console.log(`🔄 Quote requires Level ${approvalLevel} approval (${(discountPercent * 100).toFixed(1)}% discount)`);
        }
      } else if (quote.ApprovalStatus !== 'Pending') {
        quote.ApprovalStatus = 'Pending';
        console.log(`🔄 New quote requires Level ${approvalLevel} approval (${(discountPercent * 100).toFixed(1)}% discount)`);
      }
    }
  } catch (error) {
    console.error('❌ Error determining approval requirements:', error);
  }
}

/**
 * Validate margin protection rules
 */
async function validateMarginProtection(ctx: any): Promise<void> {
  const quote = ctx.input?.doc || ctx.result;
  
  try {
    // Calculate margin if we have cost information
    // This would require cost data from line items
    // For now, we'll just log a warning if discount is too high
    const discountPercent = quote.DiscountPercent || 0;
    
    if (discountPercent > 0.50) {
      console.warn(`⚠️ Warning: Quote ${quote.Name} has discount >50%, may impact margins`);
    }
  } catch (error) {
    console.error('❌ Error validating margin protection:', error);
  }
}

/**
 * Initialize quote after creation
 */
async function initializeQuote(ctx: any): Promise<void> {
  const quote = ctx.result;
  
  try {
    // Log activity for new quote
    if (quote.AccountId) {
      await ctx.db.doc.create('Activity', {
        Subject: `New Quote Created: ${quote.Name}`,
        Type: 'Quote',
        Status: 'Completed',
        Priority: 'Normal',
        AccountId: quote.AccountId,
        WhatId: quote.Id,
        OwnerId: ctx.user.id,
        ActivityDate: new Date().toISOString().split('T')[0],
        Description: `Quote ${quote.QuoteNumber} created with total value of ${quote.TotalPrice?.toLocaleString() || 0}`
      });
      console.log(`✅ Activity logged for new quote: ${quote.Name}`);
    }

    // Set expiration date if not provided
    if (!quote.ExpirationDate && quote.QuoteDate) {
      const validityDays = quote.ValidityPeriodDays || 30;
      const quoteDate = new Date(quote.QuoteDate);
      const expirationDate = new Date(quoteDate.getTime() + validityDays * 24 * 60 * 60 * 1000);
      
      await ctx.db.doc.update('Quote', quote.Id, {
        ExpirationDate: expirationDate.toISOString().split('T')[0]
      });
      console.log(`📅 Expiration date set to: ${expirationDate.toISOString().split('T')[0]}`);
    }
  } catch (error) {
    console.error('❌ Error initializing quote:', error);
  }
}

/**
 * Handle quote status changes
 */
async function handleQuoteStatusChange(ctx: any): Promise<void> {
  if (!ctx.previous || !ctx.result) return;
  
  const statusChanged = ctx.previous.Status !== ctx.result.Status;
  if (!statusChanged) return;

  const quote = ctx.result;
  
  try {
    console.log(`🔄 Quote status changed from "${ctx.previous.Status}" to "${quote.Status}"`);

    // Handle Accepted status
    if (quote.Status === 'Accepted') {
      await handleQuoteAccepted(ctx);
    }

    // Handle Sent status
    if (quote.Status === 'Sent') {
      await handleQuoteSent(ctx);
    }

    // Handle Expired status
    if (quote.Status === 'Expired') {
      await handleQuoteExpired(ctx);
    }

    // Log activity for status change
    if (quote.AccountId) {
      await ctx.db.doc.create('Activity', {
        Subject: `Quote Status Changed: ${ctx.previous.Status} → ${quote.Status}`,
        Type: 'Quote Status Change',
        Status: 'Completed',
        Priority: 'Normal',
        AccountId: quote.AccountId,
        WhatId: quote.Id,
        OwnerId: ctx.user.id,
        ActivityDate: new Date().toISOString().split('T')[0],
        Description: `Quote ${quote.QuoteNumber} status changed from "${ctx.previous.Status}" to "${quote.Status}"`
      });
    }
  } catch (error) {
    console.error('❌ Error handling quote status change:', error);
  }
}

/**
 * Handle quote accepted
 */
async function handleQuoteAccepted(ctx: any): Promise<void> {
  const quote = ctx.result;
  
  try {
    console.log('✅ Processing quote acceptance...');

    // Update accepted date and timestamp
    await ctx.db.doc.update('Quote', quote.Id, {
      AcceptedDate: new Date().toISOString()
    });

    // Update opportunity stage if linked
    if (quote.OpportunityId) {
      try {
        await ctx.db.doc.update('Opportunity', quote.OpportunityId, {
          Stage: 'closed_won',
          CloseDate: new Date().toISOString().split('T')[0]
        });
        console.log(`✅ Opportunity stage updated to Closed Won`);
      } catch (error) {
        console.error('❌ Failed to update opportunity:', error);
      }
    }

    // Auto-create contract from accepted quote
    if (quote.AccountId) {
        const startDate = new Date().toISOString().split('T')[0];
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1); // Default 1 year term

        const contractData = {
            contract_number: `CT-${quote.QuoteNumber}`,
            account: quote.AccountId,
            opportunity: quote.OpportunityId,
            status: 'Draft',
            start_date: startDate,
            end_date: endDate.toISOString().split('T')[0],
            contract_term: 12,
            contract_value: quote.TotalPrice,
            description: `Generated from Quote ${quote.QuoteNumber}`
        };

        try {
            const contract = await ctx.db.insert('contract', contractData);
            console.log(`📝 Contract created successfully: ${contract._id}`);
            
            // Link Contract back to Quote
            await ctx.db.doc.update('Quote', quote.Id, {
                Description: `${quote.Description || ''}\n Contract Created: ${contract.contract_number}`
            });
        } catch (err) {
            console.error('❌ Failed to create contract:', err);
        }
    }
  } catch (error) {
    console.error('❌ Error handling quote acceptance:', error);
  }
}

/**
 * Handle quote sent to customer
 */
async function handleQuoteSent(ctx: any): Promise<void> {
  const quote = ctx.result;
  
  try {
    console.log('📧 Quote sent to customer');
    
    // TODO: Send email notification
    // TODO: Schedule follow-up activity
    console.log('📧 Email notification would be sent here');
  } catch (error) {
    console.error('❌ Error handling quote sent:', error);
  }
}

/**
 * Handle quote expiration
 */
async function handleQuoteExpired(ctx: any): Promise<void> {
  const quote = ctx.result;
  
  try {
    console.log('⏰ Quote expired');
    
    // TODO: Notify owner about expiration
    // TODO: Suggest creating new version
    console.log('⏰ Expiration notification would be sent here');
  } catch (error) {
    console.error('❌ Error handling quote expiration:', error);
  }
}

/**
 * Handle approval status changes
 */
async function handleApprovalStatusChange(ctx: any): Promise<void> {
  if (!ctx.previous || !ctx.result) return;
  
  const approvalStatusChanged = ctx.previous.ApprovalStatus !== ctx.result.ApprovalStatus;
  if (!approvalStatusChanged) return;

  const quote = ctx.result;
  
  try {
    console.log(`🔄 Approval status changed from "${ctx.previous.ApprovalStatus}" to "${quote.ApprovalStatus}"`);

    // Handle approved
    if (quote.ApprovalStatus === 'Approved') {
      await ctx.db.doc.update('Quote', quote.Id, {
        ApprovedDate: new Date().toISOString(),
        ApprovedById: ctx.user.id,
        Status: quote.Status === 'In Review' ? 'Approved' : quote.Status
      });
      console.log('✅ Quote approved');
    }

    // Handle rejected
    if (quote.ApprovalStatus === 'Rejected') {
      await ctx.db.doc.update('Quote', quote.Id, {
        RejectedDate: new Date().toISOString(),
        RejectedById: ctx.user.id,
        Status: 'Rejected'
      });
      console.log('❌ Quote rejected');
    }
  } catch (error) {
    console.error('❌ Error handling approval status change:', error);
  }
}

export { QuotePricingHook };
export default QuotePricingHook;
