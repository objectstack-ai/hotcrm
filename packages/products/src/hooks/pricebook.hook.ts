import type { Hook } from '@objectstack/spec/data';
import { db } from '../db';

// Types for Context
export interface TriggerContext {
  old?: Record<string, any>;
  new: Record<string, any>;
  db: typeof db;
  user: { id: string; name: string; email: string; };
  event?: string; // Event type: beforeInsert, beforeUpdate, afterUpdate
}

/**
 * Pricebook Hook
 * 
 * Handles automation for pricebooks:
 * - Effective date management and validation
 * - Price activation/expiration
 * - Currency conversion updates
 * - Pricebook entry management
 */
const PricebookHook: Hook = {
  name: 'PricebookHook',
  object: 'Pricebook',
  events: ['beforeInsert', 'beforeUpdate', 'afterUpdate'],
  handler: async (ctx: TriggerContext) => {
    try {
      // Before Insert/Update: Validate pricebook configuration
      if (ctx.event === 'beforeInsert' || ctx.event === 'beforeUpdate') {
        await validatePricebookDates(ctx);
        await validateCurrencyConfiguration(ctx);
      }

      // After Update: Handle effective date and status changes
      if (ctx.event === 'afterUpdate') {
        await handleEffectiveDateChange(ctx);
        await handleStatusChange(ctx);
        await handleCurrencyChange(ctx);
      }

    } catch (error) {
      console.error('❌ Error in PricebookHook:', error);
      throw error;
    }
  }
};

/**
 * Validate pricebook date ranges
 */
async function validatePricebookDates(ctx: TriggerContext): Promise<void> {
  const pricebook = ctx.new;
  
  try {
    // Validate effective dates
    if (pricebook.EffectiveDate && pricebook.ExpirationDate) {
      const effectiveDate = new Date(pricebook.EffectiveDate);
      const expirationDate = new Date(pricebook.ExpirationDate);
      
      if (expirationDate <= effectiveDate) {
        throw new Error('Expiration date must be after effective date');
      }
    }

    // Check for overlapping pricebooks (if this is a standard pricebook)
    if (pricebook.IsStandard && pricebook.EffectiveDate) {
      const overlapping = await ctx.db.find('Pricebook', {
        filters: [
          ['IsStandard', '=', true],
          ['Status', '=', 'Active'],
          ['Id', '!=', pricebook.Id || '']
        ]
      });
      
      if (overlapping && overlapping.length > 0) {
        console.warn(`⚠️ Warning: Multiple active standard pricebooks detected`);
        // Depending on business rules, might want to throw error or auto-deactivate others
      }
    }

    console.log(`✅ Pricebook dates validated: ${pricebook.Name}`);
  } catch (error) {
    console.error('❌ Error validating pricebook dates:', error);
    throw error;
  }
}

/**
 * Validate currency configuration
 */
async function validateCurrencyConfiguration(ctx: TriggerContext): Promise<void> {
  const pricebook = ctx.new;
  
  try {
    // Validate currency code
    const validCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'AUD', 'CAD', 'CHF', 'INR'];
    
    if (pricebook.CurrencyCode && !validCurrencies.includes(pricebook.CurrencyCode)) {
      console.warn(`⚠️ Warning: Unusual currency code: ${pricebook.CurrencyCode}`);
    }

    // Validate exchange rate
    if (pricebook.ExchangeRate) {
      if (pricebook.ExchangeRate <= 0) {
        throw new Error('Exchange rate must be positive');
      }
      
      if (pricebook.CurrencyCode === 'USD' && pricebook.ExchangeRate !== 1.0) {
        console.warn(`⚠️ Warning: USD exchange rate should typically be 1.0`);
      }
    }

    console.log(`✅ Currency configuration validated`);
  } catch (error) {
    console.error('❌ Error validating currency configuration:', error);
    throw error;
  }
}

/**
 * Handle effective date changes
 */
