// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { P, cel } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
import { BUDGET_TOP_UP_FINANCE_REVIEW_PERCENT } from '../objects/_thresholds';
type Flow = Automation.Flow;

/**
 * Budget top-up approval, 成本调整审批 (hotcrm#2547, PSA phase 2c; REQ-0002 item
 * 32).
 *
 * A project manager asks for more budget by making a new version of the
 * project's budget (version 2 or later), giving its reason, and setting it In
 * Approval. The delivery leadership approves it from the Inbox: any Project
 * Director or PMO holder, first response wins, as for the project's
 * initiation. A top-up that raises the baseline by
 * BUDGET_TOP_UP_FINANCE_REVIEW_PERCENT or more then goes to a Finance
 * Controller. Approved by every tier, the version is Approved and
 * `project_budget_baseline` makes it the baseline, so the project's Approved
 * Budget becomes its total; rejected, it is Rejected and goes back to Draft for
 * revision; recalled, it is Draft again.
 *
 * Version 1 is not decided here: it rides on the project's initiation approval
 * (`with_initiation`, set by `project_budget_follow`), which is why the start
 * condition leaves it out. The plan named the project manager as the first
 * approver, but the project manager is the one asking (seat ruling, 2026-11-16).
 *
 * Built as `project_initiation_approval` is: `runAs: 'system'`, `lockRecord`
 * (the version is held while it is decided), and `admin_rescue` for an empty
 * bench.
 */
