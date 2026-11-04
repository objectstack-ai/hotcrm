// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { ObjectTranslationData } from '@objectstack/spec/system';

/**
 * English (en) — `objects` translations for the COMMERCE family:
 * what gets sold and on what paper — quotes, contracts, products.
 *
 * Roster: `crm_quote`, `crm_quote_line_item`, `crm_contract`, `crm_product`,
 * `crm_price_book`, `crm_price_book_entry`.
 *
 * SPLIT AXIS (#1311): translation NAMESPACE first, then CRM DOMAIN FAMILY.
 * Everything that is not `objects` lives in `./app.ts`; `objects` — 69-78% of
 * every bundle — is one file per CRM domain family, and a detail object
 * follows its master. A new row goes in the file for ITS family, never in
 * whichever file is already open: that is how one file re-grows past the 70%
 * advisory band `pnpm hygiene` prints. Full rule and rationale:
 * `src/sales/translations/en.ts`.
 */
export const commerce: Record<string, ObjectTranslationData> = {
  crm_contract: {
    label: 'Contract',
    pluralLabel: 'Contracts',
    fields: {
      contract_number: { label: 'Contract Number' },
      crm_account: { label: 'Account' },
      crm_contact: { label: 'Primary Contact' },
      crm_opportunity: { label: 'Related Opportunity' },
      owner_id: { label: 'Contract Owner' },
      status: {
        label: 'Status',
        options: {
          draft: 'Draft', in_approval: 'In Approval', activated: 'Activated',
          expired: 'Expired', terminated: 'Terminated',
        },
      },
      contract_term_months: { label: 'Contract Term (Months)' },
      start_date: { label: 'Start Date' },
      end_date: { label: 'End Date' },
      contract_value: { label: 'Contract Value' },
      billing_frequency: {
        label: 'Billing Frequency',
        options: {
          monthly: 'Monthly', quarterly: 'Quarterly',
          annually: 'Annually', one_time: 'One-time',
        },
      },
      payment_terms: { label: 'Payment Terms' },
      auto_renewal: { label: 'Auto Renewal' },
      renewal_notice_days: { label: 'Renewal Notice (Days)' },
      contract_type: {
        label: 'Contract Type',
        options: {
          subscription: 'Subscription', service: 'Service Agreement', license: 'License',
          partnership: 'Partnership', nda: 'NDA', msa: 'MSA',
        },
      },
      signed_date: { label: 'Signed Date' },
      signed_by: { label: 'Signed By' },
      document_url: { label: 'Contract Document' },
      special_terms: { label: 'Special Terms' },
      description: { label: 'Description' },
      billing_address: { label: 'Billing Address' },
    },
    _views: {
      all_contracts: { label: 'All Contracts' },
      renewal_calendar: { label: 'Renewal Calendar' },
      contract_gantt: { label: 'Contract Terms' },
      contract_timeline: { label: 'Contract Timeline' },
    },
    _sections: {
      basic: { label: 'Contract Information' },
      parties: { label: 'Parties' },
      terms: { label: 'Terms & Dates' },
      value: { label: 'Contract Value' },
      status: { label: 'Status & Approval' },
      renewal: { label: 'Renewal' },
      // Form section names on contract.view.ts (#1100). `contract_terms`,
      // not `terms` — `terms` is already the fieldGroup key for "Terms & Dates".
      contract_terms: { label: 'Terms' },
      signing_and_documents: { label: 'Signing & Documents' },
      notes: { label: 'Notes' },
    },
  },
};
