import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { CampaignSeedData } from './campaign.seed.js';

export const CampaignDataset: DatasetInput = {
  object: 'campaign',
  externalId: 'name',
  mode: 'ignore',
  env: ['dev', 'test'],
  records: CampaignSeedData,
};

DatasetSchema.parse(CampaignDataset);

export default CampaignDataset;
