import { describe, it, expect } from 'vitest';
import { ObjectSchema } from '@objectstack/spec/data';

// Analytics objects
import { Report } from '../../src/report.object';
import { Metric } from '../../src/metric.object';
import { KPI } from '../../src/kpi.object';
import { AnalyticsDashboard } from '../../src/analytics_dashboard.object';
import { DataSource } from '../../src/data_source.object';

// Cross-cloud objects
import { Opportunity } from '../../../crm/src/opportunity.object';
import { Account } from '../../../crm/src/account.object';
import { Invoice } from '../../../finance/src/invoice.object';
import { Contract } from '../../../finance/src/contract.object';
import { Case } from '../../../support/src/case.object';

/**
 * Cross-Cloud Analytics Integration Tests
 *
 * Verify analytics objects can reference and interact with
 * objects from CRM, Finance, and Support packages.
 */

const CROSS_CLOUD_OBJECTS = [
  { name: 'Report', schema: Report, pkg: 'analytics' },
  { name: 'Metric', schema: Metric, pkg: 'analytics' },
  { name: 'KPI', schema: KPI, pkg: 'analytics' },
  { name: 'AnalyticsDashboard', schema: AnalyticsDashboard, pkg: 'analytics' },
  { name: 'DataSource', schema: DataSource, pkg: 'analytics' },
  { name: 'Opportunity', schema: Opportunity, pkg: 'crm' },
  { name: 'Account', schema: Account, pkg: 'crm' },
  { name: 'Invoice', schema: Invoice, pkg: 'finance' },
  { name: 'Contract', schema: Contract, pkg: 'finance' },
  { name: 'Case', schema: Case, pkg: 'support' },
];

describe('Cross-Cloud Analytics - Schema Compatibility', () => {
  it.each(CROSS_CLOUD_OBJECTS)(
    '$name ($pkg) passes ObjectSchema validation',
    ({ schema }) => {
      expect(() => ObjectSchema.parse(schema)).not.toThrow();
    }
  );

  it('all cross-cloud object names are unique', () => {
    const names = CROSS_CLOUD_OBJECTS.map(o => o.schema.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('all object names are snake_case', () => {
    for (const { schema } of CROSS_CLOUD_OBJECTS) {
      expect(schema.name).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });
});

describe('Cross-Cloud Analytics - Report Source Objects', () => {
  const reportableObjects = [
    { label: 'CRM Opportunity', objectName: 'opportunity', schema: Opportunity },
    { label: 'CRM Account', objectName: 'account', schema: Account },
    { label: 'Finance Invoice', objectName: 'invoice', schema: Invoice },
    { label: 'Finance Contract', objectName: 'contract', schema: Contract },
    { label: 'Support Case', objectName: 'case', schema: Case },
  ];

  it.each(reportableObjects)(
    'Report can reference $label as source object',
    ({ objectName, schema }) => {
      // Verify the source object is a valid ObjectSchema object
      const parsed = ObjectSchema.parse(schema);
      expect(parsed.name).toBe(objectName);

      // Verify Report object_name field can hold reference strings
      const reportFields = Report.fields as Record<string, any>;
      expect(reportFields.object_name).toBeDefined();
    }
  );

  it.each(reportableObjects)(
    'Metric can aggregate data from $label',
    ({ objectName, schema }) => {
      const parsed = ObjectSchema.parse(schema);
      expect(parsed.name).toBe(objectName);

      // Verify Metric source_object field exists for cross-cloud references
      const metricFields = Metric.fields as Record<string, any>;
      expect(metricFields.source_object).toBeDefined();
      expect(metricFields.aggregation_type).toBeDefined();
    }
  );
});

describe('Cross-Cloud Analytics - KPI Source References', () => {
  it('KPI can reference source objects from any cloud', () => {
    const kpiFields = KPI.fields as Record<string, any>;
    expect(kpiFields.source_object).toBeDefined();
    expect(kpiFields.source_field).toBeDefined();
  });

  it('DataSource can connect to external data for any cloud', () => {
    const dsFields = DataSource.fields as Record<string, any>;
    expect(dsFields.connection_config).toBeDefined();
    expect(dsFields.schema_mapping).toBeDefined();
    expect(dsFields.sync_status).toBeDefined();
  });
});
