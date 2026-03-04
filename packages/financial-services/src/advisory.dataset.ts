import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { AdvisorySeedData } from './advisory.seed.js';

export const AdvisoryDataset: DatasetInput = {
  object: 'advisory',
  externalId: 'meeting_date',
  mode: 'ignore',
  env: ['dev', 'test'],
  records: AdvisorySeedData,
};

DatasetSchema.parse(AdvisoryDataset);

export default AdvisoryDataset;
