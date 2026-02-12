import { ObjectSchema, Field } from '@objectstack/spec/data';

export const OpportunityLineItem = ObjectSchema.create({
  name: 'opportunity_line_item',
  label: 'Opportunity Line Item',
  pluralLabel: 'Opportunity Line Items',
  icon: 'list-ol',
  description: 'Products linked to opportunities with quantity, pricing, and discount information',

  fields: {
    opportunity_id: Field.masterDetail('opportunity', {
      label: 'Opportunity',
      required: true,
      description: 'Parent opportunity for this line item'
    }),
    product_id: Field.lookup('product', {
      label: 'Product',
      required: true,
      description: 'Product associated with this line item'
    }),
    pricebook_entry_id: Field.lookup('pricebook', {
      label: 'Price Book Entry',
      description: 'Price book entry used for pricing'
    }),
    quantity: Field.number({
      label: 'Quantity',
      required: true,
      precision: 2,
      defaultValue: 1,
      description: 'Number of units'
    }),
    unit_price: Field.currency({
      label: 'Unit Price',
      required: true,
      description: 'Price per unit'
    }),
    total_price: Field.currency({
      label: 'Total Price',
      readonly: true,
      description: 'Calculated total (quantity × unit price - discount)'
    }),
    discount_percent: Field.percent({
      label: 'Discount (%)',
      description: 'Discount percentage applied to this line item',
      defaultValue: 0
    }),
    discount_amount: Field.currency({
      label: 'Discount Amount',
      readonly: true,
      description: 'Calculated discount amount'
    }),
    list_price: Field.currency({
      label: 'List Price',
      readonly: true,
      description: 'Original list price from price book'
    }),
    description: Field.textarea({
      label: 'Description',
      maxLength: 2000
    }),
    line_number: Field.number({
      label: 'Line Number',
      precision: 0,
      description: 'Sort order for display'
    }),
    service_date: Field.date({
      label: 'Service Date',
      description: 'Date when product/service is delivered'
    }),
    product_code: Field.text({
      label: 'Product Code',
      readonly: true,
      maxLength: 100,
      description: 'Product SKU (copied from product)'
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    feeds: false,
    files: false
  },
});
