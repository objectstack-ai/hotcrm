import { describe, it, expect } from 'vitest';
import { PageSchema } from '@objectstack/spec/ui';
import InvoicePage from '../../../src/invoice.page';

describe('Finance UI Schema Compliance', () => {
  describe('InvoicePage', () => {
    it('should be defined', () => {
      expect(InvoicePage).toBeDefined();
    });

    it('should validate against PageSchema', () => {
      expect(() => PageSchema.parse(InvoicePage)).not.toThrow();
    });
  });
});
