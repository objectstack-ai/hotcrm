/**
 * Products Studio Plugin — CPQ Cloud
 *
 * Provides Studio IDE extensions for the CPQ Cloud package including
 * quote configuration, price rule management, and product catalog browsing.
 */
import { defineStudioPlugin, StudioPluginManifestSchema } from '@objectstack/spec/studio';

const productsStudioConfig = {
  id: 'hotcrm.products',
  name: 'hotcrm-products-studio',
  version: '1.0.0',
  description: 'Studio extensions for CPQ Cloud',
  activationEvents: [
    'onObject:product',
    'onObject:pricebook',
    'onObject:quote',
    'onObject:quote_line_item',
    'onObject:product_bundle',
    'onObject:price_rule'
  ],
  contributes: {
    sidebarGroups: [
      {
        key: 'products',
        label: 'CPQ Cloud',
        order: 50,
        metadataTypes: ['object']
      }
    ],
    actions: [
      {
        id: 'configure_quote',
        label: 'Configure Quote',
        location: 'toolbar' as const
      },
      {
        id: 'price_rule_wizard',
        label: 'Price Rule Wizard',
        location: 'commandPalette' as const
      }
    ],
    panels: [
      {
        id: 'quote_builder',
        label: 'Quote Builder',
        location: 'right' as const
      },
      {
        id: 'product_catalog',
        label: 'Product Catalog',
        location: 'right' as const
      }
    ],
    commands: [
      { id: 'hotcrm.products.configureQuote', label: 'Configure Quote' },
      { id: 'hotcrm.products.showPriceRuleWizard', label: 'Show Price Rule Wizard' },
      { id: 'hotcrm.products.showQuoteBuilder', label: 'Show Quote Builder' },
      { id: 'hotcrm.products.showProductCatalog', label: 'Show Product Catalog' }
    ]
  }
};

export const ProductsStudioPlugin = defineStudioPlugin(productsStudioConfig);

export const ProductsStudioManifest = StudioPluginManifestSchema.parse(productsStudioConfig);

export default ProductsStudioPlugin;
