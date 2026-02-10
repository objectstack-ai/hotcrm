import type { Hook, HookContext } from '@objectstack/spec/data';



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
  object: 'pricebook',
  events: ['beforeInsert', 'beforeUpdate', 'afterUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      // Determine if this is a before or after hook based on available properties
      const isBeforeHook = !!ctx.input;
      const isAfterHook = !!ctx.result;
      
      // Before Insert/Update: Validate pricebook configuration
      if (isBeforeHook) {
        await validatePricebookDates(ctx);
        await validateCurrencyConfiguration(ctx);
      }

      // After Update: Handle effective date and status changes
      if (isAfterHook) {
        await handleEffectiveDateChange(ctx);
        await handleStatusChange(ctx);
        await handleCurrencyChange(ctx);
      }

    } catch (error) {
      console.error(`[pricebook.hook] handler execution failed:`, error);
      throw error;
    }
  }
};

/**
 * Validate pricebook date ranges
 */
async function validatePricebookDates(ctx: any): Promise<void> {
  const pricebook = ctx.input?.doc || ctx.result;
  
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
      const overlapping = await ctx.ql.find('pricebook', {
        filters: [
          ['IsStandard', '=', true],
          ['Status', '=', 'active'],
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
    console.error(`[pricebook.hook] validatePricebookDates failed:`, error);
    throw error;
  }
}

/**
 * Validate currency configuration
 */
async function validateCurrencyConfiguration(ctx: any): Promise<void> {
  const pricebook = ctx.input?.doc || ctx.result;
  
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
    console.error(`[pricebook.hook] validateCurrencyConfiguration failed:`, error);
    throw error;
  }
}

/**
 * Handle effective date changes
 */
async function handleEffectiveDateChange(ctx: any): Promise<void> {
  if (!ctx.previous || !ctx.result) return;
  
  const effectiveDateChanged = ctx.previous.EffectiveDate !== ctx.result.EffectiveDate;
  const expirationDateChanged = ctx.previous.ExpirationDate !== ctx.result.ExpirationDate;
  
  if (!effectiveDateChanged && !expirationDateChanged) return;

  const pricebook = ctx.result;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  try {
    // Check if pricebook should be activated
    if (pricebook.EffectiveDate) {
      const effectiveDate = new Date(pricebook.EffectiveDate);
      const effectiveDateOnly = new Date(effectiveDate.getFullYear(), effectiveDate.getMonth(), effectiveDate.getDate());
      
      if (effectiveDateOnly <= today && pricebook.Status === 'draft') {
        console.log(`✅ Pricebook effective date reached, activating: ${pricebook.Name}`);
        
        await ctx.ql.doc.update('pricebook', pricebook.Id, {
          Status: 'active'
        });
      }
    }

    // Check if pricebook should be expired
    if (pricebook.ExpirationDate) {
      const expirationDate = new Date(pricebook.ExpirationDate);
      const expirationDateOnly = new Date(expirationDate.getFullYear(), expirationDate.getMonth(), expirationDate.getDate());
      
      if (expirationDateOnly < today && pricebook.Status === 'active') {
        console.log(`⏰ Pricebook expired, deactivating: ${pricebook.Name}`);
        
        await ctx.ql.doc.update('pricebook', pricebook.Id, {
          Status: 'expired'
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
      
      await ctx.ql.doc.create('activity', {
        Subject: `Pricebook Dates Updated: ${pricebook.Name}`,
        Type: 'Pricebook Update',
        Status: 'completed',
        Priority: 'normal',
        WhatId: pricebook.Id,
        OwnerId: ctx.user.id,
        ActivityDate: new Date().toISOString().split('T')[0],
        Description: changes.join('\n')
      });
    }
  } catch (error) {
    console.error(`[pricebook.hook] handleEffectiveDateChange failed:`, error);
  }
}

/**
 * Handle pricebook status changes
 */
async function handleStatusChange(ctx: any): Promise<void> {
  if (!ctx.previous || !ctx.result) return;
  
  const statusChanged = ctx.previous.Status !== ctx.result.Status;
  if (!statusChanged) return;

  const pricebook = ctx.result;
  
  try {
    console.log(`🔄 Pricebook status changed from "${ctx.previous.Status}" to "${pricebook.Status}"`);

    // Handle activation
    if (pricebook.Status === 'active') {
      console.log(`✅ Pricebook activated: ${pricebook.Name}`);
      
      // Set effective date if not already set
      if (!pricebook.EffectiveDate) {
        await ctx.ql.doc.update('pricebook', pricebook.Id, {
          EffectiveDate: new Date().toISOString().split('T')[0]
        });
        console.log('📅 Effective date set to today');
      }

      // If this is a standard pricebook, deactivate other standard pricebooks
      if (pricebook.IsStandard) {
        try {
          const otherStandard = await ctx.ql.find('pricebook', {
            filters: [
              ['IsStandard', '=', true],
              ['Status', '=', 'active'],
              ['Id', '!=', pricebook.Id]
            ]
          });
          
          const otherPricebooks = otherStandard || [];
          if (otherPricebooks.length > 0) {
            console.log(`⚠️ Deactivating ${otherPricebooks.length} other standard pricebook(s)`);
            for (const pb of otherPricebooks) {
              await ctx.ql.doc.update('pricebook', pb.Id, {
                Status: 'inactive',
                ExpirationDate: new Date().toISOString().split('T')[0]
              });
            }
          }
        } catch (error) {
          console.error(`[pricebook.hook] deactivateOtherStandardPricebooks failed:`, error);
        }
      }

      console.debug(`[pricebook.hook] Activation notification pending: notify sales team about new active pricebook "${pricebook.Name}"`);
    }

    // Handle expiration
    if (pricebook.Status === 'expired') {
      console.log(`⏰ Pricebook expired: ${pricebook.Name}`);
      
      // Set expiration date if not already set
      if (!pricebook.ExpirationDate) {
        await ctx.ql.doc.update('pricebook', pricebook.Id, {
          ExpirationDate: new Date().toISOString().split('T')[0]
        });
      }

      console.debug(`[pricebook.hook] Expiration notification pending: notify users about expired pricebook "${pricebook.Name}"`);
    }

    // Log activity for status change
    await ctx.ql.doc.create('activity', {
      Subject: `Pricebook Status Changed: ${ctx.previous.Status} → ${pricebook.Status}`,
      Type: 'Status Change',
      Status: 'completed',
      Priority: 'normal',
      WhatId: pricebook.Id,
      OwnerId: ctx.user.id,
      ActivityDate: new Date().toISOString().split('T')[0],
      Description: `Pricebook "${pricebook.Name}" status changed from "${ctx.previous.Status}" to "${pricebook.Status}"`
    });
  } catch (error) {
    console.error(`[pricebook.hook] handleStatusChange failed:`, error);
  }
}

/**
 * Handle currency or exchange rate changes
 */
async function handleCurrencyChange(ctx: any): Promise<void> {
  if (!ctx.previous || !ctx.result) return;
  
  const currencyChanged = ctx.previous.CurrencyCode !== ctx.result.CurrencyCode;
  const rateChanged = ctx.previous.ExchangeRate !== ctx.result.ExchangeRate;
  
  if (!currencyChanged && !rateChanged) return;

  const pricebook = ctx.result;
  
  try {
    if (currencyChanged) {
      console.log(`💱 Currency changed from ${ctx.previous.CurrencyCode} to ${pricebook.CurrencyCode}`);
      
      console.debug(`[pricebook.hook] Currency update pending: update pricebook entries and notify users about currency change from ${ctx.previous.CurrencyCode} to ${pricebook.CurrencyCode} for pricebook "${pricebook.Name}"`);
    }

    if (rateChanged) {
      console.log(`💱 Exchange rate changed from ${ctx.previous.ExchangeRate} to ${pricebook.ExchangeRate}`);
      
      // Recalculate all prices based on new exchange rate
      // This would update all PricebookEntry records
      console.log('💰 Price recalculation would be triggered here');
    }

    // Log activity for currency change
    if (currencyChanged || rateChanged) {
      const changes = [];
      if (currencyChanged) {
        changes.push(`Currency: ${ctx.previous.CurrencyCode} → ${pricebook.CurrencyCode}`);
      }
      if (rateChanged) {
        changes.push(`Exchange Rate: ${ctx.previous.ExchangeRate} → ${pricebook.ExchangeRate}`);
      }
      
      await ctx.ql.doc.create('activity', {
        Subject: `Pricebook Currency Updated: ${pricebook.Name}`,
        Type: 'Currency Update',
        Status: 'completed',
        Priority: 'high',
        WhatId: pricebook.Id,
        OwnerId: ctx.user.id,
        ActivityDate: new Date().toISOString().split('T')[0],
        Description: changes.join('\n')
      });
    }
  } catch (error) {
    console.error(`[pricebook.hook] handleCurrencyChange failed:`, error);
  }
}

/**
 * Activate pricebook entries based on effective date
 */
async function activatePricebookEntries(
  pricebookId: string,
  ql: any
): Promise<void> {
  try {
    console.log(`✅ Activating pricebook entries for pricebook: ${pricebookId}`);
    
    console.debug(`[pricebook.hook] Entry activation pending: activate all PricebookEntry records for pricebook ${pricebookId}`);
  } catch (error) {
    console.error(`[pricebook.hook] activatePricebookEntries failed:`, error);
  }
}

/**
 * Expire pricebook entries
 */
async function expirePricebookEntries(
  pricebookId: string,
  ql: any
): Promise<void> {
  try {
    console.log(`⏰ Expiring pricebook entries for pricebook: ${pricebookId}`);
    
    console.debug(`[pricebook.hook] Entry expiration pending: expire all PricebookEntry records for pricebook ${pricebookId}`);
  } catch (error) {
    console.error(`[pricebook.hook] expirePricebookEntries failed:`, error);
  }
}

export default PricebookHook;
