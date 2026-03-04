import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { CaseSeedData } from './case.seed.js';

export const CaseDataset: DatasetInput = {
  object: 'case',
  externalId: 'case_number',
  mode: 'ignore',
  env: ['dev', 'test'],
  records: CaseSeedData,
};

DatasetSchema.parse(CaseDataset);

export default CaseDataset;
