import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { SystemSeedData } from './system.seed.js';

export const IndustryDataset: DatasetInput = {
  object: 'industry',
  externalId: 'code',
  mode: 'upsert',
  env: ['prod', 'dev', 'test'],
  records: SystemSeedData.industries,
};

DatasetSchema.parse(IndustryDataset);

export default IndustryDataset;
