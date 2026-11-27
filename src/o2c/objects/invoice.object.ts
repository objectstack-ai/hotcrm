// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';

/**
 * Invoice — the record of an invoice finance issued (REQ-0007, plan *The data
 * model*). A window, never a book: the invoice is issued and corrected where
 * finance keeps its books (the ERP, the accounting package, the tax
 * authority's system); this row is how sales sees it. Finance enters it or
 * imports it on `erp_ref` (`../mappings/invoice_import.mapping.ts`).
 *
 * It belongs to the account (REQ-0010, hotcrm#2557). The order and the
 * contract are optional sources (the order since hotcrm#2560): an invoice for
 * one order names it, and one for several orders, or with no source at all,
 * names only the account.
 *
 * Invoices and payments run in parallel (the 2026-11-26 ruling, hotcrm#2806):
 * an invoice hangs on its order or contract, on no payment and on no plan
 * step, and is never set against a payment. The order's, the contract's and
 * the account's Invoiced sum it; their Received sums payments on their own.
 * Paid, Open, Overpaid and the plan step are hidden, not deleted: the columns
 * and what earlier rows hold stay for a later ERP sync, and `invoice_figures`
 * still keeps Open and Overpaid in step with Paid on those rows.
 *
 * An invoice cancelled or fully credited at the source is set `cancelled` and
 * leaves every figure: Invoiced counts `issued` rows only.
 */
