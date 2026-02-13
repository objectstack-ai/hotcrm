import { PermissionSetSchema } from '@objectstack/spec/security';
import type { PermissionSet } from '@objectstack/spec/security';

const allObjects = [
  'report', 'report_schedule', 'analytics_dashboard', 'kpi',
  'metric', 'data_source', 'saved_filter', 'snapshot'
] as const;

const fullAccess = {
  allowCreate: true,
  allowRead: true,
  allowEdit: true,
  allowDelete: true,
  viewAllRecords: true,
  modifyAllRecords: true
};

const standardAccess = {
  allowCreate: true,
  allowRead: true,
  allowEdit: true,
  allowDelete: false,
  viewAllRecords: false,
  modifyAllRecords: false
};

const readOnlyAccess = {
  allowCreate: false,
  allowRead: true,
  allowEdit: false,
  allowDelete: false,
  viewAllRecords: false,
  modifyAllRecords: false
};

export const AnalyticsAdmin: PermissionSet = PermissionSetSchema.parse({
  name: 'analytics_admin',
  label: 'Analytics Administrator',
  isProfile: false,
  objects: Object.fromEntries(allObjects.map(obj => [obj, fullAccess])),
  fields: {
    'data_source.connection_config': { readable: true, editable: true },
    'report.filters': { readable: true, editable: true }
  },
  systemPermissions: ['manage_analytics_settings', 'manage_data_sources']
});

export const AnalyticsUser: PermissionSet = PermissionSetSchema.parse({
  name: 'analytics_user',
  label: 'Analytics Standard User',
  isProfile: false,
  objects: {
    report: standardAccess,
    report_schedule: standardAccess,
    analytics_dashboard: standardAccess,
    kpi: readOnlyAccess,
    metric: readOnlyAccess,
    data_source: readOnlyAccess,
    saved_filter: standardAccess,
    snapshot: readOnlyAccess
  },
  fields: {
    'data_source.connection_config': { readable: false, editable: false },
    'report.filters': { readable: true, editable: true }
  }
});

export const AnalyticsReadOnly: PermissionSet = PermissionSetSchema.parse({
  name: 'analytics_read_only',
  label: 'Analytics Read Only',
  isProfile: false,
  objects: Object.fromEntries(allObjects.map(obj => [obj, readOnlyAccess])),
  fields: {
    'data_source.connection_config': { readable: false, editable: false },
    'report.filters': { readable: true, editable: false }
  }
});
