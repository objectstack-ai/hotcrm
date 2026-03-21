import { describe, it, expect } from 'vitest';

describe('Real-Estate Dashboard Schema Compliance', () => {
  describe('BrokerageDashboard', () => {
    it('should pass module-level DashboardSchema validation', async () => {
      const mod = await import('../../../src/brokerage.dashboard');
      expect(mod.BrokerageDashboard).toBeDefined();
    });

    it('should have options.columns on table widgets', async () => {
      const mod = await import('../../../src/brokerage.dashboard');
      const tableWidgets = mod.BrokerageDashboard.widgets.filter((w: any) => w.type === 'table');
      expect(tableWidgets.length).toBeGreaterThan(0);
      for (const w of tableWidgets) {
        expect(w.options, `table widget "${w.id}" should have options`).toBeDefined();
        expect(w.options.columns, `table widget "${w.id}" should have options.columns`).toBeDefined();
        expect(Array.isArray(w.options.columns)).toBe(true);
        expect(w.options.columns.length).toBeGreaterThan(0);
      }
    });
  });
});
