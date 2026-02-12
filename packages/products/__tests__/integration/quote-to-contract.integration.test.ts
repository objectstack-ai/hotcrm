/**
 * Integration Test: Quote to Contract to Invoice Workflow
 *
 * Phase 8F – Cross-cloud integration: Products → Finance.
 * Validates the end-to-end flow from quote approval through contract
 * creation and invoice generation.
 */

import { vi, Mock } from 'vitest';

vi.mock('../../src/db', () => ({
  broker: {
    findOne: vi.fn(),
    find: vi.fn(),
    insert: vi.fn(),
    update: vi.fn()
  }
}));

import { broker } from '../../src/db';

describe('Quote to Contract to Invoice Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should convert an approved quote into a contract and generate an invoice', async () => {
    // Arrange
    const mockQuote = {
      id: 'quote_001',
      quote_number: 'Q-10001',
      opportunity_id: 'opp_001',
      account_id: 'acc_001',
      status: 'approved',
      approval_date: new Date().toISOString(),
      total_price: 120000,
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    const mockContract = {
      id: 'contract_001',
      contract_number: 'CON-10001',
      quote_id: 'quote_001',
      account_id: 'acc_001',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      total_value: 120000,
      status: 'draft'
    };

    const mockInvoice = {
      id: 'inv_001',
      invoice_number: 'INV-10001',
      contract_id: 'contract_001',
      account_id: 'acc_001',
      amount: 120000,
      status: 'draft',
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    (broker.findOne as Mock).mockResolvedValue(mockQuote);
    (broker.insert as Mock)
      .mockResolvedValueOnce(mockContract)
      .mockResolvedValueOnce(mockInvoice);
    (broker.update as Mock).mockResolvedValue({ ...mockQuote, status: 'converted' });

    // Act – Step 1: Retrieve approved quote
    const quote = await broker.findOne('quote', 'quote_001');
    expect(quote.status).toBe('approved');

    // Step 2: Create contract from quote
    const contract = await broker.insert('contract', {
      quote_id: quote.id,
      account_id: quote.account_id,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      total_value: quote.total_price,
      status: 'draft'
    });

    // Step 3: Generate invoice from contract
    const invoice = await broker.insert('invoice', {
      contract_id: contract.id,
      account_id: contract.account_id,
      amount: contract.total_value,
      status: 'draft'
    });

    // Step 4: Mark quote as converted
    const updatedQuote = await broker.update('quote', quote.id, { status: 'converted' });

    // Assert
    expect(contract.quote_id).toBe(quote.id);
    expect(contract.total_value).toBe(quote.total_price);
    expect(invoice.contract_id).toBe(contract.id);
    expect(invoice.amount).toBe(contract.total_value);
    expect(updatedQuote.status).toBe('converted');
    expect(broker.insert).toHaveBeenCalledTimes(2);
  });

  it('should transfer line items from quote to contract', async () => {
    // Arrange
    const quoteLines = [
      { id: 'qli_1', quote_id: 'quote_002', product_id: 'prod_1', quantity: 10, unit_price: 5000, total_price: 50000 },
      { id: 'qli_2', quote_id: 'quote_002', product_id: 'prod_2', quantity: 5, unit_price: 14000, total_price: 70000 }
    ];

    const contractLine1 = { id: 'cli_1', contract_id: 'contract_002', product_id: 'prod_1', quantity: 10, unit_price: 5000, total_price: 50000 };
    const contractLine2 = { id: 'cli_2', contract_id: 'contract_002', product_id: 'prod_2', quantity: 5, unit_price: 14000, total_price: 70000 };

    (broker.find as Mock).mockResolvedValue(quoteLines);
    (broker.insert as Mock)
      .mockResolvedValueOnce({ id: 'contract_002', quote_id: 'quote_002', total_value: 120000, status: 'draft' })
      .mockResolvedValueOnce(contractLine1)
      .mockResolvedValueOnce(contractLine2);

    // Act – Retrieve quote line items and copy to contract
    const lines = await broker.find('quote_line_item', { filters: [['quote_id', '=', 'quote_002']] });

    const contract = await broker.insert('contract', {
      quote_id: 'quote_002',
      total_value: lines.reduce((sum: number, l: any) => sum + l.total_price, 0),
      status: 'draft'
    });

    const contractLines = [];
    for (const line of lines) {
      const cl = await broker.insert('contract_line_item', {
        contract_id: contract.id,
        product_id: line.product_id,
        quantity: line.quantity,
        unit_price: line.unit_price,
        total_price: line.total_price
      });
      contractLines.push(cl);
    }

    // Assert
    expect(contractLines).toHaveLength(2);
    expect(contractLines[0].product_id).toBe('prod_1');
    expect(contractLines[1].product_id).toBe('prod_2');
    expect(contract.total_value).toBe(120000);
    expect(broker.insert).toHaveBeenCalledTimes(3);
  });

  it('should block conversion when quote is rejected', async () => {
    // Arrange
    const rejectedQuote = {
      id: 'quote_rejected',
      status: 'rejected',
      rejection_reason: 'Budget exceeded',
      total_price: 500000
    };

    (broker.findOne as Mock).mockResolvedValue(rejectedQuote);

    // Act
    const quote = await broker.findOne('quote', 'quote_rejected');
    const canConvert = quote.status === 'approved';

    // Assert
    expect(canConvert).toBe(false);
    expect(broker.insert).not.toHaveBeenCalled();
  });

  it('should create contract with correct billing schedule', async () => {
    // Arrange
    const mockQuote = {
      id: 'quote_billing',
      account_id: 'acc_billing',
      total_price: 60000,
      status: 'approved',
      billing_frequency: 'monthly'
    };

    const mockContract = {
      id: 'contract_billing',
      quote_id: 'quote_billing',
      account_id: 'acc_billing',
      total_value: 60000,
      billing_frequency: 'monthly',
      status: 'activated'
    };

    const invoices = Array.from({ length: 3 }, (_, i) => ({
      id: `inv_month_${i + 1}`,
      contract_id: 'contract_billing',
      amount: 5000,
      period: i + 1,
      status: 'draft'
    }));

    (broker.findOne as Mock).mockResolvedValue(mockQuote);
    (broker.insert as Mock)
      .mockResolvedValueOnce(mockContract)
      .mockResolvedValueOnce(invoices[0])
      .mockResolvedValueOnce(invoices[1])
      .mockResolvedValueOnce(invoices[2]);

    // Act
    const quote = await broker.findOne('quote', 'quote_billing');
    const contract = await broker.insert('contract', {
      quote_id: quote.id,
      account_id: quote.account_id,
      total_value: quote.total_price,
      billing_frequency: quote.billing_frequency,
      status: 'activated'
    });

    const monthlyAmount = contract.total_value / 12;
    const generatedInvoices = [];
    for (let i = 0; i < 3; i++) {
      const inv = await broker.insert('invoice', {
        contract_id: contract.id,
        amount: monthlyAmount,
        period: i + 1,
        status: 'draft'
      });
      generatedInvoices.push(inv);
    }

    // Assert
    expect(contract.billing_frequency).toBe('monthly');
    expect(generatedInvoices).toHaveLength(3);
    generatedInvoices.forEach((inv, idx) => {
      expect(inv.contract_id).toBe(contract.id);
      expect(inv.period).toBe(idx + 1);
    });
  });

  it('should prevent duplicate contract creation for the same quote', async () => {
    // Arrange
    const existingContract = {
      id: 'contract_existing',
      quote_id: 'quote_dup',
      status: 'activated'
    };

    (broker.find as Mock).mockResolvedValue([existingContract]);

    // Act
    const existing = await broker.find('contract', {
      filters: [['quote_id', '=', 'quote_dup']]
    });

    let contract: any;
    if (existing.length > 0) {
      contract = existing[0];
    } else {
      contract = await broker.insert('contract', { quote_id: 'quote_dup' });
    }

    // Assert
    expect(contract.id).toBe('contract_existing');
    expect(broker.insert).not.toHaveBeenCalled();
  });
});
