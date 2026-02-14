import { ObjectSchema, Field } from '@objectstack/spec/data';

export const FinancialProduct = ObjectSchema.create({
  name: 'financial_product',
  label: 'Financial Product',
  fields: {
    name: Field.text({ label: 'Product Name', required: true, maxLength: 255 }),
    product_type: Field.select({
      label: 'Product Type',
      required: true,
      options: [
        { label: 'Equity', value: 'equity' },
        { label: 'Bond', value: 'bond' },
        { label: 'Mutual Fund', value: 'mutual_fund' },
        { label: 'ETF', value: 'etf' },
        { label: 'Option', value: 'option' },
        { label: 'Futures', value: 'futures' },
        { label: 'Real Estate', value: 'real_estate' },
        { label: 'Alternative', value: 'alternative' }
      ]
    }),
    risk_rating: Field.number({ label: 'Risk Rating', min: 1, max: 5 }),
    min_investment: Field.number({ label: 'Minimum Investment', min: 0 }),
    expected_return: Field.number({ label: 'Expected Return (%)' }),
    fee_structure: Field.textarea({ label: 'Fee Structure (JSON)' }),
    maturity: Field.text({ label: 'Maturity Date' }),
    status: Field.select({
      label: 'Status',
      options: [
        { label: 'Available', value: 'available' },
        { label: 'Discontinued', value: 'discontinued' },
        { label: 'Suspended', value: 'suspended' }
      ],
      defaultValue: 'available'
    }),
    issuer: Field.text({ label: 'Issuer' }),
    currency: Field.text({ label: 'Currency', defaultValue: 'USD' })
  }
});
