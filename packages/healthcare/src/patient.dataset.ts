import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { PatientSeedData } from './patient.seed.js';

export const PatientDataset: DatasetInput = {
  object: 'patient',
  externalId: 'medical_record_number',
  mode: 'ignore',
  env: ['dev', 'test'],
  records: PatientSeedData,
};

DatasetSchema.parse(PatientDataset);

export default PatientDataset;
