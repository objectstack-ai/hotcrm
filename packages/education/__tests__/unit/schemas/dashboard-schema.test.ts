import { describe, it, expect } from 'vitest';
import { assertTableWidgetsHaveColumns } from '../../../../core/__tests__/helpers/dashboard-test-utils';

describe('Education Dashboard Schema Compliance', () => {
  describe('AdmissionsDashboard', () => {
    it('should pass module-level DashboardSchema validation', async () => {
      const mod = await import('../../../src/admissions.dashboard');
      expect(mod.AdmissionsDashboard).toBeDefined();
    });

    it('should have options.columns on table widgets', async () => {
      const mod = await import('../../../src/admissions.dashboard');
      assertTableWidgetsHaveColumns(mod.AdmissionsDashboard);
    });
  });
});
