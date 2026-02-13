import type { View } from '@objectstack/spec/ui';
import { ViewSchema } from '@objectstack/spec/ui';

/**
 * Campaign Timeline View
 * Timeline view for campaign schedules
 */
export const CampaignTimelineView = {
  list: {
    name: 'campaign_timeline',
    label: 'Campaign Timeline',
    type: 'timeline' as const,
    columns: [
      { field: 'name', width: 250, link: true },
      { field: 'type', width: 120 },
      { field: 'status', width: 120 },
      { field: 'start_date', width: 130 },
      { field: 'end_date', width: 130 },
      { field: 'budgeted_cost', width: 150, align: 'right' as const }
    ],
    timeline: {
      startDateField: 'start_date',
      endDateField: 'end_date',
      titleField: 'name',
      groupByField: 'type',
      colorField: 'status',
      scale: 'month' as const
    }
  }
} satisfies View;

ViewSchema.parse(CampaignTimelineView);

export default CampaignTimelineView;
