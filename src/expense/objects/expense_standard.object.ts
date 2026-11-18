// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { P } from '@objectstack/spec';
import { EXPENSE_CATEGORY_OPTIONS, EXPENSE_STANDARD_PER_OPTIONS } from './_expense-picklists';

/**
 * Expense Standard — one rule the company states about what may be spent
 * (「费用标准」, REQ-0011, hotcrm#2616, F4a): "Hotel, tier-1 cities, 600 per
 * night", or "Second-class rail" with no amount at all.
 *
 * **Advisory, and only data.** The maintainer's rule (2026-11-16): the
 * product is not a policy engine; it holds the standards, and an assistant
 * reads them and compares (「查差标」). ⛔ No validation, hook, flow or formula
 * anywhere reads a standard: an expense over one saves and is submitted
 * exactly as an expense under it. What a check finds goes in the expense's
 * Review Notes (`./expense.object.ts`), for the approver to read.
 *
 * - **Category** is the expense's own list, so a standard names the same
 *   category an expense carries; empty means any category.
 * - **Limit** is an amount in the organization's currency (REQ-0012:
 *   multi-currency is not started), optional: a rule in words has none.
 *   **Per** says what the limit is counted per, and is asked for once a limit
 *   is written.
 * - **Applies To** is words, for who and where ("Managers and above",
 *   "Tier-1 cities"). ⛔ No grade, city tier or position field: the product
 *   holds neither a grade nor a city tier, so the scope is words an assistant
 *   reads.
 *
 * `public_read`: every set that records expenses reads every standard;
 * finance and administrators keep them (`src/sales/profiles/_expense-grants.ts`).
 */
export const ExpenseStandard = ObjectSchema.create({
  name: 'crm_expense_standard',
  label: 'Expense Standard',
  pluralLabel: 'Expense Standards',
  icon: 'scale',
  description: 'A rule the company states about what may be spent, read by people and assistants; nothing in the product enforces it',

  sharingModel: 'public_read',
  nameField: 'name',
  highlightFields: ['category', 'limit_amount', 'limit_per', 'is_active'],

  fieldGroups: [
    { key: 'basic', label: 'Expense Standard', icon: 'scale' },
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
      maxLength: 200,
      description: 'For example "Hotel, tier-1 cities".',
    }),

    category: Field.select({
      label: 'Category',
      group: 'basic',
      options: EXPENSE_CATEGORY_OPTIONS,
      description: 'The expense category this standard is about. Empty means any category.',
    }),

    limit_amount: Field.currency({
      label: 'Limit',
      group: 'basic',
      min: 0,
      description: 'The most that may be spent, in the organization\'s currency. Leave empty for a rule in words only.',
    }),

    // Asked for once a limit is written: a number without its unit cannot be
    // read. A gate on the standard's own form, not a comparison with any
    // expense.
    limit_per: Field.select({
      label: 'Per',
      group: 'basic',
      options: EXPENSE_STANDARD_PER_OPTIONS,
      description: 'What the limit is counted per.',
      requiredWhen: P`has(record.limit_amount) && record.limit_amount != null`,
    }),

    applies_to: Field.text({
      label: 'Applies To',
      group: 'basic',
      maxLength: 200,
      description: 'Who and where, in words: for example "Managers and above" or "Tier-1 cities".',
    }),

    details: Field.textarea({
      label: 'Details',
      group: 'basic',
      description: 'What a number cannot say: exceptions, what is included, whom to ask.',
    }),

    is_active: Field.boolean({
      label: 'Active',
      group: 'basic',
      defaultValue: true,
      description: 'Clear it to retire a standard without deleting it.',
    }),
  },

  indexes: [
    { fields: ['category'] },
    { fields: ['is_active'] },
  ],

  enable: {
    trackHistory: true,
    apiEnabled: true,
    apiMethods: ['get', 'list', 'create', 'update', 'delete'],
  },
});
