import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Portfolio = ObjectSchema.create({
  name: 'portfolio',
  label: 'Portfolio',
  icon: 'pie-chart',
  fields: {
    account_id: Field.masterDetail('wealth_account', { required: true }),
    portfolio_name: Field.text({ label: 'Portfolio Name', required: true, maxLength: 255 }),
    assets: Field.textarea({ label: 'Assets (JSON)' }),
    allocation: Field.textarea({ label: 'Asset Allocation (JSON)' }),
    performance_ytd: Field.number({ label: 'YTD Performance (%)' }),
    benchmark: Field.text({ label: 'Benchmark Index' }),
    rebalance_date: Field.text({ label: 'Next Rebalance Date' }),
    total_value: Field.number({ label: 'Total Value', min: 0 }),
    status: Field.select({
      label: 'Status',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Liquidating', value: 'liquidating' },
        { label: 'Closed', value: 'closed' }
      ],
      defaultValue: 'active'
    })
  }
});
