// State machine configuration for listing lifecycle
import { StateMachineSchema, type StateMachineConfig } from '@objectstack/spec/automation';

/**
 * Listing Lifecycle State Machine
 * Manages the complete lifecycle of a listing from draft to sold or expired.
 */
export const ListingLifecycleStateMachine = {
  name: 'listing_lifecycle',
  label: 'Listing Lifecycle State Machine',
  object: 'listing',
  description: 'Manages listing states from draft through active marketing to closing or expiration',

  initial: 'draft',

  states: [
    {
      name: 'draft',
      label: 'Draft',
      description: 'Listing is being prepared and has not yet been published',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'draft' },
      ],
      transitions: [
        {
          to: 'active',
          event: 'publish',
          guard: 'list_price > 0 AND listing_agent != NULL',
          description: 'Publish the listing to MLS and marketing channels',
          actions: [
            { type: 'fieldUpdate', field: 'list_date', value: 'NOW()' },
            {
              type: 'emailAlert',
              template: 'listing_published',
              recipients: ['${listing_agent.email}'],
            },
          ],
        },
      ],
    },
    {
      name: 'active',
      label: 'Active',
      description: 'Listing is live on MLS and actively being marketed',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'active' },
        {
          type: 'taskCreation',
          subject: 'Schedule open house for: ${property_id.name}',
          assignee: '${listing_agent.id}',
          dueDate: 'TODAY() + 7',
          priority: 'medium',
        },
      ],
      transitions: [
        {
          to: 'pending',
          event: 'accept_offer',
          guard: 'offer_count > 0',
          description: 'An offer has been accepted, listing moves to pending',
          actions: [
            {
              type: 'emailAlert',
              template: 'offer_accepted_notification',
              recipients: ['${listing_agent.email}'],
            },
          ],
        },
        {
          to: 'withdrawn',
          event: 'withdraw',
          description: 'Seller decides to withdraw the listing',
          actions: [
            { type: 'fieldUpdate', field: 'status', value: 'withdrawn' },
          ],
        },
        {
          to: 'expired',
          event: 'expire',
          guard: 'days_on_market >= listing_agreement_days',
          description: 'Listing agreement has expired',
        },
      ],
    },
    {
      name: 'pending',
      label: 'Pending',
      description: 'An offer has been accepted and the transaction is in escrow',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'pending' },
        {
          type: 'taskCreation',
          subject: 'Coordinate inspections for: ${property_id.name}',
          assignee: '${listing_agent.id}',
          dueDate: 'TODAY() + 10',
          priority: 'high',
        },
      ],
      transitions: [
        {
          to: 'sold',
          event: 'close',
          description: 'Transaction has closed successfully',
          actions: [
            { type: 'fieldUpdate', field: 'sold_date', value: 'NOW()' },
            {
              type: 'emailAlert',
              template: 'transaction_closed',
              recipients: ['${listing_agent.email}'],
            },
          ],
        },
        {
          to: 'active',
          event: 'fall_through',
          description: 'Deal fell through, re-activate listing',
          actions: [
            { type: 'fieldUpdate', field: 'status', value: 'active' },
          ],
        },
      ],
    },
    {
      name: 'sold',
      label: 'Sold',
      description: 'Transaction has closed and the property has been sold',
      type: 'final',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'sold' },
      ],
    },
    {
      name: 'expired',
      label: 'Expired',
      description: 'Listing agreement has expired without a sale',
      type: 'final',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'expired' },
      ],
      transitions: [
        {
          to: 'draft',
          event: 'relist',
          description: 'Relist the property with a new listing agreement',
        },
      ],
    },
    {
      name: 'withdrawn',
      label: 'Withdrawn',
      description: 'Listing has been withdrawn from the market by the seller',
      type: 'final',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'withdrawn' },
      ],
      transitions: [
        {
          to: 'draft',
          event: 'relist',
          description: 'Re-prepare the listing for market',
        },
      ],
    },
  ],

  globalGuards: {
    hasAgent: 'listing_agent != NULL',
    hasProperty: 'property_id != NULL',
  },

  events: {
    publish: 'Publish listing to MLS',
    accept_offer: 'Accept an offer on the listing',
    close: 'Close the transaction',
    withdraw: 'Withdraw the listing from market',
    expire: 'Listing agreement expired',
    fall_through: 'Deal fell through, re-activate',
    relist: 'Relist the property',
  },
};

// Spec-validated state machine definition
export const ValidatedListingLifecycleStateMachine = StateMachineSchema.parse({
  id: 'listing_lifecycle',
  initial: 'draft',
  states: {
    draft: { type: 'atomic' },
    active: { type: 'atomic' },
    pending: { type: 'atomic' },
    sold: { type: 'final' },
    expired: { type: 'final' },
    withdrawn: { type: 'final' },
  },
} satisfies StateMachineConfig);

export default ListingLifecycleStateMachine;
