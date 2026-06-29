import { F, P, cel } from '@objectstack/spec';
// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Case = ObjectSchema.create({
  name: 'crm_case',
  label: 'Case',
  pluralLabel: 'Cases',
  icon: 'life-buoy',
  description: 'Customer support cases and service requests',

  fieldGroups: [
    { key: 'basic',       label: 'Case Information', icon: 'info' },
    { key: 'origin',      label: 'Origin & Routing', icon: 'route' },
    { key: 'sla',         label: 'SLA & Priority',   icon: 'clock' },
    { key: 'resolution',  label: 'Resolution',       icon: 'check-circle' },
    { key: 'escalation',  label: 'Escalation',       icon: 'alert-triangle', defaultExpanded: false },
    { key: 'system',      label: 'System',           icon: 'database',       defaultExpanded: false },
  ],

  fields: {
    // Case Information
    case_number: Field.autonumber({
      label: 'Case Number',
      format: 'CASE-{00000}',
    }),
    
    subject: Field.text({
      label: 'Subject',
      required: true,
      searchable: true,
      maxLength: 255,
    }),

    // ADR-0079 record title (was titleFormat '{case_number} - {subject}').
    display_title: Field.formula({
      label: 'Display Title',
      expression: F`record.case_number + " - " + record.subject`,
    }),

    description: Field.markdown({
      label: 'Description',
      required: true,
    }),
    
    // Relationships
    crm_account: Field.lookup('crm_account', {
      label: 'Account',
    }),
    
    crm_contact: Field.lookup('crm_contact', {
      label: 'Contact',
      // Optional so Web-to-Case (anonymous) submissions can land without
      // an existing CRM contact. Back-office staff or a triage flow links
      // the case to a contact after the fact. This matches the Salesforce
      // Web-to-Case convention.
      referenceFilters: ['crm_account = {case.crm_account}'],
    }),
    
    // Case Management
    status: Field.select({
      label: 'Status',
      required: true,
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
      required: true,
      options: [
        { label: 'Low', value: 'low', color: '#4169E1', default: true },
        { label: 'Medium', value: 'medium', color: '#FFA500' },
        { label: 'High', value: 'high', color: '#FF4500' },
        { label: 'Critical', value: 'critical', color: '#FF0000' },
      ]
    }),
    
    type: Field.select({
      label: 'Case Type',
      options: [
        { label: 'Question', value: 'question' },
        { label: 'Problem', value: 'problem' },
        { label: 'Feature Request', value: 'feature_request' },
        { label: 'Bug', value: 'bug' },
      ]
    }),
    
    origin: Field.select({
      label: 'Case Origin',
      options: [
        { label: 'Email', value: 'email' },
        { label: 'Phone', value: 'phone' },
        { label: 'Web', value: 'web' },
        { label: 'Chat', value: 'chat' },
        { label: 'Social Media', value: 'social_media' },
      ]
    }),
    
    // Assignment
    owner: Field.lookup('user', {
      defaultValue: cel`os.user.id`,
      label: 'Case Owner',
    }),
    
    // SLA and Metrics
    created_date: Field.datetime({
      label: 'Created Date',
      readonly: true,
    }),
    
    closed_date: Field.datetime({
      label: 'Closed Date',
      readonly: true,
    }),
    
    first_response_date: Field.datetime({
      label: 'First Response Date',
      readonly: true,
    }),
    
    resolution_time_hours: Field.number({
      label: 'Resolution Time (Hours)',
      readonly: true,
      scale: 2,
    }),
    
    sla_due_date: Field.datetime({
      label: 'SLA Due Date',
    }),
    
    is_sla_violated: Field.boolean({
      label: 'SLA Violated',
      defaultValue: false,
      readonly: true,
    }),
    
    // Escalation
    is_escalated: Field.boolean({
      label: 'Escalated',
      defaultValue: false,
    }),
    
    escalated_date: Field.datetime({
      label: 'Escalated Date',
      readonly: true,
    }),
    
    escalation_reason: Field.textarea({
      label: 'Escalation Reason',
    }),
    
    // Related case
    parent_case: Field.lookup('crm_case', {
      label: 'Parent Case',
      description: 'Related parent case',
    }),
    
    // Resolution
    resolution: Field.markdown({
      label: 'Resolution',
    }),
    
    // Customer satisfaction
    customer_rating: Field.rating(5, {
      label: 'Customer Satisfaction',
      description: 'Customer satisfaction rating (1-5 stars)',
    }),
    
    customer_feedback: Field.textarea({
      label: 'Customer Feedback',
    }),
    
    // Customer signature (for case resolution acknowledgment)
    customer_signature: Field.signature({
      label: 'Customer Signature',
      description: 'Digital signature acknowledging case resolution',
    }),
    
    // Internal notes
    internal_notes: Field.markdown({
      label: 'Internal Notes',
      description: 'Internal notes not visible to customer',
    }),
    
    // Flags
    is_closed: Field.boolean({
      label: 'Is Closed',
      defaultValue: false,
      readonly: true,
    }),
  },
  
  // Database indexes for performance
  indexes: [
    { fields: ['case_number'], unique: true },
    { fields: ['crm_account'] },
    { fields: ['owner'] },
    { fields: ['status'] },
    { fields: ['priority'] },
  ],
  
  enable: {
    trackHistory: true,
    searchable: true,
    apiEnabled: true,
    files: true,
    feeds: true,            // Enable social feed, comments, and mentions
    activities: true,       // Enable tasks and events tracking
    trash: true,
    mru: true,              // Track Most Recently Used
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
  compactLayout: ['case_number', 'subject', 'crm_account', 'status', 'priority'],
  
  // Removed: list_views and form_views belong in UI configuration, not object definition
  
  validations: [
    {
      name: 'resolution_required_for_closed',
      type: 'script',
      severity: 'error',
      message: 'Resolution is required when closing a case',
      condition: P`record.status == "closed" && isBlank(record.resolution)`,
    },
    {
      name: 'escalation_reason_required',
      type: 'script',
      severity: 'error',
      message: 'Escalation reason is required when escalating a case',
      condition: P`record.is_escalated == true && isBlank(record.escalation_reason)`,
    },
    {
      name: 'case_status_progression',
      type: 'state_machine',
      severity: 'warning',
      message: 'Invalid status transition',
      field: 'status',
      transitions: {
        'new': ['in_progress', 'waiting_customer', 'closed'],
        'in_progress': ['waiting_customer', 'waiting_support', 'escalated', 'resolved'],
        'waiting_customer': ['in_progress', 'closed'],
        'waiting_support': ['in_progress', 'escalated'],
        'escalated': ['in_progress', 'resolved'],
        'resolved': ['closed', 'in_progress'],  // Can reopen
        'closed': ['in_progress'],  // Can reopen
      }
    },
  ],
  
  // NOTE: object `workflows[]` were removed in @objectstack 7.7. Field-updates
  // moved to this object's *.hook.ts; scheduled status-flips & notifications
  // moved to src/flows/*.flow.ts (see flows/index.ts).
});
