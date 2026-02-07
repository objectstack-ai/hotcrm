import { PageSchema } from '@objectstack/spec/ui';

/**
 * Account Detail Page Layout
 * Demonstrates comprehensive page layout with tabs, sections, and related lists
 */
export const AccountPage = PageSchema.create({
  name: 'account_detail',
  object: 'account',
  type: 'record',
  label: 'Account Detail Page',

  layout: {
    type: 'tabs',
    sections: [
      // Account Information Tab
      {
        label: 'Account Information',
        columns: 2,
        fields: [
          'name',
          'account_number',
          'type',
          'industry',
          'phone',
          'website',
          'annual_revenue',
          'employees',
          'parent_account',
          'ownership'
        ]
      },

      // Address Information Tab
      {
        label: 'Address Information',
        columns: 2,
        fields: [
          'billing_street',
          'billing_city',
          'billing_state',
          'billing_postal_code',
          'billing_country',
          'shipping_street',
          'shipping_city',
          'shipping_state',
          'shipping_postal_code',
          'shipping_country'
        ]
      },

      // Additional Information Tab  
      {
        label: 'Additional Information',
        columns: 2,
        fields: [
          'description',
          'rating',
          'sic_code',
          'ticker_symbol',
          'fax',
          'created_by',
          'created_date',
          'last_modified_by',
          'last_modified_date'
        ]
      },

      // Related Lists - Opportunities
      {
        label: 'Opportunities',
        type: 'related_list',
        object: 'opportunity',
        columns: ['name', 'stage', 'amount', 'close_date', 'probability'],
        filters: [['stage', '!=', 'Closed Lost']],
        sort: [{ field: 'close_date', direction: 'asc' }],
        actions: ['new', 'edit', 'delete']
      },

      // Related Lists - Contacts
      {
        label: 'Contacts',
        type: 'related_list',
        object: 'contact',
        columns: ['name', 'title', 'email', 'phone', 'is_decision_maker'],
        actions: ['new', 'edit', 'delete']
      },

      // Related Lists - Cases
      {
        label: 'Cases',
        type: 'related_list',
        object: 'case',
        columns: ['case_number', 'subject', 'status', 'priority', 'created_date'],
        filters: [['status', '!=', 'Closed']],
        sort: [{ field: 'created_date', direction: 'desc' }],
        actions: ['new', 'edit']
      },

      // Related Lists - Contracts
      {
        label: 'Contracts',
        type: 'related_list',
        object: 'contract',
        columns: ['contract_number', 'status', 'start_date', 'end_date', 'contract_term'],
        actions: ['new', 'edit']
      }
    ]
  },

  // Page Actions
  actions: [
    {
      name: 'edit',
      label: 'Edit',
      type: 'standard'
    },
    {
      name: 'delete',
      label: 'Delete',
      type: 'standard'
    },
    {
      name: 'clone',
      label: 'Clone',
      type: 'custom',
      handler: 'cloneAccount'
    },
    {
      name: 'ai_analyze',
      label: 'AI Health Score',
      type: 'custom',
      handler: 'analyzeAccountHealth',
      icon: 'sparkles'
    },
    {
      name: 'ai_predict_churn',
      label: 'Predict Churn',
      type: 'custom',
      handler: 'predictChurn',
      icon: 'alert-triangle'
    }
  ]
});

export default AccountPage;
