// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { ObjectTranslationData } from '@objectstack/spec/system';

/**
 * English (en) — `objects` translations for the COMMERCE family:
 * what gets sold and on what paper — quotes, contracts, products.
 *
 * Roster: `crm_quote`, `crm_quote_line_item`, `crm_contract`, `crm_product`.
 *
 * SPLIT AXIS (#1311): translation NAMESPACE first, then CRM DOMAIN FAMILY.
 * Everything that is not `objects` lives in `./app.ts`; `objects` — 69-78% of
 * every bundle — is one file per CRM domain family, and a detail object
 * follows its master. A new row goes in the file for ITS family, never in
 * whichever file is already open: that is how one file re-grows past the 70%
 * advisory band `pnpm hygiene` prints. Full rule and rationale:
 * `src/translations/en.ts`.
 */
export const commerce: Record<string, ObjectTranslationData> = {
  crm_quote: {
    label: 'Quote',
    pluralLabel: 'Quotes',
    fields: {
      quote_number: { label: 'Quote Number' },
      name: { label: 'Quote Name' },
      crm_account: { label: 'Account' },
      crm_contact: {
        label: 'Contact',
        help: 'Required once the quote is Presented or Accepted — the drafted contract takes its Primary Contact from here.',
      },
      crm_opportunity: { label: 'Opportunity' },
      owner_id: { label: 'Quote Owner' },
      status: {
        label: 'Status',
        options: {
          draft: 'Draft', in_review: 'In Review', presented: 'Presented',
          accepted: 'Accepted', rejected: 'Rejected', expired: 'Expired',
        },
      },
      quote_date: { label: 'Quote Date' },
      expiration_date: { label: 'Expiration Date' },
      subtotal: { label: 'Subtotal' },
      discount: { label: 'Discount %' },
      discount_amount: { label: 'Discount Amount' },
      tax: { label: 'Tax' },
      shipping_handling: { label: 'Shipping & Handling' },
      total_price: { label: 'Total Price' },
      payment_terms: {
        label: 'Payment Terms',
        options: {
          net_15: 'Net 15', net_30: 'Net 30', net_60: 'Net 60',
          net_90: 'Net 90', due_on_receipt: 'Due on Receipt',
        },
      },
      shipping_terms: { label: 'Shipping Terms' },
      billing_address: { label: 'Billing Address' },
      shipping_address: { label: 'Shipping Address' },
      description: { label: 'Description' },
      internal_notes: { label: 'Internal Notes' },
      display_title: { label: 'Display Title' },
    },
    _views: {
      all_quotes: { label: 'All Quotes' },
      quote_pipeline: { label: 'Quote Pipeline' },
      quote_calendar: { label: 'Quote Calendar' },
    },
    _sections: {
      basic: { label: 'Quote Information' },
      pricing: { label: 'Pricing' },
      terms: { label: 'Terms & Validity' },
      address: { label: 'Addresses' },
      system: { label: 'System' },
      // Form section names on quote.view.ts (#1100). `quote_terms`, not
      // `terms` — `terms` is already the fieldGroup key for "Terms & Validity".
      quote: { label: 'Quote' },
      totals: { label: 'Totals' },
      quote_terms: { label: 'Terms' },
      addresses_and_notes: { label: 'Addresses & Notes' },
    },
  },
  crm_quote_line_item: {
    label: 'Quote Line Item',
    pluralLabel: 'Quote Line Items',
    description: 'Per-product pricing lines under a quote',
    fields: {
      crm_quote: { label: 'Quote' },
      crm_product: { label: 'Product' },
      description: { label: 'Description' },
      quantity: { label: 'Quantity' },
      list_price: { label: 'List Price' },
      unit_price: { label: 'Sales Price' },
      discount: { label: 'Discount %' },
      subtotal: { label: 'Subtotal' },
      tax_rate: { label: 'Tax Rate %' },
      total_price: { label: 'Total' },
      line_number: { label: 'Line #' },
    },
    _sections: {
      basic: { label: 'Line Item' },
      pricing: { label: 'Pricing' },
    },
  },
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
      payment_terms: {
        label: 'Payment Terms',
        options: {
          net_15: 'Net 15', net_30: 'Net 30', net_60: 'Net 60',
          net_90: 'Net 90', due_on_receipt: 'Due on Receipt',
        },
      },
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
  crm_product: {
    label: 'Product',
    pluralLabel: 'Products',
    fields: {
      product_code: { label: 'Product Code' },
      name: { label: 'Product Name' },
      description: { label: 'Description' },
      category: {
        label: 'Category',
        options: {
          software: 'Software', hardware: 'Hardware', service: 'Service',
          subscription: 'Subscription', support: 'Support',
        },
      },
      family: {
        label: 'Product Family',
        options: {
          enterprise: 'Enterprise Solutions', smb: 'SMB Solutions',
          services: 'Professional Services', cloud: 'Cloud Services',
        },
      },
      list_price: { label: 'List Price' },
      cost: { label: 'Cost' },
      sku: { label: 'SKU' },
      is_active: { label: 'Active' },
      product_manager: { label: 'Product Manager' },
      image: { label: 'Product Image' },
      datasheet: { label: 'Datasheet' },
      display_title: { label: 'Display Title' },
    },
    _views: {
      all_products: { label: 'All Products' },
      product_catalog: { label: 'Product Catalog' },
    },
    _sections: {
      basic: { label: 'Product Information' },
      pricing: { label: 'Pricing' },
      metadata: { label: 'Resources' },
      // Form section names on product.view.ts (#1100)
      product_info: { label: 'Product Info' },
      pricing_info: { label: 'Pricing' },
      media: { label: 'Media' },
    },
  },
};
