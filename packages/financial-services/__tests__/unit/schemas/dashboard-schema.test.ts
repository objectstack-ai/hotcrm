import { describe, it, expect } from 'vitest';
import { assertTableWidgetsHaveColumns } from '../../../../core/__tests__/helpers/dashboard-test-utils';

describe('Financial-Services Dashboard Schema Compliance', () => {
  describe('WealthManagementDashboard', () => {
    it('should pass module-level DashboardSchema validation', async () => {
      const mod = await import('../../../src/wealth_management.dashboard');
      expect(mod.WealthManagementDashboard).toBeDefined();
    });

    it('should have options.columns on table widgets', async () => {
      const mod = await import('../../../src/wealth_management.dashboard');
      assertTableWidgetsHaveColumns(mod.WealthManagementDashboard);
    });
  });
});
