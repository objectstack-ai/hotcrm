import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { RealEstateOfferSeedData } from './real_estate_offer.seed.js';

export const RealEstateOfferDataset: DatasetInput = {
  object: 'real_estate_offer',
  externalId: 'offer_date',
  mode: 'ignore',
  env: ['dev', 'test'],
  records: RealEstateOfferSeedData,
};

DatasetSchema.parse(RealEstateOfferDataset);

export default RealEstateOfferDataset;
