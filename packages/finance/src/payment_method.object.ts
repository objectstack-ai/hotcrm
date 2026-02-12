import { ObjectSchema, Field } from '@objectstack/spec/data';

export const PaymentMethod = ObjectSchema.create({
  name: 'payment_method',
  label: 'Payment Method',
  pluralLabel: 'Payment Methods',
  icon: 'credit-card',
  description: 'Stored payment methods for customer accounts',

  fields: {
    account_id: Field.lookup('account', { label: 'Account', required: true }),
    type: Field.select({
      label: 'Payment Type', required: true,
      options: [
        { label: '💳 Credit Card', value: 'credit_card' },
        { label: '🏦 Bank Transfer (ACH)', value: 'ach' },
        { label: '📄 Wire Transfer', value: 'wire' },
        { label: '📋 Check', value: 'check' },
        { label: '💰 PayPal', value: 'paypal' },
        { label: '🔗 Direct Debit', value: 'direct_debit' }
      ]
    }),
    status: Field.select({
      label: 'Status',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Expired', value: 'expired' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Verification Pending', value: 'verification_pending' }
      ],
      defaultValue: 'active'
    }),
    is_default: Field.boolean({ label: 'Default Payment Method', defaultValue: false }),
    card_last_four: Field.text({ label: 'Card Last 4 Digits', maxLength: 4 }),
    card_brand: Field.select({
      label: 'Card Brand',
      options: [
        { label: 'Visa', value: 'visa' },
        { label: 'Mastercard', value: 'mastercard' },
        { label: 'Amex', value: 'amex' },
        { label: 'Discover', value: 'discover' }
      ]
    }),
    expiration_month: Field.number({ label: 'Expiration Month', precision: 0 }),
    expiration_year: Field.number({ label: 'Expiration Year', precision: 0 }),
    bank_name: Field.text({ label: 'Bank Name', maxLength: 255 }),
    bank_account_last_four: Field.text({ label: 'Account Last 4', maxLength: 4 }),
    billing_address: Field.address({ label: 'Billing Address' }),
    nickname: Field.text({ label: 'Nickname', maxLength: 100, description: 'Friendly name for this payment method' }),
    payment_gateway: Field.text({ label: 'Payment Gateway', maxLength: 100, description: 'External gateway reference' }),
    gateway_token: Field.text({ label: 'Gateway Token', maxLength: 255, description: 'Tokenized reference (no sensitive data stored)' }),
    last_used_date: Field.date({ label: 'Last Used', readonly: true }),
    verified: Field.boolean({ label: 'Verified', defaultValue: false }),
    owner_id: Field.lookup('users', { label: 'Owner', required: true })
  },

  enable: { searchable: true, trackHistory: true, feeds: false, files: false },
});
