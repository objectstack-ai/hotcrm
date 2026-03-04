import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { PropertySeedData } from './property.seed.js';

export const PropertyDataset: DatasetInput = {
  object: 'property',
  externalId: 'mls_number',
  mode: 'ignore',
  env: ['dev', 'test'],
  records: PropertySeedData,
};

DatasetSchema.parse(PropertyDataset);

export default PropertyDataset;
