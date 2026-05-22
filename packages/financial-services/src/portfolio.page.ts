import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Portfolio Detail Page Layout
 * Comprehensive portfolio view with holdings, performance, allocation, and transactions.
 */
export const PortfolioPage = {
  name: 'portfolio_detail',
  object: 'portfolio',
  type: 'record' as const,
  kind: 'full' as const,
  label: 'Portfolio Detail',
  template: 'record_detail',
  isDefault: true,
  assignedProfiles: ['wealth_advisor', 'portfolio_manager', 'compliance_officer', 'admin'],

  regions: [
    {
      name: 'header',
      components: [
        {
          type: 'record:highlights' as const,
          properties: {
            fields: ['name', 'wealth_account', 'market_value', 'performance_ytd', 'asset_class']
          }
        }
      ]
    },
    {
      name: 'tabs',
      components: [
        {
          type: 'page:tabs' as const,
          properties: {
            tabs: ['holdings', 'performance', 'allocation', 'transactions']
          }
        }
      ]
    },
    {
      name: 'holdings',
      components: [
        {
          type: 'record:details' as const,
          label: 'Portfolio Summary',
          properties: {
            fields: [
              'name', 'wealth_account', 'asset_class', 'benchmark',
              'market_value', 'cost_basis', 'unrealized_gain_loss', 'inception_date'
            ],
            columns: 2
          }
        },
        {
          type: 'record:related_list' as const,
          label: 'Current Holdings',
          properties: {
            object: 'financial_product',
            columns: ['name', 'ticker', 'quantity', 'market_price', 'market_value', 'weight_pct'],
            sort: [{ field: 'market_value', direction: 'desc' }],
            actions: ['new', 'edit']
          }
        }
      ]
    },
    {
      name: 'performance',
      components: [
        {
          type: 'record:details' as const,
          label: 'Performance Metrics',
          properties: {
            fields: [
              'performance_ytd', 'performance_1y', 'performance_3y', 'performance_5y',
              'sharpe_ratio', 'volatility', 'max_drawdown', 'benchmark_return'
            ],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'allocation',
      components: [
        {
          type: 'record:details' as const,
          label: 'Asset Allocation',
          properties: {
            fields: [
              'equity_pct', 'fixed_income_pct', 'alternatives_pct', 'cash_pct',
              'target_equity_pct', 'target_fixed_income_pct', 'target_alternatives_pct', 'target_cash_pct'
            ],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'transactions',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Transaction History',
          properties: {
            object: 'transaction_record',
            columns: ['transaction_date', 'type', 'security_name', 'quantity', 'price', 'amount'],
            sort: [{ field: 'transaction_date', direction: 'desc' }],
            actions: ['new', 'edit']
          }
        }
      ]
    },
    {
      name: 'ai_assistant',
      components: [
        {
          type: 'ai:chat_window' as const,
          label: 'Portfolio Intelligence',
          properties: {
            mode: 'sidebar'
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(PortfolioPage);

export default PortfolioPage;
