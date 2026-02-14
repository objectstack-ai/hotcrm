import { ObjectSchema, Field } from '@objectstack/spec/data';

export const TransactionRecord = ObjectSchema.create({
  name: 'transaction_record',
  label: 'Transaction Record',
  fields: {
    account_id: Field.masterDetail('wealth_account'),
    transaction_type: Field.select({
      label: 'Transaction Type',
      required: true,
      options: [
        { label: 'Buy', value: 'buy' },
        { label: 'Sell', value: 'sell' },
        { label: 'Deposit', value: 'deposit' },
        { label: 'Withdrawal', value: 'withdrawal' },
        { label: 'Dividend', value: 'dividend' },
        { label: 'Interest', value: 'interest' },
        { label: 'Fee', value: 'fee' },
        { label: 'Transfer', value: 'transfer' }
      ]
    }),
    amount: Field.number({ label: 'Transaction Amount', required: true }),
    transaction_date: Field.text({ label: 'Transaction Date', required: true }),
    counterparty: Field.text({ label: 'Counterparty' }),
    status: Field.select({
      label: 'Status',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Completed', value: 'completed' },
        { label: 'Failed', value: 'failed' },
        { label: 'Reversed', value: 'reversed' }
      ],
      defaultValue: 'pending'
    }),
    compliance_flag: Field.select({
      label: 'Compliance Flag',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Review', value: 'review' },
        { label: 'Flagged', value: 'flagged' },
        { label: 'Blocked', value: 'blocked' }
      ],
      defaultValue: 'none'
    }),
    reference_number: Field.text({ label: 'Reference Number' }),
    notes: Field.textarea({ label: 'Notes' })
  }
});
