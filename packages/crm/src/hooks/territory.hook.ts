import type { Hook, HookContext } from '@objectstack/spec/data';

import { broker } from '../db.js';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('crm:territory');


/**
 * Territory Validation Trigger
 * 
 * Validates territory data on create/update:
 * - Territory name must not be empty
 * - Parent territory must not create a circular reference
 */
const TerritoryValidationTrigger: Hook = {
  name: 'TerritoryValidationTrigger',
  object: 'territory',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const doc = ctx.input.doc as Record<string, any>;

      // Validate territory name is not empty
      if (!doc.name || doc.name.trim() === '') {
        throw new Error('Validation Error: Territory name is required.');
      }

      // Check for circular reference in parent territory
      if (doc.parent_territory_id) {
        const territoryId = doc._id || doc.id;

        if (territoryId && doc.parent_territory_id === territoryId) {
          throw new Error('Validation Error: Territory cannot be its own parent.');
        }

        // Walk up the parent chain to detect circular references
        const visited = new Set<string>();
        if (territoryId) {
          visited.add(territoryId);
        }

        let currentParentId = doc.parent_territory_id;
        while (currentParentId) {
          if (visited.has(currentParentId)) {
            throw new Error('Validation Error: Parent territory creates a circular reference.');
          }
          visited.add(currentParentId);

          const parentRecords = await broker.find('territory', {
            filters: [['_id', '=', currentParentId]],
            fields: ['parent_territory_id'],
            limit: 1
          });

          if (parentRecords.length === 0) {
            break;
          }
          currentParentId = parentRecords[0].parent_territory_id || null;
        }
      }

      logger.info(`Territory validated: name="${doc.name}"`);

    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Validation Error:')) {
        throw error;
      }
      logger.error('Error in TerritoryValidationTrigger:', error);
    }
  }
};

/**
 * Territory Metrics Trigger
 * 
 * Logs territory metrics updates after insert/update
 */
const TerritoryMetricsTrigger: Hook = {
  name: 'TerritoryMetricsTrigger',
  object: 'territory',
  events: ['afterInsert', 'afterUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const doc = ctx.input.doc as Record<string, any>;

      const territoryId = doc._id || doc.id;
      const event = ctx.input.event || 'update';

      logger.info(`Territory metrics ${event}: id=${territoryId}, name="${doc.name}", type=${doc.territory_type || 'unknown'}, status=${doc.status || 'active'}`);

    } catch (error) {
      logger.error('Error in TerritoryMetricsTrigger:', error);
    }
  }
};

// Export all hooks
export {
  TerritoryValidationTrigger,
  TerritoryMetricsTrigger
};

export default TerritoryValidationTrigger;
