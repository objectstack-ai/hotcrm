import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { DepartmentSeedData } from './department.seed.js';

export const DepartmentDataset: DatasetInput = {
  object: 'department',
  externalId: 'code',
  mode: 'upsert',
  env: ['prod', 'dev', 'test'],
  records: DepartmentSeedData,
};

DatasetSchema.parse(DepartmentDataset);

export default DepartmentDataset;
