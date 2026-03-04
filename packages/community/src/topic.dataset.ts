import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { TopicSeedData } from './topic.seed.js';

export const TopicDataset: DatasetInput = {
  object: 'topic',
  externalId: 'title',
  mode: 'ignore',
  env: ['dev', 'test'],
  records: TopicSeedData,
};

DatasetSchema.parse(TopicDataset);

export default TopicDataset;
