import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { CourseSeedData } from './course.seed.js';

export const CourseDataset: DatasetInput = {
  object: 'course',
  externalId: 'code',
  mode: 'ignore',
  env: ['dev', 'test'],
  records: CourseSeedData,
};

DatasetSchema.parse(CourseDataset);

export default CourseDataset;
