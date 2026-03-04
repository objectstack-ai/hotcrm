import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { KycSeedData } from './kyc.seed.js';

export const KycDataset: DatasetInput = {
  object: 'kyc',
  externalId: 'client_name',
  mode: 'ignore',
  env: ['dev', 'test'],
  records: KycSeedData,
};

DatasetSchema.parse(KycDataset);

export default KycDataset;
