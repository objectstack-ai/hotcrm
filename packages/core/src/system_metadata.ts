/**
 * System Metadata Definitions
 *
 * Adopts platform-level constants and schemas from @objectstack/spec
 * to provide a single reference point for system fields, objects,
 * package conventions, CLI configuration, and sort specifications.
 */

import { OclifPluginConfigSchema } from '@objectstack/spec/kernel';
import { PKG_CONVENTIONS, SystemFieldName, SystemObjectName } from '@objectstack/spec/system';
import { SortItemSchema } from '@objectstack/spec/shared';

// ---------------------------------------------------------------------------
// Package Conventions
// ---------------------------------------------------------------------------

/** Platform package structure conventions (directories and files) */
export const packageConventions = PKG_CONVENTIONS;

// ---------------------------------------------------------------------------
// System Field References
// ---------------------------------------------------------------------------

/** Standard system fields present on every object */
export const SYSTEM_FIELDS = {
  id: SystemFieldName.ID,
  createdAt: SystemFieldName.CREATED_AT,
  updatedAt: SystemFieldName.UPDATED_AT,
  ownerId: SystemFieldName.OWNER_ID,
  tenantId: SystemFieldName.TENANT_ID,
  userId: SystemFieldName.USER_ID,
  deletedAt: SystemFieldName.DELETED_AT,
} as const;

// ---------------------------------------------------------------------------
// System Object References
// ---------------------------------------------------------------------------

/** Platform-managed system objects */
export const SYSTEM_OBJECTS = {
  user: SystemObjectName.USER,
  session: SystemObjectName.SESSION,
  account: SystemObjectName.ACCOUNT,
  verification: SystemObjectName.VERIFICATION,
  metadata: SystemObjectName.METADATA,
} as const;

// ---------------------------------------------------------------------------
// CLI Plugin Configuration
// ---------------------------------------------------------------------------

/** HotCRM CLI plugin configuration validated against OclifPluginConfigSchema */
export const hotcrmCliConfig = OclifPluginConfigSchema.parse({
  name: '@hotcrm/cli',
  commands: {
    seed: { description: 'Seed demo data into the CRM environment' },
    reset: { description: 'Reset all CRM data to factory defaults' },
    migrate: { description: 'Run pending database migrations' },
    validate: { description: 'Validate all package metadata definitions' },
  },
});

// ---------------------------------------------------------------------------
// Standard Sort Specifications
// ---------------------------------------------------------------------------

/** Common sort configurations used across HotCRM list views */
export const STANDARD_SORTS = {
  nameAsc: SortItemSchema.parse({ field: 'name', order: 'asc' }),
  nameDesc: SortItemSchema.parse({ field: 'name', order: 'desc' }),
  createdAtDesc: SortItemSchema.parse({ field: 'created_at', order: 'desc' }),
  createdAtAsc: SortItemSchema.parse({ field: 'created_at', order: 'asc' }),
  updatedAtDesc: SortItemSchema.parse({ field: 'updated_at', order: 'desc' }),
  amountDesc: SortItemSchema.parse({ field: 'amount', order: 'desc' }),
  priorityDesc: SortItemSchema.parse({ field: 'priority', order: 'desc' }),
} as const;

// ---------------------------------------------------------------------------
// Aggregate Export
// ---------------------------------------------------------------------------

export const SystemMetadata = {
  fields: SYSTEM_FIELDS,
  objects: SYSTEM_OBJECTS,
  packageConventions,
  cliConfig: hotcrmCliConfig,
  sorts: STANDARD_SORTS,
} as const;

export default SystemMetadata;
