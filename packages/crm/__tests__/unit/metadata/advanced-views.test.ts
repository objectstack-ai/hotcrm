import { describe, it, expect } from 'vitest';
import { ViewSchema } from '@objectstack/spec/ui';
import { OpportunityKanbanView } from '../../../src/opportunity_kanban.view';
import { ActivityCalendarView } from '../../../src/activity_calendar.view';
import { RecruitmentKanbanView } from '../../../../hr/src/recruitment_kanban.view';
import { CaseKanbanView } from '../../../../support/src/case_kanban.view';
import { CampaignTimelineView } from '../../../../marketing/src/campaign_timeline.view';
import { QuoteGanttView } from '../../../../products/src/quote_gantt.view';

describe('Phase 10.5A Advanced Views Metadata Compliance', () => {
  const views = [
    { name: 'OpportunityKanbanView', view: OpportunityKanbanView, expectedType: 'kanban' },
    { name: 'ActivityCalendarView', view: ActivityCalendarView, expectedType: 'calendar' },
    { name: 'RecruitmentKanbanView', view: RecruitmentKanbanView, expectedType: 'kanban' },
    { name: 'CaseKanbanView', view: CaseKanbanView, expectedType: 'kanban' },
    { name: 'CampaignTimelineView', view: CampaignTimelineView, expectedType: 'timeline' },
    { name: 'QuoteGanttView', view: QuoteGanttView, expectedType: 'gantt' },
  ];

  it('should have exactly 6 advanced view definitions', () => {
    expect(views.length).toBe(6);
  });

  describe.each(views)('$name', ({ view, expectedType }) => {
    it('should be defined', () => {
      expect(view).toBeDefined();
    });

    it('should validate against ViewSchema', () => {
      expect(() => ViewSchema.parse(view)).not.toThrow();
    });

    it('should have a snake_case list name', () => {
      expect(view.list.name).toMatch(/^[a-z][a-z0-9_]*$/);
    });

    it(`should be of type "${expectedType}"`, () => {
      expect(view.list.type).toBe(expectedType);
    });

    it('should have columns defined', () => {
      expect(Array.isArray(view.list.columns)).toBe(true);
      expect(view.list.columns.length).toBeGreaterThan(0);
    });

    it(`should have ${expectedType} configuration`, () => {
      expect(view.list[expectedType as keyof typeof view.list]).toBeDefined();
    });
  });

  it('view names are unique across clouds', () => {
    const names = views.map((v) => v.view.list.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
