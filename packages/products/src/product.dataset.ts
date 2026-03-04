import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { ProductSeedData } from './product.seed.js';

export const ProductDataset: DatasetInput = {
  object: 'product',
  externalId: 'code',
  mode: 'ignore',
  env: ['dev', 'test'],
  records: ProductSeedData,
};

DatasetSchema.parse(ProductDataset);

export default ProductDataset;
