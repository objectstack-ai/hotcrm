import { PermissionSetSchema } from '@objectstack/spec/security';
import type { PermissionSet } from '@objectstack/spec/security';

const allObjects = [
  'connector', 'connection', 'sync_config', 'sync_log',
  'webhook_subscription', 'webhook_delivery', 'api_key', 'field_mapping'
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

export const IntegrationAdmin: PermissionSet = PermissionSetSchema.parse({
  name: 'integration_admin',
  label: 'Integration Administrator',
  isProfile: false,
  objects: Object.fromEntries(allObjects.map(obj => [obj, fullAccess])),
  fields: {
    'connector.credentials_ref': { readable: true, editable: true },
    'connection.auth_token_ref': { readable: true, editable: true },
    'api_key.key_hash': { readable: true, editable: true }
  },
  systemPermissions: ['manage_integration_settings', 'manage_connectors', 'manage_api_keys']
});

export const IntegrationUser: PermissionSet = PermissionSetSchema.parse({
  name: 'integration_user',
  label: 'Integration Standard User',
  isProfile: false,
  objects: {
    connector: readOnlyAccess,
    connection: standardAccess,
    sync_config: standardAccess,
    sync_log: readOnlyAccess,
    webhook_subscription: standardAccess,
    webhook_delivery: readOnlyAccess,
    api_key: standardAccess,
    field_mapping: standardAccess
  },
  fields: {
    'connector.credentials_ref': { readable: false, editable: false },
    'connection.auth_token_ref': { readable: false, editable: false },
    'api_key.key_hash': { readable: false, editable: false }
  }
});

export const IntegrationViewer: PermissionSet = PermissionSetSchema.parse({
  name: 'integration_viewer',
  label: 'Integration Viewer',
  isProfile: false,
  objects: Object.fromEntries(allObjects.map(obj => [obj, readOnlyAccess])),
  fields: {
    'connector.credentials_ref': { readable: false, editable: false },
    'connection.auth_token_ref': { readable: false, editable: false },
    'api_key.key_hash': { readable: false, editable: false }
  }
});
