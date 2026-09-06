// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { ObjectTranslationData } from '@objectstack/spec/system';

/**
 * English (en) — `objects` translations for the MARKETING family:
 * demand generation — campaigns and their membership.
 *
 * Roster: `crm_campaign`, `crm_campaign_member`.
 *
 * SPLIT AXIS (#1311): translation NAMESPACE first, then CRM DOMAIN FAMILY.
 * Everything that is not `objects` lives in `./app.ts`; `objects` — 69-78% of
 * every bundle — is one file per CRM domain family, and a detail object
 * follows its master. A new row goes in the file for ITS family, never in
 * whichever file is already open: that is how one file re-grows past the 70%
 * advisory band `pnpm hygiene` prints. Full rule and rationale:
 * `src/translations/en.ts`.
 */
export const marketing: Record<string, ObjectTranslationData> = {
  crm_campaign: {
    label: 'Campaign',
    pluralLabel: 'Campaigns',
    fields: {
      campaign_code: { label: 'Campaign Code' },
      name: { label: 'Campaign Name' },
      description: { label: 'Description' },
      type: {
        label: 'Campaign Type',
        options: {
          email: 'Email', webinar: 'Webinar', trade_show: 'Trade Show',
          conference: 'Conference', direct_mail: 'Direct Mail', social_media: 'Social Media',
          content: 'Content Marketing', partner: 'Partner Marketing',
        },
      },
      channel: {
        label: 'Primary Channel',
        options: {
          digital: 'Digital', social: 'Social', email: 'Email',
          events: 'Events', partner: 'Partner',
        },
      },
      status: {
        label: 'Status',
        options: {
          planning: 'Planning', in_progress: 'In Progress',
          completed: 'Completed', aborted: 'Aborted',
        },
      },
      start_date: { label: 'Start Date' },
      end_date: { label: 'End Date' },
      budgeted_cost: { label: 'Budgeted Cost' },
      actual_cost: { label: 'Actual Cost' },
      expected_revenue: { label: 'Expected Revenue' },
      actual_revenue: { label: 'Actual Revenue' },
      target_size: { label: 'Target Size', help: 'Target number of leads/contacts' },
      num_sent: { label: 'Number Sent' },
      num_responses: { label: 'Number of Responses' },
      num_leads: { label: 'Number of Leads' },
      num_converted_leads: { label: 'Converted Leads' },
      num_opportunities: { label: 'Opportunities Created' },
      num_won_opportunities: { label: 'Won Opportunities' },
      response_rate: { label: 'Response Rate %' },
      roi: { label: 'ROI %' },
      owner_id: { label: 'Campaign Owner' },
      landing_page_url: { label: 'Landing Page' },
      is_active: { label: 'Active' },
      display_title: { label: 'Display Title' },
    },
    _views: {
      all_campaigns: { label: 'All Campaigns' },
      campaign_gantt: { label: 'Campaign Schedule' },
      campaign_calendar: { label: 'Launch Calendar' },
      campaign_timeline: { label: 'Marketing Timeline' },
    },
    _sections: {
      basic: { label: 'Campaign Information' },
      schedule: { label: 'Schedule' },
      budget: { label: 'Budget & ROI' },
      metrics: { label: 'Performance' },
      assignment: { label: 'Ownership' },
      assets: { label: 'Campaign Assets' },
    },
    _actions: {
      enroll_leads: {
        label: 'Enroll Members',
        successMessage: 'Eligible members enrolled in campaign.',
      },
    },
  },
  crm_campaign_member: {
    label: 'Campaign Member',
    pluralLabel: 'Campaign Members',
    description: 'Leads and contacts touched by a campaign, with response status',
    fields: {
      member_number: { label: 'Member Number' },
      crm_campaign: { label: 'Campaign' },
      crm_lead: { label: 'Lead', help: 'Set when the member was a Lead at enrollment time' },
      crm_contact: { label: 'Contact', help: 'Set when the member is an existing Contact' },
      status: {
        label: 'Status',
        options: {
          sent: 'Sent', responded: 'Responded',
          converted: 'Converted', unsubscribed: 'Unsubscribed',
        },
      },
      added_date: { label: 'Added Date' },
      response_date: { label: 'Response Date' },
      has_responded: { label: 'Has Responded' },
    },
    _sections: {
      basic: { label: 'Basic Information' },
      response: { label: 'Response Tracking' },
    },
    _actions: {
      mark_responded: {
        label: 'Mark Responded',
        successMessage: 'Response recorded on this campaign member.',
      },
    },
  },
};
