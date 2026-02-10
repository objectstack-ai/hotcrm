import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Quote = ObjectSchema.create({
  name: 'quote',
  label: 'Quote',
  pluralLabel: 'Quotes',
  icon: 'file-invoice-dollar',
  description: 'CPQ (Configure, Price, Quote) with complex pricing, discount approval, and PDF generation',

  fields: {
    quote_number: Field.autonumber({
      label: 'Quote Number',
      readonly: true,
      format: 'Q-{YYYY}-{MM}-{0000}'
    }),
    name: Field.text({
      label: 'Quote name',
      required: true,
      maxLength: 255
    }),
    status: Field.select({
      label: 'status',
      required: true,
      defaultValue: 'draft',
      options: [
        {
          "label": "📝 Draft",
          "value": "draft"
        },
        {
          "label": "🔄 In Review",
          "value": "in_review"
        },
        {
          "label": "✅ Approved",
          "value": "approved"
        },
        {
          "label": "❌ Rejected",
          "value": "rejected"
        },
        {
          "label": "📧 Sent",
          "value": "sent"
        },
        {
          "label": "🤝 Accepted",
          "value": "accepted"
        },
        {
          "label": "🚫 Declined",
          "value": "declined"
        },
        {
          "label": "⏰ Expired",
          "value": "expired"
        }
      ]
    }),
    opportunity_id: Field.lookup('opportunity', {
      label: 'Opportunity',
      required: true
    }),
    account_id: Field.lookup('account', {
      label: 'Account',
      required: true
    }),
    contact_id: Field.lookup('contact', { label: 'Contact' }),
    pricebook_id: Field.lookup('pricebook', {
      label: 'Price Book',
      required: true
    }),
    quote_date: Field.date({
      label: 'Quote Date',
      required: true,
      defaultValue: '$today'
    }),
    expiration_date: Field.date({
      label: 'Expiration Date',
      required: true
    }),
    validity_period_days: Field.number({
      label: 'Validity Period (Days)',
      defaultValue: 30,
      readonly: true,
      precision: 0
    }),
    subtotal: Field.currency({
      label: 'subtotal',
      description: 'Sum of all line item amounts',
      readonly: true,
      precision: 2
    }),
    discount_percent: Field.percent({
      label: 'Discount %',
      defaultValue: 0
    }),
    discount_amount: Field.currency({
      label: 'Discount Amount',
      readonly: true,
      precision: 2
    }),
    tax_percent: Field.percent({
      label: 'Tax %',
      defaultValue: 0
    }),
    tax_amount: Field.currency({
      label: 'Tax Amount',
      readonly: true,
      precision: 2
    }),
    shipping_handling: Field.currency({
      label: 'Shipping & Handling',
      defaultValue: 0,
      precision: 2
    }),
    total_price: Field.currency({
      label: 'Total Price',
      description: 'subtotal - Discount + Tax + Shipping',
      readonly: true,
      precision: 2
    }),
    currency_code: Field.select({
      label: 'Currency',
      defaultValue: 'usd',
      options: [
        {
          "label": "USD - US Dollar",
          "value": "usd"
        },
        {
          "label": "EUR - Euro",
          "value": "eur"
        },
        {
          "label": "GBP - British Pound",
          "value": "gbp"
        },
        {
          "label": "JPY - Japanese Yen",
          "value": "jpy"
        },
        {
          "label": "CNY - Chinese Yuan",
          "value": "cny"
        },
        {
          "label": "AUD - Australian Dollar",
          "value": "aud"
        },
        {
          "label": "CAD - Canadian Dollar",
          "value": "cad"
        }
      ]
    }),
    exchange_rate: Field.number({
      label: 'Exchange Rate',
      description: 'Conversion rate to base currency',
      defaultValue: 1,
      precision: 6
    }),
    payment_terms: Field.select({
      label: 'Payment Terms',
      options: [
        {
          "label": "Full Prepayment",
          "value": "full_prepayment"
        },
        {
          "label": "30% Prepay, 70% on Acceptance",
          "value": "split_30_70"
        },
        {
          "label": "50% Prepay, 50% on Acceptance",
          "value": "split_50_50"
        },
        {
          "label": "Net 30",
          "value": "net_30"
        },
        {
          "label": "Net 60",
          "value": "net_60"
        },
        {
          "label": "Net 90",
          "value": "net_90"
        },
        {
          "label": "Installments",
          "value": "installments"
        },
        {
          "label": "Other",
          "value": "other"
        }
      ]
    }),
    delivery_terms: Field.select({
      label: 'Delivery Terms',
      options: [
        {
          "label": "On-site Delivery",
          "value": "on_site_delivery"
        },
        {
          "label": "Remote Delivery",
          "value": "remote_delivery"
        },
        {
          "label": "Cloud Deployment",
          "value": "cloud_deployment"
        },
        {
          "label": "Shipping",
          "value": "shipping"
        },
        {
          "label": "Digital Download",
          "value": "digital_download"
        },
        {
          "label": "Other",
          "value": "other"
        }
      ]
    }),
    shipping_street: Field.text({
      label: 'Shipping Street',
      maxLength: 255
    }),
    shipping_city: Field.text({
      label: 'Shipping City',
      maxLength: 40
    }),
    shipping_state: Field.text({
      label: 'Shipping State',
      maxLength: 80
    }),
    shipping_postal_code: Field.text({
      label: 'Shipping Postal Code',
      maxLength: 20
    }),
    shipping_country: Field.text({
      label: 'Shipping Country',
      maxLength: 80
    }),
    billing_street: Field.text({
      label: 'Billing Street',
      maxLength: 255
    }),
    billing_city: Field.text({
      label: 'Billing City',
      maxLength: 40
    }),
    billing_state: Field.text({
      label: 'Billing State',
      maxLength: 80
    }),
    billing_postal_code: Field.text({
      label: 'Billing Postal Code',
      maxLength: 20
    }),
    billing_country: Field.text({
      label: 'Billing Country',
      maxLength: 80
    }),
    approval_status: Field.select({
      label: 'Approval status',
      defaultValue: 'not_submitted',
      readonly: true,
      options: [
        {
          "label": "Not Submitted",
          "value": "not_submitted"
        },
        {
          "label": "Pending",
          "value": "pending"
        },
        {
          "label": "Approved",
          "value": "approved"
        },
        {
          "label": "Rejected",
          "value": "rejected"
        },
        {
          "label": "Recalled",
          "value": "recalled"
        }
      ]
    }),
    approval_level: Field.number({
      label: 'Approval Level',
      description: 'Required approval level based on discount %',
      readonly: true,
      precision: 0
    }),
    approved_by_id: Field.lookup('users', {
      label: 'Approved By',
      readonly: true
    }),
    approved_date: Field.datetime({
      label: 'Approved Date',
      readonly: true
    }),
    rejected_by_id: Field.lookup('users', {
      label: 'Rejected By',
      readonly: true
    }),
    rejected_date: Field.datetime({
      label: 'Rejected Date',
      readonly: true
    }),
    rejection_reason: Field.textarea({
      label: 'Rejection Reason',
      readonly: true,
      maxLength: 2000
    }),
    version_number: Field.number({
      label: 'Version',
      defaultValue: 1,
      readonly: true,
      precision: 0
    }),
    is_primary_quote: Field.boolean({
      label: 'Primary Quote',
      description: 'Is this the primary quote for the opportunity?',
      defaultValue: true
    }),
    previous_version_id: Field.lookup('quote', {
      label: 'Previous Version',
      readonly: true
    }),
    latest_version_id: Field.lookup('quote', {
      label: 'Latest Version',
      readonly: true
    }),
    template_id: Field.lookup('quote_template', {
      label: 'Template',
      description: 'Quote template used for PDF generation'
    }),
    description: Field.textarea({
      label: 'description',
      maxLength: 32000
    }),
    internal_notes: Field.textarea({
      label: 'Internal Notes',
      description: 'Internal use only, not visible to customer',
      maxLength: 5000
    }),
    p_d_f_generated_date: Field.datetime({
      label: 'PDF Generated Date',
      readonly: true
    }),
    p_d_f_url: Field.url({
      label: 'PDF URL',
      readonly: true
    }),
    p_d_f_document_id: Field.lookup('document', {
      label: 'PDF Document',
      readonly: true
    }),
    accepted_date: Field.datetime({
      label: 'Accepted Date',
      readonly: true
    }),
    accepted_by_id: Field.lookup('contact', {
      label: 'Accepted By',
      readonly: true
    }),
    customer_signature: Field.text({
      label: 'Customer Signature',
      readonly: true,
      maxLength: 255
    }),
    ai_recommended_bundle: Field.textarea({
      label: 'AI Recommended Bundle',
      description: 'Auto-generated product bundle recommendations based on customer budget',
      readonly: true,
      maxLength: 2000
    }),
    ai_optimal_discount: Field.percent({
      label: 'AI Optimal Discount',
      description: 'AI-suggested optimal discount based on historical data',
      readonly: true
    }),
    ai_win_probability: Field.percent({
      label: 'AI Win Probability',
      description: 'Predicted win rate based on quote configuration',
      readonly: true
    }),
    ai_pricing_analysis: Field.textarea({
      label: 'AI Pricing Analysis',
      description: 'Competitive pricing analysis and recommendations',
      readonly: true,
      maxLength: 2000
    }),
    ai_recommended_upsells: Field.textarea({
      label: 'AI Recommended Upsells',
      description: 'Cross-sell and upsell product recommendations',
      readonly: true,
      maxLength: 2000
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    activities: true,
    feeds: true,
    files: true
  },
});