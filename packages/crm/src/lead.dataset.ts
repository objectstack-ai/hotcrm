import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { LeadSeedData } from './lead.seed.js';

export const LeadDataset: DatasetInput = {
  object: 'lead',
  externalId: 'email',
  mode: 'ignore',
  env: ['dev', 'test'],
  records: LeadSeedData,
};

DatasetSchema.parse(LeadDataset);

export default LeadDataset;
