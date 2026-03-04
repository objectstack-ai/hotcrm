import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { SystemSeedData } from './system.seed.js';

export const CurrencyDataset: DatasetInput = {
  object: 'currency',
  externalId: 'code',
  mode: 'upsert',
  env: ['prod', 'dev', 'test'],
  records: SystemSeedData.currencies,
};

DatasetSchema.parse(CurrencyDataset);

export default CurrencyDataset;
