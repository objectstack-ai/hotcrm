/**
 * @hotcrm/financial-services - Financial Services Plugin Definition
 *
 * This plugin provides financial services management functionality including:
 * - Wealth Account Management
 * - Portfolio Management
 * - Advisory Services
 * - Compliance & KYC
 * - Financial Products
 * - Transaction Records
 * - AI-Powered Portfolio Optimization & Risk Profiling
 *
 * Dependencies: @hotcrm/core
 */

import { PluginSchema } from '@objectstack/spec/kernel';
import type { PluginDefinition } from '@objectstack/spec/kernel';

// Import all Financial Services objects
import { WealthAccount } from './wealth_account.object';
import { Portfolio } from './portfolio.object';
import { Advisory } from './advisory.object';
import { ComplianceCheck } from './compliance_check.object';
import { Kyc } from './kyc.object';
import { FinancialProduct } from './financial_product.object';
import { TransactionRecord } from './transaction_record.object';

// Import hooks
import { WealthAccountRiskAssessment, WealthAccountSuitabilityCheck, WealthAccountBalanceAlert } from './wealth_account.hook';
import { PortfolioDriftDetection, PortfolioRebalanceTrigger, PortfolioPerformanceCalc } from './portfolio.hook';
import { KycDocumentExpiryAlert, KycPeriodicReverification, KycRiskAutoClassification } from './kyc.hook';
import { ComplianceRegulationAlert, ComplianceAutoScreening, ComplianceAuditTrail } from './compliance_check.hook';

// Import actions
import FinancialServicesAIAction from './financial_services_ai.action';

/**
 * Financial Services Plugin Definition
 *
 * Exports all financial-services-related business objects, hooks, and actions
 * to be registered with the ObjectStack runtime
 */
export const FinancialServicesPlugin = {
  name: 'financial_services',
  label: 'Financial Services Cloud',
  version: '1.0.0',
  description: 'Financial Services management - Wealth Management, Portfolio, KYC, Compliance, and Advisory',

  // Plugin dependencies
  dependencies: ['core'],

  // Plugin initialization
  init: async () => {
    // No initialization required for this plugin
  },

  // Business objects provided by this plugin
  objects: {
    wealth_account: WealthAccount,
    portfolio: Portfolio,
    advisory: Advisory,
    compliance_check: ComplianceCheck,
    kyc: Kyc,
    financial_product: FinancialProduct,
    transaction_record: TransactionRecord,
  },

  // Actions provided by this plugin
  actions: {
    financial_services_ai: FinancialServicesAIAction,
  },

  // Triggers/Hooks
  triggers: {
    wealth_account_risk_assessment: WealthAccountRiskAssessment,
    wealth_account_suitability_check: WealthAccountSuitabilityCheck,
    wealth_account_balance_alert: WealthAccountBalanceAlert,
    portfolio_drift_detection: PortfolioDriftDetection,
    portfolio_rebalance_trigger: PortfolioRebalanceTrigger,
    portfolio_performance_calc: PortfolioPerformanceCalc,
    kyc_document_expiry_alert: KycDocumentExpiryAlert,
    kyc_periodic_reverification: KycPeriodicReverification,
    kyc_risk_auto_classification: KycRiskAutoClassification,
    compliance_regulation_alert: ComplianceRegulationAlert,
    compliance_auto_screening: ComplianceAutoScreening,
    compliance_audit_trail: ComplianceAuditTrail,
  },

  // Apps provided by this plugin
  apps: [
    {
      name: 'financial_services',
      label: 'Financial Services Cloud',
      navigation: [
        {
          id: 'wealth_management',
          type: 'group',
          label: 'Wealth Management',
          children: [
            { id: 'wealth_account', label: 'Wealth Account', type: 'object', objectName: 'wealth_account' },
            { id: 'portfolio', label: 'Portfolio', type: 'object', objectName: 'portfolio' },
            { id: 'advisory', label: 'Advisory', type: 'object', objectName: 'advisory' },
          ]
        },
        {
          id: 'compliance_kyc',
          type: 'group',
          label: 'Compliance & KYC',
          children: [
            { id: 'compliance_check', label: 'Compliance Check', type: 'object', objectName: 'compliance_check' },
            { id: 'kyc', label: 'KYC', type: 'object', objectName: 'kyc' },
          ]
        },
        {
          id: 'products_trading',
          type: 'group',
          label: 'Products & Trading',
          children: [
            { id: 'financial_product', label: 'Financial Product', type: 'object', objectName: 'financial_product' },
            { id: 'transaction_record', label: 'Transaction Record', type: 'object', objectName: 'transaction_record' },
          ]
        },
        {
          id: 'administration',
          type: 'group',
          label: 'Administration',
          children: []
        }
      ]
    }
  ]
};

/** Spec-validated plugin metadata */
export const FinancialServicesPluginMetadata: PluginDefinition = PluginSchema.parse({
  name: 'financial_services',
  label: 'Financial Services Cloud',
  version: '1.0.0',
  description: 'Financial Services management - Wealth Management, Portfolio, KYC, Compliance, and Advisory',
});

export default FinancialServicesPlugin;
