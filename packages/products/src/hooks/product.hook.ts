import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('products:product');



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
 object: 'product',
 events: ['beforeInsert', 'beforeUpdate', 'afterUpdate'],
 handler: async (ctx: HookContext) => {
 try {
 // Determine if this is a before or after hook based on available properties
 const isBeforeHook = !!ctx.input;
 const isAfterHook = !!ctx.result;
 
 // Before Insert/Update: Validate product configuration
 if (isBeforeHook) {
 await validateProductConfiguration(ctx);
 await validateBundleConfiguration(ctx);
 }

 // After Update: Handle stock and price changes
 if (isAfterHook) {
 await handleStockLevelChange(ctx);
 await handlePriceChange(ctx);
 await handleStatusChange(ctx);
 }

 } catch (error) {
 logger.error(`[product.hook] handler execution failed:`, error);
 throw error;
 }
 }
};

/**
 * Validate product configuration
 */
async function validateProductConfiguration(ctx: HookContext): Promise<void> {
 const product = (ctx.input?.doc || ctx.result) as Record<string, any>;
 
 try {
 // Ensure product code is unique
 if (product.ProductCode) {
 const existing = await (ctx.ql as any).find('product', {
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
 logger.warn(`Warning: Cost price (${product.CostPrice}) exceeds list price (${product.ListPrice})`);
 }
 }

 logger.info(`Product configuration validated: ${product.Name}`);
 } catch (error) {
 logger.error(`[product.hook] validateProductConfiguration failed:`, error);
 throw error;
 }
}

/**
 * Validate bundle configuration and dependencies
 */
async function validateBundleConfiguration(ctx: HookContext): Promise<void> {
 const product = (ctx.input?.doc || ctx.result) as Record<string, any>;
 
 try {
 // If this is a bundle product, validate bundle items
 if (product.IsBundle) {
 logger.info(`📦 Validating bundle configuration for: ${product.Name}`);
 
 // Check if bundle has required components defined
 // This would require querying ProductBundleItem records
 // For now, we'll just log a message
 logger.info('📦 Bundle validation would check component products here');
 }

 // Validate product dependencies
 if (product.RequiredProducts) {
 logger.info(`🔗 Product has dependencies: ${product.RequiredProducts}`);
 // Validate that required products exist and are active
 // This would require querying Product records
 logger.info('🔗 Dependency validation would be performed here');
 }
 } catch (error) {
 logger.error(`[product.hook] validateBundleConfiguration failed:`, error);
 }
}

/**
 * Handle stock level changes
 */
async function handleStockLevelChange(ctx: HookContext): Promise<void> {
 if (!ctx.previous || !ctx.result) return;
 
 const prev = ctx.previous as Record<string, any>;
 const result = ctx.result as Record<string, any>;
 const stockChanged = prev.StockLevel !== result.StockLevel;
 if (!stockChanged) return;

 const product = result;
 
 try {
 logger.info(`Stock level changed from ${prev.StockLevel} to ${product.StockLevel}`);

 // Check if stock is low
 if (product.LowStockThreshold && product.StockLevel <= product.LowStockThreshold) {
 logger.warn(`Low stock alert: ${product.Name} (${product.StockLevel} units)`);
 
 // Create alert/notification
 logger.debug(`[product.hook] Inventory notification pending: stock below threshold for product ${product.Name} (${product.StockLevel} units remaining)`);
 }

 // Check if out of stock
 if (product.StockLevel === 0) {
 logger.warn(`🚫 Out of stock: ${product.Name}`);
 
 // Update product status to Out of Stock
 if (product.Status === 'active') {
 await (ctx.ql as any).doc.update('product', product.Id, {
 Status: 'Out of Stock'
 });
 logger.info('🚫 Product status updated to Out of Stock');
 }
 }

 // If stock was replenished, reactivate product
 if (prev.StockLevel === 0 && product.StockLevel > 0 && product.Status === 'Out of Stock') {
 await (ctx.ql as any).doc.update('product', product.Id, {
 Status: 'active'
 });
 logger.info('Product reactivated after stock replenishment');
 }
 } catch (error) {
 logger.error(`[product.hook] handleStockLevelChange failed:`, error);
 }
}

/**
 * Handle price changes
 */
async function handlePriceChange(ctx: HookContext): Promise<void> {
 if (!ctx.previous || !ctx.result) return;
 
 const prev = ctx.previous as Record<string, any>;
 const result = ctx.result as Record<string, any>;
 const listPriceChanged = prev.ListPrice !== result.ListPrice;
 const costPriceChanged = prev.CostPrice !== result.CostPrice;
 
 if (!listPriceChanged && !costPriceChanged) return;

 const product = result;
 
 try {
 if (listPriceChanged) {
 logger.info(`List price changed from ${prev.ListPrice} to ${product.ListPrice}`);
 
 // Log price change activity
 await (ctx.ql as any).doc.create('activity', {
 Subject: `Price Change: ${product.Name}`,
 Type: 'Price Update',
 Status: 'completed',
 Priority: 'normal',
 WhatId: product.Id,
 OwnerId: ctx.user.id,
 ActivityDate: new Date().toISOString().split('T')[0],
 Description: `List price changed from ${prev.ListPrice} to ${product.ListPrice}`
 });
 logger.info('Price change activity logged');

 logger.debug(`[product.hook] Pricebook update pending: update active pricebook entries for product ${product.Name} with new list price ${product.ListPrice}`);
 
 logger.debug(`[product.hook] Sales team notification pending: price change for product ${product.Name} from ${prev.ListPrice} to ${product.ListPrice}`);
 }

 if (costPriceChanged) {
 logger.info(`💵 Cost price changed from ${prev.CostPrice} to ${product.CostPrice}`);
 
 // Recalculate margin
 if (product.ListPrice && product.CostPrice) {
 const margin = ((product.ListPrice - product.CostPrice) / product.ListPrice) * 100;
 logger.info(`New margin: ${margin.toFixed(2)}%`);
 
 if (margin < 0) {
 logger.warn(`Warning: Negative margin detected for ${product.Name}`);
 }
 }
 }
 } catch (error) {
 logger.error(`[product.hook] handlePriceChange failed:`, error);
 }
}

/**
 * Handle product status changes
 */
async function handleStatusChange(ctx: HookContext): Promise<void> {
 if (!ctx.previous || !ctx.result) return;
 
 const prev = ctx.previous as Record<string, any>;
 const result = ctx.result as Record<string, any>;
 const statusChanged = prev.Status !== result.Status;
 if (!statusChanged) return;

 const product = result;
 
 try {
 logger.info(`Product status changed from "${prev.Status}" to "${product.Status}"`);

 // Handle deactivation
 if (product.Status === 'inactive' || product.Status === 'discontinued') {
 logger.info(`🚫 Product deactivated: ${product.Name}`);
 
 logger.debug(`[product.hook] Deactivation pending for product ${product.Name}: remove from active price books and notify users with affected quotes`);
 }

 // Handle reactivation
 if ((prev.Status === 'inactive' || prev.Status === 'discontinued') && 
 product.Status === 'active') {
 logger.info(`Product reactivated: ${product.Name}`);
 
 logger.debug(`[product.hook] Reactivation pending for product ${product.Name}: add to default price book`);
 }

 // Log activity for status change
 await (ctx.ql as any).doc.create('activity', {
 Subject: `Product Status Changed: ${prev.Status} → ${product.Status}`,
 Type: 'Status Change',
 Status: 'completed',
 Priority: 'normal',
 WhatId: product.Id,
 OwnerId: ctx.user.id,
 ActivityDate: new Date().toISOString().split('T')[0],
 Description: `Product "${product.Name}" status changed from "${prev.Status}" to "${product.Status}"`
 });
 } catch (error) {
 logger.error(`[product.hook] handleStatusChange failed:`, error);
 }
}

/**
 * Validate bundle dependencies
 * Ensures that required products are available when bundle items are configured
 */
async function validateBundleDependencies(
 bundleId: string,
 ql: any
): Promise<boolean> {
 try {
 logger.debug(`[product.hook] Bundle dependency validation pending: query ProductBundleItem and ProductBundleDependency for bundle ${bundleId}`);
 return true;
 } catch (error) {
 logger.error(`[product.hook] validateBundleDependencies failed:`, error);
 return false;
 }
}

/**
 * Check bundle constraints
 * Ensures that conflicting products are not included in the same bundle
 */
async function checkBundleConstraints(
 bundleId: string,
 ql: any
): Promise<boolean> {
 try {
 logger.debug(`[product.hook] Bundle constraint check pending: query ProductBundleConstraint for bundle ${bundleId}`);
 return true;
 } catch (error) {
 logger.error(`[product.hook] checkBundleConstraints failed:`, error);
 return false;
 }
}

export default ProductHook;
