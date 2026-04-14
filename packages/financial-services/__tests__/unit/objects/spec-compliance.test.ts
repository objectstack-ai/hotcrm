import { describe, it, expect } from 'vitest';
import { WealthAccount } from '../../../src/wealth_account.object';
import { Portfolio } from '../../../src/portfolio.object';
import { Advisory } from '../../../src/advisory.object';
import { ComplianceCheck } from '../../../src/compliance_check.object';
import { Kyc } from '../../../src/kyc.object';
import { FinancialProduct } from '../../../src/financial_product.object';
import { TransactionRecord } from '../../../src/transaction_record.object';

// ─── WealthAccount ─────────────────────────────────────────────────────────────

describe('WealthAccount Object Spec Compliance', () => {
  it('should be defined', () => {
    expect(WealthAccount).toBeDefined();
  });

  it('should have correct object name and label', () => {
    expect(WealthAccount.name).toBe('wealth_account');
    expect(WealthAccount.label).toBe('Wealth Account');
  });

  it('should use snake_case name', () => {
    expect(WealthAccount.name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('should have fields defined', () => {
    expect(WealthAccount.fields).toBeDefined();
    expect(Object.keys(WealthAccount.fields).length).toBeGreaterThan(0);
  });

  it('should have required fields', () => {
    expect(WealthAccount.fields.client_id.required).toBe(true);
    expect(WealthAccount.fields.account_type.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(WealthAccount.fields.client_id.type).toBe('lookup');
    expect(WealthAccount.fields.account_type.type).toBe('select');
    expect(WealthAccount.fields.balance.type).toBe('number');
    expect(WealthAccount.fields.risk_profile.type).toBe('select');
    expect(WealthAccount.fields.investment_strategy.type).toBe('select');
    expect(WealthAccount.fields.advisor_id.type).toBe('lookup');
    expect(WealthAccount.fields.status.type).toBe('select');
    expect(WealthAccount.fields.opened_date.type).toBe('text');
    expect(WealthAccount.fields.currency.type).toBe('text');
  });

  it('should have account_type select with valid options', () => {
    const values = WealthAccount.fields.account_type.options.map((o: any) => o.value);
    expect(values).toContain('individual');
    expect(values).toContain('joint');
    expect(values).toContain('trust');
    expect(values).toContain('corporate');
    expect(values).toContain('retirement');
  });

  it('should have risk_profile select with valid options', () => {
    const values = WealthAccount.fields.risk_profile.options.map((o: any) => o.value);
    expect(values).toContain('conservative');
    expect(values).toContain('moderate');
    expect(values).toContain('aggressive');
    expect(values).toContain('very_aggressive');
  });

  it('should default status to active', () => {
    expect(WealthAccount.fields.status.defaultValue).toBe('active');
  });

  it('should have client_id lookup referencing contact', () => {
    expect(WealthAccount.fields.client_id.type).toBe('lookup');
    expect(WealthAccount.fields.client_id.reference).toBe('contact');
  });

  it('should have advisor_id lookup referencing contact', () => {
    expect(WealthAccount.fields.advisor_id.type).toBe('lookup');
    expect(WealthAccount.fields.advisor_id.reference).toBe('contact');
  });
});

// ─── Portfolio ──────────────────────────────────────────────────────────────────

describe('Portfolio Object Spec Compliance', () => {
  it('should be defined', () => {
    expect(Portfolio).toBeDefined();
  });

  it('should have correct object name and label', () => {
    expect(Portfolio.name).toBe('portfolio');
    expect(Portfolio.label).toBe('Portfolio');
  });

  it('should use snake_case name', () => {
    expect(Portfolio.name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('should have fields defined', () => {
    expect(Portfolio.fields).toBeDefined();
    expect(Object.keys(Portfolio.fields).length).toBeGreaterThan(0);
  });

  it('should have required fields', () => {
    expect(Portfolio.fields.account_id.required).toBe(true);
    expect(Portfolio.fields.portfolio_name.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(Portfolio.fields.account_id.type).toBe('master_detail');
    expect(Portfolio.fields.portfolio_name.type).toBe('text');
    expect(Portfolio.fields.assets.type).toBe('textarea');
    expect(Portfolio.fields.allocation.type).toBe('textarea');
    expect(Portfolio.fields.performance_ytd.type).toBe('number');
    expect(Portfolio.fields.benchmark.type).toBe('text');
    expect(Portfolio.fields.rebalance_date.type).toBe('text');
    expect(Portfolio.fields.total_value.type).toBe('number');
    expect(Portfolio.fields.status.type).toBe('select');
  });

  it('should have account_id masterDetail referencing wealth_account', () => {
    expect(Portfolio.fields.account_id.type).toBe('master_detail');
    expect(Portfolio.fields.account_id.reference).toBe('wealth_account');
  });

  it('should default status to active', () => {
    expect(Portfolio.fields.status.defaultValue).toBe('active');
  });
});

// ─── Advisory ───────────────────────────────────────────────────────────────────

describe('Advisory Object Spec Compliance', () => {
  it('should be defined', () => {
    expect(Advisory).toBeDefined();
  });

  it('should have correct object name and label', () => {
    expect(Advisory.name).toBe('advisory');
    expect(Advisory.label).toBe('Advisory');
  });

  it('should use snake_case name', () => {
    expect(Advisory.name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('should have fields defined', () => {
    expect(Advisory.fields).toBeDefined();
    expect(Object.keys(Advisory.fields).length).toBeGreaterThan(0);
  });

  it('should have required fields', () => {
    expect(Advisory.fields.meeting_type.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(Advisory.fields.client_id.type).toBe('master_detail');
    expect(Advisory.fields.advisor_id.type).toBe('lookup');
    expect(Advisory.fields.meeting_type.type).toBe('select');
    expect(Advisory.fields.recommendations.type).toBe('textarea');
    expect(Advisory.fields.next_review.type).toBe('text');
    expect(Advisory.fields.compliance_approved.type).toBe('select');
    expect(Advisory.fields.meeting_date.type).toBe('text');
    expect(Advisory.fields.meeting_notes.type).toBe('textarea');
    expect(Advisory.fields.action_items.type).toBe('textarea');
  });

  it('should have meeting_type select with valid options', () => {
    const values = Advisory.fields.meeting_type.options.map((o: any) => o.value);
    expect(values).toContain('initial_consultation');
    expect(values).toContain('quarterly_review');
    expect(values).toContain('annual_review');
    expect(values).toContain('ad_hoc');
    expect(values).toContain('phone');
  });

  it('should default compliance_approved to pending', () => {
    expect(Advisory.fields.compliance_approved.defaultValue).toBe('pending');
  });
});

// ─── ComplianceCheck ────────────────────────────────────────────────────────────

describe('ComplianceCheck Object Spec Compliance', () => {
  it('should be defined', () => {
    expect(ComplianceCheck).toBeDefined();
  });

  it('should have correct object name and label', () => {
    expect(ComplianceCheck.name).toBe('compliance_check');
    expect(ComplianceCheck.label).toBe('Compliance Check');
  });

  it('should use snake_case name', () => {
    expect(ComplianceCheck.name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('should have fields defined', () => {
    expect(ComplianceCheck.fields).toBeDefined();
    expect(Object.keys(ComplianceCheck.fields).length).toBeGreaterThan(0);
  });

  it('should have required fields', () => {
    expect(ComplianceCheck.fields.entity_id.required).toBe(true);
    expect(ComplianceCheck.fields.check_type.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(ComplianceCheck.fields.entity_id.type).toBe('text');
    expect(ComplianceCheck.fields.entity_type.type).toBe('select');
    expect(ComplianceCheck.fields.check_type.type).toBe('select');
    expect(ComplianceCheck.fields.status.type).toBe('select');
    expect(ComplianceCheck.fields.findings.type).toBe('textarea');
    expect(ComplianceCheck.fields.reviewer.type).toBe('lookup');
    expect(ComplianceCheck.fields.review_date.type).toBe('text');
    expect(ComplianceCheck.fields.regulation.type).toBe('text');
    expect(ComplianceCheck.fields.risk_score.type).toBe('number');
    expect(ComplianceCheck.fields.next_review.type).toBe('text');
  });

  it('should have check_type select with valid options', () => {
    const values = ComplianceCheck.fields.check_type.options.map((o: any) => o.value);
    expect(values).toContain('aml');
    expect(values).toContain('kyc');
    expect(values).toContain('sanctions');
    expect(values).toContain('pep');
    expect(values).toContain('adverse_media');
  });

  it('should default status to pending', () => {
    expect(ComplianceCheck.fields.status.defaultValue).toBe('pending');
  });

  it('should have reviewer lookup referencing contact', () => {
    expect(ComplianceCheck.fields.reviewer.type).toBe('lookup');
    expect(ComplianceCheck.fields.reviewer.reference).toBe('contact');
  });
});

// ─── Kyc ────────────────────────────────────────────────────────────────────────

describe('Kyc Object Spec Compliance', () => {
  it('should be defined', () => {
    expect(Kyc).toBeDefined();
  });

  it('should have correct object name and label', () => {
    expect(Kyc.name).toBe('kyc');
    expect(Kyc.label).toBe('KYC');
  });

  it('should use snake_case name', () => {
    expect(Kyc.name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('should have fields defined', () => {
    expect(Kyc.fields).toBeDefined();
    expect(Object.keys(Kyc.fields).length).toBeGreaterThan(0);
  });

  it('should have required fields', () => {
    expect(Kyc.fields.document_type.required).toBe(true);
    expect(Kyc.fields.document_id.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(Kyc.fields.client_id.type).toBe('master_detail');
    expect(Kyc.fields.document_type.type).toBe('select');
    expect(Kyc.fields.document_id.type).toBe('text');
    expect(Kyc.fields.verification_status.type).toBe('select');
    expect(Kyc.fields.verified_date.type).toBe('date');
    expect(Kyc.fields.expiry_date.type).toBe('date');
    expect(Kyc.fields.risk_level.type).toBe('select');
    expect(Kyc.fields.verified_by.type).toBe('lookup');
    expect(Kyc.fields.notes.type).toBe('textarea');
  });

  it('should have document_type select with valid options', () => {
    const values = Kyc.fields.document_type.options.map((o: any) => o.value);
    expect(values).toContain('passport');
    expect(values).toContain('drivers_license');
    expect(values).toContain('national_id');
    expect(values).toContain('utility_bill');
    expect(values).toContain('bank_statement');
  });

  it('should default verification_status to pending', () => {
    expect(Kyc.fields.verification_status.defaultValue).toBe('pending');
  });

  it('should default risk_level to low', () => {
    expect(Kyc.fields.risk_level.defaultValue).toBe('low');
  });
});

// ─── FinancialProduct ───────────────────────────────────────────────────────────

describe('FinancialProduct Object Spec Compliance', () => {
  it('should be defined', () => {
    expect(FinancialProduct).toBeDefined();
  });

  it('should have correct object name and label', () => {
    expect(FinancialProduct.name).toBe('financial_product');
    expect(FinancialProduct.label).toBe('Financial Product');
  });

  it('should use snake_case name', () => {
    expect(FinancialProduct.name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('should have fields defined', () => {
    expect(FinancialProduct.fields).toBeDefined();
    expect(Object.keys(FinancialProduct.fields).length).toBeGreaterThan(0);
  });

  it('should have required fields', () => {
    expect(FinancialProduct.fields.name.required).toBe(true);
    expect(FinancialProduct.fields.product_type.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(FinancialProduct.fields.name.type).toBe('text');
    expect(FinancialProduct.fields.product_type.type).toBe('select');
    expect(FinancialProduct.fields.risk_rating.type).toBe('number');
    expect(FinancialProduct.fields.min_investment.type).toBe('number');
    expect(FinancialProduct.fields.expected_return.type).toBe('number');
    expect(FinancialProduct.fields.fee_structure.type).toBe('textarea');
    expect(FinancialProduct.fields.maturity.type).toBe('text');
    expect(FinancialProduct.fields.status.type).toBe('select');
    expect(FinancialProduct.fields.issuer.type).toBe('text');
    expect(FinancialProduct.fields.currency.type).toBe('text');
  });

  it('should have product_type select with valid options', () => {
    const values = FinancialProduct.fields.product_type.options.map((o: any) => o.value);
    expect(values).toContain('equity');
    expect(values).toContain('bond');
    expect(values).toContain('mutual_fund');
    expect(values).toContain('etf');
    expect(values).toContain('option');
    expect(values).toContain('futures');
    expect(values).toContain('real_estate');
    expect(values).toContain('alternative');
  });

  it('should default status to available', () => {
    expect(FinancialProduct.fields.status.defaultValue).toBe('available');
  });

  it('should default currency to USD', () => {
    expect(FinancialProduct.fields.currency.defaultValue).toBe('USD');
  });
});

// ─── TransactionRecord ──────────────────────────────────────────────────────────

describe('TransactionRecord Object Spec Compliance', () => {
  it('should be defined', () => {
    expect(TransactionRecord).toBeDefined();
  });

  it('should have correct object name and label', () => {
    expect(TransactionRecord.name).toBe('transaction_record');
    expect(TransactionRecord.label).toBe('Transaction Record');
  });

  it('should use snake_case name', () => {
    expect(TransactionRecord.name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('should have fields defined', () => {
    expect(TransactionRecord.fields).toBeDefined();
    expect(Object.keys(TransactionRecord.fields).length).toBeGreaterThan(0);
  });

  it('should have required fields', () => {
    expect(TransactionRecord.fields.transaction_type.required).toBe(true);
    expect(TransactionRecord.fields.amount.required).toBe(true);
    expect(TransactionRecord.fields.transaction_date.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(TransactionRecord.fields.account_id.type).toBe('master_detail');
    expect(TransactionRecord.fields.transaction_type.type).toBe('select');
    expect(TransactionRecord.fields.amount.type).toBe('currency');
    expect(TransactionRecord.fields.transaction_date.type).toBe('date');
    expect(TransactionRecord.fields.counterparty.type).toBe('text');
    expect(TransactionRecord.fields.status.type).toBe('select');
    expect(TransactionRecord.fields.compliance_flag.type).toBe('select');
    expect(TransactionRecord.fields.reference_number.type).toBe('text');
    expect(TransactionRecord.fields.notes.type).toBe('textarea');
  });

  it('should have transaction_type select with valid options', () => {
    const values = TransactionRecord.fields.transaction_type.options.map((o: any) => o.value);
    expect(values).toContain('buy');
    expect(values).toContain('sell');
    expect(values).toContain('deposit');
    expect(values).toContain('withdrawal');
    expect(values).toContain('dividend');
    expect(values).toContain('interest');
    expect(values).toContain('fee');
    expect(values).toContain('transfer');
  });

  it('should have account_id masterDetail referencing wealth_account', () => {
    expect(TransactionRecord.fields.account_id.type).toBe('master_detail');
    expect(TransactionRecord.fields.account_id.reference).toBe('wealth_account');
  });

  it('should default status to pending', () => {
    expect(TransactionRecord.fields.status.defaultValue).toBe('pending');
  });

  it('should default compliance_flag to none', () => {
    expect(TransactionRecord.fields.compliance_flag.defaultValue).toBe('none');
  });
});
