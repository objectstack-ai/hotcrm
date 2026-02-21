import type { HookContext } from '@objectstack/spec/data';
import { vi } from 'vitest';
import {
 OrderValidationTrigger,
 OrderStatusLifecycleTrigger
} from '../../../src/hooks/order.hook';

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
const mockQlDocGet = vi.fn();
const mockQlDocCreate = vi.fn();
const mockQlDocUpdate = vi.fn();

const createMockContext = (
 event: string,
 doc: any,
 previous?: any,
 result?: any
): HookContext => {
 const baseContext: any = {
 event,
 ql: {
 find: mockQlFind,
 doc: {
 get: mockQlDocGet,
 create: mockQlDocCreate,
 update: mockQlDocUpdate
 }
 },
 session: { userId: 'user_123', tenantId: 'tenant_123'}
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

describe('Order Hook - OrderValidationTrigger', () => {
 beforeEach(() => {
 vi.clearAllMocks();
 });

 it('should validate order_date exists', async () => {
 const doc = { order_date: '2025-03-15', subtotal: 100 };
 const ctx = createMockContext('beforeInsert', doc);
 const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

 await OrderValidationTrigger.handler(ctx);

 expect(doc.total_amount).toBeDefined();
 consoleSpy.mockRestore();
 });

 it('should set total_amount from subtotal, tax, shipping, discount', async () => {
 const doc = { subtotal: 1000, tax_amount: 80, shipping_amount: 20, discount_amount: 100 };
 const ctx = createMockContext('beforeInsert', doc);
 const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

 await OrderValidationTrigger.handler(ctx);

 expect(doc.total_amount).toBe(1000);
 consoleSpy.mockRestore();
 });

 it('should default missing amounts to 0', async () => {
 const doc = { subtotal: 500 };
 const ctx = createMockContext('beforeInsert', doc);
 const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

 await OrderValidationTrigger.handler(ctx);

 expect(doc.total_amount).toBe(500);
 consoleSpy.mockRestore();
 });

 it('should log error for invalid order_date', async () => {
 const doc = { order_date: 'not-a-date'};
 const ctx = createMockContext('beforeInsert', doc);
 const consoleSpy = vi.spyOn(console, 'error').mockImplementation();

 await OrderValidationTrigger.handler(ctx);

 expect(consoleSpy).toHaveBeenCalledWith(
 'Order Validation Error:',
 expect.any(Error)
 );
 consoleSpy.mockRestore();
 });
});

describe('Order Hook - OrderStatusLifecycleTrigger', () => {
 beforeEach(() => {
 vi.clearAllMocks();
 });

 it('should prevent reactivating cancelled orders', async () => {
 const doc = { status: 'activated', order_number: 'ORD-001'};
 const previous = { status: 'cancelled', order_number: 'ORD-001'};
 const ctx = createMockContext('beforeUpdate', doc, previous);
 const consoleSpy = vi.spyOn(console, 'error').mockImplementation();

 await OrderStatusLifecycleTrigger.handler(ctx);

 expect(consoleSpy).toHaveBeenCalledWith(
 'Order Status Lifecycle Error:',
 expect.any(Error)
 );
 consoleSpy.mockRestore();
 });

 it('should allow valid transition from draft to activated', async () => {
 const doc = { status: 'activated', order_number: 'ORD-002'};
 const previous = { status: 'draft', order_number: 'ORD-002'};
 const ctx = createMockContext('beforeUpdate', doc, previous);
 const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

 await OrderStatusLifecycleTrigger.handler(ctx);

 expect(doc.effective_date).toBeDefined();
 consoleSpy.mockRestore();
 });
});
