import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('products:approval_request');

const DISCOUNT_THRESHOLDS: { max: number; approver: string }[] = [
  { max: 10, approver: 'auto' },
  { max: 20, approver: 'sales_manager' },
  { max: 30, approver: 'sales_director' },
  { max: 50, approver: 'vp_of_sales' },
  { max: Infinity, approver: 'cfo' },
];

const ApprovalRequestCreationTrigger: Hook = {
  name: 'ApprovalRequestCreationTrigger',
  object: 'quote',
  events: ['beforeUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;
    const oldDoc = ctx.previous as Record<string, any> | undefined;

    if (!oldDoc) return;

    try {
      const discountPercent = doc.discount_percent || 0;
      const oldDiscountPercent = oldDoc.discount_percent || 0;

      if (discountPercent <= oldDiscountPercent) return;
      if (discountPercent <= 0) return;

      const threshold = DISCOUNT_THRESHOLDS.find(t => discountPercent <= t.max);
      if (!threshold) return;

      if (threshold.approver === 'auto') {
        logger.info(`Quote discount ${discountPercent}% auto-approved (within 0-10% threshold)`);
        return;
      }

      doc.status = 'pending_approval';

      await (ctx.ql as any).doc.create('approval_request', {
        quote: oldDoc._id,
        requested_by: oldDoc.owner,
        approver_role: threshold.approver,
        discount_percent: discountPercent,
        status: 'pending',
        reason: `Discount of ${discountPercent}% requires ${threshold.approver} approval`,
        created_date: new Date().toISOString()
      });

      logger.info(`Approval request created for quote ${oldDoc._id}: ${discountPercent}% discount requires ${threshold.approver}`);
    } catch (err) {
      logger.error('Approval Request Creation Error:', err);
    }
  }
};

const ApprovalDecisionTrigger: Hook = {
  name: 'ApprovalDecisionTrigger',
  object: 'approval_request',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    const approval = ctx.result as Record<string, any>;
    const oldApproval = ctx.previous as Record<string, any> | undefined;

    if (!oldApproval || approval.status === oldApproval.status) return;
    if (!approval.quote) return;

    try {
      if (approval.status === 'approved') {
        await (ctx.ql as any).doc.update('quote', approval.quote, {
          status: 'draft'
        });
        logger.info(`Quote ${approval.quote} approved — status set to draft (editable)`);
      }

      if (approval.status === 'rejected') {
        await (ctx.ql as any).doc.update('quote', approval.quote, {
          status: 'rejected'
        });
        logger.info(`Quote ${approval.quote} rejected — reason: ${approval.rejection_reason || 'not specified'}`);
      }
    } catch (err) {
      logger.error('Approval Decision Error:', err);
    }
  }
};

export { ApprovalRequestCreationTrigger, ApprovalDecisionTrigger };
export default [ApprovalRequestCreationTrigger, ApprovalDecisionTrigger] as Hook[];
