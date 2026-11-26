// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { ObjectTranslationData } from '@objectstack/spec/system';

/**
 * English (en) — `objects` translations for the COMMERCE family:
 * what gets sold and on what paper — quotes, contracts, products.
 *
 * Roster: `crm_quote`, `crm_quote_line_item`, `crm_contract`, `crm_sales_order`,
 * `crm_sales_order_line`, `crm_product`,
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
      name: { label: 'Contract Name' },
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
      // The countersigned copy (#2317).
      signed_copy: {
        label: 'Signed Copy',
        help: 'The contract as the customer signed it. Required to activate the contract; uploading it fills Signed Date when that is empty.',
      },
      document_url: { label: 'Contract Document' },
      special_terms: { label: 'Special Terms' },
      description: { label: 'Description' },
      automation_key: { label: 'Automation Key', help: 'Which automation drafted this contract. Written by that automation; never edit.' },
      billing_address: { label: 'Billing Address' },
      // The contract's form, an order contract's amount and Change (#2804).
      contract_form: {
        label: 'Contract Form',
        help: 'Order Contract: drafted from an order, its value is the order amount. Framework Contract: its value is typed, and it may carry many orders. Other: no amount, such as an NDA.',
        options: { order: 'Order Contract', framework: 'Framework Contract', other: 'Other' },
      },
      crm_sales_order: { label: 'Source Order', help: 'The order this contract was drafted from.' },
      order_amount: { label: 'Order Amount', help: 'The order\'s total, tax included.' },
      order_amount_differs: { label: 'Differs from the Order Amount', help: 'The contract value no longer equals the order\'s amount. Change, with Update from Order, takes the order\'s amount.' },
      change_reason: { label: 'Change Reason', help: 'Why the contract was last changed. Written by Change.' },
      change_amendment: { label: 'Signed Amendment', help: 'The amendment the customer signed for the last change. Written by Change.' },
      change_new_value: { label: 'New Contract Value', help: 'Leave empty to keep the contract value.' },
      change_new_end_date: { label: 'New End Date', help: 'Leave empty to keep the end date.' },
      change_new_payment_terms: { label: 'New Payment Terms', help: 'Leave empty to keep the payment terms.' },
      change_from_order: { label: 'Update from Order', help: 'Take the order\'s current amount as the contract value.' },
    },
    // Print Contract (#2317).
    _actions: {
      print_contract: { label: 'Print Contract', successMessage: 'Contract PDF attached to the contract.' },
      // Change (#2804): one action per kind of contract.
      change_contract: { label: 'Change', description: 'Changes the contract value, the end date or the payment terms of this activated contract. Leave a field empty to keep it.', successMessage: 'Contract {{ record.name }} changed.' },
      change_order_contract: { label: 'Change', description: 'Changes the end date or the payment terms of this activated order contract, or takes the order\'s current amount. Leave a field empty to keep it.', successMessage: 'Contract {{ record.name }} changed.' },
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
      change: { label: 'Last Change' },
      // Form section names on contract.view.ts (#1100). `contract_terms`,
      // not `terms` — `terms` is already the fieldGroup key for "Terms & Dates".
      contract_terms: { label: 'Terms' },
      signing_and_documents: { label: 'Signing & Documents' },
      notes: { label: 'Notes' },
    },
  },
  // The order and its lines (REQ-0010, hotcrm#2555).
  crm_sales_order: {
    // Draft Contract (#2558).
    _actions: {
      draft_contract: { label: 'Draft Contract' },
      // Confirm / Complete / Cancel Order (#2716).
      confirm_sales_order: {
        label: 'Confirm Order',
        confirmText: 'Confirm this order? Its lines are then locked: to change them, the order has to go back to Draft.',
        successMessage: 'Order {{ record.name }} confirmed.',
      },
      complete_sales_order: {
        label: 'Complete Order',
        confirmText: 'Complete this order? A completed order is final: its status and its lines can no longer change.',
        successMessage: 'Order {{ record.name }} completed.',
      },
      cancel_sales_order: {
        label: 'Cancel Order',
        confirmText: 'Cancel this order? A cancelled order is final: it cannot be reopened, and its lines can no longer change.',
        successMessage: 'Order {{ record.name }} cancelled.',
      },
    },
    label: 'Order',
    pluralLabel: 'Orders',
    fields: {
      owner_id: { label: 'Order Owner' },
      order_number: { label: 'Order Number' },
      name: { label: 'Order Name' },
      crm_account: { label: 'Account' },
      crm_contact: { label: 'Contact' },
      crm_opportunity: { label: 'Opportunity' },
      order_date: { label: 'Order Date' },
      crm_contract: { label: 'Contract' },
      customer_po_number: { label: 'Customer PO Number', help: "The number on the customer's own purchase order, as they will quote it." },
      description: { label: 'Description' },
      subtotal: { label: 'Subtotal' },
      discount: { label: 'Discount %' },
      discount_amount: { label: 'Discount Amount' },
      tax: { label: 'Tax' },
      shipping_handling: { label: 'Shipping & Handling' },
      total_price: { label: 'Total Price' },
      payment_terms: { label: 'Payment Terms' },
      shipped_date: { label: 'Shipped Date' },
      billing_address: { label: 'Billing Address' },
      shipping_address: { label: 'Shipping Address' },
      external_ref: { label: 'External Reference', help: "The order's number in another system. An import naming the same reference updates this order." },
      status: { label: 'Status', options: { draft: 'Draft', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' } },
      fulfillment_status: { label: 'Fulfillment Status', options: { not_shipped: 'Not Shipped', partially_shipped: 'Partially Shipped', shipped: 'Shipped' } },
    },
    _views: {
      all_sales_orders: { label: 'All Orders' },
      order_board: { label: 'Order Board' },
      orders_to_ship: { label: 'To Ship' },
    },
    _sections: {
      basic: { label: 'Order Information' },
      pricing: { label: 'Pricing' },
      delivery: { label: 'Delivery' },
      address: { label: 'Addresses' },
      system: { label: 'System' },
    },
  },
  // The order and its lines (REQ-0010, hotcrm#2555).
  crm_sales_order_line: {
    label: 'Order Line',
    pluralLabel: 'Order Lines',
    fields: {
      crm_sales_order: { label: 'Order' },
      crm_product: { label: 'Product' },
      product_title: { label: 'Product Title', help: 'What this line sells. Filled from the product when one is chosen; type it when there is none.' },
      description: { label: 'Description' },
      quantity: { label: 'Quantity' },
      list_price: { label: 'List Price', help: "The product's list price when it was put on this line." },
      unit_price: { label: 'Sales Price' },
      discount: { label: 'Discount %' },
      subtotal: { label: 'Subtotal' },
      total_price: { label: 'Total' },
      line_number: { label: 'Line #' },
    },
    _sections: {
      basic: { label: 'Line' },
      pricing: { label: 'Pricing' },
    },
  },
};
