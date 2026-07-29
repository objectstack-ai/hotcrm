import { F, P } from '@objectstack/spec';
// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';

/**
 * Product Object
 * Represents products/services offered by the company
 */
export const Product = ObjectSchema.create({
  name: 'crm_product',
  label: 'Product',
  pluralLabel: 'Products',
  icon: 'box',
  description: 'Products and services offered by the company',

  // ADR-0090 D1/D7: OWD is an authored decision. Product catalog is org-visible; only owners edit.
  sharingModel: 'public_read',
  // ADR-0079: render-only `titleFormat` retired in favor of `nameField`,
  // which names a real field. The former template composed two local fields, so
  // a `display_title` formula field reproduces it for the record title.
  nameField: 'display_title',
  // Explicit search targets (ADR-0061). REQUIRED because nameField is a
  // FORMULA (display_title/full_name): without this, $search auto-defaults to
  // the formula field, which isn't a real column, so the lookup picker + global
  // search silently return zero. These are real, indexed columns.
  searchableFields: ['name', 'product_code', 'sku'],
  highlightFields: ['product_code', 'name', 'category', 'is_active'],

  fieldGroups: [
    { key: 'basic',    label: 'Product Information', icon: 'info' },
    { key: 'pricing',  label: 'Pricing & Billing',   icon: 'dollar-sign' },
    { key: 'metadata', label: 'Resources',           icon: 'link', defaultExpanded: false },
  ],

  fields: {
    // AutoNumber field - Unique product identifier
    product_code: Field.autonumber({
      label: 'Product Code',
      group: 'basic',
      format: 'PRD-{0000}',
    }),
    
    // Basic Information
    name: Field.text({
      label: 'Product Name',
      group: 'basic',
      required: true,
      searchable: true,
      maxLength: 255,
    }),

    // ADR-0079 record title (was titleFormat '{product_code} - {name}').
    display_title: Field.formula({
      label: 'Display Title',
      group: 'basic',
      expression: F`record.product_code + " - " + record.name`,
    }),

    description: Field.markdown({
      label: 'Description',
      group: 'basic',
    }),

    // Categorization
    category: Field.select({
      label: 'Category',
      group: 'basic',
      options: [
        { label: 'Software', value: 'software', default: true },
        { label: 'Hardware', value: 'hardware' },
        { label: 'Service', value: 'service' },
        { label: 'Subscription', value: 'subscription' },
        { label: 'Support', value: 'support' },
      ]
    }),
    
    family: Field.select({
      label: 'Product Family',
      group: 'basic',
      options: [
        { label: 'Enterprise Solutions', value: 'enterprise' },
        { label: 'SMB Solutions', value: 'smb' },
        { label: 'Professional Services', value: 'services' },
        { label: 'Cloud Services', value: 'cloud' },
      ]
    }),
    
    // Pricing
    list_price: Field.currency({ 
      label: 'List Price',
      group: 'pricing',
      scale: 2,
      min: 0,
      required: true,
    }),
    
    cost: Field.currency({ 
      label: 'Cost',
      group: 'pricing',
      scale: 2,
      min: 0,
    }),
    
    // SKU and Inventory
    sku: Field.text({
      label: 'SKU',
      group: 'basic',
      maxLength: 50,
      unique: true,
    }),
    
    quantity_on_hand: Field.number({
      label: 'Quantity on Hand',
      group: 'basic',
      min: 0,
      defaultValue: 0,
    }),
    
    reorder_point: Field.number({
      label: 'Reorder Point',
      group: 'basic',
      min: 0,
    }),
    
    // Status
    is_active: Field.boolean({
      label: 'Active',
      group: 'basic',
      defaultValue: true,
      trackHistory: true,
    }),

    is_taxable: Field.boolean({
      label: 'Taxable',
      group: 'pricing',
      defaultValue: true,
    }),
    
    // Relationships
    product_manager: Field.lookup('sys_user', {
      label: 'Product Manager',
      group: 'basic',
    }),
    
    // Images and Assets
    image: Field.image({
      label: 'Product Image',
      group: 'metadata',
    }),

    datasheet: Field.file({
      label: 'Datasheet',
      group: 'metadata',
    }),

    // Tax & billing
    tax_rate: Field.percent({
      label: 'Default Tax Rate %',
      group: 'pricing',
      scale: 2,
      min: 0,
      max: 100,
      defaultValue: 0,
    }),

    billing_type: Field.select({
      label: 'Billing Type',
      group: 'pricing',
      options: [
        { label: 'One-Time',  value: 'one_time', default: true },
        { label: 'Monthly',   value: 'monthly' },
        { label: 'Quarterly', value: 'quarterly' },
        { label: 'Annual',    value: 'annual' },
        { label: 'Usage',     value: 'usage' },
      ],
    }),

    unit_of_measure: Field.select({
      label: 'Unit of Measure',
      group: 'pricing',
      options: [
        { label: 'Each',       value: 'each', default: true },
        { label: 'License',    value: 'license' },
        { label: 'Seat',       value: 'seat' },
        { label: 'Hour',       value: 'hour' },
        { label: 'Day',        value: 'day' },
        { label: 'Month',      value: 'month' },
      ],
    }),
  },
  
  // Database indexes
  indexes: [
    { fields: ['name'] },
    { fields: ['sku'], unique: true },
    { fields: ['category'] },
    { fields: ['is_active'] },
  ],
  
  // Enable advanced features
  // Dead object-level enable.* flags removed in @objectstack 12 (ADR-0049);
  // only the live API surface remains. History → Field.trackHistory (ADR-0052).
  enable: {
    apiEnabled: true,
    apiMethods: ['get', 'list', 'create', 'update', 'delete'],
  },
  
  // Validation Rules
  validations: [
    {
      name: 'price_positive',
      type: 'script',
      severity: 'error',
      message: 'List Price must be positive',
      condition: P`record.list_price < 0`,
    },
    {
      name: 'cost_less_than_price',
      type: 'script',
      severity: 'warning',
      message: 'Cost should be less than List Price',
      condition: P`record.cost >= record.list_price`,
    },
  ],
});
