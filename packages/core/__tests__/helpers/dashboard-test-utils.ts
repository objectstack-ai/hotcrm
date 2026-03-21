import { expect } from 'vitest';
import type { Dashboard } from '@objectstack/spec/ui';

/**
 * Assert every `table`-type widget in a dashboard has `options.columns`
 * defined as a non-empty array of `{ header: string; accessorKey: string }`
 * objects — the format required by the ObjectUI renderer.
 *
 * @param dashboard  The dashboard definition to inspect.
 * @param expectAtLeastOne  If `true` (default), also asserts at least one
 *   table widget exists — preventing the test from silently passing on
 *   dashboards that happen to have zero table widgets.
 */
export function assertTableWidgetsHaveColumns(
  dashboard: Dashboard,
  expectAtLeastOne = true,
): void {
  const tableWidgets = dashboard.widgets.filter((w: any) => w.type === 'table');
  if (expectAtLeastOne) {
    expect(tableWidgets.length).toBeGreaterThan(0);
  }
  for (const w of tableWidgets as any[]) {
    expect(w.options, `table widget "${w.id}" should have options`).toBeDefined();
    expect(w.options.columns, `table widget "${w.id}" should have options.columns`).toBeDefined();
    expect(Array.isArray(w.options.columns)).toBe(true);
    expect(w.options.columns.length).toBeGreaterThan(0);
    for (const col of w.options.columns) {
      expect(typeof col, `table widget "${w.id}" columns must be objects, not strings`).toBe('object');
      expect(col.header, `table widget "${w.id}" column missing header`).toBeDefined();
      expect(typeof col.header).toBe('string');
      expect(col.accessorKey, `table widget "${w.id}" column missing accessorKey`).toBeDefined();
      expect(typeof col.accessorKey).toBe('string');
    }
  }
}
