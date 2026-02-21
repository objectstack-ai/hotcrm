import { describe, it, expect } from 'vitest';
import { validateSeedData, validateSeedFields } from '../../../src/seed_validation';

describe('Seed Data Validation Utility', () => {
  describe('validateSeedData', () => {
    it('should validate a valid seed data array', () => {
      const data = [
        { name: 'Test', value: 1 },
        { name: 'Test2', value: 2 },
      ];
      const result = validateSeedData(data);
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-array input', () => {
      const result = validateSeedData('not an array');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('must be an array');
    });

    it('should reject null input', () => {
      const result = validateSeedData(null);
      expect(result.valid).toBe(false);
    });

    it('should enforce minRecords', () => {
      const result = validateSeedData([], { minRecords: 1 });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('at least 1 records');
    });

    it('should validate required fields', () => {
      const data = [{ name: 'Test' }];
      const result = validateSeedData(data, { requiredFields: ['name', 'email'] });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('missing required field: email');
    });

    it('should pass when all required fields present', () => {
      const data = [{ name: 'Test', email: 'test@example.com' }];
      const result = validateSeedData(data, { requiredFields: ['name', 'email'] });
      expect(result.valid).toBe(true);
    });

    it('should enforce strictRequired for null values', () => {
      const data = [{ name: 'Test', email: null }];
      const result = validateSeedData(data, {
        requiredFields: ['name', 'email'],
        strictRequired: true,
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('null/undefined for required field: email');
    });

    it('should reject non-object records', () => {
      const data = ['string', 42, null];
      const result = validateSeedData(data);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateSeedFields', () => {
    it('should pass when all fields are allowed', () => {
      const data = [{ name: 'Test', value: 1 }];
      const result = validateSeedFields(data, ['name', 'value']);
      expect(result.valid).toBe(true);
    });

    it('should reject unexpected fields', () => {
      const data = [{ name: 'Test', extra: 'bad' }];
      const result = validateSeedFields(data, ['name']);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('unexpected field: extra');
    });

    it('should allow subset of fields', () => {
      const data = [{ name: 'Test' }];
      const result = validateSeedFields(data, ['name', 'value', 'other']);
      expect(result.valid).toBe(true);
    });
  });
});
