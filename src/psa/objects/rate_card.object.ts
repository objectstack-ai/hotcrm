// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { P } from '@objectstack/spec';
import { RATE_CARD_SENIORITY_OPTIONS, RATE_CARD_UNIT_OPTIONS } from './_psa-picklists';

/**
 * Rate Card — what an hour (or a day) of one seniority level costs the company and
 * what it is billed at (ruling 5, 2026-11-15: the card holds both, with no
 * dependency on the revenue module's price books).
 *
 * Amounts are in the organization's currency. A time entry COPIES the rate
 * when its hours are written (`time_entry.hook.ts`), so editing a card, or
 * closing it with `effective_to` and opening a new one, changes the cost of
 * hours written from then on and never the cost already counted.
 *
 * Readable by every delivery role; the cost rate is hidden from project
 * members at the field level (`src/sales/profiles/project-member.profile.ts`).
 */
export const RateCard = ObjectSchema.create({
  name: 'crm_rate_card',
  label: 'Rate Card',
  pluralLabel: 'Rate Cards',
  icon: 'badge-dollar-sign',
  description: 'The cost rate and bill rate of one seniority level',

  sharingModel: 'public_read',
  nameField: 'name',
  highlightFields: ['seniority', 'unit', 'bill_rate', 'effective_to'],

  fieldGroups: [
    { key: 'basic', label: 'Rate Card', icon: 'badge-dollar-sign' },
    { key: 'rates', label: 'Rates', icon: 'dollar-sign' },
  ],

  fields: {
    owner_id: Field.lookup('sys_user', {
      label: 'Owner',
      group: 'basic',
      system: true,
      readonly: false,
    }),

    name: Field.text({
      label: 'Name',
      group: 'basic',
      required: true,
      maxLength: 120,
      description: 'For example "Senior Consultant".',
    }),

    seniority: Field.select({
      label: 'Seniority',
      group: 'basic',
      required: true,
      options: RATE_CARD_SENIORITY_OPTIONS,
    }),

    unit: Field.select({
      label: 'Unit',
      group: 'rates',
      required: true,
      options: RATE_CARD_UNIT_OPTIONS.map((o) => (o.value === 'hour' ? { ...o, default: true } : o)),
      description: 'A day rate is counted as eight hours.',
    }),

    cost_rate: Field.currency({
      label: 'Cost Rate',
      group: 'rates',
      required: true,
      min: 0,
      description: 'What one unit of this role costs the company.',
    }),

    bill_rate: Field.currency({
      label: 'Bill Rate',
      group: 'rates',
      required: true,
      min: 0,
      description: 'What one unit of this role is billed to the customer at.',
    }),

    is_internal: Field.boolean({
      label: 'Internal',
      group: 'basic',
      defaultValue: false,
      description: 'An internal card may bill below cost, or not at all.',
    }),

    effective_from: Field.date({ label: 'Effective From', group: 'basic' }),
    effective_to: Field.date({ label: 'Effective To', group: 'basic' }),
  },

  validations: [
    {
      name: 'rate_card_bill_not_below_cost',
      type: 'script',
      severity: 'error',
      message: 'Bill Rate may not be below Cost Rate unless the card is Internal.',
      condition: P`has(record.bill_rate) && record.bill_rate != null && has(record.cost_rate) && record.cost_rate != null && record.bill_rate < record.cost_rate && !(has(record.is_internal) && record.is_internal == true)`,
    },
    {
      name: 'rate_card_dates',
      type: 'script',
      severity: 'error',
      message: 'Effective To must be on or after Effective From.',
      condition: P`has(record.effective_from) && record.effective_from != null && has(record.effective_to) && record.effective_to != null && record.effective_to < record.effective_from`,
    },
  ],

  indexes: [
    { fields: ['seniority'] },
  ],

  enable: {
    apiEnabled: true,
    apiMethods: ['get', 'list', 'create', 'update', 'delete'],
  },
});
