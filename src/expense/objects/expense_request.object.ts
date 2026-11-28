// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { F, P } from '@objectstack/spec';
import { EXPENSE_REQUEST_STATUS_OPTIONS, EXPENSE_SOURCE_OPTIONS } from './_expense-picklists';

/**
 * The planned values an approval was given for. Once a request is Approved
 * (and after, Cancelled or Closed) they no longer change: to change a plan the
 * traveler cancels and files a new request (hotcrm#2578). The lock is the
 * field's own `readonlyWhen`, so the form shows the fields read-only and a
 * caller's write to one is dropped by the platform; the approval's closing
 * write, a system write, is not a caller write and is never judged. While a
 * request waits it is held by the approval's record lock instead.
 */
const PLANNED_VALUES_LOCKED = P`has(record.status) && (record.status == "approved" || record.status == "cancelled" || record.status == "closed")`;

/**
 * Travel Request — asking before a trip: where, when, why and roughly how
 * much (REQ-0011, hotcrm#2578, F3a). The traveler's manager says yes or no
 * before money is spent; afterwards the expense report is read against what
 * was approved (F3c).
 *
 * The object name is wider than the label on purpose: an object name cannot
 * be changed later, and a request before spending may one day cover more than
 * trips. This version is travel only, so there is no type field.
 *
 * One estimate, on the request: one total for the whole trip, whoever pays.
 * Itinerary lines (F3b) carry no amounts, so there are never two totals. The
 * amount is in the organization's currency, as every amount here is
 * (REQ-0012: multi-currency is not started).
 *
 * Agent-first (the maintainer, 2026-11-16 23:04Z): the product supplies the
 * record, its statuses, its approval and the few fields an agent writes or
 * compares on — `source`, and `review_notes`, where an agent or a rule writes
 * what it found for the approver. Estimating, checking and reminding are an
 * agent's work through the API, acting as the traveler.
 *
 * A request is optional: an expense never requires one.
 *
 * `private` to the traveler (the owner). Whoever approves it reaches it
 * through `expense_request_approver_edit`, which shares it to the `approver`
 * its approval stamps (`../sharing/expense.sharing.ts`).
 */
