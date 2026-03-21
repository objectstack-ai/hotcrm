import { describe, it, expect } from 'vitest';
import { ViewSchema, ReportSchema, ChartConfigSchema, ActionSchema, WidgetManifestSchema } from '@objectstack/spec/ui';
import { CaseVolumeReport } from '../../../src/case_volume_report.report';
import { CaseKanbanView } from '../../../src/case_kanban.view';
import { CaseResolutionChart } from '../../../src/case_resolution.chart';
import { EscalateCaseAction, MergeCasesAction, CreateKnowledgeArticleAction } from '../../../src/support_actions.action_ui';
import { SlaWidget } from '../../../src/sla_widget.widget';

describe('Support UI Schema Compliance', () => {
  describe('SupportDashboard', () => {
    // SupportDashboard module calls DashboardSchema.parse() at load time.
    // Filters now use MongoDB-style FilterCondition format.
    it('should pass module-level DashboardSchema validation', async () => {
      const mod = await import('../../../src/support.dashboard');
      expect(mod.SupportDashboard).toBeDefined();
    });

    it('should have options.columns on table widgets', async () => {
      const mod = await import('../../../src/support.dashboard');
      const tableWidgets = mod.SupportDashboard.widgets.filter((w: any) => w.type === 'table');
      expect(tableWidgets.length).toBeGreaterThan(0);
      for (const w of tableWidgets) {
        expect(w.options, `table widget "${w.id}" should have options`).toBeDefined();
        expect(w.options.columns, `table widget "${w.id}" should have options.columns`).toBeDefined();
        expect(Array.isArray(w.options.columns)).toBe(true);
        expect(w.options.columns.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Reports', () => {
    it('should validate CaseVolumeReport against ReportSchema', () => {
      expect(CaseVolumeReport).toBeDefined();
      expect(() => ReportSchema.parse(CaseVolumeReport)).not.toThrow();
      expect(CaseVolumeReport.name).toMatch(/^[a-z][a-z0-9_]*$/);
    });
  });

  describe('Advanced Views', () => {
    it('should validate CaseKanbanView against ViewSchema', () => {
      expect(CaseKanbanView).toBeDefined();
      expect(() => ViewSchema.parse(CaseKanbanView)).not.toThrow();
    });
  });

  describe('Charts', () => {
    it('should validate CaseResolutionChart against ChartConfigSchema', () => {
      expect(CaseResolutionChart).toBeDefined();
      expect(() => ChartConfigSchema.parse(CaseResolutionChart)).not.toThrow();
    });
  });

  describe('UI Actions', () => {
    const actions = [
      { name: 'EscalateCaseAction', action: EscalateCaseAction },
      { name: 'MergeCasesAction', action: MergeCasesAction },
      { name: 'CreateKnowledgeArticleAction', action: CreateKnowledgeArticleAction },
    ];

    describe.each(actions)('$name', ({ action }) => {
      it('should be defined', () => {
        expect(action).toBeDefined();
      });

      it('should validate against ActionSchema', () => {
        expect(() => ActionSchema.parse(action)).not.toThrow();
      });

      it('should have snake_case name', () => {
        expect(action.name).toMatch(/^[a-z][a-z0-9_]*$/);
      });
    });
  });

  describe('Widgets', () => {
    it('should validate SlaWidget against WidgetManifestSchema', () => {
      expect(SlaWidget).toBeDefined();
      expect(() => WidgetManifestSchema.parse(SlaWidget)).not.toThrow();
    });
  });
});
