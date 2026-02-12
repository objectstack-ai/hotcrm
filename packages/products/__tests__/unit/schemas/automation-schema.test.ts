import { describe, it, expect } from 'vitest';
import { ApprovalProcessSchema } from '@objectstack/spec/automation';
import { ValidatedQuoteApprovalProcess } from '../../../src/quote_approval.process';

describe('Products Automation Schema Compliance', () => {
  describe('QuoteApprovalProcess', () => {
    it('should be defined (validated at module load)', () => {
      expect(ValidatedQuoteApprovalProcess).toBeDefined();
    });

    it('should re-validate against ApprovalProcessSchema', () => {
      expect(() => ApprovalProcessSchema.parse(ValidatedQuoteApprovalProcess)).not.toThrow();
    });

    it('should have a name property', () => {
      expect(ValidatedQuoteApprovalProcess.name).toBeTruthy();
    });
  });
});