export const Invoice = ObjectSchema.create({
  name: 'crm_invoice',
  label: 'Invoice',
  pluralLabel: 'Invoices',
  icon: 'receipt',
  description: 'An invoice finance issued to an account, against its order or contract',

  // Whoever reads the account reads its invoices (ADR-0055; through the
  // contract before hotcrm#2557, which derives from the account, so the
  // readers are the same). Who may write one is the permission sets' to say:
  // finance (`ar_accountant`) holds Modify All here, reps read only. Read on
  // the account is the master-side question for a write (objectstack#33250,
  // #2462), so finance, who reads every account and edits none, enters
  // invoices.
  sharingModel: 'controlled_by_parent',
  sharing: { controlledByParent: { writeRequiresMasterRead: true } },
  nameField: 'invoice_number',
  // The amount sits in the strip: with Paid, Open and Overpaid hidden
  // (hotcrm#2806) an Amounts section would hold nothing else.
  highlightFields: ['amount', 'issue_date', 'due_date', 'status'],

  fieldGroups: [
    { key: 'basic',   label: 'Invoice',        icon: 'receipt' },
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

    // The master (hotcrm#2557). An account with invoices cannot be deleted:
    // these are finance's figures, not the account's to take with it.
    crm_account: Field.masterDetail('crm_account', {
      label: 'Account',
      group: 'basic',
      required: true,
      storage: { notNull: true },
      deleteBehavior: 'restrict',
      relatedListColumns: ['invoice_number', 'crm_sales_order', 'crm_contract', 'due_date', 'amount', 'status'],
    }),

    // An optional source (hotcrm#2560): the order this invoice bills. Picking
    // it fills the account, and the order's contract while the invoice has
    // none, on the form; on every write `_row-stamp.ts` takes the account
    // from it (refusing a different one) and the order's contract (refusing a
    // different one), and fills it from the plan step when the invoice names
    // none. An order with invoices cannot be deleted (`restrict`, as a
    // contract with invoices cannot). Nullable and new: an upgrade only adds
    // the column.
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
      relatedListColumns: ['invoice_number', 'issue_date', 'due_date', 'amount', 'status'],
    }),

    // An optional source. Picking it fills the account on the form; on every
    // write `_row-stamp.ts` takes the account from it and refuses a different
    // one. A contract with invoices still cannot be deleted (`restrict`, as
    // when it was the master): its page sums them, and finance's rows keep
    // the source they were entered with.
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
      relatedListColumns: ['invoice_number', 'issue_date', 'due_date', 'amount', 'status'],
    }),

    // An optional source. When the invoice names no contract, the step's
    // contract is filled in (`_row-stamp.ts`), so the contract's figures and
    // the step's count the same invoices. Deleting the step leaves the
    // invoice (`set_null`, the lookup default). A step of another account is
    // refused on save (`invoice_plan_step_guard` in `invoice.hook.ts`).
    //
    // Hidden, not deleted (the 2026-11-26 ruling, hotcrm#2806): an invoice
    // hangs on no plan step any more. The column and what earlier rows hold
    // stay, for a later ERP sync; a row that still names a step through the
    // API is held to the step's account (`invoice_plan_step_guard`).
    crm_billing_milestone: Field.lookup('crm_billing_milestone', {
      label: 'Payment Plan',
      group: 'basic',
      hidden: true,
      // No `dependsOn`, as the order and the contract lookups have none
      // (hotcrm#2755): measured in the browser, it hid the step the milestone
      // page's New prefills ("Select Account first") and cleared it when the
      // account was picked, so the invoice was saved with no step and the
      // step's Invoiced never moved. The picker therefore lists every
      // account's steps; the pick fills the account, and the order and the
      // contract while the invoice has none, as the server stamps them on save
      // (`_row-stamp.ts`). Those two do not overwrite: an overwriting autofill
      // empties its target when the step carries none (a step has an order or
      // a contract, not always both), and the server keeps what the invoice
      // already names.
      lookupAutofill: [
        { target: 'crm_account', source: 'crm_account', overwrite: true },
        { target: 'crm_sales_order', source: 'crm_sales_order' },
        { target: 'crm_contract', source: 'crm_contract' },
      ],
      // No Invoices list on the payment plan's page either: a New there
      // would write the hidden link (hotcrm#2806).
      relatedList: false,
    }),

    issue_date: Field.date({
      label: 'Issue Date',
      group: 'basic',
      required: true,
    }),

    // Filled on entry when left empty (`invoice_figures` in `invoice.hook.ts`):
    // the contract's Payment Terms, else the order's (hotcrm#2560); finance
    // may set it outright. With neither, there are no terms to read and the
    // due date is typed.
    due_date: Field.date({
      label: 'Due Date',
      group: 'basic',
      description: 'Left empty, it is the issue date plus the payment terms of the contract, or else of the order. With neither, type it.',
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
      group: 'basic',
      required: true,
      min: 0,
      description: 'As issued, tax included.',
    }),

    // Paid, Open and Overpaid are hidden, not deleted (the 2026-11-26 ruling,
    // hotcrm#2806): an invoice is not set against payments any more, so no
    // new payment moves them. Kept for the rows entered before, and for a
    // later ERP sync.
    paid_amount: Field.summary({
      label: 'Paid',
      group: 'basic',
      hidden: true,
      scale: 2,
      readonly: true,
      summaryOperations: {
        object: 'crm_payment',
        field: 'amount',
        function: 'sum',
        relationshipField: 'crm_invoice',
      },
    }),

    // Amount minus paid, never below zero, stored. `invoice_figures`
    // (`invoice.hook.ts`) writes it on every save, the paid-amount recompute
    // included; a cancelled invoice is open for nothing. Until the 2026-11-26
    // ruling the Overdue Invoices view filtered on it and the Receivable
    // Balance summed it (#2513); both are gone (hotcrm#2806).
    open_amount: Field.currency({
      label: 'Open',
      group: 'basic',
      hidden: true,
      readonly: true,
    }),

    // Paid minus amount when the payments exceed the invoice, else 0 (#2513).
    // An overpayment is allowed: the cash is real and an ERP import must not
    // fail on it. The invoice then counts as fully paid (Open 0) and the
    // excess shows here. Setting it against other invoices is not done here.
    // Written by `invoice_figures` beside Open.
    overpaid_amount: Field.currency({
      label: 'Overpaid',
      group: 'basic',
      hidden: true,
      readonly: true,
      description: 'What was paid above the amount. The invoice counts as fully paid; the excess is not set against other invoices.',
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
    { fields: ['crm_sales_order'] },
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
