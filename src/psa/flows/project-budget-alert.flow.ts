// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { P, cel } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/**
 * Budget alert (#2316 phase 1b).
 *
 * When a project's Budget Status crosses into Warning or Exceeded
 * (`project_budget_status` keeps it, at the lines in `../objects/_thresholds.ts`),
 * tell the project manager and every Finance Controller, once per crossing,
 * and propose the lock: the notice says to tick Lock Time and Expenses if no
 * more time or spend should be submitted. The flow never ticks it. Locking is
 * a person's decision, and nothing here is an override.
 *
 * "Once per crossing" is the start condition: it fires on the save that
 * CHANGES the status to Warning or to Exceeded. A project that stays in
 * Warning while more hours are approved hears nothing more; one that falls
 * back (a budget raised, an expense rejected) and crosses again is told
 * again, because that is a new crossing.
 *
 * Measured on 18.4.0 in phase 1b: the approval that moves a timesheet or
 * expense rewrites the project's summaries through the project's own update,
 * which is where the status moves, so this record-change flow sees it.
 *
 * Inbox and email: the people told are not the ones whose save moved the
 * figure, so the inbox notice is the console's live toast for whoever is
 * online, and the email reaches the rest.
 */
export const ProjectBudgetAlertFlow: Flow = {
  name: 'project_budget_alert',
  label: 'Project Budget Alert',
  description: 'When a project\'s spend crosses into Warning or Exceeded: tell its project manager and finance, and propose locking time and expenses.',
  type: 'record_change',
  status: 'active',
  // Elevated: the save that moves the figure is usually the platform's own
  // summary rewrite after an approval, which carries no user, and the flow
  // reads the Finance Controller holders (`sys_user_position`), which the
  // people whose saves start it cannot read.
  runAs: 'system',
  variables: [],
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: 'Start (budget status crossed)',
      config: {
        objectName: 'crm_project',
        triggerType: 'record-after-update',
        condition: P`has(record.budget_status) && record.budget_status != null
          && (record.budget_status == "warning" || record.budget_status == "exceeded")
          && (!has(previous.budget_status) || previous.budget_status == null || previous.budget_status != record.budget_status)`,
      },
    },
    {
      id: 'get_finance',
      type: 'get_record',
      label: 'Get Finance Controllers',
      config: {
        objectName: 'sys_user_position',
        filter: { position: 'crm_finance_controller' },
        fields: ['id', 'user_id'],
        limit: 200,
        outputVariable: 'financeHolders',
      },
    },
    // The branch is on the edges.
    { id: 'check_level', type: 'decision', label: 'Warning or Exceeded?' },
    {
      id: 'notify_warning',
      type: 'notify',
      label: 'Notify — Budget Warning',
      config: {
        recipients: [
          cel`has(record.project_manager) ? record.project_manager : null`,
          cel`has(vars.financeHolders) && vars.financeHolders != null ? vars.financeHolders.map(h, h.user_id) : []`,
        ],
        channels: ['inbox', 'email'],
        severity: 'warning',
        topic: 'project_budget_warning',
        template: 'crm.project_budget_warning',
        templateData: { name: cel`has(record.name) ? record.name : ""` },
        actionUrl: '/crm_project/{{record.id}}',
      },
    },
    {
      id: 'notify_exceeded',
      type: 'notify',
      label: 'Notify — Budget Exceeded',
      config: {
        recipients: [
          cel`has(record.project_manager) ? record.project_manager : null`,
          cel`has(vars.financeHolders) && vars.financeHolders != null ? vars.financeHolders.map(h, h.user_id) : []`,
        ],
        channels: ['inbox', 'email'],
        severity: 'critical',
        topic: 'project_budget_exceeded',
        template: 'crm.project_budget_exceeded',
        templateData: { name: cel`has(record.name) ? record.name : ""` },
        actionUrl: '/crm_project/{{record.id}}',
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],
  edges: [
    { id: 'e_start', source: 'start', target: 'get_finance', type: 'default' },
    { id: 'e_get', source: 'get_finance', target: 'check_level', type: 'default' },
    {
      id: 'e_warning', source: 'check_level', target: 'notify_warning', type: 'conditional', label: 'Warning',
      condition: P`!has(record.budget_status) || record.budget_status != "exceeded"`,
    },
    {
      id: 'e_exceeded', source: 'check_level', target: 'notify_exceeded', type: 'conditional', label: 'Exceeded',
      condition: P`has(record.budget_status) && record.budget_status == "exceeded"`,
    },
    { id: 'e_warning_end', source: 'notify_warning', target: 'end', type: 'default' },
    { id: 'e_exceeded_end', source: 'notify_exceeded', target: 'end', type: 'default' },
  ],
};
