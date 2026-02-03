# @hotcrm/finance

Financial Operations module for HotCRM - Contract lifecycle management, invoicing, and payment tracking with AI-powered forecasting.

## Overview

This package provides comprehensive financial operations automation including contract management, invoicing, payment tracking, and AI-powered revenue forecasting and risk analysis.

**Package Stats:** 4 Objects | 3 AI Actions | 1 Automation Hook

## What's Included

### Business Objects (4 Total)

| Object | Label | Description |
|--------|-------|-------------|
| **contract** | 合同 | Contract lifecycle management (Draft → In Approval → Activated → Completed/Terminated) with terms, dates, and value tracking |
| **invoice** | Invoice | Billing statements with auto-generated numbers (INV-YYYY-000000), status tracking (Draft/Posted/Paid/Void), due dates, payment terms |
| **invoice_line** | Invoice Line | Line items for invoices with product lookup, quantity, unit price, amount calculation |
| **payment** | Payment | Payment tracking with 8 types (Down Payment, Milestone, Delivery, Acceptance, Final, Recurring, Maintenance, Other), planned vs received amounts, multiple payment methods |

### AI Actions (3 Total)

| Action | Purpose |
|--------|---------|
| **revenue_forecast** | Monthly/quarterly revenue forecasting with confidence levels, risk analysis (pipeline concentration, stale deals, expiring contracts), YoY comparison, and action recommendations |
| **contract_ai** | Contract risk scoring, renewal probability prediction, term extraction (NLP), compliance checking (GDPR/SOC2/HIPAA/ISO27001), contract optimization suggestions |
| **invoice_prediction** | Payment default prediction, payment date estimation, anomaly detection (unusual amounts, calculation errors), collection strategy optimization, cash flow forecasting |

### Automation Hooks (1 Total)

| Hook | Object | Events Triggered |
|------|--------|-------------------|
| **ContractBillingAutomation** | contract | afterUpdate → When status changes to "Activated", auto-generates invoice with line items, sets Net 30 payment terms |

## Business Capabilities

### Contract Management
- Complete lifecycle from draft to execution to renewal
- Status workflow (Draft → In Approval → Activated → On Hold → Completed/Terminated)
- Terms and conditions tracking with custom clauses
- Amendment management and version control
- Opportunity linkage (auto-creation from closed-won deals)
- Compliance tracking and audit trails

### Invoicing & Billing
- Auto-generated invoice numbers (INV-YYYY-000000 format)
- Multi-status workflow (Draft → Posted → Paid → Void)
- Invoice line items with product/quantity/price tracking
- Payment terms configuration (Net 30, Net 60, etc.)
- Due date management and overdue tracking
- Contract-based billing automation

### Payment Tracking
- 8 Payment types: Down Payment, Milestone, Delivery, Acceptance, Final, Recurring, Maintenance, Other
- Planned vs received amount reconciliation
- Multiple payment methods support
- Payment status tracking
- Overdue monitoring and collection management
- Multi-currency payment processing

### AI-Powered Intelligence
- **Revenue Forecasting**: Monthly and quarterly predictions with confidence levels
- **Risk Analysis**: Pipeline concentration, stale deal detection, contract expiration alerts
- **Renewal Prediction**: ML-based probability using customer tenure, support cases, usage patterns
- **Payment Intelligence**: Default prediction, payment date estimation with confidence
- **Contract Analysis**: NLP-based term extraction (parties, dates, values, clauses)
- **Compliance Checking**: Automated GDPR, SOC2, HIPAA, ISO27001 validation
- **Anomaly Detection**: Unusual amounts, calculation errors, invalid dates
- **Cash Flow Forecasting**: Daily predictions from outstanding invoices
- **Collection Optimization**: Automated/personal/aggressive/legal strategy recommendations

## Usage

### Importing Schemas
```typescript
import { Contract, Invoice, InvoiceLine, Payment } from '@hotcrm/finance';

console.log(Contract.label); // "合同"
console.log(Invoice.label); // "Invoice"
```

### Working with Contracts
```typescript
import { db } from '@hotcrm/core';

// Create a contract from an opportunity
const contract = await db.create('contract', {
  account: 'acc_123',
  opportunity: 'opp_456',
  status: 'Draft',
  start_date: new Date(),
  contract_term: 12, // months
  contract_value: 100000
});

// Activate contract (triggers automatic invoice generation)
await db.update('contract', contract.id, {
  status: 'Activated'
});
// → ContractBillingAutomation hook creates invoice automatically

// Query active contracts
const activeContracts = await db.find('contract', {
  filters: [['status', '=', 'Activated']]
});
```

### Using AI Actions
```typescript
import { 
  forecastRevenue,
  analyzeContractRisk,
  predictPaymentDefault,
  predictRenewalProbability,
  forecastCashFlow
} from '@hotcrm/finance';

// Revenue forecasting
const forecast = await forecastRevenue({
  period: 'quarterly',
  includeRiskAnalysis: true
});
console.log(forecast.predictions); // Q1-Q4 revenue with confidence
console.log(forecast.risks); // Pipeline concentration, stale deals

// Contract risk analysis
const riskAnalysis = await analyzeContractRisk({
  contractId: 'cont_123'
});
console.log(riskAnalysis.riskScore); // 0-100
console.log(riskAnalysis.factors); // Term risk, payment risk, credit risk

// Renewal prediction
const renewal = await predictRenewalProbability({
  contractId: 'cont_456'
});
console.log(renewal.probability); // 0-100%
console.log(renewal.factors); // Customer tenure, support cases, usage

// Payment default prediction
const defaultRisk = await predictPaymentDefault({
  invoiceId: 'inv_789'
});
console.log(defaultRisk.probability); // 0-100%
console.log(defaultRisk.recommendedAction); // Collection strategy

// Cash flow forecasting
const cashFlow = await forecastCashFlow({
  startDate: '2026-02-01',
  endDate: '2026-02-28'
});
console.log(cashFlow.dailyForecasts); // Daily expected payments
console.log(cashFlow.totalExpected); // Total expected cash
```

### Hooks Auto-Trigger (No Code Required)
```typescript
// When contract is activated, invoice is automatically created
await db.update('contract', contractId, {
  status: 'Activated'
});
// → ContractBillingAutomation hook:
//   1. Creates invoice with auto-generated number
//   2. Creates invoice line items from contract
//   3. Sets due date to Net 30
//   4. Links invoice to contract and account
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
