import type { Hook } from '@objectstack/spec/data';
import { db } from '@hotcrm/core';

// Types for Context
export interface TriggerContext {
  old?: Record<string, any>;
  new: Record<string, any>;
  db: typeof db;
  user: { id: string; name: string; email: string; };
  event?: string; // Event type: beforeInsert, beforeUpdate, afterUpdate
}

/**
 * Product Hook
 * 
 * Handles automation for products:
 * - Bundle validation (dependencies, constraints)
 * - Stock updates and inventory management
 * - Price change tracking
 * - Product activation/deactivation
 */
const ProductHook: Hook = {
  name: 'ProductHook',
  object: 'Product',
  events: ['beforeInsert', 'beforeUpdate', 'afterUpdate'],
  handler: async (ctx: TriggerContext) => {
    try {
      // Before Insert/Update: Validate product configuration
      if (ctx.event === 'beforeInsert' || ctx.event === 'beforeUpdate') {
        await validateProductConfiguration(ctx);
        await validateBundleConfiguration(ctx);
      }

      // After Update: Handle stock and price changes
      if (ctx.event === 'afterUpdate') {
        await handleStockLevelChange(ctx);
        await handlePriceChange(ctx);
        await handleStatusChange(ctx);
      }

    } catch (error) {
      console.error('❌ Error in ProductHook:', error);
      throw error;
    }
  }
};

/**
 * Validate product configuration
 */
async function validateProductConfiguration(ctx: TriggerContext): Promise<void> {
  const product = ctx.new;
  
  try {
    // Ensure product code is unique
    if (product.ProductCode) {
      const existing = await ctx.db.find('Product', {
        filters: [
          ['ProductCode', '=', product.ProductCode],
          ['Id', '!=', product.Id || '']
        ]
      });
      
      if (existing && existing.length > 0) {
        throw new Error(`Product code ${product.ProductCode} already exists`);
      }
    }

    // Validate pricing
    if (product.ListPrice && product.CostPrice) {
      if (product.CostPrice > product.ListPrice) {
        console.warn(`⚠️ Warning: Cost price (${product.CostPrice}) exceeds list price (${product.ListPrice})`);
      }
    }

    console.log(`✅ Product configuration validated: ${product.Name}`);
  } catch (error) {
    console.error('❌ Error validating product configuration:', error);
    throw error;
  }
}

/**
 * Validate bundle configuration and dependencies
 */
async function validateBundleConfiguration(ctx: TriggerContext): Promise<void> {
  const product = ctx.new;
  
  try {
    // If this is a bundle product, validate bundle items
    if (product.IsBundle) {
      console.log(`📦 Validating bundle configuration for: ${product.Name}`);
      
      // Check if bundle has required components defined
      // This would require querying ProductBundleItem records
      // For now, we'll just log a message
      console.log('📦 Bundle validation would check component products here');
    }

    // Validate product dependencies
    if (product.RequiredProducts) {
      console.log(`🔗 Product has dependencies: ${product.RequiredProducts}`);
      // Validate that required products exist and are active
      // This would require querying Product records
      console.log('🔗 Dependency validation would be performed here');
    }
  } catch (error) {
    console.error('❌ Error validating bundle configuration:', error);
  }
}

/**
 * Handle stock level changes
 */
async function handleStockLevelChange(ctx: TriggerContext): Promise<void> {
  if (!ctx.old || !ctx.new) return;
  
  const stockChanged = ctx.old.StockLevel !== ctx.new.StockLevel;
  if (!stockChanged) return;

  const product = ctx.new;
  
  try {
    console.log(`📊 Stock level changed from ${ctx.old.StockLevel} to ${product.StockLevel}`);

    // Check if stock is low
    if (product.LowStockThreshold && product.StockLevel <= product.LowStockThreshold) {
      console.warn(`⚠️ Low stock alert: ${product.Name} (${product.StockLevel} units)`);
      
      // Create alert/notification
      // TODO: Send notification to inventory manager
      console.log('📧 Low stock notification would be sent here');
    }

    // Check if out of stock
    if (product.StockLevel === 0) {
      console.warn(`🚫 Out of stock: ${product.Name}`);
      
      // Update product status to Out of Stock
      if (product.Status === 'Active') {
        await ctx.db.doc.update('Product', product.Id, {
          Status: 'Out of Stock'
        });
        console.log('🚫 Product status updated to Out of Stock');
      }
    }

    // If stock was replenished, reactivate product
    if (ctx.old.StockLevel === 0 && product.StockLevel > 0 && product.Status === 'Out of Stock') {
      await ctx.db.doc.update('Product', product.Id, {
        Status: 'Active'
      });
      console.log('✅ Product reactivated after stock replenishment');
    }
  } catch (error) {
    console.error('❌ Error handling stock level change:', error);
  }
}

