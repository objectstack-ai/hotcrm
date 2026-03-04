import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { SystemSeedData } from './system.seed.js';

export const CountryDataset: DatasetInput = {
  object: 'country',
  externalId: 'code',
  mode: 'upsert',
  env: ['prod', 'dev', 'test'],
  records: SystemSeedData.countries,
};

DatasetSchema.parse(CountryDataset);

export default CountryDataset;
