import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HookContext } from '@objectstack/spec/data';
import { KPIValidationTrigger, KPIThresholdAlertTrigger } from '../../../src/hooks/kpi.hook';

const createMockContext = (
  event: string,
  doc: any,
  previous?: any,
  result?: any
): HookContext => {
  const baseContext: any = {
    event,
    ql: {
      find: vi.fn(),
      doc: { get: vi.fn(), create: vi.fn(), update: vi.fn() }
    },
    session: { userId: 'user_123', tenantId: 'tenant_123' }
  };

  if (event.startsWith('before')) {
    baseContext.input = { doc };
    baseContext.previous = previous;
  } else {
    baseContext.result = result || doc;
    baseContext.previous = previous;
    baseContext.input = { doc };
  }
  return baseContext;
};

describe('KPI Hook - KPIValidationTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should accept valid KPI with warning > critical threshold', async () => {
    const doc = {
      name: 'Win Rate',
      threshold_warning: 70,
      threshold_critical: 50,
      target_value: 85
    };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(KPIValidationTrigger.handler(ctx)).resolves.not.toThrow();
  });

  it('should throw when warning threshold is less than critical', async () => {
    const doc = {
      name: 'Win Rate',
      threshold_warning: 30,
      threshold_critical: 50
    };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(KPIValidationTrigger.handler(ctx)).rejects.toThrow(
      'Warning threshold must be greater than critical threshold'
    );
  });

  it('should throw when warning threshold equals critical', async () => {
    const doc = {
      name: 'Win Rate',
      threshold_warning: 50,
      threshold_critical: 50
    };
    const ctx = createMockContext('beforeUpdate', doc);

    await expect(KPIValidationTrigger.handler(ctx)).rejects.toThrow(
      'Warning threshold must be greater than critical threshold'
    );
  });

  it('should throw when target_value is negative', async () => {
    const doc = {
      name: 'Revenue',
      target_value: -100
    };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(KPIValidationTrigger.handler(ctx)).rejects.toThrow(
      'Target value must be non-negative'
    );
  });

  it('should accept target_value of zero', async () => {
    const doc = { name: 'Churn', target_value: 0 };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(KPIValidationTrigger.handler(ctx)).resolves.not.toThrow();
  });

  it('should accept KPI without thresholds', async () => {
    const doc = { name: 'Simple KPI' };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(KPIValidationTrigger.handler(ctx)).resolves.not.toThrow();
  });
});

describe('KPI Hook - KPIThresholdAlertTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should log critical alert when value is at or below critical threshold', async () => {
    const doc = {
      name: 'Win Rate',
      current_value: 40,
      threshold_warning: 70,
      threshold_critical: 50
    };
    const ctx = createMockContext('afterUpdate', doc, undefined, doc);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await KPIThresholdAlertTrigger.handler(ctx);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('CRITICAL')
    );
    consoleSpy.mockRestore();
  });

  it('should log warning when value is below warning but above critical', async () => {
    const doc = {
      name: 'Win Rate',
      current_value: 60,
      threshold_warning: 70,
      threshold_critical: 50
    };
    const ctx = createMockContext('afterUpdate', doc, undefined, doc);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await KPIThresholdAlertTrigger.handler(ctx);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('WARNING')
    );
    consoleSpy.mockRestore();
  });

  it('should log healthy when value is above warning threshold', async () => {
    const doc = {
      name: 'Win Rate',
      current_value: 80,
      threshold_warning: 70,
      threshold_critical: 50
    };
    const ctx = createMockContext('afterUpdate', doc, undefined, doc);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await KPIThresholdAlertTrigger.handler(ctx);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('healthy')
    );
    consoleSpy.mockRestore();
  });

  it('should skip alerting when current_value is null', async () => {
    const doc = {
      name: 'Win Rate',
      current_value: null,
      threshold_warning: 70,
      threshold_critical: 50
    };
    const ctx = createMockContext('afterUpdate', doc, undefined, doc);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await KPIThresholdAlertTrigger.handler(ctx);

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
