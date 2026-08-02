// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { P } from '@objectstack/spec';

/**
 * Campaign Member Object
 *
 * Links a Lead OR Contact to a Campaign and tracks the response
 * lifecycle (Sent → Opened → Clicked → Responded → Converted).
 * Used by the campaign-enrollment flow and by ROI dashboards.
 */
export const CampaignMember = ObjectSchema.create({
  name: 'crm_campaign_member',
  label: 'Campaign Member',
  pluralLabel: 'Campaign Members',
  icon: 'user-plus',
  description: 'Membership and response tracking for marketing campaigns',

  // ADR-0090 D1/D7: OWD is an authored decision. Membership is an attribute of
  // the campaign, so record access DERIVES from it (ADR-0055): reads are
  // filtered to members whose `crm_campaign` the caller can read, and enrolling
  // or updating a member requires edit access to that campaign. The relation
  // resolver accepts the REQUIRED `crm_campaign` LOOKUP as the parent, so no
  // master-detail conversion is needed.
  //
  // It was `private` before (#488) — with no owner field on the junction row
  // that meant "whoever inserted it", which is nobody's idea of campaign
  // membership and hid rows written by the enrollment flow.
  sharingModel: 'controlled_by_parent',

  // @objectstack 12: the dead object-level `enable.trackHistory` flag was
  // removed (ADR-0049) — per-field history is opt-in via `Field.trackHistory`
  // (ADR-0052), set on `status` below.

  // ADR-0079: junction rows have no derivable text title; point the canonical
  // nameField at the stored autonumber explicitly (autonumber is not in the
  // auto-derivation whitelist).
  nameField: 'member_number',

  highlightFields: ['crm_campaign', 'crm_lead', 'crm_contact', 'status', 'response_date'],

  fieldGroups: [
    { key: 'basic',    label: 'Basic Information', icon: 'info' },
    { key: 'response', label: 'Response Tracking', icon: 'activity' },
  ],

  fields: {
    member_number: Field.autonumber({
      label: 'Member Number',
      format: 'CM-{00000}',
      group: 'basic',
    }),

    crm_campaign: Field.lookup('crm_campaign', {
      label: 'Campaign',
      required: true,
      storage: { notNull: true },
      group: 'basic',
    }),

    crm_lead: Field.lookup('crm_lead', {
      label: 'Lead',
      group: 'basic',
      description: 'Set when the member was a Lead at enrollment time',
    }),

    crm_contact: Field.lookup('crm_contact', {
      label: 'Contact',
      group: 'basic',
      description: 'Set when the member is an existing Contact',
    }),

    status: Field.select({
      label: 'Status',
      required: true,
      storage: { notNull: true },
      group: 'response',
      trackHistory: true,
      options: [
        { label: 'Sent',      value: 'sent',      default: true, color: '#A0A0A0' },
        { label: 'Opened',    value: 'opened',    color: '#4169E1' },
        { label: 'Clicked',   value: 'clicked',   color: '#00AA00' },
        { label: 'Responded', value: 'responded', color: '#00AA00' },
        { label: 'Converted', value: 'converted', color: '#7C3AED' },
        { label: 'Bounced',   value: 'bounced',   color: '#FF4500' },
        { label: 'Unsubscribed', value: 'unsubscribed', color: '#FF0000' },
      ],
    }),

    // NOT `readonly`: the campaign_enrollment flow writes this stamp, and
    // 16.x drops writes to readonly fields (#2948) — every member landed with
    // a null Added Date while the flag was on.
    added_date: Field.datetime({
      label: 'Added Date',
      group: 'response',
    }),

    first_opened_date: Field.datetime({
      label: 'First Opened',
      group: 'response',
    }),

    first_clicked_date: Field.datetime({
      label: 'First Clicked',
      group: 'response',
    }),

    response_date: Field.datetime({
      label: 'Response Date',
      group: 'response',
    }),

    has_responded: Field.boolean({
      label: 'Has Responded',
      defaultValue: false,
      group: 'response',
    }),
  },

  // Predicates below are TOTAL: every `record.x` read is `has()`-guarded, so the
  // rule returns a verdict even when the merged record has no such key. See
  // AGENTS.md "Validation predicates must be TOTAL" and
  // test/object-validation-predicates.test.ts, which fails the build otherwise.
  validations: [
    {
      name: 'lead_or_contact_required',
      type: 'script',
      severity: 'error',
      message: 'A campaign member must reference either a Lead or a Contact',
      condition: P`(!has(record.crm_lead) || isBlank(record.crm_lead)) && (!has(record.crm_contact) || isBlank(record.crm_contact))`,
    },
  ],
});