/**
 * Handle price changes
 */
async function handlePriceChange(ctx: TriggerContext): Promise<void> {
  if (!ctx.old || !ctx.new) return;
  
  const listPriceChanged = ctx.old.ListPrice !== ctx.new.ListPrice;
  const costPriceChanged = ctx.old.CostPrice !== ctx.new.CostPrice;
  
  if (!listPriceChanged && !costPriceChanged) return;

  const product = ctx.new;
  
  try {
    if (listPriceChanged) {
      console.log(`💰 List price changed from ${ctx.old.ListPrice} to ${product.ListPrice}`);
      
      // Log price change activity
      await ctx.db.doc.create('Activity', {
        Subject: `Price Change: ${product.Name}`,
        Type: 'Price Update',
        Status: 'Completed',
        Priority: 'Normal',
        WhatId: product.Id,
        OwnerId: ctx.user.id,
        ActivityDate: new Date().toISOString().split('T')[0],
        Description: `List price changed from ${ctx.old.ListPrice} to ${product.ListPrice}`
      });
      console.log('✅ Price change activity logged');

      // TODO: Update all active pricebook entries
      console.log('💰 Pricebook entries would be updated here');
      
      // TODO: Notify sales team about price change
      console.log('📧 Price change notification would be sent here');
    }

    if (costPriceChanged) {
      console.log(`💵 Cost price changed from ${ctx.old.CostPrice} to ${product.CostPrice}`);
      
      // Recalculate margin
      if (product.ListPrice && product.CostPrice) {
        const margin = ((product.ListPrice - product.CostPrice) / product.ListPrice) * 100;
        console.log(`📊 New margin: ${margin.toFixed(2)}%`);
        
        if (margin < 0) {
          console.warn(`⚠️ Warning: Negative margin detected for ${product.Name}`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error handling price change:', error);
  }
}

/**
 * Handle product status changes
 */
async function handleStatusChange(ctx: TriggerContext): Promise<void> {
  if (!ctx.old || !ctx.new) return;
  
  const statusChanged = ctx.old.Status !== ctx.new.Status;
  if (!statusChanged) return;

  const product = ctx.new;
  
  try {
    console.log(`🔄 Product status changed from "${ctx.old.Status}" to "${product.Status}"`);

    // Handle deactivation
    if (product.Status === 'Inactive' || product.Status === 'Discontinued') {
      console.log(`🚫 Product deactivated: ${product.Name}`);
      
      // TODO: Remove from active price books
      console.log('💰 Would remove from active price books');
      
      // TODO: Notify users with open quotes containing this product
      console.log('📧 Would notify users with affected quotes');
    }

    // Handle reactivation
    if ((ctx.old.Status === 'Inactive' || ctx.old.Status === 'Discontinued') && 
        product.Status === 'Active') {
      console.log(`✅ Product reactivated: ${product.Name}`);
      
      // TODO: Add to default price book
      console.log('💰 Would add to default price book');
    }

    // Log activity for status change
    await ctx.db.doc.create('Activity', {
      Subject: `Product Status Changed: ${ctx.old.Status} → ${product.Status}`,
      Type: 'Status Change',
      Status: 'Completed',
      Priority: 'Normal',
      WhatId: product.Id,
      OwnerId: ctx.user.id,
      ActivityDate: new Date().toISOString().split('T')[0],
      Description: `Product "${product.Name}" status changed from "${ctx.old.Status}" to "${product.Status}"`
    });
  } catch (error) {
    console.error('❌ Error handling status change:', error);
  }
}

/**
 * Validate bundle dependencies
 * Ensures that required products are available when bundle items are configured
 */
async function validateBundleDependencies(
  bundleId: string,
  db: typeof import('@hotcrm/core').db
): Promise<boolean> {
  try {
    // TODO: Query ProductBundleItem and ProductBundleDependency
    // Validate that all dependencies are satisfied
    console.log(`🔗 Validating bundle dependencies for ${bundleId}`);
    return true;
  } catch (error) {
    console.error('❌ Error validating bundle dependencies:', error);
    return false;
  }
}

/**
 * Check bundle constraints
 * Ensures that conflicting products are not included in the same bundle
 */
async function checkBundleConstraints(
  bundleId: string,
  db: typeof import('@hotcrm/core').db
): Promise<boolean> {
  try {
    // TODO: Query ProductBundleConstraint
    // Validate that no constraints are violated
    console.log(`⚠️ Checking bundle constraints for ${bundleId}`);
    return true;
  } catch (error) {
    console.error('❌ Error checking bundle constraints:', error);
    return false;
  }
}

export default ProductHook;
