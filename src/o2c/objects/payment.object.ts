// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';

/**
 * Payment — money received against a contract (REQ-0007, plan *The data
 * model*): against one invoice, or against a plan step before it is invoiced.
 * A receipt that pays several invoices is one row per invoice, the split the
 * ERP or finance already made, so there is no allocation object. An advance
 * paid before its invoice points at the plan step; when the invoice is issued,
 * finance fills in the invoice on the same row.
 *
 * Sales does not record payments: a figure sales sees is always one finance
 * wrote, so a commission plan built on collections never reads a number the
 * rep typed.
 */
export const Payment = ObjectSchema.create({
  name: 'crm_payment',
  label: 'Payment',
  pluralLabel: 'Payments',
  icon: 'banknote',
  description: 'Money received against a contract, an invoice or a plan step',

  // Whoever reads the contract reads its payments; finance writes them (see
  // `crm_invoice`).
  sharingModel: 'controlled_by_parent',
  nameField: 'payment_number',
  highlightFields: ['payment_date', 'amount', 'method', 'crm_invoice'],

  fieldGroups: [
    { key: 'basic',  label: 'Payment', icon: 'banknote' },
    { key: 'source', label: 'Source',  icon: 'refresh-ccw', collapse: 'collapsed' },
  ],

  fields: {
    payment_number: Field.autonumber({
      label: 'Payment Number',
      group: 'basic',
      format: 'PAY-{00000}',
    }),

    crm_contract: Field.masterDetail('crm_contract', {
      label: 'Contract',
      group: 'basic',
      required: true,
      storage: { notNull: true },
      deleteBehavior: 'restrict',
      relatedListColumns: ['payment_number', 'payment_date', 'amount', 'method', 'crm_invoice', 'crm_billing_milestone'],
    }),

    crm_invoice: Field.lookup('crm_invoice', {
      label: 'Invoice',
      group: 'basic',
      dependsOn: ['crm_contract'],
      relatedListColumns: ['payment_number', 'payment_date', 'amount', 'method'],
    }),

    // Copied from the invoice when there is one (`payment_plan_step_stamp`),
    // so the step's Received counts payments made through its invoices.
    crm_billing_milestone: Field.lookup('crm_billing_milestone', {
      label: 'Billing Milestone',
      group: 'basic',
      dependsOn: ['crm_contract'],
      relatedListColumns: ['payment_number', 'payment_date', 'amount', 'crm_invoice'],
    }),

    crm_account: Field.lookup('crm_account', {
      label: 'Account',
      group: 'basic',
      readonly: true,
      relatedListColumns: ['payment_number', 'crm_contract', 'payment_date', 'amount', 'method'],
    }),

    payment_date: Field.date({
      label: 'Payment Date',
      group: 'basic',
      required: true,
    }),

    amount: Field.currency({
      label: 'Amount',
      group: 'basic',
      required: true,
      min: 0,
    }),

    // The methods every market shares (plan decision 7, ruled B under
    // "global customers first", 2026-11-14): a bill and its maturity date are
    // a customer's own shape, added in its own repository.
    method: Field.select({
      label: 'Method',
      group: 'basic',
      options: [
        { label: 'Bank Transfer', value: 'bank_transfer', default: true },
        { label: 'Other', value: 'other' },
      ],
      required: true,
    }),

    source: Field.select({
      label: 'Source',
      group: 'source',
      options: [
        { label: 'Manual entry', value: 'manual', default: true },
        { label: 'Import', value: 'import' },
      ],
      // Not `readonly`: the import mapping writes `import` here as a constant,
      // and a read-only column is stripped from a user's write.
      // Synced At is stamped whenever a write sets it to `import`
      // (`_row-stamp.ts`).
    }),

    erp_ref: Field.text({
      label: 'ERP Reference',
      group: 'source',
      maxLength: 120,
      unique: true,
      description: 'The receipt\'s key in finance\'s own system. Importing a row with the same reference updates this payment.',
    }),

    synced_at: Field.datetime({
      label: 'Synced At',
      group: 'source',
      readonly: true,
    }),
  },

  indexes: [
    { fields: ['crm_contract'] },
    { fields: ['crm_account'] },
    { fields: ['crm_invoice'] },
    { fields: ['crm_billing_milestone'] },
    { fields: ['payment_date'] },
  ],

  enable: {
    apiEnabled: true,
    apiMethods: ['get', 'list', 'create', 'update', 'delete'],
  },
});
