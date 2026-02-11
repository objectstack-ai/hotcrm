import { vi, Mock } from 'vitest';

vi.mock('../../../src/db', () => ({
  db: {
    find: vi.fn(),
    insert: vi.fn(),
    update: vi.fn()
  }
}));

import { db } from '../../../src/db';
import { LeadConvertAction } from '../../../src/actions/lead_convert.action';

describe('LeadConvertAction', () => {
  const handler = LeadConvertAction.handler;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should convert a lead into account, contact, and opportunity', async () => {
    const mockLead = {
      _id: 'lead_001',
      status: 'qualified',
      company: 'Acme Corp',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@acme.com',
      phone: '+1-555-1234',
      website: 'https://acme.com',
      city: 'San Francisco',
      country: 'US',
      title: 'VP of Sales',
      mobile: '+1-555-5678',
      lead_source: 'Website',
      annual_revenue: 5000000,
      owner: 'user_001'
    };

    (db.find as Mock).mockResolvedValue([mockLead]);
    (db.insert as Mock)
      .mockResolvedValueOnce({ _id: 'acc_001' })   // account
      .mockResolvedValueOnce({ _id: 'con_001' })   // contact
      .mockResolvedValueOnce({ _id: 'opp_001' });  // opportunity
    (db.update as Mock).mockResolvedValue({});

    const ctx = {
      params: {
        lead_id: 'lead_001',
        create_opportunity: true,
        opportunity_name: 'Acme Deal'
      },
      user: { id: 'user_current' }
    };

    const result = await handler(ctx);

    expect(result.account_id).toBe('acc_001');
    expect(result.contact_id).toBe('con_001');
    expect(result.opportunity_id).toBe('opp_001');
    expect(db.insert).toHaveBeenCalledTimes(3);
    expect(db.update).toHaveBeenCalledWith('lead', 'lead_001', expect.objectContaining({
      status: 'converted',
      is_converted: true
    }));
  });

  it('should throw error when lead is not found', async () => {
    (db.find as Mock).mockResolvedValue([]);

    const ctx = {
      params: { lead_id: 'nonexistent' },
      user: { id: 'user_001' }
    };

    await expect(handler(ctx)).rejects.toThrow('Lead not found: nonexistent');
  });

  it('should throw error when lead is already converted', async () => {
    (db.find as Mock).mockResolvedValue([{ _id: 'lead_001', status: 'converted' }]);

    const ctx = {
      params: { lead_id: 'lead_001' },
      user: { id: 'user_001' }
    };

    await expect(handler(ctx)).rejects.toThrow('Lead is already converted.');
  });

  it('should skip opportunity creation when create_opportunity is false', async () => {
    const mockLead = {
      _id: 'lead_002',
      status: 'qualified',
      company: 'Beta Inc',
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane@beta.com',
      owner: 'user_002'
    };

    (db.find as Mock).mockResolvedValue([mockLead]);
    (db.insert as Mock)
      .mockResolvedValueOnce({ _id: 'acc_002' })
      .mockResolvedValueOnce({ _id: 'con_002' });
    (db.update as Mock).mockResolvedValue({});

    const ctx = {
      params: {
        lead_id: 'lead_002',
        create_opportunity: false
      },
      user: { id: 'user_current' }
    };

    const result = await handler(ctx);

    expect(result.account_id).toBe('acc_002');
    expect(result.contact_id).toBe('con_002');
    expect(result.opportunity_id).toBeNull();
    expect(db.insert).toHaveBeenCalledTimes(2);
  });

  it('should use lead owner when no owner_id is specified', async () => {
    const mockLead = {
      _id: 'lead_003',
      status: 'qualified',
      company: 'Gamma LLC',
      first_name: 'Bob',
      last_name: 'Jones',
      email: 'bob@gamma.com',
      owner: 'lead_owner_id'
    };

    (db.find as Mock).mockResolvedValue([mockLead]);
    (db.insert as Mock)
      .mockResolvedValueOnce({ _id: 'acc_003' })
      .mockResolvedValueOnce({ _id: 'con_003' });
    (db.update as Mock).mockResolvedValue({});

    const ctx = {
      params: {
        lead_id: 'lead_003',
        create_opportunity: false
      },
      user: { id: 'user_current' }
    };

    await handler(ctx);

    expect(db.insert).toHaveBeenCalledWith('account', expect.objectContaining({
      owner: 'lead_owner_id'
    }));
  });
});
