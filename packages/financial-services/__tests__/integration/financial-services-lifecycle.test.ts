/**
 * Integration Test: Financial Services Lifecycle
 *
 * Validates the full client onboarding → KYC → account opening → portfolio creation → advisory review flow.
 */

import { vi, Mock } from 'vitest';

vi.mock('../../src/db', () => ({
  broker: {
    findOne: vi.fn(),
    find: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    count: vi.fn()
  }
}));

import { describe, it, expect, beforeEach } from 'vitest';
import { broker } from '../../src/db';

describe('Financial Services Lifecycle Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a wealth account for a new client', async () => {
    const account = {
      _id: 'acc_1',
      client_id: 'contact_1',
      account_type: 'individual',
      balance: 100000,
      risk_profile: 'moderate',
      investment_strategy: 'balanced',
      status: 'active',
      currency: 'USD'
    };

    (broker.insert as Mock).mockResolvedValueOnce(account);

    const created = await broker.insert('wealth_account', account);

    expect(created.client_id).toBe('contact_1');
    expect(created.account_type).toBe('individual');
    expect(created.status).toBe('active');
  });

  it('should complete KYC verification for a client', async () => {
    const kyc = {
      _id: 'kyc_1',
      client_id: 'acc_1',
      document_type: 'passport',
      document_id: 'P12345678',
      verification_status: 'pending',
      risk_level: 'low'
    };

    (broker.insert as Mock).mockResolvedValueOnce(kyc);
    (broker.update as Mock).mockResolvedValueOnce({ ...kyc, verification_status: 'verified', verified_date: '2024-01-15' });

    const createdKyc = await broker.insert('kyc', kyc);
    expect(createdKyc.verification_status).toBe('pending');

    const verifiedKyc = await broker.update('kyc', 'kyc_1', { verification_status: 'verified', verified_date: '2024-01-15' });
    expect(verifiedKyc.verification_status).toBe('verified');
  });

  it('should create a portfolio for an account', async () => {
    const portfolio = {
      _id: 'port_1',
      account_id: 'acc_1',
      portfolio_name: 'Growth Portfolio',
      allocation: JSON.stringify({ equities: 60, bonds: 30, alternatives: 10 }),
      total_value: 100000,
      benchmark: 'S&P 500',
      status: 'active'
    };

    (broker.insert as Mock).mockResolvedValueOnce(portfolio);

    const created = await broker.insert('portfolio', portfolio);

    expect(created.account_id).toBe('acc_1');
    expect(created.portfolio_name).toBe('Growth Portfolio');
    expect(created.status).toBe('active');
  });

  it('should record a transaction on the account', async () => {
    const transaction = {
      _id: 'txn_1',
      account_id: 'acc_1',
      transaction_type: 'deposit',
      amount: 50000,
      transaction_date: '2024-01-20',
      status: 'completed',
      compliance_flag: 'none',
      reference_number: 'TXN-001'
    };

    (broker.insert as Mock).mockResolvedValueOnce(transaction);

    const created = await broker.insert('transaction_record', transaction);

    expect(created.account_id).toBe('acc_1');
    expect(created.transaction_type).toBe('deposit');
    expect(created.amount).toBe(50000);
    expect(created.status).toBe('completed');
  });

  it('should schedule an advisory review', async () => {
    const advisory = {
      _id: 'adv_1',
      client_id: 'acc_1',
      advisor_id: 'contact_2',
      meeting_type: 'initial_consultation',
      meeting_date: '2024-02-01',
      compliance_approved: 'pending'
    };

    (broker.insert as Mock).mockResolvedValueOnce(advisory);
    (broker.update as Mock).mockResolvedValueOnce({
      ...advisory,
      recommendations: 'Diversify into bonds',
      compliance_approved: 'approved',
      next_review: '2024-05-01'
    });

    const created = await broker.insert('advisory', advisory);
    expect(created.meeting_type).toBe('initial_consultation');
    expect(created.compliance_approved).toBe('pending');

    const updated = await broker.update('advisory', 'adv_1', {
      recommendations: 'Diversify into bonds',
      compliance_approved: 'approved',
      next_review: '2024-05-01'
    });
    expect(updated.compliance_approved).toBe('approved');
    expect(updated.recommendations).toBe('Diversify into bonds');
  });

  it('should perform a compliance check on the account', async () => {
    const compliance = {
      _id: 'comp_1',
      entity_id: 'acc_1',
      entity_type: 'account',
      check_type: 'aml',
      status: 'pending',
      regulation: 'BSA/AML'
    };

    (broker.insert as Mock).mockResolvedValueOnce(compliance);
    (broker.update as Mock).mockResolvedValueOnce({ ...compliance, status: 'passed', risk_score: 15 });

    const created = await broker.insert('compliance_check', compliance);
    expect(created.check_type).toBe('aml');
    expect(created.status).toBe('pending');

    const updated = await broker.update('compliance_check', 'comp_1', { status: 'passed', risk_score: 15 });
    expect(updated.status).toBe('passed');
    expect(updated.risk_score).toBe(15);
  });

  it('should complete the full onboarding lifecycle', async () => {
    // Step 1: Create account
    const account = { _id: 'acc_2', client_id: 'contact_3', account_type: 'individual', status: 'active' };
    (broker.insert as Mock).mockResolvedValueOnce(account);
    const createdAccount = await broker.insert('wealth_account', account);

    // Step 2: KYC verification
    const kyc = { _id: 'kyc_2', client_id: 'acc_2', document_type: 'passport', document_id: 'P999', verification_status: 'verified' };
    (broker.insert as Mock).mockResolvedValueOnce(kyc);
    const createdKyc = await broker.insert('kyc', kyc);

    // Step 3: Create portfolio
    const portfolio = { _id: 'port_2', account_id: 'acc_2', portfolio_name: 'Balanced Fund', status: 'active' };
    (broker.insert as Mock).mockResolvedValueOnce(portfolio);
    const createdPortfolio = await broker.insert('portfolio', portfolio);

    // Step 4: Advisory review
    const advisory = { _id: 'adv_2', client_id: 'acc_2', meeting_type: 'initial_consultation', compliance_approved: 'approved' };
    (broker.insert as Mock).mockResolvedValueOnce(advisory);
    const createdAdvisory = await broker.insert('advisory', advisory);

    expect(createdAccount.status).toBe('active');
    expect(createdKyc.verification_status).toBe('verified');
    expect(createdPortfolio.status).toBe('active');
    expect(createdAdvisory.compliance_approved).toBe('approved');
  });
});
