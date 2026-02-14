import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * CRM Utility Bar Layout
 * Utility bar providing quick lookup, recent records, and favorites for CRM users.
 */
export const CrmUtilityPage = {
  name: 'crm_utility',
  type: 'utility' as const,
  label: 'CRM Utility Bar',
  template: 'default',
  isDefault: false,
  assignedProfiles: ['sales_rep', 'sales_manager', 'account_executive', 'admin'],

  regions: [
    {
      name: 'search',
      components: [
        {
          type: 'page:card' as const,
          label: 'Quick Lookup',
          properties: {}
        }
      ]
    },
    {
      name: 'recent',
      components: [
        {
          type: 'page:card' as const,
          label: 'Recent Records',
          properties: {}
        }
      ]
    },
    {
      name: 'favorites',
      components: [
        {
          type: 'page:card' as const,
          label: 'Favorites',
          properties: {}
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(CrmUtilityPage);

export default CrmUtilityPage;
