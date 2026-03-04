import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { OpportunitySeedData } from './opportunity.seed.js';

export const OpportunityDataset: DatasetInput = {
  object: 'opportunity',
  externalId: 'name',
  mode: 'ignore',
  env: ['dev', 'test'],
  records: OpportunitySeedData,
};

DatasetSchema.parse(OpportunityDataset);

export default OpportunityDataset;
