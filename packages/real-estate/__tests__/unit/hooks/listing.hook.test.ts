import type { HookContext } from '@objectstack/spec/data';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ListingDaysOnMarket,
  ListingPriceChangeAlert,
  ListingMlsSync,
  ListingAutoComparable
} from '../../../src/listing.hook';

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

const mockQlFind = vi.fn();
const mockQlFindOne = vi.fn();
const mockQlDocUpdate = vi.fn();

function createMockContext(event: string, doc: any, result?: any): HookContext {
  const base: any = {
    event,
    ql: {
      find: mockQlFind,
      findOne: mockQlFindOne,
      doc: { update: mockQlDocUpdate }
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

// ─── ListingDaysOnMarket ───────────────────────────────────────────────────────

describe('ListingDaysOnMarket', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct hook metadata', () => {
    expect(ListingDaysOnMarket.name).toBe('ListingDaysOnMarket');
    expect(ListingDaysOnMarket.object).toBe('listing');
    expect(ListingDaysOnMarket.events).toContain('beforeUpdate');
  });

  it('should calculate days_on_market from list_date to sold_date', async () => {
    const doc = { list_date: '2024-01-01', sold_date: '2024-01-31' };
    const ctx = createMockContext('beforeUpdate', doc);

    await ListingDaysOnMarket.handler(ctx);

    expect(doc.days_on_market).toBe(30);
  });

  it('should set days_on_market to 0 when dates are the same', async () => {
    const doc = { list_date: '2024-06-15', sold_date: '2024-06-15' };
    const ctx = createMockContext('beforeUpdate', doc);

    await ListingDaysOnMarket.handler(ctx);

    expect(doc.days_on_market).toBe(0);
  });

  it('should not set days_on_market when sold_date is missing', async () => {
    const doc = { list_date: '2024-01-01' } as any;
    const ctx = createMockContext('beforeUpdate', doc);

    await ListingDaysOnMarket.handler(ctx);

    expect(doc.days_on_market).toBeUndefined();
  });

  it('should not set days_on_market when list_date is missing', async () => {
    const doc = { sold_date: '2024-01-31' } as any;
    const ctx = createMockContext('beforeUpdate', doc);

    await ListingDaysOnMarket.handler(ctx);

    expect(doc.days_on_market).toBeUndefined();
  });
});

// ─── ListingPriceChangeAlert ───────────────────────────────────────────────────

describe('ListingPriceChangeAlert', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct hook metadata', () => {
    expect(ListingPriceChangeAlert.name).toBe('ListingPriceChangeAlert');
    expect(ListingPriceChangeAlert.object).toBe('listing');
    expect(ListingPriceChangeAlert.events).toContain('afterUpdate');
  });

  it('should log when list_price changes', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const ctx = createMockContext('afterUpdate',
      { list_price: 500000 },
      { _id: 'listing_1', list_price: 450000 }
    );

    await ListingPriceChangeAlert.handler(ctx);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Price change alert')
    );
    consoleSpy.mockRestore();
  });

  it('should not log when list_price is unchanged', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const ctx = createMockContext('afterUpdate',
      { list_price: 450000 },
      { _id: 'listing_1', list_price: 450000 }
    );

    await ListingPriceChangeAlert.handler(ctx);

    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Price change alert')
    );
    consoleSpy.mockRestore();
  });
});

// ─── ListingMlsSync ────────────────────────────────────────────────────────────

describe('ListingMlsSync', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct hook metadata', () => {
    expect(ListingMlsSync.name).toBe('ListingMlsSync');
    expect(ListingMlsSync.object).toBe('listing');
    expect(ListingMlsSync.events).toContain('afterInsert');
  });

  it('should warn when property has no MLS number', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockQlFindOne.mockResolvedValue({ _id: 'prop_1', name: 'Test Property' });

    const ctx = createMockContext('afterInsert', {},
      { _id: 'listing_1', property_id: 'prop_1' }
    );

    await ListingMlsSync.handler(ctx);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('no MLS number')
    );
    warnSpy.mockRestore();
  });

  it('should not warn when property has MLS number', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockQlFindOne.mockResolvedValue({ _id: 'prop_1', mls_number: 'MLS-12345' });

    const ctx = createMockContext('afterInsert', {},
      { _id: 'listing_1', property_id: 'prop_1' }
    );

    await ListingMlsSync.handler(ctx);

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('should skip when result has no _id', async () => {
    const ctx = createMockContext('afterInsert', {}, {});
    await ListingMlsSync.handler(ctx);
    expect(mockQlFindOne).not.toHaveBeenCalled();
  });

  it('should skip when result has no property_id', async () => {
    const ctx = createMockContext('afterInsert', {}, { _id: 'listing_1' });
    await ListingMlsSync.handler(ctx);
    expect(mockQlFindOne).not.toHaveBeenCalled();
  });
});

// ─── ListingAutoComparable ─────────────────────────────────────────────────────

describe('ListingAutoComparable', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct hook metadata', () => {
    expect(ListingAutoComparable.name).toBe('ListingAutoComparable');
    expect(ListingAutoComparable.object).toBe('listing');
    expect(ListingAutoComparable.events).toContain('afterInsert');
  });

  it('should find comparable listings after insert', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockQlFindOne.mockResolvedValue({ _id: 'prop_1', property_type: 'residential' });
    mockQlFind.mockResolvedValue([{ _id: 'l_1' }, { _id: 'l_2' }]);

    const ctx = createMockContext('afterInsert', {},
      { _id: 'listing_1', property_id: 'prop_1' }
    );

    await ListingAutoComparable.handler(ctx);

    expect(mockQlFind).toHaveBeenCalledWith('listing', expect.objectContaining({
      filters: [['status', '=', 'active']]
    }));
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('2 comparable listings')
    );
    consoleSpy.mockRestore();
  });

  it('should skip when result has no _id', async () => {
    const ctx = createMockContext('afterInsert', {}, {});
    await ListingAutoComparable.handler(ctx);
    expect(mockQlFindOne).not.toHaveBeenCalled();
  });

  it('should not throw when finding comparables fails', async () => {
    mockQlFindOne.mockRejectedValue(new Error('DB error'));
    const ctx = createMockContext('afterInsert', {},
      { _id: 'listing_1', property_id: 'prop_1' }
    );
    await expect(ListingAutoComparable.handler(ctx)).resolves.toBeUndefined();
  });
});
