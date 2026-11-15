// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { P } from '@objectstack/spec';
import { PROJECT_RESPONSIBILITY_OPTIONS } from './_psa-picklists';

/**
 * Project Member — one person staffed on a project: with what responsibility, at which
 * rate card, for how long (hotcrm#2316, plan *crm_project_member*).
 *
 * The rate card is what an entry of this person's hours on this project is
 * costed and billed at (`time_entry.hook.ts`). Saving a member keeps the
 * project's Team and Project Manager in step (`project_member.hook.ts`).
 */
export const ProjectMember = ObjectSchema.create({
  name: 'crm_project_member',
  label: 'Project Member',
  pluralLabel: 'Project Members',
  icon: 'user-plus',
  description: 'A person staffed on a project, with a responsibility, at a rate card',

  // Whoever reads the project reads its staffing (ADR-0055).
  sharingModel: 'controlled_by_parent',
  nameField: 'person',
  highlightFields: ['responsibility', 'rate_card', 'allocation_percent', 'end_date'],

  fieldGroups: [
    { key: 'basic', label: 'Staffing', icon: 'user-plus' },
  ],

  fields: {
    crm_project: Field.masterDetail('crm_project', {
      label: 'Project',
      group: 'basic',
      required: true,
      storage: { notNull: true },
      deleteBehavior: 'cascade',
      relatedListColumns: ['person', 'responsibility', 'rate_card', 'allocation_percent', 'start_date', 'end_date', 'is_billable'],
    }),

    person: Field.lookup('sys_user', {
      label: 'Person',
      group: 'basic',
      required: true,
    }),

    responsibility: Field.select({
      label: 'Responsibility',
      group: 'basic',
      required: true,
      options: PROJECT_RESPONSIBILITY_OPTIONS.map((o) => (o.value === 'consultant' ? { ...o, default: true } : o)),
    }),

    rate_card: Field.lookup('crm_rate_card', {
      label: 'Rate Card',
      group: 'basic',
      description: 'The cost and bill rate this person\'s hours on this project are counted at.',
      relatedListColumns: ['crm_project', 'person', 'responsibility'],
    }),

    allocation_percent: Field.percent({
      label: 'Allocation',
      group: 'basic',
      min: 0,
      max: 100,
    }),

    start_date: Field.date({ label: 'Start Date', group: 'basic' }),
    end_date: Field.date({ label: 'End Date', group: 'basic' }),

    is_billable: Field.boolean({
      label: 'Billable',
      group: 'basic',
      defaultValue: true,
      description: 'Whether this person\'s hours on this project are billed to the customer.',
    }),
  },

  validations: [
    {
      name: 'project_member_dates',
      type: 'script',
      severity: 'error',
      message: 'End Date must be on or after Start Date.',
      condition: P`has(record.start_date) && record.start_date != null && has(record.end_date) && record.end_date != null && record.end_date < record.start_date`,
    },
  ],

  indexes: [
    { fields: ['crm_project'] },
    { fields: ['person'] },
    { fields: ['rate_card'] },
  ],

  enable: {
    apiEnabled: true,
    apiMethods: ['get', 'list', 'create', 'update', 'delete'],
  },
});
