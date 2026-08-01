import { F, P, cel } from '@objectstack/spec';
// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { PAYMENT_TERMS_OPTIONS } from './_picklists';

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

  // ADR-0090 D1/D7: OWD is an authored decision. Owner only.
  sharingModel: 'private',
  // ADR-0079: render-only `titleFormat` retired in favor of `nameField`,
  // which names a real field. The former template composed two local fields, so
  // a `display_title` formula field reproduces it for the record title.
  nameField: 'display_title',
  // Explicit search targets (ADR-0061). REQUIRED because nameField is a
  // FORMULA (display_title/full_name): without this, $search auto-defaults to
  // the formula field, which isn't a real column, so the lookup picker + global
  // search silently return zero. These are real, indexed columns.
  searchableFields: ['name', 'quote_number'],
  highlightFields: ['quote_number', 'name', 'crm_account', 'status', 'total_price'],

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
      group: 'basic',
      format: 'QTE-{0000}',
    }),
    
    // Basic Information
    name: Field.text({
      label: 'Quote Name',
      group: 'basic',
      required: true,
      storage: { notNull: true },
      searchable: true,
      maxLength: 255,
    }),

    // ADR-0079 record title (was titleFormat '{quote_number} - {name}').
    display_title: Field.formula({
      label: 'Display Title',
      group: 'basic',
      expression: F`record.quote_number + " - " + record.name`,
    }),

    // Relationships
    crm_account: Field.lookup('crm_account', {
      label: 'Account',
      group: 'basic',
      required: true,
      storage: { notNull: true },
    }),
    
    crm_contact: Field.lookup('crm_contact', {
      label: 'Contact',
      group: 'basic',
      // Optional: quote_generation maps the opportunity's primary_contact,
      // which is itself optional — requiring it here meant contact-less
      // opportunities could never draft a quote. Recipient is nailed down by
      // the time a quote is presented, not when it is drafted.
      // @objectstack 12: string[] `referenceFilters` is dead (not read by the
      // picker); `dependsOn` is the live cascading form — scopes contacts to the
      // quote's `crm_account` (ADR-0049).
      dependsOn: ['crm_account'],
    }),

    crm_opportunity: Field.lookup('crm_opportunity', {
      label: 'Opportunity',
      group: 'basic',
      // Scope opportunities to the quote's account (was dead referenceFilters).
      dependsOn: ['crm_account'],
    }),

    owner: Field.lookup('sys_user', {
      label: 'Quote Owner',
      group: 'basic',
      trackHistory: true,
    }),

    // Status
    status: Field.select({
      label: 'Status',
      group: 'basic',
      options: [
        { label: 'Draft', value: 'draft', color: '#999999', default: true },
        { label: 'In Review', value: 'in_review', color: '#FFA500' },
        { label: 'Presented', value: 'presented', color: '#4169E1' },
        { label: 'Accepted', value: 'accepted', color: '#00AA00' },
        { label: 'Rejected', value: 'rejected', color: '#FF0000' },
        { label: 'Expired', value: 'expired', color: '#666666' },
      ],
      required: true,
      storage: { notNull: true },
      trackHistory: true,
    }),
    
    // Dates
    quote_date: Field.date({
      label: 'Quote Date',
      group: 'terms',
      required: true,
      storage: { notNull: true },
      defaultValue: cel`today()`,
    }),
    
    expiration_date: Field.date({
      label: 'Expiration Date',
      group: 'terms',
      required: true,
      storage: { notNull: true },
    }),
    
    // Pricing
    // subtotal/discount_amount/total_price are NOT `readonly`: the
    // quote_generation flow writes them at create time, and 16.x silently
    // drops writes to readonly fields (#2948).
    subtotal: Field.currency({ 
      label: 'Subtotal',
      group: 'pricing',
      scale: 2,
    }),
    
    discount: Field.percent({
      label: 'Discount %',
      group: 'pricing',
      scale: 2,
      min: 0,
      max: 100,
    }),
    
    discount_amount: Field.currency({ 
      label: 'Discount Amount',
      group: 'pricing',
      scale: 2,
    }),
    
    tax: Field.currency({ 
      label: 'Tax',
      group: 'pricing',
      scale: 2,
    }),
    
    shipping_handling: Field.currency({ 
      label: 'Shipping & Handling',
      group: 'pricing',
      scale: 2,
    }),
    
    total_price: Field.currency({ 
      label: 'Total Price',
      group: 'pricing',
      scale: 2,
    }),
    
    // Terms
    payment_terms: Field.select({
      label: 'Payment Terms',
      group: 'terms',
      // Canonical set shared with Contract (#490) — see _picklists.ts.
      options: [...PAYMENT_TERMS_OPTIONS],
    }),
    
    shipping_terms: Field.text({
      label: 'Shipping Terms',
      group: 'terms',
      maxLength: 255,
    }),
    
    // Billing & Shipping Address
    billing_address: Field.address({
      label: 'Billing Address',
      group: 'address',
    }),

    shipping_address: Field.address({
      label: 'Shipping Address',
      group: 'address',
    }),
    
    // Notes
    description: Field.markdown({
      label: 'Description',
      group: 'basic',
    }),
    
    internal_notes: Field.textarea({
      label: 'Internal Notes',
      group: 'system',
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
  // Dead object-level enable.* flags removed in @objectstack 12 (ADR-0049);
  // only the live API surface remains. History → Field.trackHistory (ADR-0052).
  enable: {
    apiEnabled: true,
    apiMethods: ['get', 'list', 'create', 'update', 'delete'],
  },
  
  // Validation Rules
  validations: [
    {
      name: 'expiration_after_quote',
      type: 'script',
      severity: 'error',
      message: 'Expiration Date must be after Quote Date',
      condition: P`record.expiration_date != null && record.quote_date != null && record.expiration_date <= record.quote_date`,
    },
    {
      name: 'valid_discount',
      type: 'script',
      severity: 'error',
      message: 'Discount cannot exceed 100%',
      condition: P`record.discount != null && record.discount > 100`,
    },
    {
      // #575 B4. `crm_quote` had a full lifecycle vocabulary and no transition
      // constraint whatsoever — nor a status guard in `quote.hook.ts` — so a
      // quote could go straight from `draft` to `accepted`, which in CPQ terms
      // is a signed number nobody reviewed or sent. `warning` severity matches
      // the lead / opportunity / case machines: it flags the jump on the record
      // without blocking a support-driven correction.
      name: 'quote_status_progression',
      type: 'state_machine',
      severity: 'warning',
      message: 'Invalid quote status transition',
      field: 'status',
      transitions: {
        // `→ expired` is legal from every UNSETTLED state: the quote_expiration
        // flow sweeps on `expiration_date` alone and expires drafts that were
        // never sent as readily as presented ones.
        draft: ['in_review', 'expired'],
        in_review: ['draft', 'presented', 'rejected', 'expired'],
        presented: ['accepted', 'rejected', 'expired'],
        // `accepted` and `expired` are terminal, and not only by convention —
        // `quote_pricing_guard` in quote.hook.ts freezes both, allowing edits
        // to `internal_notes` and nothing else.
        accepted: [],
        expired: [],
        // A rejected quote is not frozen: the rep revises the numbers and
        // re-issues, which starts again at `draft`.
        rejected: ['draft'],
      },
    },
  ],
  
  // Workflow Rules
  // NOTE: object `workflows[]` were removed in @objectstack 7.7. Field-updates
  // moved to this object's *.hook.ts; scheduled status-flips & notifications
  // moved to src/flows/*.flow.ts (see flows/index.ts).
});
