import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DiscountScheduleActivationTrigger, DiscountScheduleOverlapDetectionTrigger } from '../../../src/hooks/discount_schedule.hook';

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

describe('DiscountScheduleActivationTrigger', () => {
 beforeEach(() => {
 vi.restoreAllMocks();
 });

 it('should have correct hook metadata', () => {
 expect(DiscountScheduleActivationTrigger.name).toBe('DiscountScheduleActivationTrigger');
 expect(DiscountScheduleActivationTrigger.object).toBe('discount_schedule');
 expect(DiscountScheduleActivationTrigger.events).toEqual(['beforeUpdate']);
 });

 it('should return early when previous is not provided', async () => {
 const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

 const ctx = {
 input: { doc: { status: 'active'} },
 previous: undefined
 };

 await DiscountScheduleActivationTrigger.handler(ctx as any);

 expect(consoleSpy).not.toHaveBeenCalled();
 });

 it('should return early when status has not changed', async () => {
 const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

 const ctx = {
 input: { doc: { status: 'active'} },
 previous: { status: 'active'}
 };

 await DiscountScheduleActivationTrigger.handler(ctx as any);

 expect(consoleSpy).not.toHaveBeenCalled();
 });

 it('should return early when new status is not active', async () => {
 const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

 const ctx = {
 input: { doc: { status: 'inactive'} },
 previous: { status: 'active'}
 };

 await DiscountScheduleActivationTrigger.handler(ctx as any);

 expect(consoleSpy).not.toHaveBeenCalled();
 });

 it('should warn when tiered discount activated without tier configuration', async () => {
 const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
 vi.spyOn(console, 'log').mockImplementation(() => {});
 vi.spyOn(console, 'error').mockImplementation(() => {});

 const ctx = {
 input: { doc: { status: 'active'} },
 previous: { name: 'Tiered Schedule', status: 'draft', discount_type: 'tiered'}
 };

 await DiscountScheduleActivationTrigger.handler(ctx as any);

 expect(consoleSpy).toHaveBeenCalledWith(
 expect.stringContaining('Tiered discount schedule activated without discount tier configuration')
 );
 });

 it('should set start_date when activating without one', async () => {
 vi.spyOn(console, 'log').mockImplementation(() => {});
 vi.spyOn(console, 'warn').mockImplementation(() => {});
 vi.spyOn(console, 'error').mockImplementation(() => {});

 const doc = { status: 'active'} as Record<string, any>;
 const ctx = {
 input: { doc },
 previous: { name: 'My Schedule', status: 'draft', discount_type: 'flat'}
 };

 await DiscountScheduleActivationTrigger.handler(ctx as any);

 expect(doc.start_date).toBeDefined();
 expect(new Date(doc.start_date).toISOString()).toBe(doc.start_date);
 });

 it('should log activation message on success', async () => {
 const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
 vi.spyOn(console, 'warn').mockImplementation(() => {});
 vi.spyOn(console, 'error').mockImplementation(() => {});

 const ctx = {
 input: { doc: { status: 'active'} },
 previous: { name: 'Flat Schedule', status: 'draft', discount_type: 'flat'}
 };

 await DiscountScheduleActivationTrigger.handler(ctx as any);

 expect(consoleSpy).toHaveBeenCalledWith(
 expect.stringContaining('Discount schedule "Flat Schedule" activated')
 );
 });
});

describe('DiscountScheduleOverlapDetectionTrigger', () => {
 let mockQl: any;

 beforeEach(() => {
 vi.restoreAllMocks();
 mockQl = {
 find: vi.fn(),
 doc: { get: vi.fn(), create: vi.fn(), update: vi.fn() }
 };
 });

 it('should have correct hook metadata', () => {
 expect(DiscountScheduleOverlapDetectionTrigger.name).toBe('DiscountScheduleOverlapDetectionTrigger');
 expect(DiscountScheduleOverlapDetectionTrigger.object).toBe('discount_schedule');
 expect(DiscountScheduleOverlapDetectionTrigger.events).toEqual(['beforeInsert', 'beforeUpdate']);
 });

 it('should return early when start_date or end_date is missing', async () => {
 const ctx = {
 input: { doc: { name: 'No Dates'} },
 ql: mockQl
 };

 await DiscountScheduleOverlapDetectionTrigger.handler(ctx as any);

 expect(mockQl.find).not.toHaveBeenCalled();
 });

 it('should return early when no existing active schedules found', async () => {
 mockQl.find.mockResolvedValueOnce([]);

 const ctx = {
 input: { doc: { name: 'New Schedule', start_date: '2025-01-01', end_date: '2025-12-31'} },
 ql: mockQl
 };

 await DiscountScheduleOverlapDetectionTrigger.handler(ctx as any);

 expect(mockQl.find).toHaveBeenCalled();
 });

 it('should warn when schedule overlaps with an existing schedule', async () => {
 const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
 vi.spyOn(console, 'error').mockImplementation(() => {});

 mockQl.find.mockResolvedValueOnce([
 { name: 'Existing Schedule', start_date: '2025-03-01', end_date: '2025-09-30'}
 ]);

 const ctx = {
 input: {
 doc: {
 name: 'Overlapping Schedule',
 start_date: '2025-06-01',
 end_date: '2025-12-31',
 applies_to: 'category_a'}
 },
 ql: mockQl
 };

 await DiscountScheduleOverlapDetectionTrigger.handler(ctx as any);

 expect(consoleSpy).toHaveBeenCalledWith(
 expect.stringContaining('Overlapping Schedule')
 );
 expect(consoleSpy).toHaveBeenCalledWith(
 expect.stringContaining('Existing Schedule')
 );
 });

 it('should not warn when schedules do not overlap', async () => {
 const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
 vi.spyOn(console, 'error').mockImplementation(() => {});

 mockQl.find.mockResolvedValueOnce([
 { name: 'Old Schedule', start_date: '2024-01-01', end_date: '2024-06-30'}
 ]);

 const ctx = {
 input: {
 doc: { name: 'Future Schedule', start_date: '2025-01-01', end_date: '2025-12-31'}
 },
 ql: mockQl
 };

 await DiscountScheduleOverlapDetectionTrigger.handler(ctx as any);

 expect(consoleSpy).not.toHaveBeenCalled();
 });

 it('should handle errors gracefully', async () => {
 const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

 mockQl.find.mockRejectedValueOnce(new Error('DB error'));

 const ctx = {
 input: { doc: { name: 'Error Schedule', start_date: '2025-01-01', end_date: '2025-12-31'} },
 ql: mockQl
 };

 await DiscountScheduleOverlapDetectionTrigger.handler(ctx as any);

 expect(consoleSpy).toHaveBeenCalledWith(
 'DiscountScheduleOverlapDetectionTrigger Error:',
 expect.any(Error)
 );
 });
});
