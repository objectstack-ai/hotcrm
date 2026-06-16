import { P, cel } from '@objectstack/spec';
// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';

/**
 * Quote Object
 * Represents price quotes sent to customers
 */
export const Quote = ObjectSchema.create({
  name: 'crm_quote',
  label: 'Quote',
  pluralLabel: 'Quotes',
  icon: 'file-text',
  description: 'Price quotes for customers',
  titleFormat: '{quote_number} - {name}',
  compactLayout: ['quote_number', 'name', 'crm_account', 'status', 'total_price'],

  fieldGroups: [
    { key: 'basic',     label: 'Quote Information', icon: 'info' },
    { key: 'pricing',   label: 'Pricing',           icon: 'dollar-sign' },
    { key: 'terms',     label: 'Terms & Validity',  icon: 'calendar' },
    { key: 'address',   label: 'Addresses',         icon: 'map-pin', defaultExpanded: false },
    { key: 'system',    label: 'System',            icon: 'database', defaultExpanded: false },
  ],

  fields: {
    // AutoNumber field
    quote_number: Field.autonumber({
      label: 'Quote Number',
      format: 'QTE-{0000}',
    }),
    
    // Basic Information
    name: Field.text({ 
      label: 'Quote Name', 
      required: true, 
      searchable: true,
      maxLength: 255,
    }),
    
    // Relationships
    crm_account: Field.lookup('crm_account', {
      label: 'Account',
      required: true,
    }),
    
    crm_contact: Field.lookup('crm_contact', {
      label: 'Contact',
      required: true,
      referenceFilters: [
        'crm_account = {crm_account}',
      ]
    }),
    
    crm_opportunity: Field.lookup('crm_opportunity', {
      label: 'Opportunity',
      referenceFilters: [
        'crm_account = {crm_account}',
      ]
    }),
    
    owner: Field.lookup('user', {
      label: 'Quote Owner',
    }),
    
    // Status
    status: Field.select({
      label: 'Status',
      options: [
        { label: 'Draft', value: 'draft', color: '#999999', default: true },
        { label: 'In Review', value: 'in_review', color: '#FFA500' },
        { label: 'Presented', value: 'presented', color: '#4169E1' },
        { label: 'Accepted', value: 'accepted', color: '#00AA00' },
        { label: 'Rejected', value: 'rejected', color: '#FF0000' },
        { label: 'Expired', value: 'expired', color: '#666666' },
      ],
      required: true,
    }),
    
    // Dates
    quote_date: Field.date({
      label: 'Quote Date',
      required: true,
      defaultValue: cel`today()`,
    }),
    
    expiration_date: Field.date({
      label: 'Expiration Date',
      required: true,
    }),
    
    // Pricing
    subtotal: Field.currency({ 
      label: 'Subtotal',
      scale: 2,
      readonly: true,
    }),
    
    discount: Field.percent({
      label: 'Discount %',
      scale: 2,
      min: 0,
      max: 100,
    }),
    
    discount_amount: Field.currency({ 
      label: 'Discount Amount',
      scale: 2,
      readonly: true,
    }),
    
    tax: Field.currency({ 
      label: 'Tax',
      scale: 2,
    }),
    
    shipping_handling: Field.currency({ 
      label: 'Shipping & Handling',
      scale: 2,
    }),
    
    total_price: Field.currency({ 
      label: 'Total Price',
      scale: 2,
      readonly: true,
    }),
    
    // Terms
    payment_terms: Field.select({
      label: 'Payment Terms',
      options: [
        { label: 'Net 15', value: 'net_15' },
        { label: 'Net 30', value: 'net_30', default: true },
        { label: 'Net 60', value: 'net_60' },
        { label: 'Net 90', value: 'net_90' },
        { label: 'Due on Receipt', value: 'due_on_receipt' },
      ]
    }),
    
    shipping_terms: Field.text({
      label: 'Shipping Terms',
      maxLength: 255,
    }),
    
    // Billing & Shipping Address
    billing_address: Field.address({
      label: 'Billing Address',
    }),

    shipping_address: Field.address({
      label: 'Shipping Address',
    }),
    
    // Notes
    description: Field.markdown({
      label: 'Description',
    }),
    
    internal_notes: Field.textarea({
      label: 'Internal Notes',
    }),
  },
  
  // Database indexes
  indexes: [
    { fields: ['crm_account'] },
    { fields: ['crm_opportunity'] },
    { fields: ['owner'] },
    { fields: ['status'] },
    { fields: ['quote_date'] },
  ],
  
  // Enable advanced features
  enable: {
    trackHistory: true,
    searchable: true,
    apiEnabled: true,
    apiMethods: ['get', 'list', 'create', 'update', 'delete', 'search', 'export'],
    files: true,
    feeds: true,
    activities: true,
    trash: true,
    mru: true,
  },
  
  // Validation Rules
  validations: [
    {
      name: 'expiration_after_quote',
      type: 'script',
      severity: 'error',
      message: 'Expiration Date must be after Quote Date',
      condition: P`record.expiration_date <= record.quote_date`,
    },
    {
      name: 'valid_discount',
      type: 'script',
      severity: 'error',
      message: 'Discount cannot exceed 100%',
      condition: P`record.discount > 100`,
    },
  ],
  
  // Workflow Rules
  // NOTE: object `workflows[]` were removed in @objectstack 7.7. Field-updates
  // moved to this object's *.hook.ts; scheduled status-flips & notifications
  // moved to src/flows/*.flow.ts (see flows/index.ts).
});
