// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';

/**
 * Payment — money an account paid (REQ-0007, plan *The data model*; under the
 * account since REQ-0010, hotcrm#2557): against an order (hotcrm#2560) or a
 * contract and the plan step it collects, or against nothing yet — a deposit
 * that matches no order names only the account.
 *
 * Invoices and payments run in parallel (the 2026-11-26 ruling, hotcrm#2806):
 * a payment names no invoice, and neither is set against the other. The
 * order and the contract sum each on its own, as Invoiced and Received. One
 * receipt split across several orders is one row per order, the split noted
 * in the row's description; there is no bank reference field.
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
  description: 'Money an account paid: against a payment plan, an order, a contract, or none of them yet',

  // Whoever reads the account reads its payments; finance writes them, with
  // read on the account as the master-side question (see `crm_invoice`).
  sharingModel: 'controlled_by_parent',
  sharing: { controlledByParent: { writeRequiresMasterRead: true } },
  nameField: 'payment_number',
  highlightFields: ['payment_date', 'amount', 'method', 'crm_billing_milestone'],

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

    // The master (hotcrm#2557). An account with payments cannot be deleted,
    // as an account with invoices cannot.
    crm_account: Field.masterDetail('crm_account', {
      label: 'Account',
      group: 'basic',
      required: true,
      storage: { notNull: true },
      deleteBehavior: 'restrict',
      relatedListColumns: ['payment_number', 'crm_sales_order', 'crm_contract', 'payment_date', 'amount', 'method'],
    }),

    // An optional source (hotcrm#2560): the order the money was received for.
    // Filled from the plan step when the payment names none (`_row-stamp.ts`),
    // so the order's Received counts what its steps count. Picking it fills the account, and the order's contract
    // while the payment has none; a different account or contract is refused.
    // An order with payments cannot be deleted (`restrict`, as a contract with
    // payments cannot). Nullable and new: an upgrade only adds the column.
    crm_sales_order: Field.lookup('crm_sales_order', {
      label: 'Order',
      group: 'basic',
      // No `dependsOn`, as the contract lookup has none: a `dependsOn` hides a
      // value the order page's New prefills ("Select Account first") while the
      // account is still empty, measured in the browser on hotcrm#2560. The
      // pick fills the account; another account's order is refused on save.
      deleteBehavior: 'restrict',
      lookupAutofill: [
        { target: 'crm_account', source: 'crm_account', overwrite: true },
        { target: 'crm_contract', source: 'crm_contract' },
      ],
      relatedListColumns: ['payment_number', 'payment_date', 'amount', 'method', 'crm_billing_milestone'],
    }),

    // An optional source, filled from the plan step when the payment names
    // none (`_row-stamp.ts`), so the contract's Received counts what its steps
    // count. Picking it fills the
    // account on the form. A contract with payments cannot be deleted
    // (`restrict`, as when it was the master).
    crm_contract: Field.lookup('crm_contract', {
      label: 'Contract',
      group: 'basic',
      // The order's contract moves it (`sales_order_contract_fill`, hotcrm#2724
      // ruling B): the history says from which contract to which.
      trackHistory: true,
      // Declared, not left implicit: through 6.5.0 this column was the
      // required master and NOT NULL, and an upgrade relaxes it only where the
      // package says it is nullable (a managed upgrade's
      // `relaxInstallDeclaredNotNull`; hotcrm#2557, ruling A on #2583).
      storage: { notNull: false },
      deleteBehavior: 'restrict',
      lookupAutofill: [{ target: 'crm_account', source: 'crm_account', overwrite: true }],
      relatedListColumns: ['payment_number', 'payment_date', 'amount', 'method', 'crm_billing_milestone'],
    }),

    // Hidden, not deleted (the 2026-11-26 ruling, hotcrm#2806): a payment
    // names no invoice any more, so the form, the record page and the import
    // leave it out. The column and what earlier rows hold stay, for a later
    // ERP sync; a row that still names an invoice through the API is held to
    // the invoice's account (`payment_plan_step_stamp`).
    crm_invoice: Field.lookup('crm_invoice', {
      label: 'Invoice',
      group: 'basic',
      hidden: true,
      dependsOn: ['crm_account'],
      relatedListColumns: ['payment_number', 'payment_date', 'amount', 'method'],
    }),

    // The plan step the money collects; the step's Received sums it. Picking
    // it fills the order and the contract when the payment names neither
    // (`_row-stamp.ts`).
    crm_billing_milestone: Field.lookup('crm_billing_milestone', {
      label: 'Payment Plan',
      group: 'basic',
      dependsOn: ['crm_account'],
      relatedListColumns: ['payment_number', 'payment_date', 'amount', 'method'],
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
    { fields: ['crm_sales_order'] },
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
