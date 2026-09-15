// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/**
 * Lead Conversion Approval — sign-off before a lead may become a deal.
 *
 * REQ-0005 step 7: 「线索对应审批流程，审批通过后方可转化为正式商机」. Expressed as an
 * **approval node** (`type: 'approval'`, ADR-0019), the construct
 * `opportunity-approval.flow.ts` already uses — ⛔ there is no `workflow`
 * metadata type and no standalone `ApprovalProcess` to author.
 *
 * ## ⚠️ This flow is INERT until an install arms the gate, and that is by design
 *
 * REQ-0005: "The gate must be configurable — off by default. A single-seller
 * install must not be forced through an approval to convert a lead."
 *
 * The switch is `crm_lead.conversion_approval_status`'s `defaultValue`, not this
 * flow's `status`. Shipped, that default is `not_required`, so NO lead is ever
 * born `pending` and the start condition below is false for every record that
 * has ever existed — the flow registers, binds its trigger, opens nothing, and
 * costs a predicate evaluation per insert. An install arms the gate by changing
 * that one value to `'pending'`; from then on every NEW lead enters here, and
 * `lead.hook.ts` refuses its conversion until this flow writes a verdict.
 *
 * ⛔ Do NOT reach for `status: 'draft'` as the off switch instead. Measured on
 * the pinned `@objectstack/service-automation` 17.4.0, whose own registration
 * diagnostic says it in as many words — "draft flows still fire their triggers;
 * set status: 'active' to make intent explicit, or 'obsolete' to disable". And
 * ⛔ not `'obsolete'` either: `isFlowEnabled` composes the authoring status with
 * the installation's activation ledger so that "either one disarms; neither can
 * override the other", which makes `obsolete` a gate no install can ever turn
 * ON — the opposite of configurable. A condition no record satisfies is off AND
 * switchable; a disabled flow is only off.
 *
 * ## Why the trigger is insert-only
 *
 * `pending` appears at exactly one moment — the field default, stamped as the
 * row is written — so the request is opened where it appears. ⛔ An afterUpdate
 * twin (the shape `opportunity_approval` needs, because a deal can GROW across
 * its threshold) would re-enter on every edit made while the lead sat pending
 * and open a second request for the same decision.
 *
 * ⇒ A lead that predates the arming keeps `not_required` and never enters, which
 * is REQ-0005 acceptance 4 holding by construction: arming the gate invalidates
 * no existing record.
 */
