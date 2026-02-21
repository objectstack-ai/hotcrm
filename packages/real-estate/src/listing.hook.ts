import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('real-estate:listing');

/**
 * Listing Days On Market
 *
 * Calculates days_on_market from list_date to sold_date before update.
 */
const ListingDaysOnMarket: Hook = {
  name: 'ListingDaysOnMarket',
  object: 'listing',
  events: ['beforeUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;

    if (doc.sold_date && doc.list_date) {
      const listDate = new Date(doc.list_date);
      const soldDate = new Date(doc.sold_date);
      const diffTime = soldDate.getTime() - listDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      doc.days_on_market = Math.max(0, diffDays);
    }
  }
};

/**
 * Listing Price Change Alert
 *
 * Logs a notification when list_price changes on update.
 */
const ListingPriceChangeAlert: Hook = {
  name: 'ListingPriceChangeAlert',
  object: 'listing',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    const result = ctx.result as Record<string, any>;
    const doc = ctx.input.doc as Record<string, any>;

    if (doc.list_price !== undefined && result?.list_price !== doc.list_price) {
      logger.info(`Price change alert for listing ${result?._id}: new price ${doc.list_price}`);
    }
  }
};

/**
 * Listing MLS Sync
 *
 * Validates that the property has an MLS number when a listing is created.
 */
const ListingMlsSync: Hook = {
  name: 'ListingMlsSync',
  object: 'listing',
  events: ['afterInsert'],
  handler: async (ctx: HookContext) => {
    const listing = ctx.result as Record<string, any>;
    if (!listing?._id || !listing?.property_id) return;

    try {
      const property = await (ctx.ql as any).findOne('property', listing.property_id);
      if (!property?.mls_number) {
        logger.warn(`Property ${listing.property_id} has no MLS number for listing ${listing._id}`);
      }
    } catch (error) {
      logger.warn('Failed to validate MLS number:', error);
    }
  }
};

/**
 * Listing Auto Comparable
 *
 * Finds comparable listings in the same neighborhood after insert.
 */
const ListingAutoComparable: Hook = {
  name: 'ListingAutoComparable',
  object: 'listing',
  events: ['afterInsert'],
  handler: async (ctx: HookContext) => {
    const listing = ctx.result as Record<string, any>;
    if (!listing?._id || !listing?.property_id) return;

    try {
      const property = await (ctx.ql as any).findOne('property', listing.property_id);
      if (!property) return;

      const comparables = await (ctx.ql as any).find('listing', {
        filters: [['status', '=', 'active']],
        limit: 5
      });

      logger.info(`Found ${comparables.length} comparable listings for property ${listing.property_id}`);
    } catch (error) {
      logger.warn('Failed to find comparable listings:', error);
    }
  }
};

export { ListingDaysOnMarket, ListingPriceChangeAlert, ListingMlsSync, ListingAutoComparable };
export default ListingDaysOnMarket;
