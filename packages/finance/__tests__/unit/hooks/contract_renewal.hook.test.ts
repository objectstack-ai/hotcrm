import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';

vi.mock('../../../src/db', () => ({
  db: {
    find: vi.fn(),
    insert: vi.fn(),
    update: vi.fn()
  }
}));

import { db } from '../../../src/db';
import { ContractRenewalCheck, ContractExpirationAlert } from '../../../src/hooks/contract_renewal.hook';

// Helper to build a date N days from now
function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

describe('ContractRenewalCheck', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should create renewal opportunity when contract is activated and expires within 90 days', async () => {
    const newDoc = {
      _id: 'contract_1',
      status: 'Activated',
      end_date: daysFromNow(60),
      contract_number: 'CNT-001',
      account: 'acc_1',
      contract_value: 50000
    };
    const oldDoc = {
      _id: 'contract_1',
      status: 'Draft',
      end_date: daysFromNow(60),
      contract_number: 'CNT-001',
      account: 'acc_1',
      contract_value: 50000
    };
    const ctx = {
      result: newDoc,
      previous: oldDoc
    };

    // No existing renewal opportunity
    (db.find as Mock).mockResolvedValueOnce([]);
    // Insert opportunity returns new record
    (db.insert as Mock).mockResolvedValueOnce({
      _id: 'opp_1',
      name: `Renewal: ${newDoc.contract_number}`
    });
    // Insert task
    (db.insert as Mock).mockResolvedValueOnce({ _id: 'task_1' });

    await ContractRenewalCheck.handler(ctx as any);

    expect(db.find).toHaveBeenCalledWith('opportunity', {
      filters: [
        ['source_contract', '=', 'contract_1'],
        ['type', '=', 'Renewal']
      ]
    });

    expect(db.insert).toHaveBeenCalledTimes(2);

    // Verify opportunity creation
    const oppCall = (db.insert as Mock).mock.calls[0];
    expect(oppCall[0]).toBe('opportunity');
    expect(oppCall[1]).toMatchObject({
      name: 'Renewal: CNT-001',
      account: 'acc_1',
      source_contract: 'contract_1',
      type: 'Renewal',
      stage: 'Prospecting',
      amount: 50000
    });

    // Verify task creation
    const taskCall = (db.insert as Mock).mock.calls[1];
    expect(taskCall[0]).toBe('task');
    expect(taskCall[1]).toMatchObject({
      related_to: 'acc_1',
      status: 'Open'
    });
  });

  it('should not create opportunity when contract expires after 90 days', async () => {
    const ctx = {
      result: {
        _id: 'contract_2',
        status: 'Activated',
        end_date: daysFromNow(120),
        contract_number: 'CNT-002',
        account: 'acc_2',
        contract_value: 30000
      },
      previous: {
        _id: 'contract_2',
        status: 'Draft',
        end_date: daysFromNow(120),
        contract_number: 'CNT-002',
        account: 'acc_2',
        contract_value: 30000
      }
    };

    await ContractRenewalCheck.handler(ctx as any);

    expect(db.find).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('should not trigger when status does not change to Activated', async () => {
    const ctx = {
      result: {
        _id: 'contract_3',
        status: 'Draft',
        end_date: daysFromNow(30),
        contract_number: 'CNT-003',
        account: 'acc_3',
        contract_value: 10000
      },
      previous: {
        _id: 'contract_3',
        status: 'Draft',
        end_date: daysFromNow(30),
        contract_number: 'CNT-003',
        account: 'acc_3',
        contract_value: 10000
      }
    };

    await ContractRenewalCheck.handler(ctx as any);

    expect(db.find).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('should not create a duplicate opportunity if one already exists', async () => {
    const ctx = {
      result: {
        _id: 'contract_4',
        status: 'Activated',
        end_date: daysFromNow(45),
        contract_number: 'CNT-004',
        account: 'acc_4',
        contract_value: 80000
      },
      previous: {
        _id: 'contract_4',
        status: 'Draft',
        end_date: daysFromNow(45),
        contract_number: 'CNT-004',
        account: 'acc_4',
        contract_value: 80000
      }
    };

    (db.find as Mock).mockResolvedValueOnce([{ _id: 'existing_opp' }]);

    await ContractRenewalCheck.handler(ctx as any);

    expect(db.find).toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    const ctx = {
      result: {
        _id: 'contract_5',
        status: 'Activated',
        end_date: daysFromNow(30),
        contract_number: 'CNT-005',
        account: 'acc_5',
        contract_value: 20000
      },
      previous: {
        _id: 'contract_5',
        status: 'Draft',
        end_date: daysFromNow(30),
        contract_number: 'CNT-005',
        account: 'acc_5',
        contract_value: 20000
      }
    };

    (db.find as Mock).mockRejectedValueOnce(new Error('DB connection failed'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await ContractRenewalCheck.handler(ctx as any);

    expect(consoleSpy).toHaveBeenCalledWith(
      '❌ Contract Renewal Check Error:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('should set task priority to High when contract expires within 30 days', async () => {
    const ctx = {
      result: {
        _id: 'contract_6',
        status: 'Activated',
        end_date: daysFromNow(20),
        contract_number: 'CNT-006',
        account: 'acc_6',
        contract_value: 60000
      },
      previous: {
        _id: 'contract_6',
        status: 'Draft',
        end_date: daysFromNow(20),
        contract_number: 'CNT-006',
        account: 'acc_6',
        contract_value: 60000
      }
    };

    (db.find as Mock).mockResolvedValueOnce([]);
    (db.insert as Mock)
      .mockResolvedValueOnce({ _id: 'opp_6', name: 'Renewal: CNT-006' })
      .mockResolvedValueOnce({ _id: 'task_6' });

    await ContractRenewalCheck.handler(ctx as any);

    const taskCall = (db.insert as Mock).mock.calls[1];
    expect(taskCall[1].priority).toBe('High');
  });
});

describe('ContractExpirationAlert', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should send alert when contract expires within 30 days', async () => {
    const ctx = {
      result: {
        _id: 'contract_10',
        status: 'Activated',
        end_date: daysFromNow(15),
        contract_number: 'CNT-010',
        account: 'acc_10',
        contract_value: 100000,
        renewal_reminder_sent: false
      },
      previous: {
        _id: 'contract_10',
        status: 'Draft',
        end_date: daysFromNow(15),
        contract_number: 'CNT-010',
        account: 'acc_10',
        contract_value: 100000,
        renewal_reminder_sent: false
      }
    };

    (db.insert as Mock).mockResolvedValueOnce({ _id: 'activity_1' });
    (db.update as Mock).mockResolvedValueOnce({});

    await ContractExpirationAlert.handler(ctx as any);

    // Should insert an alert activity
    expect(db.insert).toHaveBeenCalledWith('activity', expect.objectContaining({
      type: 'Alert',
      related_to: 'acc_10',
      contract: 'contract_10',
      priority: 'High',
      status: 'Open'
    }));

    // Should flag the contract to prevent duplicate reminders
    expect(db.update).toHaveBeenCalledWith('contract', 'contract_10', {
      renewal_reminder_sent: true
    });
  });

  it('should not alert when contract expires after 30 days', async () => {
    const ctx = {
      result: {
        _id: 'contract_11',
        status: 'Activated',
        end_date: daysFromNow(60),
        contract_number: 'CNT-011',
        account: 'acc_11',
        contract_value: 50000,
        renewal_reminder_sent: false
      },
      previous: {
        _id: 'contract_11',
        status: 'Draft',
        end_date: daysFromNow(60),
        contract_number: 'CNT-011',
        account: 'acc_11',
        contract_value: 50000,
        renewal_reminder_sent: false
      }
    };

    await ContractExpirationAlert.handler(ctx as any);

    expect(db.insert).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it('should not alert when renewal_reminder_sent is already true', async () => {
    const ctx = {
      result: {
        _id: 'contract_12',
        status: 'Activated',
        end_date: daysFromNow(10),
        contract_number: 'CNT-012',
        account: 'acc_12',
        contract_value: 70000,
        renewal_reminder_sent: true
      },
      previous: {
        _id: 'contract_12',
        status: 'Draft',
        end_date: daysFromNow(10),
        contract_number: 'CNT-012',
        account: 'acc_12',
        contract_value: 70000,
        renewal_reminder_sent: false
      }
    };

    await ContractExpirationAlert.handler(ctx as any);

    expect(db.insert).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it('should not alert when status is not Activated', async () => {
    const ctx = {
      result: {
        _id: 'contract_13',
        status: 'Draft',
        end_date: daysFromNow(10),
        contract_number: 'CNT-013',
        account: 'acc_13',
        contract_value: 25000,
        renewal_reminder_sent: false
      },
      previous: {
        _id: 'contract_13',
        status: 'Draft',
        end_date: daysFromNow(20),
        contract_number: 'CNT-013',
        account: 'acc_13',
        contract_value: 25000,
        renewal_reminder_sent: false
      }
    };

    await ContractExpirationAlert.handler(ctx as any);

    expect(db.insert).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    const ctx = {
      result: {
        _id: 'contract_14',
        status: 'Activated',
        end_date: daysFromNow(5),
        contract_number: 'CNT-014',
        account: 'acc_14',
        contract_value: 30000,
        renewal_reminder_sent: false
      },
      previous: {
        _id: 'contract_14',
        status: 'Draft',
        end_date: daysFromNow(5),
        contract_number: 'CNT-014',
        account: 'acc_14',
        contract_value: 30000,
        renewal_reminder_sent: false
      }
    };

    (db.insert as Mock).mockRejectedValueOnce(new Error('Insert failed'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await ContractExpirationAlert.handler(ctx as any);

    expect(consoleSpy).toHaveBeenCalledWith(
      '❌ Contract Expiration Alert Error:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});