export const LeadConversionApprovalFlow: Flow = {
  name: 'lead_conversion_approval',
  label: 'Lead Conversion Approval',
  description:
    'Sign-off a lead needs before it may be converted. Inert unless the install arms the gate on crm_lead.conversion_approval_status.',
  type: 'record_change',
  status: 'active',
  // Same reading `opportunity_approval` records, and for the same two reasons.
  // A gate exists to CONSTRAIN the submitter, so the submitter's own scope is
  // the wrong identity to evaluate it under — and an approval control that
  // engages only for writers carrying a session is not a control, since a
  // `runAs: 'system'` importer creating leads would simply bypass it. The
  // verdict writes below also land on `conversion_approval_status`, which is
  // `readonly: true` on the object, so only a platform write reaches it.
  runAs: 'system',

  variables: [
    { name: 'leadId', type: 'text', isInput: true, isOutput: false },
  ],

  nodes: [
    {
      id: 'start',
      type: 'start',
      label: 'Start',
      config: {
        objectName: 'crm_lead',
        triggerType: 'record-after-create',
        // TOTALITY (AGENTS.md — validation predicates must be TOTAL): `has()`
        // on every read. A flow condition is strict CEL on every run, and an
        // unguarded read against a driver that omits absent columns aborts —
        // which from 17.0.0-rc.2 FAILS THE RUN rather than skipping it. The
        // absent case must read as "not gated": a lead with no approval column
        // at all is a lead from before the field existed, and it converts the
        // way it always did.
        condition: P`has(record.conversion_approval_status) && record.conversion_approval_status == "pending"`,
      },
    },
    {
      id: 'get_lead',
      type: 'get_record',
      label: 'Get Lead',
      config: { objectName: 'crm_lead', filter: { id: '{record.id}' }, outputVariable: 'leadRecord' },
    },
    {
      id: 'conversion_review',
      type: 'approval',
      label: 'Lead Conversion Review',
      config: {
        // The customer's chain is 销售负责人 → 销售总监; the generic shape core
        // ships is the manager bench this app already declares approvers
        // against. A second tier, or a different position, is overlay
        // configuration — the same status as the need-type vocabulary.
        approvers: [{ type: 'position', value: 'sales_manager' }],
        // Explicit though it is the schema default, exactly as
        // `opportunity_approval` authors it: approvers snapshot at request
        // creation, so an empty bench would otherwise leave the request
        // undecidable — and here that means a lead nobody can ever convert.
        onEmptyApprovers: 'admin_rescue',
        behavior: 'first_response',
        // ⚠️ `false`, and NOT the schema default `true` — the one place this
        // node deliberately differs from its opportunity sibling. A deal under
        // review is a document being negotiated; a LEAD under review is a person
        // a rep is still calling. Locking the record would freeze
        // `last_contacted_date`, `next_followup_date`, the notes and every
        // activity bubble for as long as the approver takes, so the gate would
        // stop the work it exists to authorise. Nothing is at risk in leaving it
        // open: the verdict column is `readonly: true`, so the only field this
        // node's decision touches is one no user may write anyway.
        lockRecord: false,
        approvalStatusField: 'conversion_approval_status',
      },
    },
    {
      id: 'mark_approved',
      type: 'update_record',
      label: 'Mark Approved',
      config: {
        objectName: 'crm_lead',
        filter: { id: '{record.id}' },
        fields: { conversion_approval_status: 'approved' },
      },
    },
    {
      id: 'notify_approved',
      type: 'notify',
      label: 'Notify Owner — Approved',
      config: {
        recipients: ['{leadRecord.owner_id}'],
        channels: ['inbox'],
        topic: 'lead_conversion_approved',
        title: 'Lead approved for conversion: {leadRecord.first_name} {leadRecord.last_name}',
        message: 'This lead has been signed off. You can convert it into an account, contact and opportunity.',
        actionUrl: '/crm_lead/{record.id}',
      },
    },
    {
      id: 'mark_rejected',
      type: 'update_record',
      label: 'Mark Rejected',
      config: {
        objectName: 'crm_lead',
        filter: { id: '{record.id}' },
        fields: { conversion_approval_status: 'rejected' },
      },
    },
    {
      id: 'notify_rejected',
      type: 'notify',
      label: 'Notify Owner — Rejected',
      config: {
        recipients: ['{leadRecord.owner_id}'],
        channels: ['inbox'],
        severity: 'warning',
        topic: 'lead_conversion_rejected',
        title: 'Lead not approved: {leadRecord.first_name} {leadRecord.last_name}',
        message: 'Conversion of this lead was not approved. Keep working it, or disqualify it with a reason.',
        actionUrl: '/crm_lead/{record.id}',
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'e1', source: 'start', target: 'get_lead', type: 'default' },
    { id: 'e2', source: 'get_lead', target: 'conversion_review', type: 'default' },
    // Approval-node branch labels — the engine resumes down the out-edge whose
    // `label` matches the recorded decision.
    { id: 'e3', source: 'conversion_review', target: 'mark_approved', type: 'default', label: 'approve' },
    { id: 'e4', source: 'conversion_review', target: 'mark_rejected', type: 'default', label: 'reject' },
    { id: 'e5', source: 'mark_approved', target: 'notify_approved', type: 'default' },
    { id: 'e6', source: 'notify_approved', target: 'end', type: 'default' },
    { id: 'e7', source: 'mark_rejected', target: 'notify_rejected', type: 'default' },
    { id: 'e8', source: 'notify_rejected', target: 'end', type: 'default' },
  ],
};
