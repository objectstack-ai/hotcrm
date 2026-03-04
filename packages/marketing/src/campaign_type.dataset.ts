import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { CampaignTypeSeedData } from './campaign_type.seed.js';

export const CampaignTypeDataset: DatasetInput = {
  object: 'campaign_type',
  externalId: 'name',
  mode: 'upsert',
  env: ['prod', 'dev', 'test'],
  records: CampaignTypeSeedData,
};

DatasetSchema.parse(CampaignTypeDataset);

export default CampaignTypeDataset;
