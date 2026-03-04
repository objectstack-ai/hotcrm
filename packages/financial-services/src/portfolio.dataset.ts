import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { PortfolioSeedData } from './portfolio.seed.js';

export const PortfolioDataset: DatasetInput = {
  object: 'portfolio',
  externalId: 'name',
  mode: 'ignore',
  env: ['dev', 'test'],
  records: PortfolioSeedData,
};

DatasetSchema.parse(PortfolioDataset);

export default PortfolioDataset;
