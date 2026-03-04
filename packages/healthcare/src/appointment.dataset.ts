import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { AppointmentSeedData } from './appointment.seed.js';

export const AppointmentDataset: DatasetInput = {
  object: 'appointment',
  externalId: 'reason',
  mode: 'ignore',
  env: ['dev', 'test'],
  records: AppointmentSeedData,
};

DatasetSchema.parse(AppointmentDataset);

export default AppointmentDataset;
