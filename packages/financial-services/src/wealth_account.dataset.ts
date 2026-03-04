import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { WealthAccountSeedData } from './wealth_account.seed.js';

export const WealthAccountDataset: DatasetInput = {
  object: 'wealth_account',
  externalId: 'account_name',
  mode: 'ignore',
  env: ['dev', 'test'],
  records: WealthAccountSeedData,
};

DatasetSchema.parse(WealthAccountDataset);

export default WealthAccountDataset;
