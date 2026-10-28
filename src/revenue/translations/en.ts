// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

/**
 * English (en) — the revenue module's own translations: every row whose
 * target this package registers. Why they live here and not in the app
 * package's pack: `./index.ts`.
 */
export const en: TranslationData = {
  objects: {
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
    crm_price_book: {
      label: 'Price Book',
      pluralLabel: 'Price Books',
      description: 'A named list of product prices: the standard list, a partner or regional tier, or a promotion',
      fields: {
        owner_id: { label: 'Price Book Owner' },
        name: { label: 'Price Book Name' },
        description: { label: 'Description' },
        is_active: { label: 'Active' },
        is_standard: { label: 'Standard' },
        valid_from: { label: 'Valid From' },
        valid_to: { label: 'Valid To' },
      },
      _sections: {
        basic: { label: 'Price Book Information' },
        validity: { label: 'Validity' },
      },
    },
    crm_price_book_entry: {
      label: 'Price Book Entry',
      pluralLabel: 'Price Book Entries',
      description: "One product's price in one price book",
      fields: {
        entry_number: { label: 'Entry Number' },
        crm_price_book: { label: 'Price Book' },
        crm_product: { label: 'Product' },
        list_price: { label: 'List Price' },
        is_active: { label: 'Active' },
      },
      _sections: {
        basic: { label: 'Entry Information' },
      },
    },
    crm_quote: {
      label: 'Quote',
      pluralLabel: 'Quotes',
      fields: {
        quote_number: { label: 'Quote Number' },
        name: { label: 'Quote Name' },
        crm_account: { label: 'Account' },
        crm_contact: {
          label: 'Contact',
          help: 'Required on the save that moves the quote to Presented or Accepted — the drafted contract takes its Primary Contact from here.',
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
        payment_terms: { label: 'Payment Terms' },
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
    crm_opportunity_line_item: {
      label: 'Opportunity Line Item',
      pluralLabel: 'Opportunity Line Items',
      description: 'Per-product pricing lines under an opportunity',
      fields: {
        crm_opportunity: { label: 'Opportunity' },
        crm_product: { label: 'Product' },
        description: { label: 'Description' },
        product_title: { label: 'Product Title', help: "The product's title, kept in step with the product. It names this line." },
        quantity: { label: 'Quantity' },
        list_price: { label: 'List Price', help: "Auto-populated from the product's List Price." },
        unit_price: {
          label: 'Sales Price',
          help: 'Negotiated unit price (may differ from list price)',
        },
        discount: { label: 'Discount %' },
        total_price: { label: 'Total' },
        line_number: { label: 'Line #' },
      },
      _sections: {
        basic: { label: 'Line Item' },
        pricing: { label: 'Pricing' },
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
        product_title: { label: 'Product Title', help: "The product's title, kept in step with the product. It names this line." },
        quantity: { label: 'Quantity' },
        list_price: { label: 'List Price' },
        unit_price: { label: 'Sales Price' },
        discount: { label: 'Discount %' },
        subtotal: { label: 'Subtotal' },
        total_price: { label: 'Total' },
        line_number: { label: 'Line #' },
      },
      _sections: {
        basic: { label: 'Line Item' },
        pricing: { label: 'Pricing' },
      },
    },
  },
};
