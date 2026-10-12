// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/**
 * Account Approval — the sign-off a new account record needs before it counts
 * as established data.
 *
 * REQ-0003 step 5: 「客户信息提交后进入审批流，审批通过后客户正式生效」. Expressed as an
 * **approval node** (`type: 'approval'`, ADR-0019), the construct
 * `opportunity-approval.flow.ts` and `lead-conversion-approval.flow.ts` already
 * use — ⛔ there is no `workflow` metadata type and no standalone
 * `ApprovalProcess` to author.
 *
 * ## ⚠️ This flow ships ARMED, and that is the one place it differs from its
 * ## lead sibling
 *
 * `lead-conversion-approval` is inert until an install opts in, because
 * REQ-0005 asked for a gate that is off by default. REQ-0003 asks for the
 * opposite in as many words — acceptance 4: "A newly created account sits in a
 * pending state, appears in the platform approval inbox HotCRM already mounts,
 * and only reaches the approved state through a decision on that request." So
 * every new account enters here: `crm_account.approval_status` ships with NO
 * default, a new account is born blank, and the start condition below fires on
 * the blank.
 *
 * ## `pending` is written by the request, not by the field default (#2067)
 *
 * The approval node's `approvalStatusField` mirror writes `pending` onto the
 * account the moment it opens the request (plugin-approvals `openNodeRequest`,
 * measured on 17.7.0), inside the create, so with approvals in the
 * composition acceptance 4 holds exactly as before and `pending` always has a
 * request behind it. Without approvals no executor exists for the node, the
 * run fails at it (`No executor registered for node type 'approval'`), and
 * nothing writes `pending`: the account stays blank and editable. A shipped
 * `pending` default had stamped every such account `pending` with no request
 * behind it, and the console derives its lock from that value, so each one
 * read "locked for approval" forever with nothing able to decide it.
 *
 * The off switch is still the field default, not this flow's `status`: an
 * install that wants no account sign-off gives the column a default of
 * `approved`, the start condition below is then false for every record that
 * will ever exist, and the gate is off AND still switchable. ⛔ Do NOT reach
 * for `status: 'draft'` or `'obsolete'` instead — both were measured on
 * `@objectstack/service-automation` 17.4.0 and neither is an off switch: draft
 * flows still fire their triggers, and `isFlowEnabled` composes authoring
 * status with the installation's activation ledger so that `obsolete` is a gate
 * no install can ever turn back ON. That measurement is recorded in
 * `lead-conversion-approval.flow.ts`; it is quoted here, ⛔ not re-derived.
 *
 * ## Why the trigger is insert-only
 *
 * Submission happens at exactly one moment, the account's creation, so that is
 * where the request is opened. ⛔ An afterUpdate twin would re-enter on every
 * edit made while the account sat blank or pending and open a second request
 * for the same decision. The trigger, not the condition, is also what keeps an
 * account that predates this field out: it carries no `approval_status`, which
 * the condition below would read as blank, but it is never inserted again, so
 * it is never dragged into an approval it was not created under.
 */
