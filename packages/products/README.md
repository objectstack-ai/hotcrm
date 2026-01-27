# @hotcrm/products

Products module for HotCRM - Product catalog, pricing, and quotes.

## Overview

This package contains all product and pricing functionality including CPQ (Configure, Price, Quote).

## Business Objects

### Product
Product catalog and specifications with:
- Product details and descriptions
- SKU management
- Category hierarchies
- Inventory tracking
- Product lifecycle

### Pricebook
Pricing structures and configurations with:
- Multiple price books
- Currency support
- Discount rules
- Volume pricing
- Time-based pricing

### Quote
CPQ (Configure, Price, Quote) functionality with:
- Product configuration
- Pricing calculations
- Quote generation
- Approval workflows
- Quote-to-order conversion

## Usage

```typescript
import { /* ProductSchema, PricebookSchema, QuoteSchema */ } from '@hotcrm/products';

// Note: TypeScript definitions to be created following the metadata protocol
```

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
