# @hotcrm/finance

Finance module for HotCRM - Contract and payment management.

## Overview

This package contains all finance-related functionality including contract lifecycle management and payment tracking.

## Business Objects

### Contract
Contract lifecycle management with:
- Contract creation and templates
- Terms and conditions
- Renewal tracking
- Amendment management
- E-signature integration
- Compliance tracking

### Payment
Payment tracking and reconciliation with:
- Payment schedules
- Invoice management
- Payment methods
- Reconciliation
- Revenue recognition
- Multi-currency support

## Usage

```typescript
import { ContractSchema } from '@hotcrm/finance';

// Use object definitions in your code
console.log(ContractSchema.label); // "合同"
```

## Domain Focus

This module focuses on **Financial Operations**, managing the complete contract-to-cash process and ensuring accurate revenue tracking.

## Build

```bash
pnpm --filter @hotcrm/finance build
```

## Development

```bash
pnpm --filter @hotcrm/finance dev
```
