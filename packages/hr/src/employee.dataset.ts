import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { EmployeeSeedData } from './employee.seed.js';

export const EmployeeDataset: DatasetInput = {
  object: 'employee',
  externalId: 'email',
  mode: 'ignore',
  env: ['dev', 'test'],
  records: EmployeeSeedData,
};

DatasetSchema.parse(EmployeeDataset);

export default EmployeeDataset;
