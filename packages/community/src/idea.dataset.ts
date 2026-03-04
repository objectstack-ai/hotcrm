import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { IdeaSeedData } from './idea.seed.js';

export const IdeaDataset: DatasetInput = {
  object: 'idea',
  externalId: 'title',
  mode: 'ignore',
  env: ['dev', 'test'],
  records: IdeaSeedData,
};

DatasetSchema.parse(IdeaDataset);

export default IdeaDataset;
