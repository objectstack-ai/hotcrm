import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { KbArticleSeedData } from './kb_article.seed.js';

export const KbArticleDataset: DatasetInput = {
  object: 'kb_article',
  externalId: 'title',
  mode: 'ignore',
  env: ['dev', 'test'],
  records: KbArticleSeedData,
};

DatasetSchema.parse(KbArticleDataset);

export default KbArticleDataset;