export const ProjectBudgetApprovalFlow: Flow = {
  name: 'project_budget_approval',
  label: 'Budget Top-Up Approval',
  description: `When a budget top-up is sent for approval: a Project Director or the PMO approves it, and one raising the baseline by ${BUDGET_TOP_UP_FINANCE_REVIEW_PERCENT}% or more then goes to a Finance Controller.`,
  type: 'record_change',
  status: 'active',
  // Elevated as `project_initiation_approval` is: the gate must engage whoever
  // sent the version, and `mark_approved` writes onto a version the approval
  // node holds locked, which only a platform write may. The decider is still
  // attributed on that write (18.0.0 resume-as-decider).
  runAs: 'system',
  variables: [],
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: 'Start (top-up sent for approval)',
      config: {
        objectName: 'crm_project_budget',
        triggerType: 'record-after-update',
        // A save that moves the version to In Approval on its own, not the
        // version 1 the project's own approval carries.
        condition: P`has(record.status) && record.status == "in_approval"
          && (!has(previous.status) || previous.status != "in_approval")
          && (!has(record.with_initiation) || record.with_initiation != true)`,
      },
    },
    {
      id: 'leadership_review',
      type: 'approval',
      label: 'Project Director Review',
      config: {
        approvers: [
          { type: 'position', value: 'crm_project_director' },
          { type: 'position', value: 'crm_pmo' },
        ],
        onEmptyApprovers: 'admin_rescue',
        behavior: 'first_response',
        lockRecord: true,
      },
    },
    {
      id: 'get_budget',
      type: 'get_record',
      label: 'Get Budget Version',
      config: { objectName: 'crm_project_budget', filter: { id: cel`record.id` }, outputVariable: 'budgetRecord' },
    },
    {
      id: 'get_project',
      type: 'get_record',
      label: 'Get Project',
      config: { objectName: 'crm_project', filter: { id: cel`vars.budgetRecord.crm_project` }, outputVariable: 'projectRecord' },
    },
    { id: 'check_raise', type: 'decision', label: `Raises the Baseline ${BUDGET_TOP_UP_FINANCE_REVIEW_PERCENT}% or More?` },
    {
      id: 'finance_review',
      type: 'approval',
      label: 'Finance Controller Review',
      config: {
        approvers: [{ type: 'position', value: 'crm_finance_controller' }],
        onEmptyApprovers: 'admin_rescue',
        behavior: 'first_response',
        lockRecord: true,
      },
    },
    {
      id: 'mark_approved',
      type: 'update_record',
      label: 'Mark Approved',
      config: { objectName: 'crm_project_budget', filter: { id: cel`record.id` }, fields: { status: 'approved' } },
    },
    {
      id: 'mark_rejected',
      type: 'update_record',
      label: 'Mark Rejected',
      config: { objectName: 'crm_project_budget', filter: { id: cel`record.id` }, fields: { status: 'rejected' } },
    },
    {
      id: 'back_to_draft',
      type: 'update_record',
      label: 'Back to Draft (recalled)',
      config: { objectName: 'crm_project_budget', filter: { id: cel`record.id` }, fields: { status: 'draft' } },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],
  edges: [
    { id: 'e_start', source: 'start', target: 'leadership_review', type: 'default' },
    { id: 'e_leadership_approve', source: 'leadership_review', target: 'get_budget', type: 'default', label: 'approve' },
    {
      id: 'e_leadership_reject', source: 'leadership_review', target: 'mark_rejected', type: 'conditional', label: 'reject',
      condition: P`!has(vars.leadership_review) || !has(vars.leadership_review.decision) || vars.leadership_review.decision != "recall"`,
    },
    {
      id: 'e_leadership_recall', source: 'leadership_review', target: 'back_to_draft', type: 'conditional', label: 'reject',
      condition: P`has(vars.leadership_review) && has(vars.leadership_review.decision) && vars.leadership_review.decision == "recall"`,
    },
    { id: 'e_get_budget', source: 'get_budget', target: 'get_project', type: 'default' },
    { id: 'e_get_project', source: 'get_project', target: 'check_raise', type: 'default' },
    {
      // No baseline to measure against (a project approved before budget
      // versions), a version that cannot be read, or a raise of the threshold
      // or more: finance signs too. `e_small` is its exact complement.
      id: 'e_large', source: 'check_raise', target: 'finance_review', type: 'conditional',
      label: `${BUDGET_TOP_UP_FINANCE_REVIEW_PERCENT}% or more`,
      condition: P`!has(vars.projectRecord) || vars.projectRecord == null
        || !has(vars.projectRecord.approved_budget) || vars.projectRecord.approved_budget == null || vars.projectRecord.approved_budget <= 0
        || !has(vars.budgetRecord) || vars.budgetRecord == null
        || !has(vars.budgetRecord.total_cost) || vars.budgetRecord.total_cost == null
        || (vars.budgetRecord.total_cost - vars.projectRecord.approved_budget) * 100 >= ${BUDGET_TOP_UP_FINANCE_REVIEW_PERCENT} * vars.projectRecord.approved_budget`,
    },
    {
      id: 'e_small', source: 'check_raise', target: 'mark_approved', type: 'conditional',
      label: `Under ${BUDGET_TOP_UP_FINANCE_REVIEW_PERCENT}%`,
      condition: P`has(vars.projectRecord) && vars.projectRecord != null
        && has(vars.projectRecord.approved_budget) && vars.projectRecord.approved_budget != null && vars.projectRecord.approved_budget > 0
        && has(vars.budgetRecord) && vars.budgetRecord != null
        && has(vars.budgetRecord.total_cost) && vars.budgetRecord.total_cost != null
        && (vars.budgetRecord.total_cost - vars.projectRecord.approved_budget) * 100 < ${BUDGET_TOP_UP_FINANCE_REVIEW_PERCENT} * vars.projectRecord.approved_budget`,
    },
    { id: 'e_finance_approve', source: 'finance_review', target: 'mark_approved', type: 'default', label: 'approve' },
    {
      id: 'e_finance_reject', source: 'finance_review', target: 'mark_rejected', type: 'conditional', label: 'reject',
      condition: P`!has(vars.finance_review) || !has(vars.finance_review.decision) || vars.finance_review.decision != "recall"`,
    },
    {
      id: 'e_finance_recall', source: 'finance_review', target: 'back_to_draft', type: 'conditional', label: 'reject',
      condition: P`has(vars.finance_review) && has(vars.finance_review.decision) && vars.finance_review.decision == "recall"`,
    },
    { id: 'e_approved_end', source: 'mark_approved', target: 'end', type: 'default' },
    { id: 'e_rejected_end', source: 'mark_rejected', target: 'end', type: 'default' },
    { id: 'e_draft_end', source: 'back_to_draft', target: 'end', type: 'default' },
  ],
};
