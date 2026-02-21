import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('products:pricebook');



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
      logger.error(`[pricebook.hook] handler execution failed:`, error);
      throw error;
    }
  }
};

/**
 * Validate pricebook date ranges
 */
async function validatePricebookDates(ctx: HookContext): Promise<void> {
  const pricebook = (ctx.input?.doc || ctx.result) as Record<string, any>;
  
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
      const overlapping = await (ctx.ql as any).find('pricebook', {
        filters: [
          ['IsStandard', '=', true],
          ['Status', '=', 'active'],
          ['Id', '!=', pricebook.Id || '']
        ]
      });
      
      if (overlapping && overlapping.length > 0) {
        logger.warn(`Warning: Multiple active standard pricebooks detected`);
        // Depending on business rules, might want to throw error or auto-deactivate others
      }
    }

    logger.info(`Pricebook dates validated: ${pricebook.Name}`);
  } catch (error) {
    logger.error(`[pricebook.hook] validatePricebookDates failed:`, error);
    throw error;
  }
}

/**
 * Validate currency configuration
 */
async function validateCurrencyConfiguration(ctx: HookContext): Promise<void> {
  const pricebook = (ctx.input?.doc || ctx.result) as Record<string, any>;
  
  try {
    // Validate currency code
    const validCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'AUD', 'CAD', 'CHF', 'INR'];
    
    if (pricebook.CurrencyCode && !validCurrencies.includes(pricebook.CurrencyCode)) {
      logger.warn(`Warning: Unusual currency code: ${pricebook.CurrencyCode}`);
    }

    // Validate exchange rate
    if (pricebook.ExchangeRate) {
      if (pricebook.ExchangeRate <= 0) {
        throw new Error('Exchange rate must be positive');
      }
      
      if (pricebook.CurrencyCode === 'USD' && pricebook.ExchangeRate !== 1.0) {
        logger.warn(`Warning: USD exchange rate should typically be 1.0`);
      }
    }

    logger.info(`Currency configuration validated`);
  } catch (error) {
    logger.error(`[pricebook.hook] validateCurrencyConfiguration failed:`, error);
    throw error;
  }
}

/**
 * Handle effective date changes
 */
