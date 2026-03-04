import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { ListingSeedData } from './listing.seed.js';

export const ListingDataset: DatasetInput = {
  object: 'listing',
  externalId: 'mls_number',
  mode: 'ignore',
  env: ['dev', 'test'],
  records: ListingSeedData,
};

DatasetSchema.parse(ListingDataset);

export default ListingDataset;
