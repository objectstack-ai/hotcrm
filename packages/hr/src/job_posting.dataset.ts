import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { JobPostingSeedData } from './job_posting.seed.js';

export const JobPostingDataset: DatasetInput = {
  object: 'job_posting',
  externalId: 'title',
  mode: 'ignore',
  env: ['dev', 'test'],
  records: JobPostingSeedData,
};

DatasetSchema.parse(JobPostingDataset);

export default JobPostingDataset;
