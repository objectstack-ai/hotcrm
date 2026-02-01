import { defineObjectFromZod } from '@hotcrm/core';
import { LeadSchema } from './schemas/lead.schema';

const LeadObject = defineObjectFromZod('lead', LeadSchema, {
  label: '线索',
  labelPlural: '线索',
  icon: 'user-plus',
  description: 'AI-Native Lead Management Object (Zod Defined)',
  enable: {
    searchable: true,
    trackHistory: true,
    activities: true,
    feeds: true,
    files: true,
    enableDuplicateDetection: true
  },
  // We can still override field metadata if Zod isn't enough
  fields: {
    Email: { searchable: true, unique: true },
    Company: { searchable: true },
    LastName: { searchable: true },
    LeadScore: { type: 'number', scale: 0 },
    AnnualRevenue: { type: 'currency', scale: 2 }
  }
});

export default LeadObject;
