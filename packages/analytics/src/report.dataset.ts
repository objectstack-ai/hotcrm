import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { ReportSeedData } from './report.seed.js';

export const ReportDataset: DatasetInput = {
  object: 'report',
  externalId: 'name',
  mode: 'ignore',
  env: ['dev', 'test'],
  records: ReportSeedData,
};

DatasetSchema.parse(ReportDataset);

export default ReportDataset;
