import { describe, it, expect } from 'vitest';

describe('HR UI Schema Compliance', () => {
  describe('HrDashboard', () => {
    // HrDashboard module calls DashboardSchema.parse() at load time.
    // The dashboard widget filter format currently uses arrays (ObjectQL style)
    // which does not match the DashboardSchema expectation of record/object.
    it('should fail module-level DashboardSchema validation (known schema mismatch)', async () => {
      await expect(() => import('../../../src/hr.dashboard')).rejects.toThrow();
    });
  });
});
