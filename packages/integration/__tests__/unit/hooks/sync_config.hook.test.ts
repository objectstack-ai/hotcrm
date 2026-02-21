import { describe, it, expect, vi } from 'vitest';
import { MappingValidation, ScheduleManagement, ConflictResolution } from '../../../src/sync_config.hook';

vi.mock('@hotcrm/core', () => ({
  createLogger: () => ({
    info: (...args: any[]) => console.log(...args),
    warn: (...args: any[]) => console.warn(...args),
    error: (...args: any[]) => console.error(...args),
    debug: (...args: any[]) => console.debug(...args),
    fatal: (...args: any[]) => console.error(...args),
  }),
  logger: {
    info: (...args: any[]) => console.log(...args),
    warn: (...args: any[]) => console.warn(...args),
    error: (...args: any[]) => console.error(...args),
    debug: (...args: any[]) => console.debug(...args),
    fatal: (...args: any[]) => console.error(...args),
  },
}));

function createMockContext(overrides: Record<string, any> = {}): any {
  return {
    input: { doc: {} },
    result: null,
    ql: {
      find: vi.fn().mockResolvedValue([]),
      doc: {
        update: vi.fn().mockResolvedValue({}),
      },
    },
    ...overrides,
  };
}

// ─── MappingValidation ─────────────────────────────────────────────────────────

describe('MappingValidation Hook', () => {
  it('should have correct hook metadata', () => {
    expect(MappingValidation.name).toBe('MappingValidation');
    expect(MappingValidation.object).toBe('sync_config');
    expect(MappingValidation.events).toContain('beforeInsert');
    expect(MappingValidation.events).toContain('beforeUpdate');
  });

  it('should accept valid JSON object field_mapping', async () => {
    const ctx = createMockContext({
      input: { doc: { field_mapping: '{"name": "full_name"}' } },
    });
    await expect(MappingValidation.handler(ctx)).resolves.not.toThrow();
  });

  it('should accept field_mapping as an object', async () => {
    const ctx = createMockContext({
      input: { doc: { field_mapping: { name: 'full_name' } } },
    });
    await expect(MappingValidation.handler(ctx)).resolves.not.toThrow();
  });

  it('should reject invalid JSON in field_mapping', async () => {
    const ctx = createMockContext({
      input: { doc: { field_mapping: '{invalid json}' } },
    });
    await expect(MappingValidation.handler(ctx)).rejects.toThrow('invalid JSON');
  });

  it('should reject array field_mapping', async () => {
    const ctx = createMockContext({
      input: { doc: { field_mapping: '["a", "b"]' } },
    });
    await expect(MappingValidation.handler(ctx)).rejects.toThrow('must be a JSON object');
  });

  it('should reject when source_object equals target_object', async () => {
    const ctx = createMockContext({
      input: { doc: { source_object: 'account', target_object: 'account' } },
    });
    await expect(MappingValidation.handler(ctx)).rejects.toThrow('must be different');
  });

  it('should allow different source_object and target_object', async () => {
    const ctx = createMockContext({
      input: { doc: { source_object: 'account', target_object: 'contact' } },
    });
    await expect(MappingValidation.handler(ctx)).resolves.not.toThrow();
  });

  it('should pass when no field_mapping or objects are set', async () => {
    const ctx = createMockContext({
      input: { doc: { name: 'Test Sync' } },
    });
    await expect(MappingValidation.handler(ctx)).resolves.not.toThrow();
  });
});

// ─── ScheduleManagement ────────────────────────────────────────────────────────

describe('ScheduleManagement Hook', () => {
  it('should have correct hook metadata', () => {
    expect(ScheduleManagement.name).toBe('ScheduleManagement');
    expect(ScheduleManagement.object).toBe('sync_config');
    expect(ScheduleManagement.events).toContain('afterUpdate');
  });

  it('should log when active config has non-manual frequency', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const ctx = createMockContext({
      result: { _id: 'sc1', name: 'Test Sync', is_active: true, frequency: 'hourly' },
    });

    await ScheduleManagement.handler(ctx);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('hourly'));
    consoleSpy.mockRestore();
  });

  it('should not log for manual frequency', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const ctx = createMockContext({
      result: { _id: 'sc1', name: 'Test Sync', is_active: true, frequency: 'manual' },
    });

    await ScheduleManagement.handler(ctx);

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should not log when config is inactive', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const ctx = createMockContext({
      result: { _id: 'sc1', name: 'Test Sync', is_active: false, frequency: 'hourly' },
    });

    await ScheduleManagement.handler(ctx);

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should skip when result has no _id', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const ctx = createMockContext({
      result: { name: 'Test Sync', is_active: true, frequency: 'daily' },
    });

    await ScheduleManagement.handler(ctx);

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

// ─── ConflictResolution ────────────────────────────────────────────────────────

describe('ConflictResolution Hook', () => {
  it('should have correct hook metadata', () => {
    expect(ConflictResolution.name).toBe('ConflictResolution');
    expect(ConflictResolution.object).toBe('sync_config');
    expect(ConflictResolution.events).toContain('beforeInsert');
    expect(ConflictResolution.events).toContain('beforeUpdate');
  });

  it('should throw when bidirectional sync has no conflict_resolution', async () => {
    const ctx = createMockContext({
      input: { doc: { direction: 'bidirectional' } },
    });
    await expect(ConflictResolution.handler(ctx)).rejects.toThrow('conflict_resolution is required');
  });

  it('should allow bidirectional sync with conflict_resolution', async () => {
    const ctx = createMockContext({
      input: { doc: { direction: 'bidirectional', conflict_resolution: 'source_wins' } },
    });
    await expect(ConflictResolution.handler(ctx)).resolves.not.toThrow();
  });

  it('should not require conflict_resolution for inbound syncs', async () => {
    const ctx = createMockContext({
      input: { doc: { direction: 'inbound' } },
    });
    await expect(ConflictResolution.handler(ctx)).resolves.not.toThrow();
  });

  it('should not require conflict_resolution for outbound syncs', async () => {
    const ctx = createMockContext({
      input: { doc: { direction: 'outbound' } },
    });
    await expect(ConflictResolution.handler(ctx)).resolves.not.toThrow();
  });
});
