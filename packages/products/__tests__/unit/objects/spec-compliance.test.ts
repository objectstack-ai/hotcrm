import { ObjectSchema } from '@objectstack/spec/data';
import { ApprovalRequest } from '../../../src/approval_request.object';
import { DiscountSchedule } from '../../../src/discount_schedule.object';
import { Pricebook } from '../../../src/pricebook.object';
import { PriceRule } from '../../../src/price_rule.object';
import { Product } from '../../../src/product.object';
import { ProductBundle } from '../../../src/product_bundle.object';
import { ProductBundleComponent } from '../../../src/product_bundle_component.object';
import { Quote } from '../../../src/quote.object';
import { QuoteLineItem } from '../../../src/quote_line_item.object';

const IDENTIFIER_RE = /^[a-z][a-z0-9_.]+$/;

const OBJECTS = [
  { name: 'Product', schema: Product },
  { name: 'Quote', schema: Quote },
  { name: 'Pricebook', schema: Pricebook },
  { name: 'PriceRule', schema: PriceRule },
  { name: 'ProductBundle', schema: ProductBundle },
  { name: 'QuoteLineItem', schema: QuoteLineItem },
  { name: 'ProductBundleComponent', schema: ProductBundleComponent },
  { name: 'DiscountSchedule', schema: DiscountSchedule },
  { name: 'ApprovalRequest', schema: ApprovalRequest },
];

describe('Products Package - Spec Compliance', () => {
  describe.each(OBJECTS)('$name', ({ name, schema }) => {
    it('should pass ObjectSchema.parse() validation', () => {
      expect(() => ObjectSchema.parse(schema)).not.toThrow();
    });

    it('should have snake_case object name', () => {
      expect(schema.name).toMatch(/^[a-z][a-z0-9_]*$/);
    });

    it('should have all select option values as valid identifiers', () => {
      const fields = schema.fields as Record<string, any>;
      for (const [fieldName, field] of Object.entries(fields)) {
        if (field.options && Array.isArray(field.options)) {
          for (const opt of field.options) {
            expect(opt.value).toMatch(IDENTIFIER_RE);
          }
        }
      }
    });

    it('should not have unknown properties in enable', () => {
      if (!schema.enable) return;
      const parsed = ObjectSchema.parse(schema);
      const originalKeys = Object.keys(schema.enable);
      const parsedKeys = Object.keys((parsed as any).enable || {});
      const unknownKeys = originalKeys.filter(k => !parsedKeys.includes(k));
      expect(unknownKeys).toEqual([]);
    });
  });
});
