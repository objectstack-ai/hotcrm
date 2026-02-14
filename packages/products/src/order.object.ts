import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Order = ObjectSchema.create({
  name: 'order',
  label: 'Order',
  pluralLabel: 'Orders',
  icon: 'shopping-cart',
  description: 'Sales orders for fulfillment tracking and revenue recognition',

  fields: {
    order_number: Field.autonumber({
      label: 'Order Number',
      description: 'Auto-generated order number'
    }),
    account_id: Field.lookup('account', {
      label: 'Account',
      required: true,
      description: 'Customer account placing the order'
    }),
    opportunity_id: Field.lookup('opportunity', {
      label: 'Opportunity',
      description: 'Associated opportunity'
    }),
    quote_id: Field.lookup('quote', {
      label: 'Quote',
      description: 'Quote this order was created from'
    }),
    contract_id: Field.lookup('contract', {
      label: 'Contract',
      description: 'Related contract'
    }),
    status: Field.select({
      label: 'Status',
      required: true,
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Activated', value: 'activated' },
        { label: 'Fulfilled', value: 'fulfilled' },
        { label: 'Partially Fulfilled', value: 'partially_fulfilled' },
        { label: 'Shipped', value: 'shipped' },
        { label: 'Completed', value: 'completed' },
        { label: 'Cancelled', value: 'cancelled' }
      ],
      defaultValue: 'draft'
    }),
    order_date: Field.date({
      label: 'Order Date',
      required: true,
      description: 'Date order was placed'
    }),
    effective_date: Field.date({
      label: 'Effective Date',
      description: 'Date order becomes effective'
    }),
    total_amount: Field.currency({
      label: 'Total Amount',
      readonly: true,
      description: 'Sum of all order items'
    }),
    subtotal: Field.currency({
      label: 'Subtotal',
      readonly: true,
      description: 'Subtotal before tax and shipping'
    }),
    tax_amount: Field.currency({
      label: 'Tax Amount',
      readonly: true,
      description: 'Total tax on the order'
    }),
    shipping_amount: Field.currency({
      label: 'Shipping Amount',
      description: 'Shipping and handling cost'
    }),
    discount_amount: Field.currency({
      label: 'Discount Amount',
      readonly: true,
      description: 'Total discount applied'
    }),
    billing_address: Field.address({
      label: 'Billing Address',
      description: 'Billing address for this order'
    }),
    shipping_address: Field.address({
      label: 'Shipping Address',
      description: 'Shipping address for this order'
    }),
    payment_terms: Field.select({
      label: 'Payment Terms',
      options: [
        { label: 'Due on Receipt', value: 'due_on_receipt' },
        { label: 'Net 15', value: 'net_15' },
        { label: 'Net 30', value: 'net_30' },
        { label: 'Net 60', value: 'net_60' }
      ],
      defaultValue: 'net_30'
    }),
    shipping_method: Field.select({
      label: 'Shipping Method',
      options: [
        { label: 'Standard', value: 'standard' },
        { label: 'Express', value: 'express' },
        { label: 'Overnight', value: 'overnight' },
        { label: 'Digital Delivery', value: 'digital' }
      ]
    }),
    fulfillment_status: Field.select({
      label: 'Fulfillment Status',
      options: [
        { label: 'Not Started', value: 'not_started' },
        { label: 'In Progress', value: 'in_progress' },
        { label: 'Partially Shipped', value: 'partially_shipped' },
        { label: 'Shipped', value: 'shipped' },
        { label: 'Delivered', value: 'delivered' }
      ],
      defaultValue: 'not_started'
    }),
    owner_id: Field.lookup('users', {
      label: 'Owner',
      required: true
    }),
    notes: Field.textarea({
      label: 'Order Notes',
      maxLength: 4000
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    feeds: true,
    files: true
  },
});
