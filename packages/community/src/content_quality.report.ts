import type { Report } from '@objectstack/spec/ui';
import { ReportSchema } from '@objectstack/spec/ui';

/**
 * Content Quality Report
 * Content quality analysis by author with post counts, quality scores, and helpful votes
 */
export const ContentQualityReport = {
  name: 'content_quality_report',
  label: 'Content Quality Report',
  description: 'Content quality analysis by author with post counts, quality scores, and helpful vote metrics',
  objectName: 'topic',
  type: 'summary' as const,
  columns: [
    { field: 'author_name', label: 'Author' },
    { field: 'topic_id', label: 'Posts', aggregate: 'count' as const },
    { field: 'quality_score', label: 'Avg Quality', aggregate: 'avg' as const },
    { field: 'helpful_votes', label: 'Helpful Votes', aggregate: 'sum' as const }
  ],
  groupingsDown: [
    { field: 'author_name', sortOrder: 'asc' as const }
  ],
  chart: {
    type: 'bar' as const,
    title: 'Content Quality by Author',
    xAxis: 'author_name',
    yAxis: 'quality_score',
    showLegend: true,
    showDataLabels: false
  }
} satisfies Report;

ReportSchema.parse(ContentQualityReport);

export default ContentQualityReport;
