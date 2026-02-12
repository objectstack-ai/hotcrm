import { ObjectSchema, Field } from '@objectstack/spec/data';

export const OrderItem = ObjectSchema.create({
  name: 'order_item',
  label: 'Order Item',
  pluralLabel: 'Order Items',
  icon: 'box',
  description: 'Individual line items within an order',

  fields: {
    order_id: Field.masterDetail('order', {
      label: 'Order',
      required: true,
      description: 'Parent order'
    }),
    product_id: Field.lookup('product', {
      label: 'Product',
      required: true,
      description: 'Product being ordered'
    }),
    quantity: Field.number({
      label: 'Quantity',
      required: true,
      precision: 2,
      defaultValue: 1,
      description: 'Quantity ordered'
    }),
    unit_price: Field.currency({
      label: 'Unit Price',
      required: true,
      description: 'Price per unit'
    }),
    total_price: Field.currency({
      label: 'Total Price',
      readonly: true,
      description: 'Calculated total (quantity × unit price)'
    }),
    discount_percent: Field.percent({
      label: 'Discount (%)',
      defaultValue: 0
    }),
    discount_amount: Field.currency({
      label: 'Discount Amount',
      readonly: true
    }),
    tax_amount: Field.currency({
      label: 'Tax',
      readonly: true
    }),
    line_number: Field.number({
      label: 'Line Number',
      precision: 0,
      description: 'Sort order'
    }),
    status: Field.select({
      label: 'Status',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Allocated', value: 'allocated' },
        { label: 'Shipped', value: 'shipped' },
        { label: 'Delivered', value: 'delivered' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Returned', value: 'returned' }
      ],
      defaultValue: 'pending'
    }),
    fulfilled_quantity: Field.number({
      label: 'Fulfilled Quantity',
      precision: 2,
      defaultValue: 0,
      description: 'Quantity already fulfilled'
    }),
    remaining_quantity: Field.number({
      label: 'Remaining Quantity',
      readonly: true,
      precision: 2,
      description: 'Quantity yet to be fulfilled'
    }),
    expected_delivery_date: Field.date({
      label: 'Expected Delivery',
      description: 'Expected delivery date for this item'
    }),
    actual_delivery_date: Field.date({
      label: 'Actual Delivery',
      description: 'Actual delivery date'
    }),
    description: Field.textarea({
      label: 'Description',
      maxLength: 2000
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    feeds: false,
    files: false
  },
});
