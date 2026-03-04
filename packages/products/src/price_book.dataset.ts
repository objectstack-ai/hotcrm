import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { PriceBookSeedData } from './price_book.seed.js';

export const PriceBookDataset: DatasetInput = {
  object: 'price_book',
  externalId: 'name',
  mode: 'ignore',
  env: ['dev', 'test'],
  records: PriceBookSeedData,
};

DatasetSchema.parse(PriceBookDataset);

export default PriceBookDataset;
