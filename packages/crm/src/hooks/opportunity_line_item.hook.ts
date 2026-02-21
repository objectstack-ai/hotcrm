import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('crm:opportunity_line_item');

const OpportunityLineItemCalculationTrigger: Hook = {
  name: 'OpportunityLineItemCalculationTrigger',
  object: 'opportunity_line_item',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;

    try {
      const quantity = doc.quantity || 0;
      const unitPrice = doc.unit_price || 0;
      const discountPercent = doc.discount_percent || 0;

      if (quantity <= 0) {
        throw new Error('Quantity must be greater than 0');
      }

      if (unitPrice < 0) {
        throw new Error('Unit price must be greater than or equal to 0');
      }

      if (discountPercent < 0 || discountPercent > 100) {
        throw new Error('Discount percent must be between 0 and 100');
      }

      const lineTotal = quantity * unitPrice;
      const discountAmount = lineTotal * (discountPercent / 100);
      const totalPrice = lineTotal - discountAmount;

      doc.discount_amount = discountAmount;
      doc.total_price = totalPrice;

      logger.info(`Opportunity line item calculated: ${quantity} × ${unitPrice} = ${lineTotal}, discount=${discountAmount}, total=${totalPrice}`);
    } catch (err) {
      logger.error('Opportunity Line Item Calculation Error:', err);
    }
  }
};

const OpportunityLineItemRollupTrigger: Hook = {
  name: 'OpportunityLineItemRollupTrigger',
  object: 'opportunity_line_item',
  events: ['afterInsert', 'afterUpdate', 'afterDelete'],
  handler: async (ctx: HookContext) => {
    const lineItem = ctx.result as Record<string, any>;

    if (!lineItem.opportunity_id) return;

    try {
      const lineItems = await (ctx.ql as any).find('opportunity_line_item', {
        filters: [['opportunity_id', '=', lineItem.opportunity_id]]
      });

      let totalAmount = 0;

      if (lineItems && lineItems.length > 0) {
        for (const item of lineItems) {
          totalAmount += item.total_price || 0;
        }
      }

      await (ctx.ql as any).doc.update('opportunity', lineItem.opportunity_id, {
        amount: totalAmount
      });

      logger.info(`Opportunity ${lineItem.opportunity_id} amount updated: ${totalAmount}`);
    } catch (err) {
      logger.error('Opportunity Line Item Rollup Error:', err);
    }
  }
};

export { OpportunityLineItemCalculationTrigger, OpportunityLineItemRollupTrigger };
export default [OpportunityLineItemCalculationTrigger, OpportunityLineItemRollupTrigger] as Hook[];
