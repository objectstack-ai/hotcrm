import { describe, it, expect, vi } from 'vitest';
import { ConnectorActivation, ConnectorDeactivation, ConnectorHealthCheck } from '../../../src/connector.hook';

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

// ─── ConnectorActivation ───────────────────────────────────────────────────────

describe('ConnectorActivation Hook', () => {
  it('should have correct hook metadata', () => {
    expect(ConnectorActivation.name).toBe('ConnectorActivation');
    expect(ConnectorActivation.object).toBe('connector');
    expect(ConnectorActivation.events).toContain('beforeUpdate');
  });

  it('should throw when activating without base_url', async () => {
    const ctx = createMockContext({
      input: { doc: { status: 'active' } },
      result: { status: 'inactive' },
    });
    await expect(ConnectorActivation.handler(ctx)).rejects.toThrow('base_url is required');
  });

  it('should throw when activating without auth_type', async () => {
    const ctx = createMockContext({
      input: { doc: { status: 'active' } },
      result: { status: 'inactive', base_url: 'https://api.example.com' },
    });
    await expect(ConnectorActivation.handler(ctx)).rejects.toThrow('auth_type must be configured');
  });

  it('should allow activation when base_url and auth_type are set', async () => {
    const ctx = createMockContext({
      input: { doc: { status: 'active' } },
      result: { status: 'inactive', base_url: 'https://api.example.com', auth_type: 'oauth2', name: 'Test' },
    });
    await expect(ConnectorActivation.handler(ctx)).resolves.not.toThrow();
  });

  it('should not validate when status is not changing to active', async () => {
    const ctx = createMockContext({
      input: { doc: { status: 'inactive' } },
      result: { status: 'active' },
    });
    await expect(ConnectorActivation.handler(ctx)).resolves.not.toThrow();
  });

  it('should not validate when status is already active', async () => {
    const ctx = createMockContext({
      input: { doc: { status: 'active' } },
      result: { status: 'active' },
    });
    await expect(ConnectorActivation.handler(ctx)).resolves.not.toThrow();
  });
});

// ─── ConnectorDeactivation ─────────────────────────────────────────────────────

describe('ConnectorDeactivation Hook', () => {
  it('should have correct hook metadata', () => {
    expect(ConnectorDeactivation.name).toBe('ConnectorDeactivation');
    expect(ConnectorDeactivation.object).toBe('connector');
    expect(ConnectorDeactivation.events).toContain('afterUpdate');
  });

  it('should disconnect active connections when connector becomes inactive', async () => {
    const mockConnections = [
      { _id: 'conn1', status: 'connected' },
      { _id: 'conn2', status: 'connected' },
    ];
    const ctx = createMockContext({
      result: { _id: 'ctr1', status: 'inactive' },
    });
    ctx.ql.find.mockResolvedValue(mockConnections);

    await ConnectorDeactivation.handler(ctx);

    expect(ctx.ql.find).toHaveBeenCalledWith('connection', {
      filters: [['connector_id', '=', 'ctr1'], ['status', '=', 'connected']],
    });
    expect(ctx.ql.doc.update).toHaveBeenCalledTimes(2);
    expect(ctx.ql.doc.update).toHaveBeenCalledWith('connection', 'conn1', { status: 'disconnected' });
    expect(ctx.ql.doc.update).toHaveBeenCalledWith('connection', 'conn2', { status: 'disconnected' });
  });

  it('should not disconnect when status is not inactive', async () => {
    const ctx = createMockContext({
      result: { _id: 'ctr1', status: 'active' },
    });

    await ConnectorDeactivation.handler(ctx);

    expect(ctx.ql.find).not.toHaveBeenCalled();
  });

  it('should skip when result has no _id', async () => {
    const ctx = createMockContext({
      result: { status: 'inactive' },
    });

    await ConnectorDeactivation.handler(ctx);

    expect(ctx.ql.find).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully during deactivation', async () => {
    const ctx = createMockContext({
      result: { _id: 'ctr1', status: 'inactive' },
    });
    ctx.ql.find.mockRejectedValue(new Error('DB error'));

    await expect(ConnectorDeactivation.handler(ctx)).resolves.not.toThrow();
  });
});

// ─── ConnectorHealthCheck ──────────────────────────────────────────────────────

describe('ConnectorHealthCheck Hook', () => {
  it('should have correct hook metadata', () => {
    expect(ConnectorHealthCheck.name).toBe('ConnectorHealthCheck');
    expect(ConnectorHealthCheck.object).toBe('connector');
    expect(ConnectorHealthCheck.events).toContain('afterInsert');
  });

  it('should run health check when connector has _id and base_url', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const ctx = createMockContext({
      result: { _id: 'ctr1', name: 'Test Connector', base_url: 'https://api.example.com' },
    });

    await ConnectorHealthCheck.handler(ctx);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('health check'));
    consoleSpy.mockRestore();
  });

  it('should skip health check when base_url is missing', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const ctx = createMockContext({
      result: { _id: 'ctr1', name: 'Test Connector' },
    });

    await ConnectorHealthCheck.handler(ctx);

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should skip health check when _id is missing', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const ctx = createMockContext({
      result: { name: 'Test Connector', base_url: 'https://api.example.com' },
    });

    await ConnectorHealthCheck.handler(ctx);

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
