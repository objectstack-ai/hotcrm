// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';

/**
 * Invoice — the record of an invoice finance issued (REQ-0007, plan *The data
 * model*). A window, never a book: the invoice is issued and corrected where
 * finance keeps its books (the ERP, the accounting package, the tax
 * authority's system); this row is how sales sees it. Finance enters it or
 * imports it on `erp_ref` (`../mappings/invoice_import.mapping.ts`).
 *
 * An invoice cancelled or fully credited at the source is set `cancelled` and
 * leaves every figure: the plan step's Invoiced counts `issued` rows only, and
 * a cancelled invoice is open for nothing.
 */
export const Invoice = ObjectSchema.create({
  name: 'crm_invoice',
  label: 'Invoice',
  pluralLabel: 'Invoices',
  icon: 'receipt',
  description: 'An invoice finance issued against a contract, and how much of it is paid',

  // Whoever reads the contract reads its invoices (ADR-0055). Who may write
  // one is the permission sets' to say: finance (`ar_accountant`) holds Modify
  // All here, reps read only.
  sharingModel: 'controlled_by_parent',
  nameField: 'invoice_number',
  highlightFields: ['amount', 'due_date', 'status', 'open_amount'],

  fieldGroups: [
    { key: 'basic',   label: 'Invoice',        icon: 'receipt' },
    { key: 'amounts', label: 'Amounts',        icon: 'dollar-sign' },
    { key: 'source',  label: 'Source',         icon: 'refresh-ccw', collapse: 'collapsed' },
  ],

  fields: {
    invoice_number: Field.text({
      label: 'Invoice Number',
      group: 'basic',
      required: true,
      maxLength: 64,
      description: 'The number on the invoice, as finance issued it.',
    }),

    // The master. A contract with invoices cannot be deleted: these are
    // finance's figures, not the contract's to take with it.
    crm_contract: Field.masterDetail('crm_contract', {
      label: 'Contract',
      group: 'basic',
      required: true,
      storage: { notNull: true },
      deleteBehavior: 'restrict',
      relatedListColumns: ['invoice_number', 'issue_date', 'due_date', 'amount', 'paid_amount', 'open_amount', 'status'],
    }),

    crm_billing_milestone: Field.lookup('crm_billing_milestone', {
      label: 'Billing Milestone',
      group: 'basic',
      // Only the steps of this invoice's contract.
      dependsOn: ['crm_contract'],
      relatedListColumns: ['invoice_number', 'issue_date', 'amount', 'status'],
    }),

    // Stamped from the contract (`_row-stamp.ts`).
    crm_account: Field.lookup('crm_account', {
      label: 'Account',
      group: 'basic',
      readonly: true,
      relatedListColumns: ['invoice_number', 'crm_contract', 'due_date', 'amount', 'open_amount', 'status'],
    }),

    issue_date: Field.date({
      label: 'Issue Date',
      group: 'basic',
      required: true,
    }),

    // Filled on entry from the contract's Payment Terms when left empty
    // (`invoice_figures` in `invoice.hook.ts`); finance may set it outright.
    due_date: Field.date({
      label: 'Due Date',
      group: 'basic',
      description: 'Left empty, it is the issue date plus the contract\'s payment terms.',
    }),

    status: Field.select({
      label: 'Status',
      group: 'basic',
      options: [
        { label: 'Issued', value: 'issued', color: '#2563EB', default: true },
        { label: 'Cancelled', value: 'cancelled', color: '#666666' },
      ],
      required: true,
      trackHistory: true,
    }),

    amount: Field.currency({
      label: 'Amount',
      group: 'amounts',
      required: true,
      min: 0,
      description: 'As issued, tax included.',
    }),

    paid_amount: Field.summary({
      label: 'Paid',
      group: 'amounts',
      scale: 2,
      readonly: true,
      summaryOperations: {
        object: 'crm_payment',
        field: 'amount',
        function: 'sum',
        relationshipField: 'crm_invoice',
      },
    }),

    // Amount minus paid, STORED rather than a formula, because the rep's
    // Overdue Invoices view filters on it and a formula is not a stored column
    // the engine can filter (INVALID_FIELD). `invoice_figures`
    // (`invoice.hook.ts`) writes it on every save, the paid-amount recompute
    // included; a cancelled invoice is open for nothing.
    open_amount: Field.currency({
      label: 'Open',
      group: 'amounts',
      readonly: true,
    }),

    invoice_file: Field.file({
      label: 'Invoice File',
      group: 'basic',
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
      description: 'Import covers a spreadsheet, an accounting package\'s export and an ERP writing through the same key.',
    }),

    erp_ref: Field.text({
      label: 'ERP Reference',
      group: 'source',
      maxLength: 120,
      unique: true,
      description: 'The invoice\'s key in finance\'s own system. Importing a row with the same reference updates this invoice.',
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
    { fields: ['crm_billing_milestone'] },
    { fields: ['due_date'] },
    { fields: ['status'] },
  ],

  enable: {
    apiEnabled: true,
    apiMethods: ['get', 'list', 'create', 'update', 'delete'],
  },
});
