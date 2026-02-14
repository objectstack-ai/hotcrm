import type { HookContext } from '@objectstack/spec/data';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadgeAutoAward, BadgePointsCalculation } from '../../../src/badge.hook';

function createMockContext(event: string, doc: any, result?: any): HookContext {
  const base: any = {
    event,
    ql: {
      find: vi.fn().mockResolvedValue([]),
      doc: { update: vi.fn().mockResolvedValue({}) }
    },
    session: { userId: 'user_1', tenantId: 'tenant_1' },
    user: { id: 'user_1' }
  };

  if (event.startsWith('before')) {
    base.input = { doc };
  } else {
    base.result = result || doc;
    base.input = { doc };
  }
  return base;
}

// ─── BadgeAutoAward ────────────────────────────────────────────────────────────

describe('BadgeAutoAward', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct hook metadata', () => {
    expect(BadgeAutoAward.name).toBe('BadgeAutoAward');
    expect(BadgeAutoAward.object).toBe('badge');
    expect(BadgeAutoAward.events).toContain('afterInsert');
    expect(BadgeAutoAward.events).toContain('afterUpdate');
  });

  it('should log evaluation when badge is automatic with criteria', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const ctx = createMockContext('afterInsert', {}, {
      _id: 'badge_1',
      name: 'Top Poster',
      is_automatic: true,
      criteria: JSON.stringify({ min_posts: 50 })
    });

    await BadgeAutoAward.handler(ctx);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Top Poster'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('minimum 50 posts'));
    consoleSpy.mockRestore();
  });

  it('should skip when badge is not automatic', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const ctx = createMockContext('afterInsert', {}, {
      _id: 'badge_1',
      name: 'Manual Badge',
      is_automatic: false,
      criteria: '{}'
    });

    await BadgeAutoAward.handler(ctx);

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should skip when result has no _id', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const ctx = createMockContext('afterInsert', {}, {});

    await BadgeAutoAward.handler(ctx);

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should handle invalid criteria JSON gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const ctx = createMockContext('afterUpdate', {}, {
      _id: 'badge_1',
      name: 'Bad Badge',
      is_automatic: true,
      criteria: '{invalid json'
    });

    await BadgeAutoAward.handler(ctx);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to parse badge criteria'),
      expect.anything()
    );
    consoleSpy.mockRestore();
  });
});

// ─── BadgePointsCalculation ────────────────────────────────────────────────────

describe('BadgePointsCalculation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct hook metadata', () => {
    expect(BadgePointsCalculation.name).toBe('BadgePointsCalculation');
    expect(BadgePointsCalculation.object).toBe('badge');
    expect(BadgePointsCalculation.events).toContain('beforeInsert');
    expect(BadgePointsCalculation.events).toContain('beforeUpdate');
  });

  it('should enforce minimum 100 points for legendary badges', async () => {
    const doc = { rarity: 'legendary', points_value: 50 };
    const ctx = createMockContext('beforeInsert', doc);

    await BadgePointsCalculation.handler(ctx);

    expect(doc.points_value).toBe(100);
  });

  it('should not change points for legendary badges already at 100+', async () => {
    const doc = { rarity: 'legendary', points_value: 200 };
    const ctx = createMockContext('beforeInsert', doc);

    await BadgePointsCalculation.handler(ctx);

    expect(doc.points_value).toBe(200);
  });

  it('should not change points for non-legendary badges', async () => {
    const doc = { rarity: 'common', points_value: 10 };
    const ctx = createMockContext('beforeInsert', doc);

    await BadgePointsCalculation.handler(ctx);

    expect(doc.points_value).toBe(10);
  });

  it('should accept valid criteria JSON', async () => {
    const doc = { criteria: JSON.stringify({ min_posts: 10 }) };
    const ctx = createMockContext('beforeUpdate', doc);

    await expect(BadgePointsCalculation.handler(ctx)).resolves.toBeUndefined();
  });

  it('should reject invalid criteria JSON', async () => {
    const doc = { criteria: '{bad json' };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(BadgePointsCalculation.handler(ctx)).rejects.toThrow(
      'Validation Error: criteria field contains invalid JSON'
    );
  });

  it('should pass when no criteria is provided', async () => {
    const doc = { rarity: 'rare', points_value: 50 };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(BadgePointsCalculation.handler(ctx)).resolves.toBeUndefined();
  });
});