export const AccountApprovalFlow: Flow = {
  name: 'account_approval',
  label: 'Account Approval',
  description:
    'Sign-off a newly created account needs before it counts as established data. Switchable from crm_account.approval_status.',
  type: 'record_change',
  status: 'active',
  // Same reading the two sibling approval flows record. A gate exists to
  // CONSTRAIN the submitter, so the submitter's own scope is the wrong identity
  // to evaluate it under; and the verdict writes below land on
  // `approval_status`, which is `readonly: true` on the object, so only a
  // platform write reaches it at all.
  runAs: 'system',

  variables: [{ name: 'accountId', type: 'text', isInput: true, isOutput: false }],

  nodes: [
    {
      id: 'start',
      type: 'start',
      label: 'Start',
      config: {
        objectName: 'crm_account',
        triggerType: 'record-after-create',
        // Fires on the BLANK a new account is born with (see the header):
        // absent on a sparse driver, null on SQL. A user cannot pre-fill the
        // column (it is `readonly`), so only a system writer or an install's
        // `approved` default can make it non-blank at insert, and both mean
        // "nothing to submit".
        // TOTALITY (AGENTS.md — validation predicates must be TOTAL): the
        // `(!has(x) || isBlank(x))` form is the "x holds no value" row of that
        // table. A flow condition is strict CEL on every run, and an unguarded
        // read against a driver that omits absent columns aborts — which from
        // 17.0.0-rc.2 FAILS THE RUN rather than skipping it.
        condition: P`!has(record.approval_status) || isBlank(record.approval_status)`,
      },
    },
    {
      id: 'get_account',
      type: 'get_record',
      label: 'Get Account',
      config: {
        objectName: 'crm_account',
        filter: { id: '{record.id}' },
        outputVariable: 'accountRecord',
      },
    },
    {
      id: 'account_review',
      type: 'approval',
      label: 'Account Review',
      config: {
        // The customer's chain is 销售负责人 → 销售总监; REQ-0003 rules that named
        // chain **C** (overlay — one company's org chart), so core ships the
        // one generic tier against the manager bench this app already declares.
        approvers: [{ type: 'position', value: 'sales_manager' }],
        // Explicit though it is the schema default, exactly as both sibling
        // flows author it: approvers snapshot at request creation, so an empty
        // bench would otherwise leave the request undecidable — and here that
        // means an account nobody can ever approve.
        onEmptyApprovers: 'admin_rescue',
        behavior: 'first_response',
        // ⚠️ `false`, matching the lead sibling rather than the opportunity one.
        // An account under review is a record a rep is still working — contacts
        // are being attached, the address is being corrected, activity is
        // landing on it. Locking it would freeze exactly the data-entry the
        // approval exists to review. Nothing is at risk: the verdict column is
        // `readonly: true`, so the only field this decision touches is one no
        // user may write anyway.
        lockRecord: false,
        approvalStatusField: 'approval_status',
      },
    },
    {
      id: 'mark_approved',
      type: 'update_record',
      label: 'Mark Approved',
      config: {
        objectName: 'crm_account',
        filter: { id: '{record.id}' },
        fields: { approval_status: 'approved' },
      },
    },
    {
      id: 'notify_approved',
      type: 'notify',
      label: 'Notify Owner — Approved',
      config: {
        recipients: ['{accountRecord.owner_id}'],
        channels: ['inbox'],
        topic: 'account_approved',
        template: 'crm.account_approved',
        templateData: { name: '{accountRecord.name}' },
        actionUrl: '/crm_account/{record.id}',
      },
    },
    {
      id: 'mark_rejected',
      type: 'update_record',
      label: 'Mark Rejected',
      config: {
        objectName: 'crm_account',
        filter: { id: '{record.id}' },
        fields: { approval_status: 'rejected' },
      },
    },
    {
      id: 'notify_rejected',
      type: 'notify',
      label: 'Notify Owner — Rejected',
      config: {
        recipients: ['{accountRecord.owner_id}'],
        channels: ['inbox'],
        severity: 'warning',
        topic: 'account_rejected',
        template: 'crm.account_rejected',
        templateData: { name: '{accountRecord.name}' },
        actionUrl: '/crm_account/{record.id}',
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'e1', source: 'start', target: 'get_account', type: 'default' },
    { id: 'e2', source: 'get_account', target: 'account_review', type: 'default' },
    // Approval-node branch labels — the engine resumes down the out-edge whose
    // `label` matches the recorded decision.
    { id: 'e3', source: 'account_review', target: 'mark_approved', type: 'default', label: 'approve' },
    { id: 'e4', source: 'account_review', target: 'mark_rejected', type: 'default', label: 'reject' },
    { id: 'e5', source: 'mark_approved', target: 'notify_approved', type: 'default' },
    { id: 'e6', source: 'notify_approved', target: 'end', type: 'default' },
    { id: 'e7', source: 'mark_rejected', target: 'notify_rejected', type: 'default' },
    { id: 'e8', source: 'notify_rejected', target: 'end', type: 'default' },
  ],
};
