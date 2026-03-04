import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { ScholarshipSeedData } from './scholarship.seed.js';

export const ScholarshipDataset: DatasetInput = {
  object: 'scholarship',
  externalId: 'name',
  mode: 'ignore',
  env: ['dev', 'test'],
  records: ScholarshipSeedData,
};

DatasetSchema.parse(ScholarshipDataset);

export default ScholarshipDataset;
