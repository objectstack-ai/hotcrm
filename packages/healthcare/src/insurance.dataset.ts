import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { InsuranceSeedData } from './insurance.seed.js';

export const InsuranceDataset: DatasetInput = {
  object: 'insurance',
  externalId: 'group_number',
  mode: 'ignore',
  env: ['dev', 'test'],
  records: InsuranceSeedData,
};

DatasetSchema.parse(InsuranceDataset);

export default InsuranceDataset;
