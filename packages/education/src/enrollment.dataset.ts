import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { EnrollmentSeedData } from './enrollment.seed.js';

export const EnrollmentDataset: DatasetInput = {
  object: 'enrollment',
  externalId: 'student_name',
  mode: 'ignore',
  env: ['dev', 'test'],
  records: EnrollmentSeedData,
};

DatasetSchema.parse(EnrollmentDataset);

export default EnrollmentDataset;
