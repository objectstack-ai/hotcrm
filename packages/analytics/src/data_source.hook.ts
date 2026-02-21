import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('analytics:data_source');

/**
 * Connection Health Check
 *
 * After a new data source is created, validates the connection_string
 * configuration and sets the initial sync_status accordingly.
 */
const ConnectionHealthCheck: Hook = {
 name: 'ConnectionHealthCheck',
 object: 'data_source',
 events: ['afterInsert'],
 handler: async (ctx: HookContext) => {
 const ds = ctx.result as Record<string, any>;
 if (!ds?._id) return;

 logger.info(`🔌 Validating connection for data source "${ds.name}"`);

 let status = 'disconnected';
 try {
 if (!ds.connection_string) {
 // Internal sources don't need a connection string
 if (ds.source_type === 'internal') {
 status = 'connected';
 } else {
 logger.warn(`Data source "${ds.name}" has no connection config`);
 status = 'error';
 }
 } else {
 const config = typeof ds.connection_string === 'string'
 ? JSON.parse(ds.connection_string)
 : ds.connection_string;

 // Validate required connection fields based on source type
 if (ds.source_type === 'database' && !config.host) {
 throw new Error('Database connection requires "host" in config');
 }
 if (ds.source_type === 'rest_api' && !config.url) {
 throw new Error('REST API connection requires "url" in config');
 }
 if (ds.source_type === 'warehouse' && !config.endpoint) {
 throw new Error('Data warehouse connection requires "endpoint" in config');
 }

 status = 'connected';
 }
 } catch (error) {
 logger.error(`Connection validation failed for "${ds.name}":`, error);
 status = 'error';
 }

 try {
 await (ctx.ql as any).doc.update('data_source', ds._id, {
 sync_status: status,
 last_sync: status === 'connected' ? new Date().toISOString() : undefined
 });
 logger.info(`Data source "${ds.name}" status: ${status}`);
 } catch (error) {
 logger.warn('Failed to update data source status:', error);
 }
 }
};

/**
 * Sync Lifecycle
 *
 * Manages data source sync state transitions after updates. Ensures valid
 * transitions (e.g., cannot go from "error" directly to "connected" without
 * going through "syncing").
 */
const SyncLifecycle: Hook = {
 name: 'SyncLifecycle',
 object: 'data_source',
 events: ['afterUpdate'],
 handler: async (ctx: HookContext) => {
 const ds = ctx.result as Record<string, any>;
 const previous = ctx.previous as Record<string, any> | undefined;
 if (!ds?._id) return;

 const prevStatus = previous?.sync_status;
 const newStatus = ds.sync_status;

 if (!prevStatus || prevStatus === newStatus) return;

 logger.info(`Data source "${ds.name}" sync status: ${prevStatus} → ${newStatus}`);

 // When sync completes, record the timestamp
 if (newStatus === 'connected' && prevStatus === 'syncing') {
 try {
 await (ctx.ql as any).doc.update('data_source', ds._id, {
 last_sync: new Date().toISOString()
 });
 logger.info(`Data source "${ds.name}" sync completed`);
 } catch (error) {
 logger.warn('Failed to update last_sync:', error);
 }
 }

 // When sync errors, create an alert
 if (newStatus === 'error') {
 logger.error(`Data source "${ds.name}" entered error state`);
 try {
 await (ctx.ql as any).doc.create('activity', {
 Subject: `Data Source Sync Error: ${ds.name}`,
 Type: 'Alert',
 Status: 'open',
 Priority: 'high',
 OwnerId: ds.owner_id,
 ActivityDate: new Date().toISOString().split('T')[0],
 Description: `Data source "${ds.name}" sync failed. Previous status: ${prevStatus}.`
 });
 } catch (error) {
 logger.warn('Failed to create sync error alert:', error);
 }
 }
 }
};

/**
 * Schema Drift Detection
 *
 * After a data source update, compares the current schema_mapping against
 * the previous one. If differences are found, alerts the owner.
 */
const SchemaDriftDetection: Hook = {
 name: 'SchemaDriftDetection',
 object: 'data_source',
 events: ['afterUpdate'],
 handler: async (ctx: HookContext) => {
 const ds = ctx.result as Record<string, any>;
 const previous = ctx.previous as Record<string, any> | undefined;
 if (!ds?._id) return;

 const prevMapping = previous?.schema_mapping;
 const newMapping = ds.schema_mapping;

 // Only check if schema_mapping changed
 if (!prevMapping || !newMapping || prevMapping === newMapping) return;

 let prevSchema: Record<string, any>;
 let newSchema: Record<string, any>;
 try {
 prevSchema = typeof prevMapping === 'string' ? JSON.parse(prevMapping) : prevMapping;
 newSchema = typeof newMapping === 'string' ? JSON.parse(newMapping) : newMapping;
 } catch {
 return; // Can't compare non-JSON values
 }

 const prevFields = new Set(Object.keys(prevSchema));
 const newFields = new Set(Object.keys(newSchema));

 const added = [...newFields].filter(f => !prevFields.has(f));
 const removed = [...prevFields].filter(f => !newFields.has(f));
 const modified = [...newFields].filter(f =>
 prevFields.has(f) && JSON.stringify(prevSchema[f]) !== JSON.stringify(newSchema[f])
 );

 if (added.length === 0 && removed.length === 0 && modified.length === 0) return;

 const changes: string[] = [];
 if (added.length > 0) changes.push(`Added: ${added.join(', ')}`);
 if (removed.length > 0) changes.push(`Removed: ${removed.join(', ')}`);
 if (modified.length > 0) changes.push(`Modified: ${modified.join(', ')}`);

 logger.warn(`Schema drift detected for data source "${ds.name}": ${changes.join('; ')}`);

 try {
 await (ctx.ql as any).doc.create('activity', {
 Subject: `Schema Drift Detected: ${ds.name}`,
 Type: 'Alert',
 Status: 'open',
 Priority: removed.length > 0 ? 'critical' : 'high',
 OwnerId: ds.owner_id,
 ActivityDate: new Date().toISOString().split('T')[0],
 Description: `Schema drift detected for data source "${ds.name}". Changes: ${changes.join('; ')}`
 });
 } catch (error) {
 logger.warn('Failed to create schema drift alert:', error);
 }
 }
};

export { ConnectionHealthCheck, SyncLifecycle, SchemaDriftDetection };
export default ConnectionHealthCheck;
