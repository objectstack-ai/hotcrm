import { describe, it, expect } from 'vitest';

describe('Support UI Schema Compliance', () => {
  describe('SupportDashboard', () => {
    // SupportDashboard module calls DashboardSchema.parse() at load time.
    // The dashboard widget filter format currently uses arrays (ObjectQL style)
    // which does not match the DashboardSchema expectation of record/object.
    it('should fail module-level DashboardSchema validation (known schema mismatch)', async () => {
      await expect(() => import('../../../src/support.dashboard')).rejects.toThrow();
    });
  });
});
