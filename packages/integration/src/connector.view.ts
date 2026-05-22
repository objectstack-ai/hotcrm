import type { View } from '@objectstack/spec/ui';
import { ViewSchema } from '@objectstack/spec/ui';

/**
 * Connector List Views
 * Connector library with status, health, and last sync information
 */

// All Connectors View
export const AllConnectorsView = {
  list: {
    type: 'grid' as const,
    name: 'all_connectors',
    label: 'All Connectors',
    columns: [
      { field: 'name', width: 200, sortable: true, link: true },
      { field: 'provider', width: 150, sortable: true },
      { field: 'connector_type', width: 130, sortable: true },
      { field: 'status', width: 100, sortable: true },
      { field: 'category', width: 130, sortable: true },
      { field: 'base_url', width: 250 },
      { field: 'version', width: 80 }
    ],
    sort: [{ field: 'name', order: 'asc' as const }],
    bulkActions: ['delete', 'export'],
    inlineEdit: false,
    pagination: { pageSize: 25, pageSizeOptions: [10, 25, 50, 100] }
  }
} satisfies View;

// Active Connectors View
export const ActiveConnectorsView = {
  list: {
    type: 'grid' as const,
    name: 'active_connectors',
    label: 'Active Connectors',
    filter: [{ field: 'status', operator: '=', value: 'active' }],
    columns: [
      { field: 'name', width: 200, link: true },
      { field: 'provider', width: 150 },
      { field: 'connector_type', width: 130 },
      { field: 'category', width: 130 },
      { field: 'base_url', width: 250 }
    ],
    sort: [{ field: 'name', order: 'asc' as const }],
    conditionalFormatting: [
      { condition: { dialect: 'cel', source: 'status == "active"' }, style: { backgroundColor: '#F0FDF4', borderLeft: '3px solid #22C55E' } }
    ]
  }
} satisfies View;

// Connectors with Errors View
export const ErrorConnectorsView = {
  list: {
    type: 'grid' as const,
    name: 'error_connectors',
    label: 'Connectors with Errors',
    filter: [{ field: 'status', operator: '=', value: 'error' }],
    columns: [
      { field: 'name', width: 200, link: true },
      { field: 'provider', width: 150 },
      { field: 'connector_type', width: 130 },
      { field: 'base_url', width: 250 }
    ],
    sort: [{ field: 'name', order: 'asc' as const }],
    conditionalFormatting: [
      { condition: { dialect: 'cel', source: 'status == "error"' }, style: { backgroundColor: '#FEF2F2', borderLeft: '3px solid #EF4444' } }
    ]
  }
} satisfies View;

ViewSchema.parse(AllConnectorsView);
ViewSchema.parse(ActiveConnectorsView);
ViewSchema.parse(ErrorConnectorsView);

export const ConnectorListViews = {
  all: AllConnectorsView,
  active: ActiveConnectorsView,
  errors: ErrorConnectorsView
};

export default ConnectorListViews;
