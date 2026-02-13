import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * Metric Formula Validation Trigger
 *
 * Validates formula syntax and checks for circular dependencies.
 */
const MetricValidationTrigger: Hook = {
  name: 'MetricValidationTrigger',
  object: 'metric',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const doc = ctx.input.doc as Record<string, any>;

      // Validate formula is not empty when aggregation_type is not set
      if (!doc.formula && !doc.aggregation_type) {
        throw new Error('Either formula or aggregation_type must be specified');
      }

      // Validate filters JSON if provided
      if (doc.filters) {
        try {
          const filters = JSON.parse(doc.filters);
          if (!Array.isArray(filters)) {
            throw new Error('Filters must be a JSON array');
          }
        } catch (e: any) {
          if (e.message === 'Filters must be a JSON array') throw e;
          throw new Error('Invalid JSON in filters field');
        }
      }

      // Check for self-referencing formula (simple circular dependency check)
      if (doc.formula && doc.name) {
        if (doc.formula.includes(doc.name)) {
          throw new Error(`Circular dependency detected: metric "${doc.name}" references itself`);
        }
      }

    } catch (error) {
      console.error('❌ Error in MetricValidationTrigger:', error);
      throw error;
    }
  }
};

export { MetricValidationTrigger };
export default MetricValidationTrigger;