async function handleEffectiveDateChange(ctx: TriggerContext): Promise<void> {
  if (!ctx.old || !ctx.new) return;
  
  const effectiveDateChanged = ctx.old.EffectiveDate !== ctx.new.EffectiveDate;
  const expirationDateChanged = ctx.old.ExpirationDate !== ctx.new.ExpirationDate;
  
  if (!effectiveDateChanged && !expirationDateChanged) return;

  const pricebook = ctx.new;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  try {
    // Check if pricebook should be activated
    if (pricebook.EffectiveDate) {
      const effectiveDate = new Date(pricebook.EffectiveDate);
      const effectiveDateOnly = new Date(effectiveDate.getFullYear(), effectiveDate.getMonth(), effectiveDate.getDate());
      
      if (effectiveDateOnly <= today && pricebook.Status === 'Draft') {
        console.log(`✅ Pricebook effective date reached, activating: ${pricebook.Name}`);
        
        await ctx.db.doc.update('Pricebook', pricebook.Id, {
          Status: 'Active'
        });
      }
    }

    // Check if pricebook should be expired
    if (pricebook.ExpirationDate) {
      const expirationDate = new Date(pricebook.ExpirationDate);
      const expirationDateOnly = new Date(expirationDate.getFullYear(), expirationDate.getMonth(), expirationDate.getDate());
      
      if (expirationDateOnly < today && pricebook.Status === 'Active') {
        console.log(`⏰ Pricebook expired, deactivating: ${pricebook.Name}`);
        
        await ctx.db.doc.update('Pricebook', pricebook.Id, {
          Status: 'Expired'
        });
      }
    }

    // Log activity for date change
    if (effectiveDateChanged || expirationDateChanged) {
      const changes = [];
      if (effectiveDateChanged) {
        changes.push(`Effective Date: ${ctx.old.EffectiveDate} → ${pricebook.EffectiveDate}`);
      }
      if (expirationDateChanged) {
        changes.push(`Expiration Date: ${ctx.old.ExpirationDate} → ${pricebook.ExpirationDate}`);
      }
      
      await ctx.db.doc.create('Activity', {
        Subject: `Pricebook Dates Updated: ${pricebook.Name}`,
        Type: 'Pricebook Update',
        Status: 'Completed',
        Priority: 'Normal',
        WhatId: pricebook.Id,
        OwnerId: ctx.user.id,
        ActivityDate: new Date().toISOString().split('T')[0],
        Description: changes.join('\n')
      });
    }
  } catch (error) {
    console.error('❌ Error handling effective date change:', error);
  }
}

/**
 * Handle pricebook status changes
 */
async function handleStatusChange(ctx: TriggerContext): Promise<void> {
  if (!ctx.old || !ctx.new) return;
  
  const statusChanged = ctx.old.Status !== ctx.new.Status;
  if (!statusChanged) return;

  const pricebook = ctx.new;
  
  try {
    console.log(`🔄 Pricebook status changed from "${ctx.old.Status}" to "${pricebook.Status}"`);

    // Handle activation
    if (pricebook.Status === 'Active') {
      console.log(`✅ Pricebook activated: ${pricebook.Name}`);
      
      // Set effective date if not already set
      if (!pricebook.EffectiveDate) {
        await ctx.db.doc.update('Pricebook', pricebook.Id, {
          EffectiveDate: new Date().toISOString().split('T')[0]
        });
        console.log('📅 Effective date set to today');
      }

      // If this is a standard pricebook, deactivate other standard pricebooks
      if (pricebook.IsStandard) {
        try {
          const otherStandard = await ctx.db.find('Pricebook', {
            filters: [
              ['IsStandard', '=', true],
              ['Status', '=', 'Active'],
              ['Id', '!=', pricebook.Id]
            ]
          });
          
          const otherPricebooks = otherStandard || [];
          if (otherPricebooks.length > 0) {
            console.log(`⚠️ Deactivating ${otherPricebooks.length} other standard pricebook(s)`);
            for (const pb of otherPricebooks) {
              await ctx.db.doc.update('Pricebook', pb.Id, {
                Status: 'Inactive',
                ExpirationDate: new Date().toISOString().split('T')[0]
              });
            }
          }
        } catch (error) {
          console.error('❌ Error deactivating other standard pricebooks:', error);
        }
      }

      // TODO: Notify sales team about new active pricebook
      console.log('📧 Activation notification would be sent here');
    }

    // Handle expiration
    if (pricebook.Status === 'Expired') {
      console.log(`⏰ Pricebook expired: ${pricebook.Name}`);
      
      // Set expiration date if not already set
      if (!pricebook.ExpirationDate) {
        await ctx.db.doc.update('Pricebook', pricebook.Id, {
          ExpirationDate: new Date().toISOString().split('T')[0]
        });
      }

      // TODO: Notify users about pricebook expiration
      console.log('📧 Expiration notification would be sent here');
    }

    // Log activity for status change
    await ctx.db.doc.create('Activity', {
      Subject: `Pricebook Status Changed: ${ctx.old.Status} → ${pricebook.Status}`,
      Type: 'Status Change',
      Status: 'Completed',
      Priority: 'Normal',
      WhatId: pricebook.Id,
      OwnerId: ctx.user.id,
      ActivityDate: new Date().toISOString().split('T')[0],
      Description: `Pricebook "${pricebook.Name}" status changed from "${ctx.old.Status}" to "${pricebook.Status}"`
    });
  } catch (error) {
    console.error('❌ Error handling status change:', error);
  }
}

