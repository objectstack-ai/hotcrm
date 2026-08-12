import { P } from '@objectstack/spec';
// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { PAYMENT_TERMS_OPTIONS } from './_picklists';

/**
 * Contract Object
 * Represents legal contracts with customers
 */
export const Contract = ObjectSchema.create({
  name: 'crm_contract',
  label: 'Contract',
  pluralLabel: 'Contracts',
  icon: 'file-pen-line',
  description: 'Legal contracts and agreements',

  // ADR-0090 D1/D7: OWD is an authored decision. Legal documents — owner only.
  sharingModel: 'private',
  // ADR-0079: render-only `titleFormat` retired in favor of `nameField`.
  // Original template was '{contract_number} - {crm_account.name}'. The
  // `crm_account.name` segment is a lookup DOT-WALK, which a formula field
  // cannot reference (ADR-0072), so it is DROPPED. Only the local
  // `contract_number` (autonumber) remains, so no formula is needed — point
  // `nameField` straight at it.
  nameField: 'contract_number',
  highlightFields: ['contract_number', 'crm_account', 'status', 'start_date', 'end_date'],

  fieldGroups: [
    { key: 'basic',     label: 'Contract Information', icon: 'info' },
    { key: 'parties',   label: 'Parties',              icon: 'users' },
    { key: 'terms',     label: 'Terms & Dates',        icon: 'calendar' },
    { key: 'value',     label: 'Contract Value',       icon: 'dollar-sign' },
    { key: 'status',    label: 'Status & Approval',    icon: 'check-circle' },
    { key: 'renewal',   label: 'Renewal',              icon: 'refresh-ccw', defaultExpanded: false },
  ],

  fields: {
    // Platform ownership anchor — canonical note in `account.object.ts` (#548).
    owner_id: Field.lookup('sys_user', {
      label: 'Contract Owner',
      group: 'parties',
      system: true,
      readonly: false,
      trackHistory: true,
    }),

    // AutoNumber field
    contract_number: Field.autonumber({
      label: 'Contract Number',
      group: 'basic',
      format: 'CTR-{0000}',
    }),
    
    // Relationships
    crm_account: Field.lookup('crm_account', {
      label: 'Account',
      group: 'parties',
      required: true,
      storage: { notNull: true },
    }),
    
    crm_contact: Field.lookup('crm_contact', {
      label: 'Primary Contact',
      group: 'parties',
      required: true,
      storage: { notNull: true },
      // @objectstack 12: string[] `referenceFilters` is dead (not read by the
      // picker); `dependsOn` is the live cascading-lookup form — scopes contacts
      // to the contract's `crm_account` (ADR-0049).
      dependsOn: ['crm_account'],
    }),

    crm_opportunity: Field.lookup('crm_opportunity', {
      label: 'Related Opportunity',
      group: 'parties',
      // Scope opportunities to the contract's account (was dead referenceFilters).
      dependsOn: ['crm_account'],
    }),
    

    // Status
    status: Field.select({
      label: 'Status',
      group: 'status',
      options: [
        { label: 'Draft', value: 'draft', color: '#999999', default: true },
        { label: 'In Approval', value: 'in_approval', color: '#FFA500' },
        { label: 'Activated', value: 'activated', color: '#00AA00' },
        { label: 'Expired', value: 'expired', color: '#FF0000' },
        { label: 'Terminated', value: 'terminated', color: '#666666' },
      ],
      required: true,
      storage: { notNull: true },
      trackHistory: true,
    }),
    
    // Contract Terms
    contract_term_months: Field.number({
      label: 'Contract Term (Months)',
      group: 'terms',
      required: true,
      storage: { notNull: true },
      min: 1,
    }),
    
    start_date: Field.date({
      label: 'Start Date',
      group: 'terms',
      required: true,
      storage: { notNull: true },
    }),
    
    end_date: Field.date({
      label: 'End Date',
      group: 'terms',
      required: true,
      storage: { notNull: true },
    }),
    
    // Financial
    contract_value: Field.currency({ 
      label: 'Contract Value',
      group: 'value',
      scale: 2,
      min: 0,
      required: true,
      storage: { notNull: true },
    }),
    
    billing_frequency: Field.select({
      label: 'Billing Frequency',
      group: 'value',
      options: [
        { label: 'Monthly', value: 'monthly', default: true },
        { label: 'Quarterly', value: 'quarterly' },
        { label: 'Annually', value: 'annually' },
        { label: 'One-time', value: 'one_time' },
      ]
    }),
    
    payment_terms: Field.select({
      label: 'Payment Terms',
      group: 'value',
      // Canonical set shared with Quote (#490): an accepted quote's terms
      // (incl. due_on_receipt) must survive the copy onto the contract. That
      // copy is `quote_on_accepted` (src/objects/quote.hook.ts), which did not
      // make it until #873 — until then this field took the `net_30` option
      // default on every auto-drafted contract. It still does when the quote
      // itself carried no term, which is the intended fall-through, not a gap.
      options: [...PAYMENT_TERMS_OPTIONS],
    }),
    
    // Renewal
    auto_renewal: Field.boolean({
      label: 'Auto Renewal',
      group: 'renewal',
      defaultValue: false,
    }),
    
    renewal_notice_days: Field.number({
      label: 'Renewal Notice (Days)',
      group: 'renewal',
      min: 0,
      defaultValue: 30,
    }),
    
    // Legal
    contract_type: Field.select({
      label: 'Contract Type',
      group: 'basic',
      options: [
        { label: 'Subscription', value: 'subscription' },
        { label: 'Service Agreement', value: 'service' },
        { label: 'License', value: 'license' },
        { label: 'Partnership', value: 'partnership' },
        { label: 'NDA', value: 'nda' },
        { label: 'MSA', value: 'msa' },
      ]
    }),
    
    signed_date: Field.date({
      label: 'Signed Date',
      group: 'status',
    }),
    
    signed_by: Field.text({
      label: 'Signed By',
      group: 'status',
      maxLength: 255,
    }),
    
    document_url: Field.url({
      label: 'Contract Document',
      group: 'basic',
    }),
    
    // Terms & Conditions
    special_terms: Field.markdown({
      label: 'Special Terms',
      group: 'terms',
    }),
    
    description: Field.markdown({
      label: 'Description',
      group: 'basic',
    }),
    
    // Billing Address
    billing_address: Field.address({
      label: 'Billing Address',
      group: 'value',
    }),
  },
  
  // Database indexes
  indexes: [
    { fields: ['crm_account'] },
    { fields: ['status'] },
    { fields: ['start_date'] },
    { fields: ['end_date'] },
    { fields: ['owner_id'] },
  ],
  
  // Enable advanced features
  // Dead enable.* flags (trash/mru) removed in @objectstack 12 (ADR-0049);
  // History → Field.trackHistory (ADR-0052).
  enable: {
    apiEnabled: true,
    apiMethods: ['get', 'list', 'create', 'update', 'delete'],
    // #602 — the executed contract itself. `document_url` remains the pointer
    // to an external DMS copy; this is where the file actually lives.
    // See the canonical capability note in `src/objects/index.ts`.
    files: true,
  },
  
  // Validation Rules
  //
  // Predicates below are TOTAL: every `record.x` read is `has()`-guarded, so the
  // rule returns a verdict even when the merged record has no such key. See
  // AGENTS.md "Validation predicates must be TOTAL" and
  // test/object-validation-predicates.test.ts, which fails the build otherwise.
  validations: [
    {
      name: 'end_after_start',
      type: 'script',
      severity: 'error',
      message: 'End Date must be after Start Date',
      condition: P`has(record.end_date) && record.end_date != null && has(record.start_date) && record.start_date != null && record.end_date <= record.start_date`,
    },
    // NOTE: the `valid_contract_term` warning (months-between term check) was
    // dropped in the 9.8.0 upgrade — its CEL predicate used `monthsBetween()`,
    // which 9.8.0's aligned CEL stdlib (ADR-0032) no longer provides. It was a
    // non-blocking warning; the hard end-date>start-date rule above remains.
    {
      // #575 B4. Like `crm_quote`, this object shipped a lifecycle vocabulary
      // with no transition constraint and no status guard in `contract.hook.ts`
      // — so `draft → activated` was a legal move, activating an agreement that
      // never passed approval. Activation is the consequential edge here:
      // `contract_on_activation` stamps `signed_date`, promotes the account to
      // `customer`, and the renewal flow starts counting from it.
      name: 'contract_status_progression',
      type: 'state_machine',
      severity: 'warning',
      message: 'Invalid contract status transition',
      field: 'status',
      transitions: {
        draft: ['in_approval', 'terminated'],
        // Approval either lands (`activated`) or sends the paperwork back.
        in_approval: ['draft', 'activated', 'terminated'],
        // `→ expired` is the contract_expiration flow, whose own sweep filter
        // is `status: 'activated'` — nothing else ages out.
        activated: ['expired', 'terminated'],
        // Both ends are terminal: a renewal is a NEW contract (the
        // contract_renewal flow files a task, it does not revive the old row).
        expired: [],
        terminated: [],
      },
    },
  ],
  
  // Workflow Rules
  // NOTE: object `workflows[]` were removed in @objectstack 7.7. Field-updates
  // moved to this object's *.hook.ts; scheduled status-flips & notifications
  // moved to src/flows/*.flow.ts (see flows/index.ts).
});
