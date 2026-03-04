import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { SystemSeedData } from './system.seed.js';

export const TimezoneDataset: DatasetInput = {
  object: 'timezone',
  externalId: 'id',
  mode: 'upsert',
  env: ['prod', 'dev', 'test'],
  records: SystemSeedData.timezones,
};

DatasetSchema.parse(TimezoneDataset);

export default TimezoneDataset;
