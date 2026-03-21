import { describe, it, expect } from 'vitest';
import { assertTableWidgetsHaveColumns } from '../../../../core/__tests__/helpers/dashboard-test-utils';

describe('Community Dashboard Schema Compliance', () => {
  describe('CommunityDashboard', () => {
    it('should pass module-level DashboardSchema validation', async () => {
      const mod = await import('../../../src/community.dashboard');
      expect(mod.CommunityDashboard).toBeDefined();
    });

    it('should have options.columns on table widgets', async () => {
      const mod = await import('../../../src/community.dashboard');
      assertTableWidgetsHaveColumns(mod.CommunityDashboard);
    });
  });
});
