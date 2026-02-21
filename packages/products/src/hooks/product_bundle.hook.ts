import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('products:product_bundle');

const VALID_STATUSES = ['draft', 'active', 'inactive', 'archived'];

const ProductBundleValidationTrigger: Hook = {
  name: 'ProductBundleValidationTrigger',
  object: 'product_bundle',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;

    try {
      if (!doc.name || doc.name.trim() === '') {
        throw new Error('Bundle name is required');
      }

      if (doc.status && !VALID_STATUSES.includes(doc.status)) {
        throw new Error(`Invalid bundle status "${doc.status}". Must be one of: ${VALID_STATUSES.join(', ')}`);
      }

      // When bundle type is 'customizable', min and max components must be set
      if (doc.bundle_type === 'customizable') {
        if (doc.min_components == null || doc.max_components == null) {
          throw new Error('Customizable bundles require min_components and max_components to be set');
        }
      }

      logger.info(`Product bundle validated: ${doc.name}`);
    } catch (err) {
      logger.error('ProductBundleValidationTrigger Error:', err);
      throw err;
    }
  }
};

const ProductBundleComponentCompletenessTrigger: Hook = {
  name: 'ProductBundleComponentCompletenessTrigger',
  object: 'product_bundle',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    const bundle = ctx.result as Record<string, any>;
    const oldBundle = ctx.previous as Record<string, any> | undefined;

    if (!oldBundle) return;
    if (bundle.status === oldBundle.status || bundle.status !== 'active') return;

    try {
      const components = await (ctx.ql as any).find('product_bundle_component', {
        filters: [['product_bundle', '=', bundle._id]]
      });

      if (!components || components.length === 0) {
        logger.warn(`Warning: Bundle "${bundle.name}" activated with no components. Add at least one component.`);
      } else {
        logger.info(`Bundle "${bundle.name}" activated with ${components.length} component(s)`);
      }
    } catch (err) {
      logger.error('ProductBundleComponentCompletenessTrigger Error:', err);
    }
  }
};

export { ProductBundleValidationTrigger, ProductBundleComponentCompletenessTrigger };
export default [ProductBundleValidationTrigger, ProductBundleComponentCompletenessTrigger] as Hook[];
