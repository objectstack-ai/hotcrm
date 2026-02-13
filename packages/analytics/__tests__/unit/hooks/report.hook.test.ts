import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HookContext } from '@objectstack/spec/data';
import { ReportValidationTrigger, ReportCreationTrigger } from '../../../src/hooks/report.hook';

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

describe('Report Hook - ReportValidationTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should accept valid report with valid JSON columns and filters', async () => {
    const doc = {
      name: 'Test Report',
      object_name: 'opportunity',
      columns: JSON.stringify(['name', 'amount']),
      filters: JSON.stringify([['stage', '!=', 'closed_lost']])
    };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(ReportValidationTrigger.handler(ctx)).resolves.not.toThrow();
  });

  it('should set default report_type to tabular when not provided', async () => {
    const doc = { name: 'Test Report', object_name: 'opportunity' };
    const ctx = createMockContext('beforeInsert', doc);

    await ReportValidationTrigger.handler(ctx);

    expect(doc.report_type).toBe('tabular');
  });

  it('should set default chart_type to none when not provided', async () => {
    const doc = { name: 'Test Report', object_name: 'opportunity' };
    const ctx = createMockContext('beforeInsert', doc);

    await ReportValidationTrigger.handler(ctx);

    expect(doc.chart_type).toBe('none');
  });

  it('should not override existing report_type', async () => {
    const doc = { name: 'Test Report', object_name: 'opportunity', report_type: 'summary' };
    const ctx = createMockContext('beforeUpdate', doc);

    await ReportValidationTrigger.handler(ctx);

    expect(doc.report_type).toBe('summary');
  });

  it('should throw on invalid JSON in columns field', async () => {
    const doc = { name: 'Test Report', object_name: 'opportunity', columns: '{invalid json' };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(ReportValidationTrigger.handler(ctx)).rejects.toThrow('Invalid JSON in columns field');
  });

  it('should throw on invalid JSON in filters field', async () => {
    const doc = { name: 'Test Report', object_name: 'opportunity', filters: 'not-json' };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(ReportValidationTrigger.handler(ctx)).rejects.toThrow('Invalid JSON in filters field');
  });

  it('should accept report with no columns or filters', async () => {
    const doc = { name: 'Minimal Report', object_name: 'account' };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(ReportValidationTrigger.handler(ctx)).resolves.not.toThrow();
  });
});

describe('Report Hook - ReportCreationTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should log report creation after insert', async () => {
    const doc = { name: 'Pipeline Report', report_type: 'summary' };
    const ctx = createMockContext('afterInsert', doc, undefined, doc);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await ReportCreationTrigger.handler(ctx);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Pipeline Report')
    );
    consoleSpy.mockRestore();
  });

  it('should not throw on error during logging', async () => {
    const ctx = createMockContext('afterInsert', {}, undefined, undefined);
    // result is undefined, accessing doc.name would fail
    Object.defineProperty(ctx, 'result', { get() { throw new Error('test'); } });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation();

    await expect(ReportCreationTrigger.handler(ctx)).resolves.not.toThrow();

    consoleSpy.mockRestore();
  });
});
