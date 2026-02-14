/**
 * @hotcrm/real-estate - Real Estate Plugin Definition
 *
 * This plugin provides real estate management functionality including:
 * - Property Management
 * - Listing Management
 * - Showing Scheduling
 * - Offer Processing
 * - Commission Tracking
 * - Open House Events
 * - Neighborhood Data
 * - AI-Powered Valuation & Analytics
 *
 * Dependencies: @hotcrm/core, @hotcrm/crm
 */

import { PluginSchema } from '@objectstack/spec/kernel';
import type { PluginDefinition } from '@objectstack/spec/kernel';

// Import all Real Estate objects
import { Property } from './property.object.js';
import { Listing } from './listing.object.js';
import { Showing } from './showing.object.js';
import { RealEstateOffer } from './real_estate_offer.object.js';
import { Commission } from './commission.object.js';
import { OpenHouse } from './open_house.object.js';
import { Neighborhood } from './neighborhood.object.js';

// Import hooks
import { ListingDaysOnMarket, ListingPriceChangeAlert, ListingMlsSync, ListingAutoComparable } from './listing.hook.js';
import { ShowingConflictDetection, ShowingFeedbackRequest, ShowingLeadScoring } from './showing.hook.js';
import { OfferValidation, OfferCounterWorkflow, OfferExpirationCheck } from './real_estate_offer.hook.js';
import { CommissionSplitCalculation, CommissionCapTracking, CommissionPaymentScheduling } from './commission.hook.js';

// Import actions
import RealEstateAIAction from './real_estate_ai.action.js';

/**
 * Real Estate Plugin Definition
 *
 * Exports all real-estate-related business objects, hooks, and actions
 * to be registered with the ObjectStack runtime
 */
export const RealEstatePlugin = {
  name: 'real_estate',
  label: 'Real Estate Cloud',
  version: '1.0.0',
  description: 'Real Estate management - Properties, Listings, Showings, Offers, and Commission Tracking',

  // Plugin dependencies
  dependencies: ['core', 'crm'],

  // Plugin initialization
  init: async () => {
    // No initialization required for this plugin
  },

  // Business objects provided by this plugin
  objects: {
    property: Property,
    listing: Listing,
    showing: Showing,
    real_estate_offer: RealEstateOffer,
    commission: Commission,
    open_house: OpenHouse,
    neighborhood: Neighborhood,
  },

  // Actions provided by this plugin
  actions: {
    real_estate_ai: RealEstateAIAction,
  },

  // Triggers/Hooks
  triggers: {
    listing_days_on_market: ListingDaysOnMarket,
    listing_price_change_alert: ListingPriceChangeAlert,
    listing_mls_sync: ListingMlsSync,
    listing_auto_comparable: ListingAutoComparable,
    showing_conflict_detection: ShowingConflictDetection,
    showing_feedback_request: ShowingFeedbackRequest,
    showing_lead_scoring: ShowingLeadScoring,
    offer_validation: OfferValidation,
    offer_counter_workflow: OfferCounterWorkflow,
    offer_expiration_check: OfferExpirationCheck,
    commission_split_calculation: CommissionSplitCalculation,
    commission_cap_tracking: CommissionCapTracking,
    commission_payment_scheduling: CommissionPaymentScheduling,
  },

  // Apps provided by this plugin
  apps: [
    {
      name: 'real_estate',
      label: 'Real Estate Cloud',
      navigation: [
        {
          id: 'properties',
          type: 'group',
          label: 'Properties',
          children: [
            { id: 'property', label: 'Property', type: 'object', objectName: 'property' },
            { id: 'neighborhood', label: 'Neighborhood', type: 'object', objectName: 'neighborhood' },
          ]
        },
        {
          id: 'listings',
          type: 'group',
          label: 'Listings',
          children: [
            { id: 'listing', label: 'Listing', type: 'object', objectName: 'listing' },
            { id: 'open_house', label: 'Open House', type: 'object', objectName: 'open_house' },
          ]
        },
        {
          id: 'transactions',
          type: 'group',
          label: 'Transactions',
          children: [
            { id: 'showing', label: 'Showing', type: 'object', objectName: 'showing' },
            { id: 'real_estate_offer', label: 'Offer', type: 'object', objectName: 'real_estate_offer' },
            { id: 'commission', label: 'Commission', type: 'object', objectName: 'commission' },
          ]
        }
      ]
    }
  ]
};

/** Spec-validated plugin metadata */
export const RealEstatePluginMetadata: PluginDefinition = PluginSchema.parse({
  name: 'real_estate',
  label: 'Real Estate Cloud',
  version: '1.0.0',
  description: 'Real Estate management - Properties, Listings, Showings, Offers, and Commission Tracking',
});

export default RealEstatePlugin;
