import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { InvoiceSeedData } from './invoice.seed.js';

export const InvoiceDataset: DatasetInput = {
  object: 'invoice',
  externalId: 'invoice_number',
  mode: 'ignore',
  env: ['dev', 'test'],
  records: InvoiceSeedData,
};

DatasetSchema.parse(InvoiceDataset);

export default InvoiceDataset;
