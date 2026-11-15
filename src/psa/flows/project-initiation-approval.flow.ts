// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { P, cel } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
import { PROJECT_FINANCE_REVIEW_BUDGET } from '../objects/_thresholds';
type Flow = Automation.Flow;

/**
 * Project initiation approval, 立项审批 (#2316 phase 1b).
 *
 * A project manager sends a Draft project for approval by setting In
 * Approval (the project's hook asks for an Approved Budget first). The
 * delivery leadership approves it from the Inbox: any Project Director or
 * PMO holder, first response wins. A project whose Approved Budget is
 * PROJECT_FINANCE_REVIEW_BUDGET or more then goes to a Finance Controller.
 * Approved by every tier, the project is Approved and its manager makes it
 * Active; rejected, it is Rejected and goes back to Draft for revision;
 * recalled, it is Draft again.
 *
 * The plan named a business-unit manager as the first approver. HotCRM has no
 * business unit and the platform's `manager` approver is the submitter's own
 * line manager, which in a delivery organization is often not who signs off a
 * project, so the first tier is the delivery leadership's two positions. A
 * customer that routes by line manager changes the one approver row.
 *
 * Built as `timesheet_approval` is (`./submission-approval.flow.ts`, which
 * explains why the status is written by the nodes and not mirrored): `runAs:
 * 'system'`, `lockRecord` (so the budget is held while it is decided), and
 * `admin_rescue` for an empty bench.
 */
export const ProjectInitiationApprovalFlow: Flow = {
  name: 'project_initiation_approval',
  label: 'Project Initiation Approval',
  description: `When a project is sent for approval: a Project Director or the PMO approves it, and a budget of ${PROJECT_FINANCE_REVIEW_BUDGET} or more then goes to a Finance Controller.`,
  type: 'record_change',
  status: 'active',
  // Elevated as `opportunity_approval` is: the gate must engage whoever sent
  // the project, and `mark_approved` writes onto a project the approval node
  // holds locked, which only a platform write may. The decider is still
  // attributed on that write (18.0.0 resume-as-decider).
  runAs: 'system',
  variables: [],
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: 'Start (project sent for approval)',
      config: {
        objectName: 'crm_project',
        triggerType: 'record-after-update',
        // As the submission flows: a save that moves the project to In
        // Approval, and not a write that leaves it there.
        condition: P`has(record.status) && record.status == "in_approval"
          && (!has(previous.status) || previous.status != "in_approval")`,
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
      id: 'get_project',
      type: 'get_record',
      label: 'Get Project',
      config: { objectName: 'crm_project', filter: { id: cel`record.id` }, outputVariable: 'projectRecord' },
    },
    { id: 'check_budget', type: 'decision', label: `Budget ${PROJECT_FINANCE_REVIEW_BUDGET} or More?` },
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
      config: { objectName: 'crm_project', filter: { id: cel`record.id` }, fields: { status: 'approved' } },
    },
    {
      id: 'mark_rejected',
      type: 'update_record',
      label: 'Mark Rejected',
      config: { objectName: 'crm_project', filter: { id: cel`record.id` }, fields: { status: 'rejected' } },
    },
    {
      id: 'back_to_draft',
      type: 'update_record',
      label: 'Back to Draft (recalled)',
      config: { objectName: 'crm_project', filter: { id: cel`record.id` }, fields: { status: 'draft' } },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],
  edges: [
    { id: 'e_start', source: 'start', target: 'leadership_review', type: 'default' },
    { id: 'e_leadership_approve', source: 'leadership_review', target: 'get_project', type: 'default', label: 'approve' },
    {
      id: 'e_leadership_reject', source: 'leadership_review', target: 'mark_rejected', type: 'conditional', label: 'reject',
      condition: P`!has(vars.leadership_review) || !has(vars.leadership_review.decision) || vars.leadership_review.decision != "recall"`,
    },
    {
      id: 'e_leadership_recall', source: 'leadership_review', target: 'back_to_draft', type: 'conditional', label: 'reject',
      condition: P`has(vars.leadership_review) && has(vars.leadership_review.decision) && vars.leadership_review.decision == "recall"`,
    },
    { id: 'e_get', source: 'get_project', target: 'check_budget', type: 'default' },
    {
      id: 'e_large', source: 'check_budget', target: 'finance_review', type: 'conditional',
      label: `${PROJECT_FINANCE_REVIEW_BUDGET} or more`,
      condition: P`has(vars.projectRecord) && has(vars.projectRecord.approved_budget) && vars.projectRecord.approved_budget != null
        && vars.projectRecord.approved_budget >= ${PROJECT_FINANCE_REVIEW_BUDGET}`,
    },
    {
      id: 'e_small', source: 'check_budget', target: 'mark_approved', type: 'conditional',
      label: `Under ${PROJECT_FINANCE_REVIEW_BUDGET}`,
      condition: P`!has(vars.projectRecord) || !has(vars.projectRecord.approved_budget) || vars.projectRecord.approved_budget == null
        || vars.projectRecord.approved_budget < ${PROJECT_FINANCE_REVIEW_BUDGET}`,
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
