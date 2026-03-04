import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { PaymentSeedData } from './payment.seed.js';

export const PaymentDataset: DatasetInput = {
  object: 'payment',
  externalId: 'payment_number',
  mode: 'ignore',
  env: ['dev', 'test'],
  records: PaymentSeedData,
};

DatasetSchema.parse(PaymentDataset);

export default PaymentDataset;
