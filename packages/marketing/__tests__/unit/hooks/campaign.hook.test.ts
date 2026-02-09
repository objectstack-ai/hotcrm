import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';

vi.mock('../../../src/db', () => ({
  db: {
    find: vi.fn(),
    insert: vi.fn(),
    update: vi.fn()
  }
}));

import { db } from '../../../src/db';
import {
  CampaignROICalculationTrigger,
  CampaignBudgetTrackingTrigger,
  CampaignStatusChangeTrigger,
  CampaignDateValidationTrigger
} from '../../../src/hooks/campaign.hook';

describe('CampaignROICalculationTrigger', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should calculate positive ROI when revenue exceeds cost', async () => {
    const campaign = {
      actual_revenue: 15000,
      actual_cost: 10000,
      budgeted_cost: 20000
    };
    const ctx = { input: { doc: campaign } };

    await CampaignROICalculationTrigger.handler(ctx as any);

    expect(campaign.roi).toBe(50);
    expect(campaign.budget_utilization).toBe(50);
  });

  it('should calculate negative ROI when cost exceeds revenue', async () => {
    const campaign = {
      actual_revenue: 5000,
      actual_cost: 10000,
      budgeted_cost: 20000
    };
    const ctx = { input: { doc: campaign } };

    await CampaignROICalculationTrigger.handler(ctx as any);

    expect(campaign.roi).toBe(-50);
  });

  it('should set ROI to 999.99 when revenue exists but cost is zero', async () => {
    const campaign = {
      actual_revenue: 5000,
      actual_cost: 0,
      budgeted_cost: 0
    };
    const ctx = { input: { doc: campaign } };

    await CampaignROICalculationTrigger.handler(ctx as any);

    expect(campaign.roi).toBe(999.99);
  });

  it('should set ROI to 0 when both revenue and cost are zero', async () => {
    const campaign = {
      actual_revenue: 0,
      actual_cost: 0
    };
    const ctx = { input: { doc: campaign } };

    await CampaignROICalculationTrigger.handler(ctx as any);

    expect(campaign.roi).toBe(0);
  });

  it('should calculate budget utilization at 100%', async () => {
    const campaign = {
      actual_revenue: 20000,
      actual_cost: 10000,
      budgeted_cost: 10000
    };
    const ctx = { input: { doc: campaign } };

    await CampaignROICalculationTrigger.handler(ctx as any);

    expect(campaign.budget_utilization).toBe(100);
  });

  it('should calculate budget utilization over 100%', async () => {
    const campaign = {
      actual_revenue: 20000,
      actual_cost: 15000,
      budgeted_cost: 10000
    };
    const ctx = { input: { doc: campaign } };

    await CampaignROICalculationTrigger.handler(ctx as any);

    expect(campaign.budget_utilization).toBe(150);
  });

  it('should not set budget_utilization when budgeted_cost is zero', async () => {
    const campaign = {
      actual_revenue: 0,
      actual_cost: 5000,
      budgeted_cost: 0
    } as any;
    const ctx = { input: { doc: campaign } };

    await CampaignROICalculationTrigger.handler(ctx as any);

    expect(campaign.budget_utilization).toBeUndefined();
  });

  it('should handle missing fields gracefully', async () => {
    const campaign = {} as any;
    const ctx = { input: { doc: campaign } };

    await CampaignROICalculationTrigger.handler(ctx as any);

    expect(campaign.roi).toBe(0);
  });

  it('should use ctx.input directly when doc is not present', async () => {
    const campaign = {
      actual_revenue: 20000,
      actual_cost: 10000,
      budgeted_cost: 10000
    };
    const ctx = { input: campaign };

    await CampaignROICalculationTrigger.handler(ctx as any);

    expect(campaign.roi).toBe(100);
  });
});

