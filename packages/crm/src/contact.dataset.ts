import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { ContactSeedData } from './contact.seed.js';

export const ContactDataset: DatasetInput = {
  object: 'contact',
  externalId: 'email',
  mode: 'ignore',
  env: ['dev', 'test'],
  records: ContactSeedData,
};

DatasetSchema.parse(ContactDataset);

export default ContactDataset;
