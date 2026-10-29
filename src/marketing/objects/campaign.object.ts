// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { F, P } from '@objectstack/spec';

/**
 * Campaign Object
 * Represents marketing campaigns
 */
export const Campaign = ObjectSchema.create({
  name: 'crm_campaign',
  label: 'Campaign',
  pluralLabel: 'Campaigns',
  icon: 'megaphone',
  description: 'Marketing campaigns and initiatives',

  // ADR-0090 D1/D7: OWD is an authored decision. Campaign catalog is org-visible; only owners edit.
  sharingModel: 'public_read',
  // ADR-0079: render-only `titleFormat` retired in favor of `nameField`,
  // which names a real field. The former template composed two local fields, so
  // a stored `display_title` field reproduces it for the record title.
  nameField: 'display_title',
  // Explicit search targets (ADR-0061): the real columns the lookup picker
  // and global search match. Until #2230 they were required, because the
  // title was a formula with no column for `$search` to default to. The
  // title is stored now; these stay because they name what is searched.
  searchableFields: ['name', 'campaign_code'],
  // The record header's strip (#2369 row 5): the title already reads
  // "CPG-0001 - Name". The Add to Campaign picker shows the same fields under
  // each campaign, where the code used to repeat the title.
  highlightFields: ['type', 'status', 'start_date', 'end_date', 'owner_id'],

  // Every other business object with a detail page groups its fields; campaign
  // was one of the two that did not, so its detail page fell back to one flat
  // 30-field grid with the ROI formulas sitting next to the campaign name. The
  // labels mirror the sections the campaign form uses (Campaign Information /
  // Schedule / Budget & ROI / Performance) so the two surfaces agree — the
  // form's old three-section shape buried the two manual-entry cost fields in a
  // combined "Schedule & Budget" row and was split to match this one (#597).
  fieldGroups: [
    { key: 'basic',      label: 'Campaign Information', icon: 'megaphone' },
    { key: 'schedule',   label: 'Schedule',             icon: 'calendar' },
    { key: 'budget',     label: 'Budget & ROI',         icon: 'dollar-sign' },
    { key: 'metrics',    label: 'Performance',          icon: 'bar-chart' },
    { key: 'assignment', label: 'Ownership',            icon: 'user' },
    { key: 'assets',     label: 'Campaign Assets',      icon: 'link', collapse: 'collapsed' },
  ],

  fields: {
    // Platform ownership anchor — canonical note in `account.object.ts` (#548).
    owner_id: Field.lookup('sys_user', {
      label: 'Campaign Owner',
      group: 'assignment',
      system: true,
      readonly: false,
      trackHistory: true,
    }),

    // AutoNumber field
    campaign_code: Field.autonumber({
      group: 'basic',
      label: 'Campaign Code',
      format: 'CPG-{0000}',
    }),
    
    // Basic Information
    name: Field.text({
      group: 'basic',
      label: 'Campaign Name',
      required: true,
      storage: { notNull: true },
      searchable: true,
      maxLength: 255,
    }),

    // ADR-0079 record title (was titleFormat '{campaign_code} - {name}').
    // A record with no `campaign_code` is titled by its name, as `crm_product` is
    // (#2168). The number is an autonumber the engine issues on insert, so only
    // rows older than the autonumber lack one; measured on staging after the
    // 6.0.0 upgrade, the concatenation faulted there (`dyn<null> + string`) and
    // left the record untitled (#2230).
    // Stored, not a formula (#2230, objectstack#24981 ruling A): the engine
    // computes the expression on every insert and every update by id and
    // stores the result, so an import matches a lookup cell against this title
    // and sort and search read a real column. `readonly` keeps it off the
    // forms; a value a client sends never stands. Rows stored before #2230
    // are titled by `scripts/backfill-record-titles.ts`.
    display_title: Field.text({
      readonly: true,
      group: 'basic',
      label: 'Display Title',
      expression: F`has(record.campaign_code) && record.campaign_code != null && record.campaign_code != "" ? record.campaign_code + " - " + record.name : record.name`,
    }),

    description: Field.markdown({
      group: 'basic',
      label: 'Description',
    }),
    
    // Type & Channel
    type: Field.select({
      group: 'basic',
      label: 'Campaign Type',
      options: [
        { label: 'Email', value: 'email', default: true },
        { label: 'Webinar', value: 'webinar' },
        { label: 'Trade Show', value: 'trade_show' },
        { label: 'Conference', value: 'conference' },
        { label: 'Direct Mail', value: 'direct_mail' },
        { label: 'Social Media', value: 'social_media' },
        { label: 'Content Marketing', value: 'content' },
        { label: 'Partner Marketing', value: 'partner' },
      ]
    }),
    
    channel: Field.select({
      group: 'basic',
      label: 'Primary Channel',
      options: [
        { label: 'Digital', value: 'digital' },
        { label: 'Social', value: 'social' },
        { label: 'Email', value: 'email' },
        { label: 'Events', value: 'events' },
        { label: 'Partner', value: 'partner' },
      ]
    }),
    
    // Status
    status: Field.select({
      group: 'basic',
      label: 'Status',
      // `kind` (#2366 row 10, the same defect on the campaign's own path):
      // Aborted is drawn as the unsuccessful end, not as a step after
      // Completed. `test/status-option-kinds.test.ts`.
      options: [
        { label: 'Planning', value: 'planning', color: '#999999', default: true, kind: 'open' },
        { label: 'In Progress', value: 'in_progress', color: '#FFA500', kind: 'open' },
        { label: 'Completed', value: 'completed', color: '#00AA00', kind: 'won' },
        { label: 'Aborted', value: 'aborted', color: '#FF0000', kind: 'lost' },
      ],
      required: true,
      storage: { notNull: true },
      trackHistory: true,
    }),
    
    // Dates
    start_date: Field.date({
      group: 'schedule',
      label: 'Start Date',
      required: true,
      storage: { notNull: true },
    }),
    
    end_date: Field.date({
      group: 'schedule',
      label: 'End Date',
      required: true,
      storage: { notNull: true },
    }),
    
    // Budget & ROI
    budgeted_cost: Field.currency({ 
      group: 'budget',
      label: 'Budgeted Cost',
      min: 0,
    }),
    
    actual_cost: Field.currency({ 
      group: 'budget',
      label: 'Actual Cost',
      min: 0,
    }),
    
    expected_revenue: Field.currency({ 
      group: 'budget',
      label: 'Expected Revenue',
      min: 0,
    }),
    
    // `readonly` (#2366 row 4), here and on the six `num_*` counts below: the
    // metric block — `CAMPAIGN_METRIC_FIELDS` in `campaign.hook.ts` — is the
    // four refresh hooks' to write, never a person's. On the form they were
    // editable, and a 999 typed into Number Sent stayed until the next member
    // write recomputed it (measured on 18.2.0, #2320 Marketing S3).
    //
    // The hooks still land their writes because all four declare
    // `runAs: 'system'`: a `readonly` field is stripped from a non-system
    // write (`FieldSchema.readonly`), and an elevated hook's `ctx.api` is a
    // system write. Three were elevated by #2014 so a rollup does not depend on
    // who fired it; `campaign_metrics_refresh` joined them with this change,
    // for the same reason and because it would otherwise be stripped. Its note
    // says so. `test/campaign-metric-fields-readonly.test.ts` pins both halves:
    // a user's write of a count is dropped, and every refresh still lands.
    actual_revenue: Field.currency({ 
      group: 'budget',
      label: 'Actual Revenue',
      min: 0,
      readonly: true,
    }),
    
    // Metrics
    target_size: Field.number({
      group: 'metrics',
      label: 'Target Size',
      description: 'Target number of leads/contacts',
      min: 0,
    }),
    
    // `readonly`, written by the same four refresh hooks — see the note on
    // `actual_revenue` above.
    // Definition: total members enrolled.
    num_sent: Field.number({
      group: 'metrics',
      label: 'Number Sent',
      min: 0,
      readonly: true,
    }),
    
    num_responses: Field.number({
      group: 'metrics',
      label: 'Number of Responses',
      min: 0,
      readonly: true,
    }),
    
    num_leads: Field.number({
      group: 'metrics',
      label: 'Number of Leads',
      min: 0,
      readonly: true,
    }),
    
    num_converted_leads: Field.number({
      group: 'metrics',
      label: 'Converted Leads',
      min: 0,
      readonly: true,
    }),
    
    num_opportunities: Field.number({
      group: 'metrics',
      label: 'Opportunities Created',
      min: 0,
      readonly: true,
    }),
    
    num_won_opportunities: Field.number({
      group: 'metrics',
      label: 'Won Opportunities',
      min: 0,
      readonly: true,
    }),
    
    // Calculated Metrics (Formula Fields)
    response_rate: Field.formula({
      group: 'metrics',
      label: 'Response Rate %',
      expression: F`coalesce(record.num_sent, 0) > 0 ? (coalesce(record.num_responses, 0) * 100.0) / record.num_sent : 0.0`,
      scale: 2,
    }),
    
    roi: Field.formula({
      group: 'budget',
      label: 'ROI %',
      expression: F`coalesce(record.actual_cost, 0) > 0 ? ((coalesce(record.actual_revenue, 0) - record.actual_cost) * 100.0) / record.actual_cost : 0.0`,
      scale: 2,
    }),
    
    // No `parent_campaign`. Campaign hierarchy was declared and never used: no
    // page, doc or report mentioned it, and the honest consumer for it — a
    // rolled-up ROI — cannot be one declaration. `roi` here is a formula over
    // this campaign's OWN `actual_cost` / `actual_revenue`, so a hierarchy ROI
    // would put a second, differently-scoped ROI on the same record and leave
    // every reader to guess which one they were looking at.
    
    // Campaign Assets
    landing_page_url: Field.url({
      group: 'assets',
      label: 'Landing Page',
    }),
    
    is_active: Field.boolean({
      group: 'assets',
      label: 'Active',
      defaultValue: true,
    }),
  },
  
  // Database indexes
  indexes: [
    { fields: ['name'] },
    { fields: ['type'] },
    { fields: ['status'] },
    { fields: ['start_date'] },
    { fields: ['owner_id'] },
  ],
  
  // Enable advanced features
  // API surface. History → Field.trackHistory (ADR-0052).
  enable: {
    apiEnabled: true,
    apiMethods: ['get', 'list', 'create', 'update', 'delete'],
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
      // `<=`, not `<`: the message promises "after", so a campaign that ends
      // the day it starts is a violation. Matches `crm_contract`'s twin rule
      // and `crm_forecast.period_end_after_start` (#514 item 12).
      condition: P`has(record.end_date) && record.end_date != null && has(record.start_date) && record.start_date != null && record.end_date <= record.start_date`,
    },
    {
      name: 'actual_cost_within_budget',
      type: 'script',
      severity: 'warning',
      message: 'Actual Cost exceeds Budgeted Cost',
      condition: P`has(record.actual_cost) && record.actual_cost != null && has(record.budgeted_cost) && record.budgeted_cost != null && record.actual_cost > record.budgeted_cost`,
    },
  ],
  
  // Workflow Rules
  // ⚠️ No `workflows[]` here, and none is possible: object `workflows[]` were
  // removed from the platform. Field updates live in this object's `*.hook.ts`;
  // scheduled status flips and notifications live in `src/*/flows/*.flow.ts`.
});
