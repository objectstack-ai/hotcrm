import type { ChartConfig } from '@objectstack/spec/ui';
import { ChartConfigSchema } from '@objectstack/spec/ui';

/**
 * Post Activity Trend Chart
 * Daily post and reply activity over time
 */
export const PostActivityChart = {
  type: 'line' as const,
  title: 'Post Activity Trend',
  subtitle: 'Daily post and reply activity',
  description: 'Line chart showing daily new topics, replies, and ideas activity trends',
  xAxis: { field: 'date', title: 'Date', showGridLines: false, logarithmic: false },
  yAxis: [{ field: 'count', title: 'Activity Count', showGridLines: true, logarithmic: false }],
  series: [
    { name: 'new_topics', label: 'New Topics', color: '#3B82F6', yAxis: 'left' as const },
    { name: 'replies', label: 'Replies', color: '#22C55E', yAxis: 'left' as const },
    { name: 'ideas', label: 'Ideas', color: '#8B5CF6', yAxis: 'left' as const }
  ],
  height: 350,
  showLegend: true,
  showDataLabels: false
} satisfies ChartConfig;

ChartConfigSchema.parse(PostActivityChart);

export default PostActivityChart;
