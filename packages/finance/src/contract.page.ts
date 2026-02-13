import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Contract Detail Page Layout
 */
export const ContractPage = {
  name: 'contract_detail',
  object: 'contract',
  type: 'record' as const,
  label: 'Contract Detail Page',
  template: 'record_detail',
  isDefault: true,
  assignedProfiles: ['finance_analyst', 'finance_manager', 'admin'],

  regions: [
    {
      name: 'header',
      components: [
        {
          type: 'record:highlights' as const,
          properties: {
            fields: ['contract_number', 'account', 'status', 'contract_value', 'end_date']
          }
        }
      ]
    },
    {
      name: 'tabs',
      components: [
        {
          type: 'page:tabs' as const,
          properties: {
            tabs: ['contract_info']
          }
        }
      ]
    },
    {
      name: 'contract_info',
      components: [
        {
          type: 'record:details' as const,
          label: 'Contract Information',
          properties: {
            fields: [
              'contract_number', 'account', 'opportunity', 'status',
              'start_date', 'end_date', 'contract_term', 'contract_value'
            ],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'related_lists',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Invoices',
          properties: {
            object: 'invoice',
            columns: ['invoice_number', 'status', 'amount', 'due_date', 'paid_date'],
            sort: [{ field: 'due_date', direction: 'asc' }],
            actions: ['new', 'edit']
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(ContractPage);

export default ContractPage;
