import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { SystemSeedData } from './system.seed.js';

export const LanguageDataset: DatasetInput = {
  object: 'language',
  externalId: 'code',
  mode: 'upsert',
  env: ['prod', 'dev', 'test'],
  records: SystemSeedData.languages,
};

DatasetSchema.parse(LanguageDataset);

export default LanguageDataset;
