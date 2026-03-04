import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { ShowingSeedData } from './showing.seed.js';

export const ShowingDataset: DatasetInput = {
  object: 'showing',
  externalId: 'buyer_name',
  mode: 'ignore',
  env: ['dev', 'test'],
  records: ShowingSeedData,
};

DatasetSchema.parse(ShowingDataset);

export default ShowingDataset;
