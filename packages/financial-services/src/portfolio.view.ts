import type { View } from '@objectstack/spec/ui';
import { ViewSchema } from '@objectstack/spec/ui';

/**
 * Portfolio List Views
 * Views for portfolio performance monitoring and management.
 */

// All Portfolios View
export const AllPortfoliosView = {
  list: {
    type: 'grid' as const,
    name: 'all_portfolios',
    label: 'All Portfolios',
    columns: [
      { field: 'name', width: 200, sortable: true, link: true },
      { field: 'wealth_account', width: 180, sortable: true },
      { field: 'asset_class', width: 140, sortable: true },
      { field: 'market_value', width: 160, sortable: true, align: 'right' as const },
      { field: 'performance_ytd', width: 130, sortable: true, align: 'right' as const },
      { field: 'benchmark', width: 140 },
      { field: 'inception_date', width: 130, sortable: true }
    ],
    sort: [{ field: 'market_value', order: 'desc' as const }],
    bulkActions: ['export'],
    inlineEdit: true,
    pagination: { pageSize: 25, pageSizeOptions: [10, 25, 50, 100] }
  }
} satisfies View;

// By Asset Class View
export const ByAssetClassView = {
  list: {
    type: 'grid' as const,
    name: 'portfolios_by_asset_class',
    label: 'By Asset Class',
    columns: [
      { field: 'asset_class', width: 140, sortable: true },
      { field: 'name', width: 200, link: true },
      { field: 'wealth_account', width: 180 },
      { field: 'market_value', width: 160, align: 'right' as const },
      { field: 'allocation_pct', width: 120, align: 'right' as const },
      { field: 'performance_ytd', width: 130, align: 'right' as const }
    ],
    sort: [{ field: 'asset_class', order: 'asc' as const }]
  }
} satisfies View;

// Top Performers View
export const TopPerformersView = {
  list: {
    type: 'grid' as const,
    name: 'top_performing_portfolios',
    label: 'Top Performers',
    filter: [{ field: 'performance_ytd', operator: '>', value: 0 }],
    columns: [
      { field: 'name', width: 200, link: true },
      { field: 'wealth_account', width: 180 },
      { field: 'performance_ytd', width: 130, sortable: true, align: 'right' as const },
      { field: 'market_value', width: 160, align: 'right' as const },
      { field: 'sharpe_ratio', width: 120, align: 'right' as const },
      { field: 'benchmark_return', width: 130, align: 'right' as const }
    ],
    sort: [{ field: 'performance_ytd', order: 'desc' as const }],
    conditionalFormatting: [
      { condition: { dialect: 'cel', source: 'performance_ytd > 10' }, style: { backgroundColor: '#F0FDF4', borderLeft: '3px solid #22C55E' } }
    ]
  }
} satisfies View;

ViewSchema.parse(AllPortfoliosView);
ViewSchema.parse(ByAssetClassView);
ViewSchema.parse(TopPerformersView);

export const PortfolioListViews = {
  all: AllPortfoliosView,
  byAssetClass: ByAssetClassView,
  topPerformers: TopPerformersView
};

export default PortfolioListViews;
