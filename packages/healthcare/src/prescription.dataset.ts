import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { PrescriptionSeedData } from './prescription.seed.js';

export const PrescriptionDataset: DatasetInput = {
  object: 'prescription',
  externalId: 'patient_name',
  mode: 'ignore',
  env: ['dev', 'test'],
  records: PrescriptionSeedData,
};

DatasetSchema.parse(PrescriptionDataset);

export default PrescriptionDataset;
