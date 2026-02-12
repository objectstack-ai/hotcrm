/**
 * Finance Studio Plugin — Revenue Cloud
 *
 * Provides Studio IDE extensions for the Revenue Cloud package including
 * invoice generation, revenue forecasting, and financial dashboard tools.
 */
import { defineStudioPlugin, StudioPluginManifestSchema } from '@objectstack/spec/studio';

const financeStudioConfig = {
  id: 'hotcrm.finance',
  name: 'hotcrm-finance-studio',
  version: '1.0.0',
  description: 'Studio extensions for Revenue Cloud',
  activationEvents: [
    'onObject:contract',
    'onObject:invoice',
    'onObject:invoice_line',
    'onObject:payment'
  ],
  contributes: {
    sidebarGroups: [
      {
        key: 'finance',
        label: 'Revenue Cloud',
        order: 20,
        metadataTypes: ['object']
      }
    ],
    actions: [
      {
        id: 'generate_invoice',
        label: 'Generate Invoice',
        location: 'toolbar' as const
      },
      {
        id: 'revenue_forecast',
        label: 'Revenue Forecast',
        location: 'commandPalette' as const
      }
    ],
    panels: [
      {
        id: 'revenue_dashboard',
        label: 'Revenue Dashboard',
        location: 'right' as const
      }
    ],
    commands: [
      { id: 'hotcrm.finance.generateInvoice', label: 'Generate Invoice from Contract' },
      { id: 'hotcrm.finance.showRevenueForecast', label: 'Show Revenue Forecast' },
      { id: 'hotcrm.finance.showRevenueDashboard', label: 'Show Revenue Dashboard' }
    ]
  }
};

export const FinanceStudioPlugin = defineStudioPlugin(financeStudioConfig);

export const FinanceStudioManifest = StudioPluginManifestSchema.parse(financeStudioConfig);

export default FinanceStudioPlugin;
