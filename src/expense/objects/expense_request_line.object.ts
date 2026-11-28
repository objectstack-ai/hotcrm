// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { P } from '@objectstack/spec';
import { EXPENSE_REQUEST_LINE_KIND_OPTIONS } from './_expense-picklists';

/**
 * The planned values of a leg lock with its request: from Submitted, while
 * the approver reads them, and for good once the request is Approved,
 * Cancelled or Closed. The request's own planned values lock the same way
 * (`./expense_request.object.ts`: its record lock while it waits, its
 * `readonlyWhen` after). A `parent`-scoped `readonlyWhen` is judged by the
 * engine against the request's stored status on every write of a line, and
 * the form shows the fields read-only. A rejected or recalled request is back
 * in Draft or Rejected, so its legs open again.
 */
const LEG_LOCKED = P`has(parent.status) && (parent.status == "submitted" || parent.status == "approved" || parent.status == "cancelled" || parent.status == "closed")`;

/**
 * Travel Request Line — one leg of a trip: a flight, a train, a car, a hotel
 * or something else, from where to where and when (REQ-0011, hotcrm#2579,
 * F3b). The legs are what an agent or a travel desk books from, and where the
 * confirmation is written back.
 *
 * - ⛔ **No amount.** The request carries the one estimate for the whole trip
 *   (hotcrm#2578), so there are never two totals.
 * - **Optional.** A request with no legs is complete; nothing requires one.
 * - **The booking reference stays writable** at every status: it is written
 *   after booking, by the traveler, an agent acting as the traveler, or
 *   whoever books, and that is after approval. While the approval is pending
 *   the platform holds every line of the request, this one too (objectstack
 *   1e018d6, 19.0: a master's approval lock covers its master-detail lines). Every other value carries
 *   {@link LEG_LOCKED}, and `expense_request_line_lock`
 *   (`./expense_request_line.hook.ts`) refuses changing, adding, removing or
 *   moving a leg of a locked request.
 *
 * Access follows the request (`controlled_by_parent`): whoever reads the
 * request reads its legs, the approver included, and a write needs edit on
 * the request.
 */
export const ExpenseRequestLine = ObjectSchema.create({
  name: 'crm_expense_request_line',
  label: 'Itinerary Line',
  pluralLabel: 'Itinerary Lines',
  icon: 'route',
  description: 'One leg of a trip: what to book, from where to where, and when',

  sharingModel: 'controlled_by_parent',

  // No New on the legs of a request that is not being drafted: the lock
  // refuses that write, so the button would only lead to the refusal. A
  // related list's create toolbar evaluates this against the HOST record.
  userActions: {
    create: {
      visibleWhen: P`!has(record.status) || record.status == "draft" || record.status == "rejected"`,
    },
  },
  nameField: 'destination',
  searchableFields: ['origin', 'destination', 'booking_reference'],
  highlightFields: ['kind', 'origin', 'destination', 'start_date'],

  fieldGroups: [
    { key: 'leg', label: 'Leg', icon: 'route' },
    { key: 'booking', label: 'Booking', icon: 'ticket' },
  ],

  fields: {
    // The request's legs go with it, as an order's lines do.
    crm_expense_request: Field.masterDetail('crm_expense_request', {
      label: 'Travel Request',
      group: 'leg',
      required: true,
      storage: { notNull: true },
      deleteBehavior: 'cascade',
      readonlyWhen: LEG_LOCKED,
      relatedListColumns: ['line_number', 'kind', 'origin', 'destination', 'start_date', 'end_date', 'booking_reference'],
    }),

    // The order the legs were added in; the page lists them by date first.
    line_number: Field.number({
      label: 'Line #',
      group: 'leg',
      scale: 0,
      readonly: true,
    }),

    kind: Field.select({
      label: 'Kind',
      group: 'leg',
      required: true,
      options: EXPENSE_REQUEST_LINE_KIND_OPTIONS,
      readonlyWhen: LEG_LOCKED,
    }),

    origin: Field.text({
      label: 'From',
      group: 'leg',
      maxLength: 200,
      readonlyWhen: LEG_LOCKED,
    }),

    destination: Field.text({
      label: 'To',
      group: 'leg',
      required: true,
      maxLength: 200,
      description: 'Where this leg goes, or where the hotel is.',
      readonlyWhen: LEG_LOCKED,
    }),

    start_date: Field.date({
      label: 'Start Date',
      group: 'leg',
      required: true,
      readonlyWhen: LEG_LOCKED,
    }),

    end_date: Field.date({
      label: 'End Date',
      group: 'leg',
      description: 'For a hotel, the day you check out. Leave empty for a one-day leg.',
      readonlyWhen: LEG_LOCKED,
    }),

    details: Field.textarea({
      label: 'Details',
      group: 'leg',
      description: 'Seat, hotel or other wishes.',
      readonlyWhen: LEG_LOCKED,
    }),

    // ⛔ No lock: written after booking, which is after approval.
    booking_reference: Field.text({
      label: 'Booking Reference',
      group: 'booking',
      maxLength: 200,
      description: 'The confirmation, written after booking by the traveler, an assistant or whoever books.',
    }),
  },

  indexes: [
    { fields: ['crm_expense_request'] },
  ],

  validations: [
    {
      name: 'expense_request_line_dates',
      type: 'script',
      severity: 'error',
      message: 'End Date must be on or after Start Date.',
      condition: P`has(record.start_date) && record.start_date != null && has(record.end_date) && record.end_date != null && record.end_date < record.start_date`,
    },
  ],

  enable: {
    trackHistory: true,
    apiEnabled: true,
    apiMethods: ['get', 'list', 'create', 'update', 'delete'],
  },
});
