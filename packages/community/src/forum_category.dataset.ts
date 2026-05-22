import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { ForumCategorySeedData } from './forum_category.seed.js';

export const ForumCategoryDataset: DatasetInput = {
  object: 'forum_category',
  externalId: 'name',
  mode: 'ignore',
  env: ['dev', 'test'],
  records: ForumCategorySeedData,
};

DatasetSchema.parse(ForumCategoryDataset);

export default ForumCategoryDataset;
