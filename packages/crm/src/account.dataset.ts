import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { AccountSeedData } from './account.seed.js';

export const AccountDataset: DatasetInput = {
  object: 'account',
  externalId: 'name',
  mode: 'ignore',
  env: ['dev', 'test'],
  records: AccountSeedData,
};

DatasetSchema.parse(AccountDataset);

export default AccountDataset;
