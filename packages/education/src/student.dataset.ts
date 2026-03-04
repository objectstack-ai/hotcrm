import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { StudentSeedData } from './student.seed.js';

export const StudentDataset: DatasetInput = {
  object: 'student',
  externalId: 'student_id',
  mode: 'ignore',
  env: ['dev', 'test'],
  records: StudentSeedData,
};

DatasetSchema.parse(StudentDataset);

export default StudentDataset;
