import { describe, it, expect } from 'vitest';
import { ObjectSchema } from '@objectstack/spec/data';
import { Report } from '../../../src/report.object';
import { ReportSchedule } from '../../../src/report_schedule.object';
import { AnalyticsDashboard } from '../../../src/analytics_dashboard.object';
import { KPI } from '../../../src/kpi.object';
import { Metric } from '../../../src/metric.object';
import { DataSource } from '../../../src/data_source.object';
import { SavedFilter } from '../../../src/saved_filter.object';
import { Snapshot } from '../../../src/snapshot.object';

const IDENTIFIER_RE = /^[a-z][a-z0-9_.]+$/;

const ANALYTICS_OBJECTS = [
  { name: 'Report', schema: Report },
  { name: 'ReportSchedule', schema: ReportSchedule },
  { name: 'AnalyticsDashboard', schema: AnalyticsDashboard },
  { name: 'KPI', schema: KPI },
  { name: 'Metric', schema: Metric },
  { name: 'DataSource', schema: DataSource },
  { name: 'SavedFilter', schema: SavedFilter },
  { name: 'Snapshot', schema: Snapshot },
];

describe('Analytics Package - Spec Compliance', () => {
  describe.each(ANALYTICS_OBJECTS)('$name', ({ name, schema }) => {
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
