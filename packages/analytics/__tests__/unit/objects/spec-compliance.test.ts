import { describe, it, expect } from 'vitest';
import { Report } from '../../../src/report.object';
import { KPI } from '../../../src/kpi.object';
import { Metric } from '../../../src/metric.object';
import { AnalyticsDashboard } from '../../../src/analytics_dashboard.object';
import { DataSource } from '../../../src/data_source.object';
import { Snapshot } from '../../../src/snapshot.object';
import { ReportSchedule } from '../../../src/report_schedule.object';
import { SavedFilter } from '../../../src/saved_filter.object';

// ─── Report ────────────────────────────────────────────────────────────────────

describe('Report Object Spec Compliance', () => {
  it('should have correct object name and label', () => {
    expect(Report.name).toBe('report');
    expect(Report.label).toBe('Report');
  });

  it('should have required fields defined', () => {
    expect(Report.fields).toBeDefined();
    expect(Report.fields.name).toBeDefined();
    expect(Report.fields.object_name).toBeDefined();
    expect(Report.fields.report_type).toBeDefined();
  });

  it('should mark name and object_name as required', () => {
    expect(Report.fields.name.required).toBe(true);
    expect(Report.fields.object_name.required).toBe(true);
    expect(Report.fields.report_type.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(Report.fields.name.type).toBe('text');
    expect(Report.fields.description.type).toBe('textarea');
    expect(Report.fields.is_public.type).toBe('boolean');
    expect(Report.fields.run_count.type).toBe('number');
    expect(Report.fields.last_run_at.type).toBe('datetime');
  });

  it('should have report_type select with 4 options', () => {
    expect(Report.fields.report_type.type).toBe('select');
    expect(Report.fields.report_type.options).toHaveLength(4);
    const values = Report.fields.report_type.options.map((o: any) => o.value);
    expect(values).toContain('tabular');
    expect(values).toContain('summary');
    expect(values).toContain('matrix');
    expect(values).toContain('joined');
  });

  it('should have chart_type select with valid options', () => {
    expect(Report.fields.chart_type.type).toBe('select');
    const values = Report.fields.chart_type.options.map((o: any) => o.value);
    expect(values).toContain('bar');
    expect(values).toContain('line');
    expect(values).toContain('pie');
  });

  it('should have owner_id lookup referencing users', () => {
    expect(Report.fields.owner_id.type).toBe('lookup');
    expect(Report.fields.owner_id.reference).toBe('users');
  });

  it('should enforce maxLength on text fields', () => {
    expect(Report.fields.name.maxLength).toBe(255);
    expect(Report.fields.object_name.maxLength).toBe(100);
  });
});

// ─── KPI ───────────────────────────────────────────────────────────────────────

describe('KPI Object Spec Compliance', () => {
  it('should have correct object name and label', () => {
    expect(KPI.name).toBe('kpi');
    expect(KPI.label).toBe('KPI');
  });

  it('should have required fields', () => {
    expect(KPI.fields.name.required).toBe(true);
    expect(KPI.fields.metric_type.required).toBe(true);
    expect(KPI.fields.target_value.required).toBe(true);
    expect(KPI.fields.period.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(KPI.fields.name.type).toBe('text');
    expect(KPI.fields.target_value.type).toBe('number');
    expect(KPI.fields.current_value.type).toBe('number');
    expect(KPI.fields.threshold_warning.type).toBe('number');
    expect(KPI.fields.threshold_critical.type).toBe('number');
  });

  it('should have metric_type select with valid options', () => {
    expect(KPI.fields.metric_type.type).toBe('select');
    const values = KPI.fields.metric_type.options.map((o: any) => o.value);
    expect(values).toContain('currency');
    expect(values).toContain('number');
    expect(values).toContain('percentage');
    expect(values).toContain('duration');
  });

  it('should have period select with valid options', () => {
    expect(KPI.fields.period.type).toBe('select');
    const values = KPI.fields.period.options.map((o: any) => o.value);
    expect(values).toContain('daily');
    expect(values).toContain('weekly');
    expect(values).toContain('monthly');
    expect(values).toContain('quarterly');
    expect(values).toContain('yearly');
  });

  it('should have trend select with up/down/flat', () => {
    expect(KPI.fields.trend.type).toBe('select');
    const values = KPI.fields.trend.options.map((o: any) => o.value);
    expect(values).toEqual(['up', 'down', 'flat']);
  });

  it('should have owner_id lookup referencing users', () => {
    expect(KPI.fields.owner_id.type).toBe('lookup');
    expect(KPI.fields.owner_id.reference).toBe('users');
  });
});

// ─── Metric ────────────────────────────────────────────────────────────────────

describe('Metric Object Spec Compliance', () => {
  it('should have correct object name and label', () => {
    expect(Metric.name).toBe('metric');
    expect(Metric.label).toBe('Metric');
  });

  it('should have required fields', () => {
    expect(Metric.fields.name.required).toBe(true);
    expect(Metric.fields.formula.required).toBe(true);
    expect(Metric.fields.source_object.required).toBe(true);
    expect(Metric.fields.aggregation_type.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(Metric.fields.name.type).toBe('text');
    expect(Metric.fields.formula.type).toBe('textarea');
    expect(Metric.fields.is_calculated.type).toBe('boolean');
    expect(Metric.fields.unit.type).toBe('text');
  });

  it('should have aggregation_type select with valid options', () => {
    expect(Metric.fields.aggregation_type.type).toBe('select');
    const values = Metric.fields.aggregation_type.options.map((o: any) => o.value);
    expect(values).toContain('sum');
    expect(values).toContain('avg');
    expect(values).toContain('count');
    expect(values).toContain('min');
    expect(values).toContain('max');
    expect(values).toContain('median');
  });

  it('should have time_grain select with valid options', () => {
    expect(Metric.fields.time_grain.type).toBe('select');
    const values = Metric.fields.time_grain.options.map((o: any) => o.value);
    expect(values).toContain('hourly');
    expect(values).toContain('daily');
    expect(values).toContain('monthly');
  });

  it('should have owner_id lookup referencing users', () => {
    expect(Metric.fields.owner_id.type).toBe('lookup');
    expect(Metric.fields.owner_id.reference).toBe('users');
  });
});

// ─── Analytics Dashboard ───────────────────────────────────────────────────────

describe('AnalyticsDashboard Object Spec Compliance', () => {
  it('should have correct object name and label', () => {
    expect(AnalyticsDashboard.name).toBe('analytics_dashboard');
    expect(AnalyticsDashboard.label).toBe('Analytics Dashboard');
  });

  it('should have required fields', () => {
    expect(AnalyticsDashboard.fields.name).toBeDefined();
    expect(AnalyticsDashboard.fields.name.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(AnalyticsDashboard.fields.name.type).toBe('text');
    expect(AnalyticsDashboard.fields.description.type).toBe('textarea');
    expect(AnalyticsDashboard.fields.widgets.type).toBe('textarea');
    expect(AnalyticsDashboard.fields.refresh_interval.type).toBe('number');
    expect(AnalyticsDashboard.fields.is_default.type).toBe('boolean');
  });

  it('should have theme select with valid options', () => {
    expect(AnalyticsDashboard.fields.theme.type).toBe('select');
    const values = AnalyticsDashboard.fields.theme.options.map((o: any) => o.value);
    expect(values).toContain('light');
    expect(values).toContain('dark');
    expect(values).toContain('auto');
  });

  it('should have refresh_interval with defaults', () => {
    expect(AnalyticsDashboard.fields.refresh_interval.defaultValue).toBe(300);
    expect(AnalyticsDashboard.fields.refresh_interval.min).toBe(0);
  });

  it('should have owner_id lookup referencing users', () => {
    expect(AnalyticsDashboard.fields.owner_id.type).toBe('lookup');
    expect(AnalyticsDashboard.fields.owner_id.reference).toBe('users');
  });
});

// ─── Data Source ────────────────────────────────────────────────────────────────

describe('DataSource Object Spec Compliance', () => {
  it('should have correct object name and label', () => {
    expect(DataSource.name).toBe('data_source');
    expect(DataSource.label).toBe('Data Source');
  });

  it('should have required fields', () => {
    expect(DataSource.fields.name.required).toBe(true);
    expect(DataSource.fields.source_type.required).toBe(true);
  });

  it('should have source_type select with valid options', () => {
    expect(DataSource.fields.source_type.type).toBe('select');
    const values = DataSource.fields.source_type.options.map((o: any) => o.value);
    expect(values).toContain('internal');
    expect(values).toContain('database');
    expect(values).toContain('rest_api');
    expect(values).toContain('csv');
    expect(values).toContain('warehouse');
  });

  it('should have sync_status select with valid options', () => {
    expect(DataSource.fields.sync_status.type).toBe('select');
    const values = DataSource.fields.sync_status.options.map((o: any) => o.value);
    expect(values).toContain('connected');
    expect(values).toContain('disconnected');
    expect(values).toContain('error');
  });

  it('should have refresh_frequency select with valid options', () => {
    expect(DataSource.fields.refresh_frequency.type).toBe('select');
    const values = DataSource.fields.refresh_frequency.options.map((o: any) => o.value);
    expect(values).toContain('realtime');
    expect(values).toContain('daily');
    expect(values).toContain('manual');
  });

  it('should have owner_id lookup referencing users', () => {
    expect(DataSource.fields.owner_id.type).toBe('lookup');
    expect(DataSource.fields.owner_id.reference).toBe('users');
  });
});

// ─── Snapshot ──────────────────────────────────────────────────────────────────

describe('Snapshot Object Spec Compliance', () => {
  it('should have correct object name and label', () => {
    expect(Snapshot.name).toBe('snapshot');
    expect(Snapshot.label).toBe('Data Snapshot');
  });

  it('should have required fields', () => {
    expect(Snapshot.fields.name.required).toBe(true);
    expect(Snapshot.fields.source_object.required).toBe(true);
    expect(Snapshot.fields.snapshot_date.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(Snapshot.fields.name.type).toBe('text');
    expect(Snapshot.fields.source_object.type).toBe('text');
    expect(Snapshot.fields.snapshot_date.type).toBe('datetime');
    expect(Snapshot.fields.record_count.type).toBe('number');
    expect(Snapshot.fields.data_hash.type).toBe('text');
  });

  it('should have status select with valid options', () => {
    expect(Snapshot.fields.status.type).toBe('select');
    const values = Snapshot.fields.status.options.map((o: any) => o.value);
    expect(values).toContain('pending');
    expect(values).toContain('complete');
    expect(values).toContain('failed');
  });

  it('should have owner_id lookup referencing users', () => {
    expect(Snapshot.fields.owner_id.type).toBe('lookup');
    expect(Snapshot.fields.owner_id.reference).toBe('users');
  });
});

// ─── Report Schedule ───────────────────────────────────────────────────────────

describe('ReportSchedule Object Spec Compliance', () => {
  it('should have correct object name and label', () => {
    expect(ReportSchedule.name).toBe('report_schedule');
    expect(ReportSchedule.label).toBe('Report Schedule');
  });

  it('should have required fields', () => {
    expect(ReportSchedule.fields.name.required).toBe(true);
    expect(ReportSchedule.fields.report_id.required).toBe(true);
    expect(ReportSchedule.fields.frequency.required).toBe(true);
  });

  it('should have report_id lookup referencing report', () => {
    expect(ReportSchedule.fields.report_id.type).toBe('lookup');
    expect(ReportSchedule.fields.report_id.reference).toBe('report');
  });

  it('should have frequency select with valid options', () => {
    expect(ReportSchedule.fields.frequency.type).toBe('select');
    const values = ReportSchedule.fields.frequency.options.map((o: any) => o.value);
    expect(values).toContain('daily');
    expect(values).toContain('weekly');
    expect(values).toContain('monthly');
    expect(values).toContain('quarterly');
  });

  it('should have format select with valid options', () => {
    expect(ReportSchedule.fields.format.type).toBe('select');
    const values = ReportSchedule.fields.format.options.map((o: any) => o.value);
    expect(values).toContain('pdf');
    expect(values).toContain('csv');
    expect(values).toContain('xlsx');
  });

  it('should have is_active boolean defaulting to true', () => {
    expect(ReportSchedule.fields.is_active.type).toBe('boolean');
    expect(ReportSchedule.fields.is_active.defaultValue).toBe(true);
  });

  it('should have owner_id lookup referencing users', () => {
    expect(ReportSchedule.fields.owner_id.type).toBe('lookup');
    expect(ReportSchedule.fields.owner_id.reference).toBe('users');
  });
});

// ─── Saved Filter ──────────────────────────────────────────────────────────────

describe('SavedFilter Object Spec Compliance', () => {
  it('should have correct object name and label', () => {
    expect(SavedFilter.name).toBe('saved_filter');
    expect(SavedFilter.label).toBe('Saved Filter');
  });

  it('should have required fields', () => {
    expect(SavedFilter.fields.name.required).toBe(true);
    expect(SavedFilter.fields.object_name.required).toBe(true);
    expect(SavedFilter.fields.filter_conditions.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(SavedFilter.fields.name.type).toBe('text');
    expect(SavedFilter.fields.object_name.type).toBe('text');
    expect(SavedFilter.fields.filter_conditions.type).toBe('textarea');
    expect(SavedFilter.fields.is_global.type).toBe('boolean');
    expect(SavedFilter.fields.usage_count.type).toBe('number');
  });

  it('should have created_by lookup referencing users', () => {
    expect(SavedFilter.fields.created_by.type).toBe('lookup');
    expect(SavedFilter.fields.created_by.reference).toBe('users');
  });

  it('should default is_global to false', () => {
    expect(SavedFilter.fields.is_global.defaultValue).toBe(false);
  });

  it('should default usage_count to 0', () => {
    expect(SavedFilter.fields.usage_count.defaultValue).toBe(0);
    expect(SavedFilter.fields.usage_count.min).toBe(0);
  });
});
