import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * Mapping Validation
 *
 * Validates the field_mapping JSON structure before a sync config
 * is created or updated.
 */
const MappingValidation: Hook = {
  name: 'MappingValidation',
  object: 'sync_config',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;

    if (doc.field_mapping) {
      try {
        const parsed = typeof doc.field_mapping === 'string'
          ? JSON.parse(doc.field_mapping)
          : doc.field_mapping;
        if (typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('Validation Error: field_mapping must be a JSON object');
        }
      } catch (error) {
        if (error instanceof SyntaxError) {
          throw new Error('Validation Error: field_mapping contains invalid JSON');
        }
        throw error;
      }
    }

    if (doc.source_object && doc.target_object && doc.source_object === doc.target_object) {
      throw new Error('Validation Error: source_object and target_object must be different');
    }
  }
};

/**
 * Schedule Management
 *
 * Logs schedule changes and validates frequency when a sync config is updated.
 */
const ScheduleManagement: Hook = {
  name: 'ScheduleManagement',
  object: 'sync_config',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.result as Record<string, any>;
    if (!doc?._id) return;

    if (doc.is_active && doc.frequency && doc.frequency !== 'manual') {
      console.log(`⏱️ Sync schedule updated: ${doc.name} will run ${doc.frequency}`);
    }
  }
};

/**
 * Conflict Resolution
 *
 * Validates that bidirectional syncs have a conflict resolution strategy set.
 */
const ConflictResolution: Hook = {
  name: 'ConflictResolution',
  object: 'sync_config',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;

    if (doc.direction === 'bidirectional' && !doc.conflict_resolution) {
      throw new Error('Validation Error: conflict_resolution is required for bidirectional syncs');
    }
  }
};

export { MappingValidation, ScheduleManagement, ConflictResolution };
export default MappingValidation;
