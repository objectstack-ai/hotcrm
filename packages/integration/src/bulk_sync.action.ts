/**
 * Bulk Sync Action
 *
 * Provides bulk data synchronization support for integration connectors.
 * Processes records in configurable batches with conflict resolution.
 */

import { broker } from './db';

// ============================================================================
// INTERFACES
// ============================================================================

export interface BulkSyncRequest {
  connection_id: string;
  source_object: string;
  records: any[];
  batch_size: number;
  conflict_resolution: 'source_wins' | 'target_wins' | 'manual';
}

export interface BulkSyncResponse {
  total_records: number;
  processed: number;
  failed: number;
  errors: Array<{ index: number; record_id?: string; message: string }>;
  duration_ms: number;
}

// ============================================================================
// HANDLER
// ============================================================================

const MAX_BATCH_SIZE = 10000;

export async function executeBulkSync(request: BulkSyncRequest): Promise<BulkSyncResponse> {
  const startTime = Date.now();
  const { connection_id, source_object, records, batch_size, conflict_resolution } = request;

  if (!connection_id || !source_object) {
    throw new Error('connection_id and source_object are required');
  }

  if (!records || records.length === 0) {
    return { total_records: 0, processed: 0, failed: 0, errors: [], duration_ms: 0 };
  }

  if (batch_size < 1 || batch_size > MAX_BATCH_SIZE) {
    throw new Error(`batch_size must be between 1 and ${MAX_BATCH_SIZE}`);
  }

  const connection = await broker.findOne('connection', connection_id);
  if (!connection) {
    throw new Error(`Connection not found: ${connection_id}`);
  }

  const errors: BulkSyncResponse['errors'] = [];
  let processed = 0;

  for (let offset = 0; offset < records.length; offset += batch_size) {
    const batch = records.slice(offset, offset + batch_size);

    for (let i = 0; i < batch.length; i++) {
      const record = batch[i];
      const globalIndex = offset + i;

      try {
        if (!record.external_id) {
          errors.push({ index: globalIndex, message: 'Record missing required external_id field' });
          continue;
        }

        const existing = await broker.find(source_object, {
          filters: [['external_id', '=', record.external_id]],
          limit: 1,
        });

        if (existing.length > 0) {
          if (conflict_resolution === 'source_wins') {
            await broker.update(source_object, existing[0]._id, record);
          } else if (conflict_resolution === 'manual') {
            errors.push({ index: globalIndex, record_id: record.external_id, message: 'Conflict requires manual resolution' });
            continue;
          }
          // target_wins: skip update, keep existing
        } else {
          await broker.insert(source_object, { ...record, connection_id });
        }

        processed++;
      } catch (err: any) {
        errors.push({ index: globalIndex, record_id: record.external_id, message: err.message || 'Unknown error' });
      }
    }
  }

  await broker.insert('sync_log', {
    connection_id,
    object_name: source_object,
    direction: 'inbound',
    status: errors.length > 0 ? 'partial' : 'success',
    records_processed: processed,
    records_failed: errors.length,
    started_at: new Date(startTime).toISOString(),
    completed_at: new Date().toISOString(),
  });

  return {
    total_records: records.length,
    processed,
    failed: errors.length,
    errors,
    duration_ms: Date.now() - startTime,
  };
}

export default {
  name: 'bulk_sync',
  description: 'Bulk data synchronization for integration connectors with batch processing and conflict resolution',
  handler: executeBulkSync,
};
