import { describe, it, expect } from 'vitest';
import { PageSchema } from '@objectstack/spec/ui';
import ProductBundlePage from '../../../src/product_bundle.page';

describe('Products UI Schema Compliance', () => {
  describe('ProductBundlePage', () => {
    it('should be defined', () => {
      expect(ProductBundlePage).toBeDefined();
    });

    it('should validate against PageSchema', () => {
      expect(() => PageSchema.parse(ProductBundlePage)).not.toThrow();
    });
  });
});
