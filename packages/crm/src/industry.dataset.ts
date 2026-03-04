import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { IndustrySeedData } from './industry.seed.js';

export const IndustryDataset: DatasetInput = {
  object: 'industry',
  externalId: 'code',
  mode: 'upsert',
  env: ['prod', 'dev', 'test'],
  records: IndustrySeedData,
};

DatasetSchema.parse(IndustryDataset);

export default IndustryDataset;
