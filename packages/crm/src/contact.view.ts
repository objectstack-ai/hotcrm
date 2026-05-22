import type { View } from '@objectstack/spec/ui';
import { ViewSchema } from '@objectstack/spec/ui';

/**
 * Contact List Views
 */

export const AllContactsView = {
  list: {
    type: 'grid' as const,
    name: 'all_contacts',
    label: 'All Contacts',
    columns: [
      { field: 'first_name', width: 150, sortable: true, link: true },
      { field: 'last_name', width: 150, sortable: true, link: true },
      { field: 'account_id', width: 200, sortable: true },
      { field: 'title', width: 180 },
      { field: 'email', width: 220 },
      { field: 'phone', width: 150 },
      { field: 'is_decision_maker', width: 130 }
    ],
    sort: [{ field: 'last_name', order: 'asc' as const }],
    bulkActions: ['delete', 'update_owner', 'export'],
    inlineEdit: true,
    pagination: { pageSize: 25, pageSizeOptions: [10, 25, 50, 100] }
  }
} satisfies View;

export const MyContactsView = {
  list: {
    type: 'grid' as const,
    name: 'my_contacts',
    label: 'My Contacts',
    filter: [{ field: 'owner', operator: '=', value: '${currentUser.id}' }],
    columns: [
      { field: 'first_name', width: 150, link: true },
      { field: 'last_name', width: 150, link: true },
      { field: 'account_id', width: 200 },
      { field: 'title', width: 180 },
      { field: 'email', width: 220 },
      { field: 'last_contact_date', width: 150 }
    ],
    sort: [{ field: 'last_contact_date', order: 'desc' as const }]
  }
} satisfies View;

export const DecisionMakersView = {
  list: {
    type: 'grid' as const,
    name: 'decision_makers',
    label: 'Decision Makers',
    filter: [{ field: 'is_decision_maker', operator: '=', value: true }],
    columns: [
      { field: 'first_name', width: 150, link: true },
      { field: 'last_name', width: 150, link: true },
      { field: 'account_id', width: 200 },
      { field: 'title', width: 180 },
      { field: 'level', width: 130 },
      { field: 'influence_level', width: 130 },
      { field: 'relationship_strength', width: 140 }
    ],
    sort: [{ field: 'last_name', order: 'asc' as const }],
    conditionalFormatting: [
      { condition: { dialect: 'cel', source: 'influence_level == "high"' }, style: { backgroundColor: '#FEF2F2', borderLeft: '3px solid #EF4444' } }
    ]
  }
} satisfies View;

export const RecentContactsView = {
  list: {
    type: 'grid' as const,
    name: 'recent_contacts',
    label: 'Recent Contacts',
    filter: [{ field: 'last_contact_date', operator: '>=', value: 'LAST_30_DAYS' }],
    columns: [
      { field: 'first_name', width: 150, link: true },
      { field: 'last_name', width: 150, link: true },
      { field: 'account_id', width: 200 },
      { field: 'title', width: 180 },
      { field: 'email', width: 220 },
      { field: 'last_contact_date', width: 150 }
    ],
    sort: [{ field: 'last_contact_date', order: 'desc' as const }]
  }
} satisfies View;

ViewSchema.parse(AllContactsView);
ViewSchema.parse(MyContactsView);
ViewSchema.parse(DecisionMakersView);
ViewSchema.parse(RecentContactsView);

export const ContactListViews = {
  all: AllContactsView,
  my: MyContactsView,
  decisionMakers: DecisionMakersView,
  recent: RecentContactsView
};

export default ContactListViews;
