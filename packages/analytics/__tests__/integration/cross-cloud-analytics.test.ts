import { describe, it, expect } from 'vitest';

// Analytics objects
import { Report } from '../../src/report.object';
import { KPI } from '../../src/kpi.object';
import { Metric } from '../../src/metric.object';
import { AnalyticsDashboard } from '../../src/analytics_dashboard.object';
import { DataSource } from '../../src/data_source.object';

// CRM objects
import { Account } from '../../../crm/src/account.object';
import { Opportunity } from '../../../crm/src/opportunity.object';

// Finance objects
import { Invoice } from '../../../finance/src/invoice.object';
import { Contract } from '../../../finance/src/contract.object';

// Support objects
import { Case } from '../../../support/src/case.object';

// ─── Cross-Cloud Report References ────────────────────────────────────────────

describe('Cross-Cloud Analytics - Report References', () => {
  it('should allow Report source to be CRM objects', () => {
    // Reports can target any object via object_name text field
    expect(Report.fields.object_name).toBeDefined();
    expect(Report.fields.object_name.type).toBe('text');

    // CRM objects exist and have valid names for reporting
    expect(Account.name).toBe('account');
    expect(Opportunity.name).toBe('opportunity');
  });

  it('should allow Report source to be Finance objects', () => {
    expect(Invoice.name).toBe('invoice');
    expect(Contract.name).toBe('contract');
    // These names can be used as Report.object_name values
  });

  it('should allow Report source to be Support objects', () => {
    expect(Case.name).toBe('case');
  });

  it('should have report_type options suitable for cross-cloud reporting', () => {
    const types = Report.fields.report_type.options.map((o: any) => o.value);
    // Summary and matrix types enable cross-object analysis
    expect(types).toContain('summary');
    expect(types).toContain('matrix');
    expect(types).toContain('joined');
  });
});

// ─── Cross-Cloud KPI References ────────────────────────────────────────────────

describe('Cross-Cloud Analytics - KPI Targets', () => {
  it('should allow KPIs to target CRM metrics via source_object', () => {
    expect(KPI.fields.source_object).toBeDefined();
    expect(KPI.fields.source_object.type).toBe('text');
    // Can hold CRM object names like 'opportunity'
    expect(KPI.fields.source_field).toBeDefined();
  });

  it('should have metric_type options covering cross-cloud use cases', () => {
    const types = KPI.fields.metric_type.options.map((o: any) => o.value);
    expect(types).toContain('currency');    // Finance KPIs
    expect(types).toContain('number');      // Support case counts
    expect(types).toContain('percentage');  // CRM win rates
    expect(types).toContain('duration');    // Support SLA times
  });

  it('should have period options for varied cloud reporting cadences', () => {
    const periods = KPI.fields.period.options.map((o: any) => o.value);
    expect(periods).toContain('daily');     // Support daily metrics
    expect(periods).toContain('monthly');   // Finance monthly close
    expect(periods).toContain('quarterly'); // CRM quarterly reviews
  });
});

// ─── Cross-Cloud Metric References ─────────────────────────────────────────────

describe('Cross-Cloud Analytics - Metric Sources', () => {
  it('should allow Metric to reference any cloud object as source', () => {
    expect(Metric.fields.source_object).toBeDefined();
    expect(Metric.fields.source_object.type).toBe('text');
    expect(Metric.fields.source_object.required).toBe(true);
  });

  it('should have aggregation types applicable across clouds', () => {
    const types = Metric.fields.aggregation_type.options.map((o: any) => o.value);
    expect(types).toContain('sum');    // Finance totals
    expect(types).toContain('avg');    // CRM averages
    expect(types).toContain('count');  // Support case counts
    expect(types).toContain('min');    // SLA minimums
    expect(types).toContain('max');    // Revenue maximums
    expect(types).toContain('median'); // Statistical analysis
  });

  it('should support time grains for all cloud reporting periods', () => {
    const grains = Metric.fields.time_grain.options.map((o: any) => o.value);
    expect(grains).toContain('hourly');    // Support real-time
    expect(grains).toContain('daily');     // Operations
    expect(grains).toContain('monthly');   // Finance
    expect(grains).toContain('quarterly'); // Executive
  });
});

// ─── Cross-Cloud Dashboard Composition ─────────────────────────────────────────

describe('Cross-Cloud Analytics - Dashboard Composition', () => {
  it('should support widget configuration for multi-cloud views', () => {
    expect(AnalyticsDashboard.fields.widgets).toBeDefined();
    expect(AnalyticsDashboard.fields.widgets.type).toBe('textarea');
    // Widgets JSON can reference reports/KPIs from any cloud
  });

  it('should support layout config for complex dashboards', () => {
    expect(AnalyticsDashboard.fields.layout_config).toBeDefined();
    expect(AnalyticsDashboard.fields.layout_config.type).toBe('textarea');
  });

  it('should support auto-refresh for real-time cross-cloud data', () => {
    expect(AnalyticsDashboard.fields.refresh_interval).toBeDefined();
    expect(AnalyticsDashboard.fields.refresh_interval.type).toBe('number');
    expect(AnalyticsDashboard.fields.refresh_interval.min).toBe(0);
  });
});

// ─── Data Source Cross-Cloud Connectivity ──────────────────────────────────────

describe('Cross-Cloud Analytics - Data Source Connectivity', () => {
  it('should support internal objects as data sources', () => {
    const sourceTypes = DataSource.fields.source_type.options.map((o: any) => o.value);
    expect(sourceTypes).toContain('internal');
  });

  it('should support external data sources for cross-system analytics', () => {
    const sourceTypes = DataSource.fields.source_type.options.map((o: any) => o.value);
    expect(sourceTypes).toContain('database');
    expect(sourceTypes).toContain('rest_api');
    expect(sourceTypes).toContain('warehouse');
  });

  it('should track sync status for cross-cloud data freshness', () => {
    const statuses = DataSource.fields.sync_status.options.map((o: any) => o.value);
    expect(statuses).toContain('connected');
    expect(statuses).toContain('syncing');
    expect(statuses).toContain('error');
  });
});