async function handleEffectiveDateChange(ctx: HookContext): Promise<void> {
  if (!ctx.previous || !ctx.result) return;
  
  const prev = ctx.previous as Record<string, any>;
  const result = ctx.result as Record<string, any>;
  const effectiveDateChanged = prev.EffectiveDate !== result.EffectiveDate;
  const expirationDateChanged = prev.ExpirationDate !== result.ExpirationDate;
  
  if (!effectiveDateChanged && !expirationDateChanged) return;

  const pricebook = result;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  try {
    // Check if pricebook should be activated
    if (pricebook.EffectiveDate) {
      const effectiveDate = new Date(pricebook.EffectiveDate);
      const effectiveDateOnly = new Date(effectiveDate.getFullYear(), effectiveDate.getMonth(), effectiveDate.getDate());
      
      if (effectiveDateOnly <= today && pricebook.Status === 'draft') {
        logger.info(`Pricebook effective date reached, activating: ${pricebook.Name}`);
        
        await (ctx.ql as any).doc.update('pricebook', pricebook.Id, {
          Status: 'active'
        });
      }
    }

    // Check if pricebook should be expired
    if (pricebook.ExpirationDate) {
      const expirationDate = new Date(pricebook.ExpirationDate);
      const expirationDateOnly = new Date(expirationDate.getFullYear(), expirationDate.getMonth(), expirationDate.getDate());
      
      if (expirationDateOnly < today && pricebook.Status === 'active') {
        logger.info(`⏰ Pricebook expired, deactivating: ${pricebook.Name}`);
        
        await (ctx.ql as any).doc.update('pricebook', pricebook.Id, {
          Status: 'expired'
        });
      }
    }

    // Log activity for date change
    if (effectiveDateChanged || expirationDateChanged) {
      const changes = [];
      if (effectiveDateChanged) {
        changes.push(`Effective Date: ${prev.EffectiveDate} → ${pricebook.EffectiveDate}`);
      }
      if (expirationDateChanged) {
        changes.push(`Expiration Date: ${prev.ExpirationDate} → ${pricebook.ExpirationDate}`);
      }
      
      await (ctx.ql as any).doc.create('activity', {
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
    logger.error(`[pricebook.hook] handleEffectiveDateChange failed:`, error);
  }
}

/**
 * Handle pricebook status changes
 */
async function handleStatusChange(ctx: HookContext): Promise<void> {
  if (!ctx.previous || !ctx.result) return;
  
  const prev = ctx.previous as Record<string, any>;
  const result = ctx.result as Record<string, any>;
  const statusChanged = prev.Status !== result.Status;
  if (!statusChanged) return;

  const pricebook = result;
  
  try {
    logger.info(`Pricebook status changed from "${prev.Status}" to "${pricebook.Status}"`);

    // Handle activation
    if (pricebook.Status === 'active') {
      logger.info(`Pricebook activated: ${pricebook.Name}`);
      
      // Set effective date if not already set
      if (!pricebook.EffectiveDate) {
        await (ctx.ql as any).doc.update('pricebook', pricebook.Id, {
          EffectiveDate: new Date().toISOString().split('T')[0]
        });
        logger.info('Effective date set to today');
      }

      // If this is a standard pricebook, deactivate other standard pricebooks
      if (pricebook.IsStandard) {
        try {
          const otherStandard = await (ctx.ql as any).find('pricebook', {
            filters: [
              ['IsStandard', '=', true],
              ['Status', '=', 'active'],
              ['Id', '!=', pricebook.Id]
            ]
          });
          
          const otherPricebooks = otherStandard || [];
          if (otherPricebooks.length > 0) {
            logger.info(`Deactivating ${otherPricebooks.length} other standard pricebook(s)`);
            for (const pb of otherPricebooks) {
              await (ctx.ql as any).doc.update('pricebook', pb.Id, {
                Status: 'inactive',
                ExpirationDate: new Date().toISOString().split('T')[0]
              });
            }
          }
        } catch (error) {
          logger.error(`[pricebook.hook] deactivateOtherStandardPricebooks failed:`, error);
        }
      }

      logger.debug(`[pricebook.hook] Activation notification pending: notify sales team about new active pricebook "${pricebook.Name}"`);
    }

    // Handle expiration
    if (pricebook.Status === 'expired') {
      logger.info(`⏰ Pricebook expired: ${pricebook.Name}`);
      
      // Set expiration date if not already set
      if (!pricebook.ExpirationDate) {
        await (ctx.ql as any).doc.update('pricebook', pricebook.Id, {
          ExpirationDate: new Date().toISOString().split('T')[0]
        });
      }

      logger.debug(`[pricebook.hook] Expiration notification pending: notify users about expired pricebook "${pricebook.Name}"`);
    }

    // Log activity for status change
    await (ctx.ql as any).doc.create('activity', {
      Subject: `Pricebook Status Changed: ${prev.Status} → ${pricebook.Status}`,
      Type: 'Status Change',
      Status: 'completed',
      Priority: 'normal',
      WhatId: pricebook.Id,
      OwnerId: ctx.user.id,
      ActivityDate: new Date().toISOString().split('T')[0],
      Description: `Pricebook "${pricebook.Name}" status changed from "${prev.Status}" to "${pricebook.Status}"`
    });
  } catch (error) {
    logger.error(`[pricebook.hook] handleStatusChange failed:`, error);
  }
}

/**
 * Handle currency or exchange rate changes
 */
async function handleCurrencyChange(ctx: HookContext): Promise<void> {
  if (!ctx.previous || !ctx.result) return;
  
  const prev = ctx.previous as Record<string, any>;
  const result = ctx.result as Record<string, any>;
  const currencyChanged = prev.CurrencyCode !== result.CurrencyCode;
  const rateChanged = prev.ExchangeRate !== result.ExchangeRate;
  
  if (!currencyChanged && !rateChanged) return;

  const pricebook = result;
  
  try {
    if (currencyChanged) {
      logger.info(`Currency changed from ${prev.CurrencyCode} to ${pricebook.CurrencyCode}`);
      
      logger.debug(`[pricebook.hook] Currency update pending: update pricebook entries and notify users about currency change from ${prev.CurrencyCode} to ${pricebook.CurrencyCode} for pricebook "${pricebook.Name}"`);
    }

    if (rateChanged) {
      logger.info(`Exchange rate changed from ${prev.ExchangeRate} to ${pricebook.ExchangeRate}`);
      
      // Recalculate all prices based on new exchange rate
      // This would update all PricebookEntry records
      logger.info('Price recalculation would be triggered here');
    }

    // Log activity for currency change
    if (currencyChanged || rateChanged) {
      const changes = [];
      if (currencyChanged) {
        changes.push(`Currency: ${prev.CurrencyCode} → ${pricebook.CurrencyCode}`);
      }
      if (rateChanged) {
        changes.push(`Exchange Rate: ${prev.ExchangeRate} → ${pricebook.ExchangeRate}`);
      }
      
      await (ctx.ql as any).doc.create('activity', {
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
    logger.error(`[pricebook.hook] handleCurrencyChange failed:`, error);
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
    logger.info(`Activating pricebook entries for pricebook: ${pricebookId}`);
    
    logger.debug(`[pricebook.hook] Entry activation pending: activate all PricebookEntry records for pricebook ${pricebookId}`);
  } catch (error) {
    logger.error(`[pricebook.hook] activatePricebookEntries failed:`, error);
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
    logger.info(`⏰ Expiring pricebook entries for pricebook: ${pricebookId}`);
    
    logger.debug(`[pricebook.hook] Entry expiration pending: expire all PricebookEntry records for pricebook ${pricebookId}`);
  } catch (error) {
    logger.error(`[pricebook.hook] expirePricebookEntries failed:`, error);
  }
}

export default PricebookHook;
