import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { CurrencySeedData } from './currency.seed.js';

export const CurrencyDataset: DatasetInput = {
  object: 'currency',
  externalId: 'code',
  mode: 'upsert',
  env: ['prod', 'dev', 'test'],
  records: CurrencySeedData,
};

DatasetSchema.parse(CurrencyDataset);

export default CurrencyDataset;