export const ExpenseRequest = ObjectSchema.create({
  name: 'crm_expense_request',
  label: 'Travel Request',
  pluralLabel: 'Travel Requests',
  icon: 'plane',
  description: 'Asking before a trip: where, when, why and roughly how much',

  sharingModel: 'private',
  nameField: 'name',
  highlightFields: ['destination', 'start_date', 'end_date', 'estimated_amount', 'status'],

  fieldGroups: [
    { key: 'trip', label: 'Trip', icon: 'plane' },
    { key: 'spend', label: 'Spending', icon: 'wallet' },
    { key: 'review', label: 'Approval', icon: 'clipboard-check' },
  ],

  fields: {
    // Platform ownership anchor — canonical note in `src/sales/objects/account.object.ts`.
    // The traveler, as "Spent By" is on the expense.
    owner_id: Field.lookup('sys_user', {
      label: 'Traveler',
      group: 'trip',
      system: true,
      readonly: false,
      trackHistory: true,
    }),

    request_number: Field.autonumber({
      label: 'Request Number',
      group: 'trip',
      format: 'TR-{00000}',
    }),

    name: Field.text({
      label: 'Purpose',
      group: 'trip',
      required: true,
      maxLength: 200,
      readonlyWhen: PLANNED_VALUES_LOCKED,
    }),

    destination: Field.text({
      label: 'Destination',
      group: 'trip',
      required: true,
      maxLength: 200,
      readonlyWhen: PLANNED_VALUES_LOCKED,
    }),

    start_date: Field.date({
      label: 'Start Date',
      group: 'trip',
      required: true,
      readonlyWhen: PLANNED_VALUES_LOCKED,
    }),

    end_date: Field.date({
      label: 'End Date',
      group: 'trip',
      required: true,
      readonlyWhen: PLANNED_VALUES_LOCKED,
    }),

    // Both dates count: a trip from Monday to Wednesday is three days.
    // Formulas are evaluated after the query, so this is not a column and
    // cannot be filtered or sorted on (see `days_in_stage` on the opportunity).
    days: Field.formula({
      label: 'Days',
      group: 'trip',
      expression: F`has(record.start_date) && record.start_date != null && has(record.end_date) && record.end_date != null ? daysBetween(record.start_date, record.end_date) + 1 : null`,
      returnType: 'number',
    }),

    // Optional: the customer the trip is for. No related list on the account
    // page — a request is private and the account page is the sales team's
    // (REQ-0010 usability rule 3).
    crm_account: Field.lookup('crm_account', {
      label: 'Account',
      group: 'trip',
      relatedList: false,
    }),

    estimated_amount: Field.currency({
      label: 'Estimated Amount',
      group: 'trip',
      required: true,
      min: 0,
      description: 'One total for the whole trip, whoever pays.',
      readonlyWhen: PLANNED_VALUES_LOCKED,
    }),

    // What the trip has cost so far, read against the estimate (F3c,
    // hotcrm#2580): the totals of the reports that cite this request and are
    // in review, approved or paid. A draft or rejected report is not counted
    // until it is sent. The request's reports are listed on its page (the
    // report's `crm_expense_request`).
    reported_amount: Field.summary({
      label: 'Reported Amount',
      group: 'spend',
      scale: 2,
      readonly: true,
      description: 'The totals of this request\'s submitted, approved and paid expense reports.',
      summaryOperations: {
        object: 'crm_expense_report',
        field: 'total_amount',
        function: 'sum',
        relationshipField: 'crm_expense_request',
        filter: { status: { $in: ['submitted', 'approved', 'paid'] } },
      },
    }),

    // Reported minus estimated: above zero is over the estimate.
    // Formulas are evaluated after the query, so neither is a column.
    estimate_difference: Field.formula({
      label: 'Difference from Estimate',
      group: 'spend',
      returnType: 'currency',
      scale: 2,
      description: 'Reported minus estimated. Above zero is over the estimate.',
      expression: F`coalesce(record.reported_amount, 0) - coalesce(record.estimated_amount, 0)`,
    }),

    // A sign, never a block (AGENTS.md rule 8): nothing refuses a report
    // over the estimate.
    over_estimate: Field.formula({
      label: 'Over the Estimate',
      group: 'spend',
      returnType: 'boolean',
      expression: F`coalesce(record.reported_amount, 0) > coalesce(record.estimated_amount, 0)`,
    }),

    itinerary: Field.textarea({ label: 'Itinerary', group: 'trip' }),

    notes: Field.textarea({ label: 'Notes', group: 'trip' }),

    source: Field.select({
      label: 'Source',
      group: 'trip',
      options: EXPENSE_SOURCE_OPTIONS,
      description: 'Typed by a person, written by an agent, or imported.',
    }),

    status: Field.select({
      label: 'Status',
      group: 'review',
      required: true,
      trackHistory: true,
      options: EXPENSE_REQUEST_STATUS_OPTIONS.map((o) => (o.value === 'draft' ? { ...o, default: true } : o)),
    }),

    // Stamped by the approval when the request is submitted: the traveler's
    // manager (`../flows/expense-request-approval.flow.ts`).
    approver: Field.lookup('sys_user', {
      label: 'Approver',
      group: 'review',
      readonly: true,
    }),

    // What an agent or a rule found, for the approver to read. It decides
    // nothing (AGENTS.md rule 8: a machine signal warns, never blocks).
    review_notes: Field.textarea({
      label: 'Review Notes',
      group: 'review',
      description: 'What an assistant or a rule found, for the approver to read.',
    }),
  },

  validations: [
    {
      name: 'expense_request_dates',
      type: 'script',
      severity: 'error',
      message: 'End Date must be on or after Start Date.',
      condition: P`has(record.start_date) && record.start_date != null && has(record.end_date) && record.end_date != null && record.end_date < record.start_date`,
    },
    {
      name: 'expense_request_status_progression',
      type: 'state_machine',
      severity: 'error',
      message: 'This status change is not allowed. A travel request moves Draft → Submitted → Approved or Rejected; a rejected request goes back to Draft to be corrected; an approved one is Cancelled before the trip or Closed after it.',
      field: 'status',
      // Protocol 19 asks for an entry contract (`state-machine-no-initial-states`). Every state is listed: a
      // record (an import or an integration included) may still be created in any of them, as on 18.6.
      // Narrowing this to the first state is a product decision of its own, not part of the upgrade.
      initialStates: ['draft', 'submitted', 'approved', 'rejected', 'cancelled', 'closed'],
      transitions: {
        draft: ['submitted'],
        submitted: ['approved', 'rejected', 'draft'],
        approved: ['cancelled', 'closed'],
        rejected: ['draft'],
        cancelled: [],
        closed: [],
      },
    },
  ],

  indexes: [
    { fields: ['owner_id'] },
    { fields: ['status'] },
    { fields: ['start_date'] },
  ],

  enable: {
    trackHistory: true,
    files: true,
    apiEnabled: true,
    apiMethods: ['get', 'list', 'create', 'update', 'delete'],
  },
});
