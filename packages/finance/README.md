# @hotcrm/finance

Financial Operations module for HotCRM - Contract lifecycle management and payment tracking.

## Overview

This package contains all finance-related functionality including contract lifecycle management, payment schedules, and revenue tracking. Following vertical slice architecture with partial TypeScript migration completed.

## Business Objects (Schemas)

**TypeScript Definitions:**
- **Contract** (`contract.object.ts`): Contract lifecycle management with terms, renewal tracking, amendment management, e-signature integration readiness, and compliance tracking

**Legacy YAML Definitions:**
- **Payment**: Payment schedules, invoice management, multiple payment methods, reconciliation, revenue recognition, multi-currency support

> Note: Contract has been migrated to TypeScript. Payment is planned for TypeScript migration in future releases.

## Key Features

### Contract Management
- **Contract Lifecycle**: Complete lifecycle from draft to execution to renewal
- **Template Support**: Reusable contract templates for faster creation
- **Terms and Conditions**: Flexible term management with custom clauses
- **Renewal Tracking**: Automatic renewal reminders and tracking
- **Amendment Management**: Track contract modifications and addendums
- **E-Signature Ready**: Integration points for electronic signature providers
- **Compliance**: Audit trails and compliance tracking
- **Opportunity Linkage**: Automatic creation from closed-won opportunities

### Payment Tracking
- **Payment Schedules**: Milestone-based and recurring payment plans
- **Invoice Management**: Invoice creation, tracking, and reconciliation
- **Payment Methods**: Support for multiple payment types (Credit Card, Wire Transfer, ACH, Check, etc.)
- **Multi-Currency**: Payment processing in multiple currencies
- **Overdue Monitoring**: Automated alerts for overdue payments
- **Collection Management**: Collection assignment and prioritization
- **Revenue Recognition**: Accurate revenue tracking and reporting
- **Reconciliation**: Payment matching and account reconciliation

## Usage

### Importing Schemas
```typescript
import { ContractSchema } from '@hotcrm/finance';

// Use Contract object definition
console.log(ContractSchema.label); // "Contract"
console.log(ContractSchema.apiName); // "Contract"
```

### Example: Working with Contracts
```typescript
import { ContractSchema } from '@hotcrm/finance';
import { db } from '@hotcrm/core';

// Create a contract from an opportunity
const contract = await db.doc.create('Contract', {
  AccountId: 'acc_123',
  OpportunityId: 'opp_456',
  Status: 'Draft',
  StartDate: new Date(),
  ContractTerm: 12, // months
  ContractValue: 100000
});

// Query active contracts
const activeContracts = await db.find('Contract', {
  filters: [['Status', '=', 'Active']]
});
```

## Future Enhancements

This package is structured to support:
- Payment schema TypeScript migration
- Business logic hooks for contract and payment automation
- Custom actions for financial workflows
- Integration with accounting systems (QuickBooks, Xero, etc.)

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
