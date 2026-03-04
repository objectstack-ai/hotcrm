import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { ConnectionSeedData } from './connection.seed.js';

export const ConnectionDataset: DatasetInput = {
  object: 'connection',
  externalId: 'name',
  mode: 'ignore',
  env: ['dev', 'test'],
  records: ConnectionSeedData,
};

DatasetSchema.parse(ConnectionDataset);

export default ConnectionDataset;
