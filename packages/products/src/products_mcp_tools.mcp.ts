/**
 * Products MCP Tools
 *
 * Exposes CPQ capabilities (product search, pricing, bundle configuration,
 * quote calculation) as Model Context Protocol tools for AI agent consumption.
 */

import type { MCPTool } from '@objectstack/spec/ai';
import { MCPToolSchema } from '@objectstack/spec/ai';

// ---------------------------------------------------------------------------
// search_products
// ---------------------------------------------------------------------------

export const SearchProductsTool = {
  name: 'search_products',
  description:
    'Search the product catalogue by keyword with an optional category filter. Returns matching products with pricing and availability information.',
  handler: 'products.search_products.execute',
  parameters: [
    {
      name: 'query',
      type: 'string' as const,
      description: 'Free-text search query matched against product name, SKU, and description',
      required: true,
    },
    {
      name: 'category',
      type: 'string' as const,
      description: 'Filter results to a specific product category',
      required: false,
    },
  ],
  returns: { type: 'array' as const, description: 'Array of matching product records with pricing' },
  sideEffects: 'read' as const,
  async: true,
  requiresConfirmation: false,
  timeout: 15000,
  version: '1.0.0',
  category: 'products',
  tags: ['product', 'catalogue', 'search'],
  examples: [
    {
      description: 'Search for enterprise licence products',
      parameters: { query: 'enterprise licence', category: 'Software' },
    },
  ],
} satisfies MCPTool;

MCPToolSchema.parse(SearchProductsTool);

// ---------------------------------------------------------------------------
// get_pricing
// ---------------------------------------------------------------------------

export const GetPricingTool = {
  name: 'get_pricing',
  description:
    'Get the unit price, volume discounts, and total for a product at a given quantity. Takes into account active price books and discount schedules.',
  handler: 'products.get_pricing.execute',
  parameters: [
    {
      name: 'product_id',
      type: 'string' as const,
      description: 'Unique identifier of the product',
      required: true,
    },
    {
      name: 'quantity',
      type: 'number' as const,
      description: 'Desired quantity for pricing calculation',
      required: true,
    },
  ],
  returns: { type: 'object' as const, description: 'Pricing breakdown with unit price, discounts, and total' },
  sideEffects: 'read' as const,
  async: true,
  requiresConfirmation: false,
  timeout: 10000,
  version: '1.0.0',
  category: 'products',
  tags: ['pricing', 'cpq', 'discount'],
  examples: [
    {
      description: 'Get pricing for 50 units',
      parameters: { product_id: 'prod_ent_001', quantity: 50 },
    },
  ],
} satisfies MCPTool;

MCPToolSchema.parse(GetPricingTool);

// ---------------------------------------------------------------------------
// configure_bundle
// ---------------------------------------------------------------------------

export const ConfigureBundleTool = {
  name: 'configure_bundle',
  description:
    'Configure a product bundle by selecting component items. Validates compatibility rules and returns the configured bundle with pricing.',
  handler: 'products.configure_bundle.execute',
  parameters: [
    {
      name: 'bundle_id',
      type: 'string' as const,
      description: 'Unique identifier of the bundle template',
      required: true,
    },
    {
      name: 'items',
      type: 'array' as const,
      description: 'Array of component selections, each with product_id and quantity',
      required: true,
    },
  ],
  returns: { type: 'object' as const, description: 'Configured bundle with validated items and total pricing' },
  sideEffects: 'write' as const,
  async: true,
  requiresConfirmation: false,
  timeout: 20000,
  version: '1.0.0',
  category: 'products',
  tags: ['bundle', 'configuration', 'cpq'],
  examples: [
    {
      description: 'Configure an enterprise starter bundle',
      parameters: {
        bundle_id: 'bnd_ent_starter',
        items: [
          { product_id: 'prod_crm_seat', quantity: 10 },
          { product_id: 'prod_support_premium', quantity: 1 },
        ],
      },
    },
  ],
} satisfies MCPTool;

MCPToolSchema.parse(ConfigureBundleTool);

// ---------------------------------------------------------------------------
// calculate_quote
// ---------------------------------------------------------------------------

export const CalculateQuoteTool = {
  name: 'calculate_quote',
  description:
    'Calculate a price quote for a set of line items. Applies volume discounts, promotional pricing, and returns a detailed quote summary.',
  handler: 'products.calculate_quote.execute',
  parameters: [
    {
      name: 'line_items',
      type: 'array' as const,
      description: 'Array of line items, each containing product_id, quantity, and optional discount_override',
      required: true,
    },
  ],
  returns: { type: 'object' as const, description: 'Quote summary with line-item detail, subtotal, discounts, and grand total' },
  sideEffects: 'read' as const,
  async: true,
  requiresConfirmation: false,
  timeout: 20000,
  version: '1.0.0',
  category: 'products',
  tags: ['quote', 'pricing', 'cpq'],
  examples: [
    {
      description: 'Calculate a quote with two line items',
      parameters: {
        line_items: [
          { product_id: 'prod_crm_seat', quantity: 25 },
          { product_id: 'prod_analytics', quantity: 1, discount_override: 0.1 },
        ],
      },
    },
  ],
} satisfies MCPTool;

MCPToolSchema.parse(CalculateQuoteTool);

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export default {
  searchProducts: SearchProductsTool,
  getPricing: GetPricingTool,
  configureBundle: ConfigureBundleTool,
  calculateQuote: CalculateQuoteTool,
};
