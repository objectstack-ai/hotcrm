import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { ShowingSeedData } from './showing.seed.js';

export const ShowingDataset: DatasetInput = {
  object: 'showing',
  externalId: 'property_address',
  mode: 'ignore',
  env: ['dev', 'test'],
  records: ShowingSeedData,
};

DatasetSchema.parse(ShowingDataset);

export default ShowingDataset;
