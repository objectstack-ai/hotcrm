import { F, P } from '@objectstack/spec';
// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Case = ObjectSchema.create({
  name: 'crm_case',
  label: 'Case',
  pluralLabel: 'Cases',
  icon: 'life-buoy',
  description: 'Customer support cases and service requests',

  // ADR-0090 D1/D7: OWD is an authored decision. Owner + escalation sharing rule.
  sharingModel: 'private',

  fieldGroups: [
    { key: 'basic',       label: 'Case Information', icon: 'info' },
    { key: 'origin',      label: 'Origin & Routing', icon: 'route' },
    { key: 'sla',         label: 'SLA & Priority',   icon: 'clock' },
    { key: 'resolution',  label: 'Resolution',       icon: 'check-circle' },
    { key: 'escalation',  label: 'Escalation',       icon: 'alert-triangle', defaultExpanded: false },
    { key: 'system',      label: 'System',           icon: 'database',       defaultExpanded: false },
  ],

  fields: {
    // Platform ownership anchor — canonical note in `account.object.ts` (#548).
    owner_id: Field.lookup('sys_user', {
      label: 'Case Owner',
      group: 'origin',
      system: true,
      readonly: false,
      trackHistory: true,
    }),

    // Case Information
    case_number: Field.autonumber({
      label: 'Case Number',
      group: 'basic',
      format: 'CASE-{00000}',
    }),
    
    subject: Field.text({
      label: 'Subject',
      group: 'basic',
      required: true,
      storage: { notNull: true },
      searchable: true,
      maxLength: 255,
    }),

    // ADR-0079 record title (was titleFormat '{case_number} - {subject}').
    display_title: Field.formula({
      label: 'Display Title',
      group: 'basic',
      expression: F`record.case_number + " - " + record.subject`,
    }),

    description: Field.markdown({
      label: 'Description',
      group: 'basic',
      required: true,
      storage: { notNull: true },
    }),
    
    // Relationships
    crm_account: Field.lookup('crm_account', {
      label: 'Account',
      group: 'basic',
    }),
    
    crm_contact: Field.lookup('crm_contact', {
      label: 'Contact',
      group: 'basic',
      // Optional so Web-to-Case (anonymous) submissions can land without
      // an existing CRM contact. Back-office staff or a triage flow links
      // the case to a contact after the fact. This matches the Salesforce
      // Web-to-Case convention.
      // @objectstack 12: string[] `referenceFilters` is dead (not read by the
      // picker). `dependsOn` is the live cascading-lookup form — it scopes the
      // contact candidates to those sharing the case's `crm_account` (ADR-0049).
      dependsOn: ['crm_account'],
    }),
    
    // Case Management
    status: Field.select({
      label: 'Status',
      group: 'basic',
      required: true,
      storage: { notNull: true },
      // ADR-0052 §5b.1 — platform auto-renders status changes on the timeline
      // ("Status: New → Escalated"). Delivers the case timeline declaratively
      // (the hand-coded version was deferred in #396 due to a hook-crash bug).
      trackHistory: true,
      options: [
        { label: 'New', value: 'new', color: '#808080', default: true },
        { label: 'In Progress', value: 'in_progress', color: '#FFA500' },
        { label: 'Waiting on Customer', value: 'waiting_customer', color: '#FFD700' },
        { label: 'Waiting on Support', value: 'waiting_support', color: '#4169E1' },
        { label: 'Escalated', value: 'escalated', color: '#FF0000' },
        { label: 'Resolved', value: 'resolved', color: '#00AA00' },
        { label: 'Closed', value: 'closed', color: '#006400' },
      ]
    }),
    
    priority: Field.select({
      label: 'Priority',
      group: 'sla',
      required: true,
      storage: { notNull: true },
      trackHistory: true,
      options: [
        { label: 'Low', value: 'low', color: '#4169E1', default: true },
        { label: 'Medium', value: 'medium', color: '#FFA500' },
        { label: 'High', value: 'high', color: '#FF4500' },
        { label: 'Critical', value: 'critical', color: '#FF0000' },
      ]
    }),

    // Sortable ordinal for `priority`. Ordering a queue by the select field
    // itself sorts the raw strings, so `priority desc` yields
    // medium > low > high > critical — the exact inversion of urgency, which
    // buried every critical case at the bottom of the agent's queue. Select
    // options carry no ordinal in the spec, so the rank is materialised here
    // and stamped by `case_sla_defaults`; queue views sort on it instead.
    // `0` is the UNRANKED sentinel, shared with crm_task.priority_rank: it is
    // what a record carries when no recognised priority has been stamped, and
    // it sorts below every real rank (1–4) on the `priority_rank desc` queues.
    // It used to be `1` here and `2` on crm_task, so the same unknown priority
    // ordered differently on the two objects — and on this object it was
    // indistinguishable from a genuine `low`.
    priority_rank: Field.number({
      label: 'Priority Rank',
      readonly: true,
      defaultValue: 0,
    }),

    type: Field.select({
      label: 'Case Type',
      group: 'basic',
      options: [
        { label: 'Question', value: 'question' },
        { label: 'Problem', value: 'problem' },
        { label: 'Feature Request', value: 'feature_request' },
        { label: 'Bug', value: 'bug' },
      ]
    }),
    
    origin: Field.select({
      label: 'Case Origin',
      group: 'origin',
      options: [
        { label: 'Email', value: 'email' },
        { label: 'Phone', value: 'phone' },
        { label: 'Web', value: 'web' },
        { label: 'Chat', value: 'chat' },
        { label: 'Social Media', value: 'social_media' },
      ]
    }),
    
    // Assignment
    
    // SLA and Metrics
    created_date: Field.datetime({
      label: 'Created Date',
      group: 'sla',
      readonly: true,
    }),
    
    closed_date: Field.datetime({
      label: 'Closed Date',
      group: 'sla',
      readonly: true,
    }),
    
    // NOT `readonly`: stamped by the `log_call` / `log_meeting` activity
    // actions (`src/actions/global.actions.ts`), and 16.x drops writes to
    // readonly fields on user-context writes (#2948) — an action body runs as
    // the acting user, so `readonly` here silently disabled the stamp. Same
    // reason `is_sla_violated` and `escalated_date` below are not readonly.
    //
    // Definition: the moment the customer first heard back from us, matching
    // Salesforce `FirstResponseDateTime` / Zendesk first reply time — NOT an
    // internal status change, which would report "responded" while the
    // customer is still waiting (#575 B2).
    first_response_date: Field.datetime({
      label: 'First Response Date',
      group: 'sla',
    }),
    
    resolution_time_hours: Field.number({
      label: 'Resolution Time (Hours)',
      group: 'sla',
      readonly: true,
      scale: 2,
    }),
    
    sla_due_date: Field.datetime({
      label: 'SLA Due Date',
      group: 'sla',
    }),
    
    // NOT `readonly`: the case_sla_monitor flow stamps this, and 16.x drops
    // writes to readonly fields (#2948) — readonly here silently disabled
    // SLA violation tracking.
    is_sla_violated: Field.boolean({
      label: 'SLA Violated',
      group: 'sla',
      defaultValue: false,
    }),
    
    // Escalation
    is_escalated: Field.boolean({
      label: 'Escalated',
      group: 'escalation',
      defaultValue: false,
    }),
    
    // NOT `readonly`: written by case_escalation / case_sla_monitor flows
    // (16.x drops readonly writes, #2948).
    escalated_date: Field.datetime({
      label: 'Escalated Date',
      group: 'escalation',
    }),
    
    escalation_reason: Field.textarea({
      label: 'Escalation Reason',
      group: 'escalation',
    }),
    
    // Related case
    parent_case: Field.lookup('crm_case', {
      label: 'Parent Case',
      group: 'basic',
      description: 'Related parent case',
    }),
    
    // Resolution
    resolution: Field.markdown({
      label: 'Resolution',
      group: 'resolution',
    }),
    
    // Customer satisfaction
    customer_rating: Field.rating(5, {
      label: 'Customer Satisfaction',
      group: 'resolution',
      description: 'Customer satisfaction rating (1-5 stars)',
    }),
    
    customer_feedback: Field.textarea({
      label: 'Customer Feedback',
      group: 'resolution',
    }),
    
    // Customer signature (for case resolution acknowledgment)
    customer_signature: Field.signature({
      label: 'Customer Signature',
      group: 'resolution',
      description: 'Digital signature acknowledging case resolution',
    }),
    
    // Internal notes
    internal_notes: Field.markdown({
      label: 'Internal Notes',
      group: 'system',
      description: 'Internal notes not visible to customer',
    }),
    
    // Flags
    is_closed: Field.boolean({
      label: 'Is Closed',
      group: 'system',
      defaultValue: false,
      readonly: true,
    }),
  },
  
  // Database indexes for performance
  //
  // `case_number` is an autonumber (`CASE-{00000}`), and the platform's
  // autonumber sequence is PER TENANT — every organization counts from 1. A
  // platform-wide unique index on it therefore rejects the second
  // organization's `CASE-00001` on insert: the exact collision framework #3696
  // exists to prevent. Spelled out as the tenant composite so the constraint
  // matches the sequence that feeds it.
  indexes: [
    { fields: ['organization_id', 'case_number'], unique: true },
    { fields: ['crm_account'] },
    { fields: ['owner_id'] },
    { fields: ['status'] },
    { fields: ['priority'] },
  ],
  
  // Dead enable.* flags (trash/mru) removed in @objectstack 12 (ADR-0049);
  // History → Field.trackHistory (ADR-0052).
  enable: {
    apiEnabled: true,
    // #602 — screenshots and logs are how a support case gets diagnosed.
    // See the canonical capability note in `src/objects/index.ts`.
    files: true,
  },

  // ADR-0052 §5b.2 — declarative milestone activity for the service narrative.
  // The caseSideEffects hook still owns its real side-effects (escalation task,
  // closed-date stamping); these are timeline entries only, emitted by the platform.
  activityMilestones: [
    { field: 'status', value: 'escalated', summary: 'Case escalated — {subject}', type: 'updated' },
    { field: 'status', value: 'resolved', summary: 'Case resolved — {subject}', type: 'completed' },
    { field: 'status', value: 'closed', summary: 'Case closed — {subject}', type: 'completed' },
  ],

  // ADR-0079: render-only `titleFormat` retired in favor of `nameField`,
  // which names a real field. The former template composed two local fields, so
  // the `display_title` formula field (see fields) reproduces it.
  nameField: 'display_title',
  // Explicit search targets (ADR-0061). REQUIRED because nameField is a
  // FORMULA (display_title/full_name): without this, $search auto-defaults to
  // the formula field, which isn't a real column, so the lookup picker + global
  // search silently return zero. These are real, indexed columns.
  searchableFields: ['subject', 'case_number'],
  highlightFields: ['case_number', 'subject', 'crm_account', 'status', 'priority'],
  
  // Removed: list_views and form_views belong in UI configuration, not object definition
  
  // Predicates below are TOTAL: every `record.x` read is `has()`-guarded, so the
  // rule returns a verdict even when the merged record has no such key. See
  // AGENTS.md "Validation predicates must be TOTAL" and
  // test/object-validation-predicates.test.ts, which fails the build otherwise.
  validations: [
    {
      name: 'resolution_required_for_closed',
      type: 'script',
      severity: 'error',
      message: 'Resolution is required when closing a case',
      condition: P`has(record.status) && record.status == "closed" && (!has(record.resolution) || isBlank(record.resolution))`,
    },
    {
      name: 'escalation_reason_required',
      type: 'script',
      severity: 'error',
      message: 'Escalation reason is required when escalating a case',
      condition: P`has(record.is_escalated) && record.is_escalated == true && (!has(record.escalation_reason) || isBlank(record.escalation_reason))`,
    },
    {
      name: 'case_status_progression',
      type: 'state_machine',
      severity: 'warning',
      message: 'Invalid status transition',
      field: 'status',
      // Escalate + Close actions are available from ANY open status (see
      // escalate_case / close_case visibility). The transition map must permit
      // →escalated and →closed from every open state, else those actions emit a
      // spurious "Invalid status transition" warning (e.g. escalating a brand-new
      // case, which is a legitimate support move).
      transitions: {
        'new': ['in_progress', 'waiting_customer', 'escalated', 'closed'],
        'in_progress': ['waiting_customer', 'waiting_support', 'escalated', 'resolved', 'closed'],
        'waiting_customer': ['in_progress', 'waiting_support', 'escalated', 'closed'],
        'waiting_support': ['in_progress', 'waiting_customer', 'escalated', 'closed'],
        'escalated': ['in_progress', 'resolved', 'closed'],
        'resolved': ['closed', 'in_progress'],  // Can reopen
        'closed': ['in_progress'],  // Can reopen
      }
    },
  ],
  
  // NOTE: object `workflows[]` were removed in @objectstack 7.7. Field-updates
  // moved to this object's *.hook.ts; scheduled status-flips & notifications
  // moved to src/flows/*.flow.ts (see flows/index.ts).
});
