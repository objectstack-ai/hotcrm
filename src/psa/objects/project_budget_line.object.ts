// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { BUDGET_LINE_CATEGORY_OPTIONS } from './_psa-picklists';

/**
 * Project Budget Line — one planned cost of a budget version: a category, a
 * month, and quantity × unit cost (hotcrm#2547; plan
 * *crm_project_budget_line*; REQ-0002 items 28–31).
 *
 * - **Labor** is hours × unit cost, and names the rate card of the level it
 *   plans for; the unit cost defaults from the card's cost rate per hour (a
 *   day card counts 8 hours, as a time entry does).
 * - **Subcontracted Services, Third-Party Goods, Expenses and Other** are
 *   quantity × unit cost.
 *
 * `amount` is stored, not a formula, because the version's Total Cost sums it
 * and a formula cannot be summed (`project_budget.hook.ts` keeps it). A labor
 * line without a rate card or hours, or another line without a quantity, is
 * refused when the version is sent for approval, not while it is drafted.
 *
 * A version's lines change only while it is Draft or Rejected.
 */
export const ProjectBudgetLine = ObjectSchema.create({
  name: 'crm_project_budget_line',
  label: 'Budget Line',
  pluralLabel: 'Budget Lines',
  icon: 'list',
  description: 'One planned cost of a budget version: category, month, quantity and unit cost',

  sharingModel: 'controlled_by_parent',
  nameField: 'description',
  highlightFields: ['category', 'period', 'amount'],

  fieldGroups: [
    { key: 'basic', label: 'Budget Line', icon: 'list' },
  ],

  fields: {
    crm_project_budget: Field.masterDetail('crm_project_budget', {
      label: 'Budget',
      group: 'basic',
      required: true,
      storage: { notNull: true },
      deleteBehavior: 'cascade',
      inlineEdit: 'grid',
      relatedListColumns: ['category', 'description', 'period', 'rate_card', 'hours', 'quantity', 'unit_cost', 'amount'],
    }),

    category: Field.select({
      label: 'Category',
      group: 'basic',
      required: true,
      options: BUDGET_LINE_CATEGORY_OPTIONS.map((o) => (o.value === 'labor' ? { ...o, default: true } : o)),
    }),

    description: Field.text({
      label: 'Description',
      group: 'basic',
      required: true,
      maxLength: 200,
    }),

    period: Field.date({
      label: 'Month',
      group: 'basic',
      description: 'The month the cost falls in. Saved as the first day of that month.',
    }),

    rate_card: Field.lookup('crm_rate_card', {
      label: 'Rate Card',
      group: 'basic',
      description: 'For a labor line: the level the hours are planned at. Its cost rate is the unit cost unless you type one.',
    }),

    hours: Field.number({
      label: 'Hours',
      group: 'basic',
      scale: 2,
      min: 0,
      description: 'For a labor line: the hours planned.',
    }),

    quantity: Field.number({
      label: 'Quantity',
      group: 'basic',
      scale: 2,
      min: 0,
      description: 'For any other line: how many units.',
    }),

    unit_cost: Field.currency({
      label: 'Unit Cost',
      group: 'basic',
      min: 0,
      description: 'Per hour for labor, per unit otherwise.',
    }),

    amount: Field.currency({
      label: 'Amount',
      group: 'basic',
      readonly: true,
      description: 'Hours × unit cost for labor, quantity × unit cost otherwise.',
    }),
  },

  indexes: [
    { fields: ['crm_project_budget'] },
    { fields: ['category'] },
  ],

  enable: {
    apiEnabled: true,
    // `bulk`: the version's New / Edit form saves its inline grid of lines
    // with the version in one `POST /batch`, which asks it of both objects
    // (hotcrm#2565).
    apiMethods: ['get', 'list', 'create', 'update', 'delete', 'bulk'],
  },
});
