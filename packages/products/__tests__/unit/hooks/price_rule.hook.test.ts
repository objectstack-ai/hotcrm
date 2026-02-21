import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PriceRuleValidationTrigger, PriceRuleConflictDetectionTrigger } from '../../../src/hooks/price_rule.hook';

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

describe('PriceRuleValidationTrigger', () => {
 beforeEach(() => {
 vi.restoreAllMocks();
 });

 it('should have correct hook metadata', () => {
 expect(PriceRuleValidationTrigger.name).toBe('PriceRuleValidationTrigger');
 expect(PriceRuleValidationTrigger.object).toBe('price_rule');
 expect(PriceRuleValidationTrigger.events).toEqual(['beforeInsert', 'beforeUpdate']);
 });

 it('should validate a valid price rule successfully', async () => {
 const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
 vi.spyOn(console, 'error').mockImplementation(() => {});

 const ctx = {
 input: { doc: { name: 'Tiered Pricing', rule_type: 'tiered', start_date: '2025-01-01'} },
 ql: { find: vi.fn() }
 };

 await PriceRuleValidationTrigger.handler(ctx as any);

 expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Price rule validated: Tiered Pricing'));
 });

 it('should throw error when rule name is missing', async () => {
 vi.spyOn(console, 'error').mockImplementation(() => {});

 const ctx = {
 input: { doc: { name: '', start_date: '2025-01-01'} },
 ql: { find: vi.fn() }
 };

 await expect(PriceRuleValidationTrigger.handler(ctx as any)).rejects.toThrow('Rule name is required');
 });

 it('should throw error for invalid rule type', async () => {
 vi.spyOn(console, 'error').mockImplementation(() => {});

 const ctx = {
 input: { doc: { name: 'Bad Rule', rule_type: 'invalid_type', start_date: '2025-01-01'} },
 ql: { find: vi.fn() }
 };

 await expect(PriceRuleValidationTrigger.handler(ctx as any)).rejects.toThrow(
 'Invalid rule type "invalid_type"');
 });

 it('should throw error when start_date is missing', async () => {
 vi.spyOn(console, 'error').mockImplementation(() => {});

 const ctx = {
 input: { doc: { name: 'No Date Rule'} },
 ql: { find: vi.fn() }
 };

 await expect(PriceRuleValidationTrigger.handler(ctx as any)).rejects.toThrow('Start date (start_date) is required');
 });

 it('should throw error when end_date is before start_date', async () => {
 vi.spyOn(console, 'error').mockImplementation(() => {});

 const ctx = {
 input: { doc: { name: 'Bad Dates', start_date: '2025-06-01', end_date: '2025-01-01'} },
 ql: { find: vi.fn() }
 };

 await expect(PriceRuleValidationTrigger.handler(ctx as any)).rejects.toThrow('End date must be after start date');
 });
});

describe('PriceRuleConflictDetectionTrigger', () => {
 let mockQl: any;

 beforeEach(() => {
 vi.restoreAllMocks();
 mockQl = {
 find: vi.fn(),
 doc: { get: vi.fn(), create: vi.fn(), update: vi.fn() }
 };
 });

 it('should have correct hook metadata', () => {
 expect(PriceRuleConflictDetectionTrigger.name).toBe('PriceRuleConflictDetectionTrigger');
 expect(PriceRuleConflictDetectionTrigger.object).toBe('price_rule');
 expect(PriceRuleConflictDetectionTrigger.events).toEqual(['beforeInsert']);
 });

 it('should return early when product_id or start_date is missing', async () => {
 const ctx = {
 input: { doc: { name: 'No Product Rule'} },
 ql: mockQl
 };

 await PriceRuleConflictDetectionTrigger.handler(ctx as any);

 expect(mockQl.find).not.toHaveBeenCalled();
 });

 it('should return early when no existing active rules found', async () => {
 mockQl.find.mockResolvedValueOnce([]);

 const ctx = {
 input: { doc: { name: 'New Rule', product_id: 'prod_1', start_date: '2025-01-01'} },
 ql: mockQl
 };

 await PriceRuleConflictDetectionTrigger.handler(ctx as any);

 expect(mockQl.find).toHaveBeenCalledWith('price_rule', {
 filters: [
 ['product_id', '=', 'prod_1'],
 ['status', '=', 'active']
 ]
 });
 });

 it('should warn when new rule overlaps with existing rule', async () => {
 const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
 vi.spyOn(console, 'error').mockImplementation(() => {});

 mockQl.find.mockResolvedValueOnce([
 { name: 'Existing Rule', start_date: '2025-01-01', end_date: '2025-12-31'}
 ]);

 const ctx = {
 input: {
 doc: { name: 'Overlapping Rule', product_id: 'prod_1', start_date: '2025-06-01', end_date: '2026-03-01'}
 },
 ql: mockQl
 };

 await PriceRuleConflictDetectionTrigger.handler(ctx as any);

 expect(consoleSpy).toHaveBeenCalledWith(
 expect.stringContaining('Overlapping Rule')
 );
 expect(consoleSpy).toHaveBeenCalledWith(
 expect.stringContaining('Existing Rule')
 );
 });

 it('should not warn when new rule does not overlap', async () => {
 const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
 vi.spyOn(console, 'error').mockImplementation(() => {});

 mockQl.find.mockResolvedValueOnce([
 { name: 'Old Rule', start_date: '2024-01-01', end_date: '2024-06-30'}
 ]);

 const ctx = {
 input: {
 doc: { name: 'Non-Overlapping Rule', product_id: 'prod_1', start_date: '2025-01-01', end_date: '2025-12-31'}
 },
 ql: mockQl
 };

 await PriceRuleConflictDetectionTrigger.handler(ctx as any);

 expect(consoleSpy).not.toHaveBeenCalled();
 });

 it('should handle errors gracefully', async () => {
 const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

 mockQl.find.mockRejectedValueOnce(new Error('DB error'));

 const ctx = {
 input: { doc: { name: 'Error Rule', product_id: 'prod_1', start_date: '2025-01-01'} },
 ql: mockQl
 };

 await PriceRuleConflictDetectionTrigger.handler(ctx as any);

 expect(consoleSpy).toHaveBeenCalledWith(
 'PriceRuleConflictDetectionTrigger Error:',
 expect.any(Error)
 );
 });
});
