# @hotcrm/products

Product & Pricing module for HotCRM - Product catalog, pricing structures, and CPQ functionality.

## Overview

This package contains all product and pricing functionality including product catalog management, multi-currency pricing, and Configure-Price-Quote (CPQ) capabilities. Package structure follows vertical slice architecture, prepared for future expansion with hooks and actions.

## Business Objects (Schemas)

**TypeScript Definitions (Preferred):**
- **Quote** (`quote.object.ts`): ✨ **NEW** - CPQ (Configure-Price-Quote) with complex pricing, multi-level discount approval, tax/shipping calculation, PDF generation, quote versioning, and AI product bundle recommendations

**Legacy YAML Definitions:**
- **Product**: Product catalog with SKU management, product families, multi-UOM support, inventory tracking, AI-powered sales points
- **Pricebook**: Multi-currency pricing (CNY, USD, EUR, GBP, JPY, HKD, SGD), regional/channel pricing, tiered strategies, date-effective pricing

> Note: Product and Pricebook objects are planned for TypeScript migration in future releases.

## Key Features

### Product Catalog
- **SKU Management**: Unique product identifiers with product families
- **Multi-Unit Support**: Flexible unit of measure configurations
- **Inventory Tracking**: Real-time stock status and availability
- **AI Enhancement**: Automated sales point generation
- **Smart Bundling**: AI-powered product bundle recommendations
- **Product Lifecycle**: Active, Inactive, and End-of-Life status tracking

### Price Management
- **Multi-Currency**: Support for 8 major currencies (CNY, USD, EUR, GBP, JPY, HKD, SGD, and more)
- **Regional Pricing**: Geographic and channel-based pricing strategies
- **Tiered Pricing**: Volume-based discount structures
- **Date-Effective**: Time-based pricing with effective dates
- **Price Books**: Multiple price lists for different customer segments

### CPQ (Configure-Price-Quote)
- **Complex Configuration**: Product bundles with options and dependencies
- **Discount Management**: Multi-level approval workflows for discounts
- **Automatic Calculations**: Tax, shipping, and total calculations
- **PDF Generation**: Professional quote documents for customers
- **AI Recommendations**: Smart product combinations based on budget and needs
- **Win Probability**: AI-predicted likelihood of quote acceptance
- **Quote-to-Order**: Seamless conversion to orders and contracts

## Usage

```typescript
import { Quote } from '@hotcrm/products';

console.log(Quote.label); // "Quote"
console.log(Quote.fields.QuoteNumber); // Auto-number field configuration
console.log(Quote.validationRules); // Approval and pricing validations

// Note: Product and Pricebook TypeScript exports will be available after migration from YAML
```

## Future Enhancements

This package is structured to support:
- TypeScript schema definitions (`.object.ts` files)
- Business logic hooks for pricing automation
- Custom actions for CPQ workflows
- Integration with ERP and inventory systems

## Domain Focus

This module focuses on **Product and Revenue Management**, enabling complex product configurations and pricing strategies.

## Build

```bash
pnpm --filter @hotcrm/products build
```

## Development

```bash
pnpm --filter @hotcrm/products dev
```
