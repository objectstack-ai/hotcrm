import { type DatasetInput, DatasetSchema } from '@objectstack/spec/data';
import { EmailTemplateSeedData } from './email_template.seed.js';

export const EmailTemplateDataset: DatasetInput = {
  object: 'email_template',
  externalId: 'name',
  mode: 'ignore',
  env: ['dev', 'test'],
  records: EmailTemplateSeedData,
};

DatasetSchema.parse(EmailTemplateDataset);

export default EmailTemplateDataset;
