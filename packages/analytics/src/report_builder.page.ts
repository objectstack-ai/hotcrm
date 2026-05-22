import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Report Builder Page Layout
 * Application page for building and previewing analytics reports.
 */
export const ReportBuilderPage = {
  name: 'report_builder',
  type: 'app' as const,
  kind: 'full' as const,
  label: 'Report Builder',
  template: 'default',
  isDefault: false,

  regions: [
    {
      name: 'header',
      components: [
        {
          type: 'page:header' as const,
          properties: {}
        }
      ]
    },
    {
      name: 'builder',
      components: [
        {
          type: 'page:card' as const,
          label: 'Report Configuration',
          properties: {}
        }
      ]
    },
    {
      name: 'preview',
      components: [
        {
          type: 'page:card' as const,
          label: 'Report Preview',
          properties: {}
        }
      ]
    },
    {
      name: 'actions',
      components: [
        {
          type: 'page:card' as const,
          label: 'Save & Share',
          properties: {}
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(ReportBuilderPage);

export default ReportBuilderPage;