/**
 * Handle currency or exchange rate changes
 */
async function handleCurrencyChange(ctx: TriggerContext): Promise<void> {
  if (!ctx.old || !ctx.new) return;
  
  const currencyChanged = ctx.old.CurrencyCode !== ctx.new.CurrencyCode;
  const rateChanged = ctx.old.ExchangeRate !== ctx.new.ExchangeRate;
  
  if (!currencyChanged && !rateChanged) return;

  const pricebook = ctx.new;
  
  try {
    if (currencyChanged) {
      console.log(`💱 Currency changed from ${ctx.old.CurrencyCode} to ${pricebook.CurrencyCode}`);
      
      // TODO: Update all pricebook entries to reflect new currency
      console.log('💱 Pricebook entries would be updated for new currency');
      
      // TODO: Notify users about currency change
      console.log('📧 Currency change notification would be sent here');
    }

    if (rateChanged) {
      console.log(`💱 Exchange rate changed from ${ctx.old.ExchangeRate} to ${pricebook.ExchangeRate}`);
      
      // Recalculate all prices based on new exchange rate
      // This would update all PricebookEntry records
      console.log('💰 Price recalculation would be triggered here');
    }

    // Log activity for currency change
    if (currencyChanged || rateChanged) {
      const changes = [];
      if (currencyChanged) {
        changes.push(`Currency: ${ctx.old.CurrencyCode} → ${pricebook.CurrencyCode}`);
      }
      if (rateChanged) {
        changes.push(`Exchange Rate: ${ctx.old.ExchangeRate} → ${pricebook.ExchangeRate}`);
      }
      
      await ctx.db.doc.create('Activity', {
        Subject: `Pricebook Currency Updated: ${pricebook.Name}`,
        Type: 'Currency Update',
        Status: 'Completed',
        Priority: 'high',
        WhatId: pricebook.Id,
        OwnerId: ctx.user.id,
        ActivityDate: new Date().toISOString().split('T')[0],
        Description: changes.join('\n')
      });
    }
  } catch (error) {
    console.error('❌ Error handling currency change:', error);
  }
}

/**
 * Activate pricebook entries based on effective date
 */
async function activatePricebookEntries(
  pricebookId: string,
  db: any
): Promise<void> {
  try {
    console.log(`✅ Activating pricebook entries for pricebook: ${pricebookId}`);
    
    // TODO: Query and activate all PricebookEntry records for this pricebook
    // This would set their status to Active
    console.log('💰 Pricebook entry activation would be performed here');
  } catch (error) {
    console.error('❌ Error activating pricebook entries:', error);
  }
}

/**
 * Expire pricebook entries
 */
async function expirePricebookEntries(
  pricebookId: string,
  db: any
): Promise<void> {
  try {
    console.log(`⏰ Expiring pricebook entries for pricebook: ${pricebookId}`);
    
    // TODO: Query and expire all PricebookEntry records for this pricebook
    // This would set their status to Expired
    console.log('⏰ Pricebook entry expiration would be performed here');
  } catch (error) {
    console.error('❌ Error expiring pricebook entries:', error);
  }
}

export default PricebookHook;
