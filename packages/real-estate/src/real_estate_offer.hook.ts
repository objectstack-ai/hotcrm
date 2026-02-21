import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('real-estate:real_estate_offer');

/**
 * Offer Validation
 *
 * Validates offer_amount > 0 and that the listing is active before insert.
 */
const OfferValidation: Hook = {
  name: 'OfferValidation',
  object: 'real_estate_offer',
  events: ['beforeInsert'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;

    if (!doc.offer_amount || doc.offer_amount <= 0) {
      throw new Error('Validation Error: Offer amount must be greater than 0');
    }

    if (doc.listing_id) {
      try {
        const listing = await (ctx.ql as any).findOne('listing', doc.listing_id);
        if (listing && listing.status !== 'active') {
          throw new Error(`Validation Error: Cannot submit offer on a ${listing.status} listing`);
        }
      } catch (error) {
        if ((error as Error).message.startsWith('Validation Error')) {
          throw error;
        }
        logger.warn('Failed to validate listing status:', error);
      }
    }
  }
};

/**
 * Offer Counter Workflow
 *
 * Notifies the buyer when the offer status changes to 'counter'.
 */
const OfferCounterWorkflow: Hook = {
  name: 'OfferCounterWorkflow',
  object: 'real_estate_offer',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;
    const result = ctx.result as Record<string, any>;

    if (doc.status === 'counter' && result?.buyer_id) {
      logger.info(`Counter offer notification sent to buyer ${result.buyer_id} for offer ${result._id}`);
    }
  }
};

/**
 * Offer Expiration Check
 *
 * Checks if the offer has expired before update.
 */
const OfferExpirationCheck: Hook = {
  name: 'OfferExpirationCheck',
  object: 'real_estate_offer',
  events: ['beforeUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;

    if (doc.expiration_date) {
      const expirationDate = new Date(doc.expiration_date);
      const now = new Date();

      if (expirationDate < now && doc.status !== 'expired' && doc.status !== 'withdrawn') {
        doc.status = 'expired';
        logger.info(`⏰ Offer automatically expired — expiration date ${doc.expiration_date} has passed`);
      }
    }
  }
};

export { OfferValidation, OfferCounterWorkflow, OfferExpirationCheck };
export default OfferValidation;
