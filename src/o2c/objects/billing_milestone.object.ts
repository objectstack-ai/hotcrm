// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { F, P } from '@objectstack/spec';

/**
 * Billing Milestone — one step of a collection plan (REQ-0007,
 * `docs/architecture/order-to-cash-module-plan.md`, *The data model*). The
 * step belongs to the account (REQ-0010, hotcrm#2557); the order or the
 * contract it plans is its source (hotcrm#2560), and every step names one of
 * the two (`billing_milestone_source`), because a plan must hang on
 * something. One deal's plan hangs in one place, on the order when there is
 * one and on the contract only when there is no order: the manual says so,
 * and no rule blocks it (the card's own words).
 *
 * An advance, go-live, acceptance, retention, or one subscription period: what
 * the rep expects to collect, and when. Sales keeps the plan; finance's
 * invoices and payments report against it. When a contract is amended, its rep
 * revises the plan — a step is a forecast, never a book entry.
 *
 * The three figures are one-hop summaries over this module's own rows (never a
 * summary of a summary): invoiced counts only `issued` invoices, received counts
 * every payment that points at the step — directly, or through its invoice,
 * because `payment_plan_step_stamp` (`payment.hook.ts`) copies the invoice's
 * step onto the payment.
 */
export const BillingMilestone = ObjectSchema.create({
  name: 'crm_billing_milestone',
  label: 'Payment Plan',
  pluralLabel: 'Payment Plans',
  icon: 'flag',
  description: 'One step of an account\'s collection plan, planned from an order or a contract: what is due, when, and how much of it is invoiced and received',

  // Plan steps are account data (hotcrm#2557): whoever reads the account reads
  // its plan (ADR-0055 derivation, the same shape as `crm_contract` under
  // `crm_account`). Before #2557 they derived from the contract, which itself
  // derives from the account, so who reads them did not change. Read on the
  // account is also the master-side question for a write (objectstack#33250,
  // #2462): a rep who reads the account keeps its plan, as far as the rep's
  // own grants here allow.
  sharingModel: 'controlled_by_parent',
  sharing: { controlledByParent: { writeRequiresMasterRead: true } },
  nameField: 'name',
  highlightFields: ['planned_amount', 'planned_date', 'received_amount', 'open_amount'],

  fieldGroups: [
    { key: 'basic',   label: 'Milestone',  icon: 'flag' },
    { key: 'plan',    label: 'Plan',       icon: 'calendar' },
    { key: 'figures', label: 'Collection', icon: 'dollar-sign' },
  ],

  fields: {
    name: Field.text({
      label: 'Milestone',
      group: 'basic',
      required: true,
      maxLength: 120,
      description: 'What the step is, as the contract says it: "Advance 30%", "Go-live", "Year 2".',
    }),

    // The master (hotcrm#2557). Deleting an account deletes its plan, as it
    // did through the contract before.
    crm_account: Field.masterDetail('crm_account', {
      label: 'Account',
      group: 'basic',
      required: true,
      storage: { notNull: true },
      deleteBehavior: 'cascade',
      relatedListColumns: ['name', 'crm_sales_order', 'crm_contract', 'planned_date', 'planned_amount', 'invoiced_amount', 'received_amount', 'open_amount'],
    }),

    // A source (hotcrm#2560): the step plans this order. Picking it fills the
    // account, and the order's contract while the step has none, on the form;
    // on every write `_row-stamp.ts` takes the account from it (refusing a
    // different one) and the order's contract (refusing a different one). An
    // order's plan goes with it (`cascade`), as a contract's does. Nullable
    // and new, so an upgrade only adds the column (no row carries it yet).
    crm_sales_order: Field.lookup('crm_sales_order', {
      label: 'Order',
      group: 'basic',
      // No `dependsOn`, as the contract lookup has none: a `dependsOn` hides a
      // value the order page's New prefills ("Select Account first") while the
      // account is still empty, measured in the browser on hotcrm#2560. The
      // pick fills the account; another account's order is refused on save.
      deleteBehavior: 'cascade',
      lookupAutofill: [
        { target: 'crm_account', source: 'crm_account', overwrite: true },
        { target: 'crm_contract', source: 'crm_contract' },
      ],
      relatedListColumns: ['name', 'planned_date', 'planned_amount', 'invoiced_amount', 'received_amount', 'open_amount'],
    }),

    // A source, the other of the two `billing_milestone_source` accepts.
    // Picking it fills the account on the form; on every write
    // `_row-stamp.ts` takes the account from it and refuses a different one.
    // A contract's plan still goes with it (`cascade`), as it did when the
    // contract was the master.
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
      deleteBehavior: 'cascade',
      lookupAutofill: [{ target: 'crm_account', source: 'crm_account', overwrite: true }],
      relatedListColumns: ['name', 'planned_date', 'planned_amount', 'invoiced_amount', 'received_amount', 'open_amount'],
    }),

    planned_amount: Field.currency({
      label: 'Planned Amount',
      group: 'plan',
      required: true,
      min: 0,
    }),

    planned_date: Field.date({
      label: 'Planned Date',
      group: 'plan',
      required: true,
    }),

    // A person's record that the customer signed off (AGENTS.md rule 8): no
    // machine sets it.
    accepted_date: Field.date({
      label: 'Accepted Date',
      group: 'plan',
      description: 'For a step paid on acceptance: the day the customer signed it off.',
    }),

    invoiced_amount: Field.summary({
      label: 'Invoiced',
      group: 'figures',
      scale: 2,
      readonly: true,
      summaryOperations: {
        object: 'crm_invoice',
        field: 'amount',
        function: 'sum',
        relationshipField: 'crm_billing_milestone',
        filter: { status: 'issued' },
      },
    }),

    received_amount: Field.summary({
      label: 'Received',
      group: 'figures',
      scale: 2,
      readonly: true,
      summaryOperations: {
        object: 'crm_payment',
        field: 'amount',
        function: 'sum',
        relationshipField: 'crm_billing_milestone',
      },
    }),

    // Planned minus received, for reading only: no view filters on it (a
    // formula is not a stored column and cannot be filtered).
    open_amount: Field.formula({
      label: 'Open',
      group: 'figures',
      returnType: 'currency',
      expression: F`coalesce(record.planned_amount, 0) - coalesce(record.received_amount, 0)`,
      scale: 2,
    }),

    description: Field.textarea({
      label: 'Notes',
      group: 'basic',
    }),
  },

  // A transition gate would let a step through without a source; an invariant
  // is what is meant (AGENTS.md rule 7): a step names its order or its
  // contract. Until hotcrm#2560 it was the contract alone
  // (`billing_milestone_contract`); renamed with the widening, since the old
  // name would say the narrower rule.
  validations: [
    {
      name: 'billing_milestone_source',
      type: 'script',
      severity: 'error',
      message: 'Choose the order or the contract this step belongs to.',
      condition: P`(!has(record.crm_sales_order) || isBlank(record.crm_sales_order)) && (!has(record.crm_contract) || isBlank(record.crm_contract))`,
    },
  ],

  indexes: [
    { fields: ['crm_contract'] },
    { fields: ['crm_sales_order'] },
    { fields: ['crm_account'] },
    { fields: ['planned_date'] },
  ],

  enable: {
    apiEnabled: true,
    apiMethods: ['get', 'list', 'create', 'update', 'delete'],
  },
});
