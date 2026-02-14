import { defineStack } from '@objectstack/spec';
import { ProductsPlugin } from './src/plugin.js';

/**
 * Products Package Configuration
 * 
 * Standalone configuration for the Products package.
 * Can be used to run or test the Products package independently.
 */
export default defineStack({
  manifest: {
    id: 'com.hotcrm.products',
    namespace: 'products',
    version: '1.0.0',
    type: 'plugin',
    name: 'Products Cloud',
    description: 'CPQ & Product Catalog - Product catalog, pricing, and quotes',
  },

  plugins: [ProductsPlugin],
});