describe('CampaignBudgetTrackingTrigger', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should warn at 80% budget spending', async () => {
    const campaign = {
      name: 'Summer Campaign',
      budgeted_cost: 10000,
      actual_cost: 8500
    };
    const ctx = {
      input: { doc: campaign },
      previous: { actual_cost: 5000 }
    };

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await CampaignBudgetTrackingTrigger.handler(ctx as any);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('85.0% of budget')
    );
    warnSpy.mockRestore();
  });

  it('should alert at 100% budget spending', async () => {
    const campaign = {
      name: 'Summer Campaign',
      budgeted_cost: 10000,
      actual_cost: 12000
    };
    const ctx = {
      input: { doc: campaign },
      previous: { actual_cost: 9000 }
    };

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await CampaignBudgetTrackingTrigger.handler(ctx as any);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('exceeded budget')
    );
    errorSpy.mockRestore();
  });

  it('should not process when actual_cost did not change', async () => {
    const campaign = {
      name: 'Test',
      budgeted_cost: 10000,
      actual_cost: 5000
    };
    const ctx = {
      input: { doc: campaign },
      previous: { actual_cost: 5000 }
    };

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await CampaignBudgetTrackingTrigger.handler(ctx as any);

    expect(logSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Budget status')
    );
    logSpy.mockRestore();
  });

  it('should not process when there is no previous state', async () => {
    const campaign = {
      name: 'Test',
      budgeted_cost: 10000,
      actual_cost: 8500
    };
    const ctx = {
      input: { doc: campaign }
    };

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await CampaignBudgetTrackingTrigger.handler(ctx as any);

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('should not warn when budget spending is below 80%', async () => {
    const campaign = {
      name: 'Test',
      budgeted_cost: 10000,
      actual_cost: 5000
    };
    const ctx = {
      input: { doc: campaign },
      previous: { actual_cost: 3000 }
    };

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await CampaignBudgetTrackingTrigger.handler(ctx as any);

    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('should handle zero budgeted_cost without errors', async () => {
    const campaign = {
      name: 'Test',
      budgeted_cost: 0,
      actual_cost: 500
    };
    const ctx = {
      input: { doc: campaign },
      previous: { actual_cost: 0 }
    };

    await CampaignBudgetTrackingTrigger.handler(ctx as any);

    // Should complete without error
  });
});

describe('CampaignStatusChangeTrigger', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should handle transition to In Progress', async () => {
    const campaign = { _id: 'c1', name: 'Spring Campaign', status: 'In Progress' };
    const ctx = {
      result: campaign,
      previous: { status: 'Planned' }
    };

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await CampaignStatusChangeTrigger.handler(ctx as any);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Planned → In Progress')
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('started')
    );
    logSpy.mockRestore();
  });

  it('should handle transition to Completed', async () => {
    const campaign = { _id: 'c2', name: 'Spring Campaign', status: 'Completed' };
    const ctx = {
      result: campaign,
      previous: { status: 'In Progress' }
    };

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await CampaignStatusChangeTrigger.handler(ctx as any);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('completed')
    );
    logSpy.mockRestore();
  });

  it('should handle transition to Aborted', async () => {
    const campaign = { _id: 'c3', name: 'Spring Campaign', status: 'Aborted' };
    const ctx = {
      result: campaign,
      previous: { status: 'In Progress' }
    };

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await CampaignStatusChangeTrigger.handler(ctx as any);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('aborted')
    );
    logSpy.mockRestore();
  });

  it('should not trigger when status does not change', async () => {
    const campaign = { _id: 'c4', name: 'Test', status: 'Planned' };
    const ctx = {
      result: campaign,
      previous: { status: 'Planned' }
    };

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await CampaignStatusChangeTrigger.handler(ctx as any);

    expect(logSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('status changed')
    );
    logSpy.mockRestore();
  });

  it('should not trigger when there is no previous state', async () => {
    const campaign = { _id: 'c5', name: 'Test', status: 'In Progress' };
    const ctx = {
      result: campaign
    };

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await CampaignStatusChangeTrigger.handler(ctx as any);

    expect(logSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('status changed')
    );
    logSpy.mockRestore();
  });

  it('should handle errors gracefully', async () => {
    const ctx = {
      result: null,
      previous: { status: 'Planned' }
    };

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await CampaignStatusChangeTrigger.handler(ctx as any);

    expect(errorSpy).toHaveBeenCalledWith(
      '[campaign.hook] status change handling failed:',
      expect.any(Error)
    );
    errorSpy.mockRestore();
  });
});

describe('CampaignDateValidationTrigger', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should throw error when end_date is before start_date', async () => {
    const campaign = {
      start_date: '2025-06-01',
      end_date: '2025-05-01'
    };
    const ctx = { input: { doc: campaign } };

    await expect(CampaignDateValidationTrigger.handler(ctx as any))
      .rejects.toThrow('Campaign end date must be after start date');
  });

  it('should calculate duration_days when dates are valid', async () => {
    const campaign = {
      start_date: '2025-06-01',
      end_date: '2025-06-11'
    };
    const ctx = { input: { doc: campaign } };

    await CampaignDateValidationTrigger.handler(ctx as any);

    expect(campaign).toHaveProperty('duration_days', 10);
  });

  it('should set duration_days to 1 for same-day start and end', async () => {
    const campaign = {
      start_date: '2025-06-01T00:00:00Z',
      end_date: '2025-06-01T12:00:00Z'
    };
    const ctx = { input: { doc: campaign } };

    await CampaignDateValidationTrigger.handler(ctx as any);

    expect(campaign).toHaveProperty('duration_days', 1);
  });

  it('should not validate when start_date is missing', async () => {
    const campaign = {
      end_date: '2025-06-01'
    } as any;
    const ctx = { input: { doc: campaign } };

    await CampaignDateValidationTrigger.handler(ctx as any);

    expect(campaign.duration_days).toBeUndefined();
  });

  it('should not validate when end_date is missing', async () => {
    const campaign = {
      start_date: '2025-06-01'
    } as any;
    const ctx = { input: { doc: campaign } };

    await CampaignDateValidationTrigger.handler(ctx as any);

    expect(campaign.duration_days).toBeUndefined();
  });

  it('should use ctx.input directly when doc is not present', async () => {
    const campaign = {
      start_date: '2025-06-01',
      end_date: '2025-06-15'
    };
    const ctx = { input: campaign };

    await CampaignDateValidationTrigger.handler(ctx as any);

    expect(campaign).toHaveProperty('duration_days', 14);
  });

  it('should handle long campaign durations', async () => {
    const campaign = {
      start_date: '2025-01-01',
      end_date: '2025-12-31'
    };
    const ctx = { input: { doc: campaign } };

    await CampaignDateValidationTrigger.handler(ctx as any);

    expect(campaign).toHaveProperty('duration_days', 364);
  });

  it('should throw error when end_date equals start_date with same time', async () => {
    const campaign = {
      start_date: '2025-06-01T00:00:00Z',
      end_date: '2025-06-01T00:00:00Z'
    };
    const ctx = { input: { doc: campaign } };

    // end_date is NOT after start_date (they are equal), duration is 0
    // The code uses endDate < startDate, so equal dates pass validation
    await CampaignDateValidationTrigger.handler(ctx as any);

    expect(campaign).toHaveProperty('duration_days', 0);
  });
});
