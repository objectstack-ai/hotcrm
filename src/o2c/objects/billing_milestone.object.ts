// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { F } from '@objectstack/spec';

/**
 * Billing Milestone — one step of a contract's collection plan (REQ-0007,
 * `docs/architecture/order-to-cash-module-plan.md`, *The data model*).
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
  label: 'Billing Milestone',
  pluralLabel: 'Billing Milestones',
  icon: 'flag',
  description: 'One step of a contract\'s collection plan: what is due, when, and how much of it is invoiced and received',

  // Plan steps are contract data: whoever reads the contract reads its plan,
  // whoever can edit the contract's account edits it (ADR-0055 derivation,
  // the same shape as `crm_contract` under `crm_account`).
  sharingModel: 'controlled_by_parent',
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

    // The master. A contract's plan goes with it.
    crm_contract: Field.masterDetail('crm_contract', {
      label: 'Contract',
      group: 'basic',
      required: true,
      storage: { notNull: true },
      deleteBehavior: 'cascade',
      relatedListColumns: ['name', 'planned_date', 'planned_amount', 'invoiced_amount', 'received_amount', 'open_amount'],
    }),

    // Stamped from the contract on every write that sets it
    // (`_row-stamp.ts`), so the account page lists its plan steps.
    crm_account: Field.lookup('crm_account', {
      label: 'Account',
      group: 'basic',
      readonly: true,
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

  indexes: [
    { fields: ['crm_contract'] },
    { fields: ['crm_account'] },
    { fields: ['planned_date'] },
  ],

  enable: {
    apiEnabled: true,
    apiMethods: ['get', 'list', 'create', 'update', 'delete'],
  },
});
