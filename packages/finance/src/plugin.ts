/**
 * @hotcrm/finance - Finance Plugin Definition
 * 
 * This plugin provides financial management functionality including:
 * - Contract Lifecycle Management
 * - Payment Tracking & Reconciliation
 * - Revenue Recognition
 * 
 * Dependencies: @hotcrm/crm (required for Account and Opportunity references)
 */

import { PluginSchema } from '@objectstack/spec/kernel';
import type { PluginDefinition } from '@objectstack/spec/kernel';

// Import all Finance objects
import { Contract } from './contract.object.js';
import { Payment } from './payment.object.js';
import { Invoice } from './invoice.object.js';
import { InvoiceLine } from './invoice_line.object.js';
import { CreditNote } from './credit_note.object.js';
import { BillingSchedule } from './billing_schedule.object.js';
import { RevenueSchedule } from './revenue_schedule.object.js';
import { RevenueRecognitionRule } from './revenue_recognition_rule.object.js';
import { PaymentMethod } from './payment_method.object.js';

// Import hooks
import { ContractBillingHook } from './hooks/contract.hook.js';
import { ContractRenewalCheck, ContractExpirationAlert } from './hooks/contract_renewal.hook.js';
import { InvoiceStatusLifecycleTrigger } from './hooks/invoice.hook.js';
import { InvoiceLineCalculationTrigger, InvoiceLineTotalUpdateTrigger } from './hooks/invoice_line.hook.js';
import { PaymentMatchingTrigger, PaymentValidationTrigger } from './hooks/payment.hook.js';
import { CreditNoteValidationTrigger, CreditNoteBalanceAdjustmentTrigger } from './hooks/credit_note.hook.js';
import { BillingScheduleValidationTrigger, BillingScheduleInvoiceGenerationTrigger } from './hooks/billing_schedule.hook.js';
import { RevenueScheduleValidationTrigger, RevenueRecognitionComplianceTrigger } from './hooks/revenue_recognition.hook.js';
import { PaymentReminderWorkflows } from './payment_reminder.workflow.js';

// Import datasets
import { InvoiceDataset } from './invoice.dataset.js';
import { PaymentDataset } from './payment.dataset.js';

// Import actions
import RevenueDashboardAction from './actions/revenue_dashboard.action.js';
import RevenueForecastAction from './actions/revenue_forecast.action.js';
import { analyzeContractRisk, predictRenewal, extractContractTerms, checkCompliance, optimizeContract } from './actions/contract_ai.action.js';
import { predictPaymentDefault, predictPaymentDate, detectAnomalies, optimizeCollectionStrategy, forecastCashFlow } from './actions/invoice_prediction.action.js';
import RevenueRecognitionAIAction from './actions/revenue_recognition_ai.action.js';

/**
 * Finance Plugin Definition
 * 
 * Exports all finance-related business objects, hooks, and actions
 * to be registered with the ObjectStack runtime
 */
export const FinancePlugin = {
  name: 'finance',
  label: 'Finance',
  version: '1.0.0',
  description: 'Financial management - Contracts, Invoices, Payments, and Revenue Recognition',
  
  // Plugin dependencies
  dependencies: ['crm'],
  
  // Plugin initialization
  init: async () => {
    // No initialization required for this plugin
  },
  
  // Business objects provided by this plugin
  objects: {
    contract: Contract,
    invoice: Invoice,
    invoice_line: InvoiceLine,
    payment: Payment,
    credit_note: CreditNote,
    billing_schedule: BillingSchedule,
    revenue_schedule: RevenueSchedule,
    revenue_recognition_rule: RevenueRecognitionRule,
    payment_method: PaymentMethod,
  },
  
  // Actions provided by this plugin
  actions: {
    revenue_dashboard: RevenueDashboardAction,
    revenue_forecast: RevenueForecastAction,
    contract_ai: { analyzeContractRisk, predictRenewal, extractContractTerms, checkCompliance, optimizeContract },
    invoice_prediction: { predictPaymentDefault, predictPaymentDate, detectAnomalies, optimizeCollectionStrategy, forecastCashFlow },
    revenue_recognition_ai: RevenueRecognitionAIAction,
  },

  // Triggers
  triggers: {
    contract_billing: ContractBillingHook,
    contract_renewal: ContractRenewalCheck,
    contract_expiration_alert: ContractExpirationAlert,
    invoice_status_lifecycle: InvoiceStatusLifecycleTrigger,
    invoice_line_calculation: InvoiceLineCalculationTrigger,
    invoice_line_total_update: InvoiceLineTotalUpdateTrigger,
    payment_matching: PaymentMatchingTrigger,
    payment_validation: PaymentValidationTrigger,
    credit_note_validation: CreditNoteValidationTrigger,
    credit_note_balance_adjustment: CreditNoteBalanceAdjustmentTrigger,
    billing_schedule_validation: BillingScheduleValidationTrigger,
    billing_schedule_invoice_generation: BillingScheduleInvoiceGenerationTrigger,
    revenue_schedule_validation: RevenueScheduleValidationTrigger,
    revenue_recognition_compliance: RevenueRecognitionComplianceTrigger,
  },

  // Workflows
  workflows: {
    invoice_payment_reminder: PaymentReminderWorkflows.invoicePaymentReminder,
    invoice_overdue_escalation: PaymentReminderWorkflows.invoiceOverdueEscalation,
    payment_confirmation: PaymentReminderWorkflows.paymentConfirmation,
    contract_renewal_reminder: PaymentReminderWorkflows.contractRenewalReminder,
  },

  // Seed data (DatasetSchema)
  // Note: CurrencyDataset is registered in core (root config), not duplicated here.
  data: [
    InvoiceDataset,
    PaymentDataset,
  ],

  // Apps provided by this plugin
  apps: [
    {
      name: 'finance',
      label: 'Finance',
      navigation: [
        {
          id: 'finance',
          type: 'group',
          label: 'Finance',
          children: [
            { id: 'contract', label: 'Contract', type: 'object', objectName: 'contract' },
            { id: 'invoice', label: 'Invoice', type: 'object', objectName: 'invoice' },
            { id: 'payment', label: 'Payment', type: 'object', objectName: 'payment' },
            { id: 'credit_note', label: 'Credit Note', type: 'object', objectName: 'credit_note' },
            { id: 'billing_schedule', label: 'Billing Schedule', type: 'object', objectName: 'billing_schedule' },
          ]
        },
        {
          id: 'revenue_recognition',
          type: 'group',
          label: 'Revenue Recognition',
          children: [
            { id: 'revenue_schedule', label: 'Revenue Schedule', type: 'object', objectName: 'revenue_schedule' },
            { id: 'revenue_recognition_rule', label: 'Revenue Recognition Rule', type: 'object', objectName: 'revenue_recognition_rule' },
            { id: 'payment_method', label: 'Payment Method', type: 'object', objectName: 'payment_method' },
          ]
        },
        {
          id: 'views_and_dashboards',
          type: 'group',
          label: 'Views & Dashboards',
          children: [
            { id: 'finance_dashboard', label: 'Finance Dashboard', type: 'dashboard', dashboardName: 'finance_dashboard' },
          ]
        }
      ]
    }
  ]
};

/** Spec-validated plugin metadata */
export const FinancePluginMetadata: PluginDefinition = PluginSchema.parse({
  name: 'finance',
  label: 'Finance',
  version: '1.0.0',
  description: 'Financial management - Contracts, Invoices, Payments, and Revenue Recognition',
});

export default FinancePlugin;
