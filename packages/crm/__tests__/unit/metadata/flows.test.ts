import { describe, it, expect } from 'vitest';
import { FlowSchema } from '@objectstack/spec/automation';
import { LeadQualificationFlow } from '../../../src/lead_qualification.flow';
import { DealCloseFlow } from '../../../src/deal_close.flow';

describe('CRM Flow Metadata Compliance', () => {
  const flows = [
    { name: 'LeadQualificationFlow', flow: LeadQualificationFlow },
    { name: 'DealCloseFlow', flow: DealCloseFlow },
  ];

  describe.each(flows)('$name', ({ flow }) => {
    it('should be defined', () => {
      expect(flow).toBeDefined();
    });

    it('should validate against FlowSchema', () => {
      expect(() => FlowSchema.parse(flow)).not.toThrow();
    });

    it('should have nodes array', () => {
      expect(Array.isArray(flow.nodes)).toBe(true);
      expect(flow.nodes.length).toBeGreaterThan(0);
    });

    it('should have edges array', () => {
      expect(Array.isArray(flow.edges)).toBe(true);
    });
  });
});
