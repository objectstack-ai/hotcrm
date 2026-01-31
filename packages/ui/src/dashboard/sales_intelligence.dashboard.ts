/**
 * AI-Powered Sales Intelligence Dashboard
 * 
 * A comprehensive dashboard providing AI-driven insights for sales leaders.
 * 
 * Components:
 * 1. Deal Health Heatmap - Color-coded risk visualization with drill-down
 * 2. Pipeline Forecast with AI - AI vs Sales Rep forecasts with confidence intervals
 * 3. Top Opportunities to Focus On - Ranked by win probability × deal size × time
 * 4. Team Performance Analytics - Win rates, sales cycles, coaching recommendations
 * 5. AI Alerts & Nudges - Proactive notifications for risks and opportunities
 * 
 * Note: This dashboard uses @objectstack/spec v0.6.1 Dashboard schema.
 * Advanced features like drill-down, custom formulas, and AI insights are configured
 * via the options field and implemented in the UI rendering layer.
 */

import type { Dashboard } from '@objectstack/spec/ui';

const SalesIntelligenceDashboard: Dashboard = {
  name: 'sales_intelligence_dashboard',
  label: 'AI Sales Intelligence Dashboard',
  description: 'AI-powered sales insights and forecasting for data-driven decision making',

  widgets: [
    // ========================================================================
    // 1. DEAL HEALTH HEATMAP
    // ========================================================================
    {
      title: '🩺 Deal Health Heatmap',
      type: 'heatmap',
      object: 'Opportunity',
      filter: {
        $and: [
          { Stage: { $nin: ['Closed Won', 'Closed Lost'] } },
          { Amount: { $gt: 0 } }
        ]
      },
      categoryField: 'Stage',
      valueField: 'Amount',
      aggregate: 'sum',
      layout: { x: 0, y: 0, w: 12, h: 4 },
      options: {
        description: 'Color-coded deal risk analysis with AI-powered health scores',
        colorScheme: {
          low: '#10b981',     // Green - Low risk
          medium: '#f59e0b',  // Amber - Medium risk  
          high: '#f97316',    // Orange - High risk
          critical: '#ef4444' // Red - Critical risk
        },
        // Advanced features configured for UI layer
        drillDown: {
          enabled: true,
          target: 'opportunity_detail'
        },
        tooltip: {
          enabled: true,
          fields: ['Name', 'Amount', 'Stage', 'Probability', 'DaysOpen']
        },
        riskCalculation: {
          // AI risk scoring logic implemented in UI rendering
          factors: ['stagnation', 'timeline', 'aiVariance'],
          thresholds: [25, 50, 75]
        }
      }
    },

    // ========================================================================
    // 2. PIPELINE FORECAST WITH AI - Total Pipeline
    // ========================================================================
    {
      title: '🤖 AI Pipeline Forecast - Total Pipeline',
      type: 'bar',
      object: 'Opportunity',
      filter: {
        $and: [
          { Stage: { $nin: ['Closed Won', 'Closed Lost'] } },
          { CloseDate: { $gte: '$quarterStart', $lte: '$quarterEnd' } }
        ]
      },
      categoryField: 'ForecastCategory',
      valueField: 'Amount',
      aggregate: 'sum',
      layout: { x: 0, y: 4, w: 4, h: 4 },
      options: {
        description: 'Total pipeline value by forecast category',
        color: '#94a3b8',
        orientation: 'vertical',
        yAxisLabel: 'Revenue ($)',
        xAxisLabel: 'Forecast Category',
        format: 'currency'
      }
    },

    // ========================================================================
    // 2b. AI FORECAST COMPARISON - Metric Cards
    // ========================================================================
    {
      title: 'Sales Rep Forecast',
      type: 'metric',
      object: 'Opportunity',
      filter: {
        $and: [
          { Stage: { $nin: ['Closed Won', 'Closed Lost'] } },
          { CloseDate: { $gte: '$quarterStart', $lte: '$quarterEnd' } }
        ]
      },
      valueField: 'Amount',
      aggregate: 'sum',
      layout: { x: 4, y: 4, w: 2, h: 2 },
      options: {
        description: 'Weighted by sales rep probability',
        color: '#3b82f6',
        icon: 'user',
        format: 'currency',
        calculation: 'weightedByProbability'
      }
    },

    {
      title: 'AI-Adjusted Forecast',
      type: 'metric',
      object: 'Opportunity',
      filter: {
        $and: [
          { Stage: { $nin: ['Closed Won', 'Closed Lost'] } },
          { CloseDate: { $gte: '$quarterStart', $lte: '$quarterEnd' } }
        ]
      },
      valueField: 'Amount',
      aggregate: 'sum',
      layout: { x: 6, y: 4, w: 2, h: 2 },
      options: {
        description: 'Weighted by AI probability',
        color: '#8b5cf6',
        icon: 'sparkles',
        format: 'currency',
        calculation: 'weightedByAIProbability',
        confidenceInterval: {
          lower: 0.85,
          upper: 1.15
        }
      }
    },

    {
      title: 'AI Forecast Accuracy',
      type: 'metric',
      object: 'Opportunity',
      filter: { Stage: 'Closed Won' },
      valueField: 'AIProbability',
      aggregate: 'avg',
      layout: { x: 4, y: 6, w: 2, h: 2 },
      options: {
        description: 'Historical accuracy vs actual closed deals',
        value: '92%',
        trend: '+5%',
        trendDirection: 'up',
        color: '#10b981',
        icon: 'chart-bar'
      }
    },

    {
      title: 'Forecast Variance',
      type: 'metric',
      object: 'Opportunity',
      filter: {
        $and: [
          { Stage: { $nin: ['Closed Won', 'Closed Lost'] } },
          { CloseDate: { $gte: '$quarterStart', $lte: '$quarterEnd' } }
        ]
      },
      valueField: 'Amount',
      aggregate: 'sum',
      layout: { x: 6, y: 6, w: 2, h: 2 },
      options: {
        description: 'AI adjustment from rep estimates',
        format: 'currency',
        calculation: 'aiVariance',
        showTrend: true,
        color: '#f59e0b',
        icon: 'adjustments'
      }
    },

    // ========================================================================
    // 3. TOP OPPORTUNITIES TO FOCUS ON
    // ========================================================================
    {
      title: '🎯 Top Opportunities to Focus On',
      type: 'table',
      object: 'Opportunity',
      filter: {
        $and: [
          { Stage: { $nin: ['Closed Won', 'Closed Lost'] } },
          { Amount: { $gt: 10000 } }
        ]
      },
      categoryField: 'Name',
      valueField: 'Amount',
      aggregate: 'sum',
      layout: { x: 8, y: 4, w: 4, h: 8 },
      options: {
        description: 'Ranked by AI Priority Score: Win Probability × Deal Size × Urgency',
        columns: [
          {
            field: 'Name',
            label: 'Opportunity',
            type: 'link',
            width: 200
          },
          {
            field: 'Amount',
            label: 'Value',
            type: 'currency',
            width: 100
          },
          {
            field: 'AIProbability',
            label: 'AI Win %',
            type: 'progress',
            width: 100,
            fallback: 'Probability'
          },
          {
            field: 'CloseDate',
            label: 'Close Date',
            type: 'date',
            width: 100
          },
          {
            field: 'Stage',
            label: 'Stage',
            type: 'badge',
            width: 120
          }
        ],
        sorting: {
          field: 'PriorityScore',
          direction: 'desc'
        },
        priorityScoreCalculation: {
          // AI Priority Score: winProb × dealSize × urgency × activityBonus
          formula: '(AIProbability || Probability) * Amount * urgency * activityBonus',
          factors: ['winProbability', 'dealSize', 'urgency', 'recentActivity']
        },
        rowActions: ['view', 'aiInsights', 'logActivity'],
        limit: 20
      }
    },

    // ========================================================================
    // 4. TEAM PERFORMANCE ANALYTICS - Win Rate
    // ========================================================================
    {
      title: '👥 Team Win Rates',
      type: 'bar',
      object: 'Opportunity',
      filter: { CreatedDate: { $gte: '$quarterStart' } },
      categoryField: 'OwnerId',
      valueField: 'Id',
      aggregate: 'count',
      layout: { x: 0, y: 8, w: 4, h: 4 },
      options: {
        description: 'Win rates by sales rep',
        orientation: 'horizontal',
        color: '#3b82f6',
        showBenchmark: true,
        benchmarkValue: 35,
        benchmarkLabel: 'Target Win Rate',
        calculation: 'winRate',
        sorting: 'desc'
      }
    },

    // ========================================================================
    // 4b. TEAM PERFORMANCE - Revenue
    // ========================================================================
    {
      title: '💰 Team Revenue',
      type: 'bar',
      object: 'Opportunity',
      filter: {
        $and: [
          { CreatedDate: { $gte: '$quarterStart' } },
          { Stage: 'Closed Won' }
        ]
      },
      categoryField: 'OwnerId',
      valueField: 'Amount',
      aggregate: 'sum',
      layout: { x: 4, y: 8, w: 4, h: 4 },
      options: {
        description: 'Revenue by sales rep',
        orientation: 'horizontal',
        color: '#10b981',
        format: 'currency',
        sorting: 'desc',
        showTrend: true
      }
    },

    // ========================================================================
    // 5. AI ALERTS & NUDGES - At-Risk Deals
    // ========================================================================
    {
      title: '🚨 At-Risk Deals',
      type: 'table',
      object: 'Opportunity',
      filter: {
        $and: [
          { Stage: { $nin: ['Closed Won', 'Closed Lost'] } },
          {
            $or: [
              { DaysOpen: { $gt: 60 } },
              { LastActivityDate: { $lt: '$7daysAgo' } },
              { CloseDate: { $lt: '$7daysFromNow' } }
            ]
          }
        ]
      },
      categoryField: 'Name',
      valueField: 'Amount',
      aggregate: 'count',
      layout: { x: 0, y: 12, w: 6, h: 5 },
      options: {
        description: 'Proactive AI notifications for deal risks',
        itemTemplate: {
          title: '{Name}',
          subtitle: '{AccountName}',
          metadata: ['Amount', 'Stage', 'DaysOpen'],
          badge: 'RiskLevel',
          icon: 'exclamation-triangle'
        },
        riskTypes: ['stagnation', 'timeline', 'aiVariance', 'competitive'],
        actions: ['viewDeal', 'aiRecommendations', 'dismiss'],
        groupBy: 'RiskLevel',
        sorting: 'RiskScore desc',
        limit: 20
      }
    },

    // ========================================================================
    // 5b. AI OPPORTUNITIES
    // ========================================================================
    {
      title: '✨ AI-Identified Opportunities',
      type: 'table',
      object: 'Opportunity',
      filter: {
        $and: [
          { Stage: { $nin: ['Closed Won', 'Closed Lost'] } },
          { AIProbability: { $gt: 70 } },
          { Amount: { $gt: 50000 } }
        ]
      },
      categoryField: 'Name',
      valueField: 'Amount',
      aggregate: 'count',
      layout: { x: 6, y: 12, w: 6, h: 5 },
      options: {
        description: 'High-value opportunities with strong win probability',
        itemTemplate: {
          title: '{Name}',
          subtitle: '{AccountName}',
          metadata: ['Amount', 'AIProbability', 'CloseDate'],
          badge: 'Stage',
          icon: 'sparkles'
        },
        aiSuggestions: {
          enabled: true,
          types: ['nextBestAction', 'closeStrategy', 'stakeholderEngagement']
        },
        actions: ['viewDeal', 'acceptSuggestion', 'scheduleCall'],
        sorting: 'AIProbability desc',
        limit: 15
      }
    },

    // ========================================================================
    // QUICK STATS - Quarter Revenue
    // ========================================================================
    {
      title: 'Quarter Revenue',
      type: 'metric',
      object: 'Opportunity',
      filter: {
        $and: [
          { CreatedDate: { $gte: '$quarterStart', $lte: '$quarterEnd' } },
          { Stage: 'Closed Won' }
        ]
      },
      valueField: 'Amount',
      aggregate: 'sum',
      layout: { x: 0, y: 17, w: 2, h: 2 },
      options: {
        color: '#10b981',
        icon: 'currency-dollar',
        format: 'currency',
        showProgress: true,
        target: '$quota'
      }
    },

    {
      title: 'Deals Closed',
      type: 'metric',
      object: 'Opportunity',
      filter: {
        $and: [
          { CreatedDate: { $gte: '$quarterStart', $lte: '$quarterEnd' } },
          { Stage: 'Closed Won' }
        ]
      },
      valueField: 'Id',
      aggregate: 'count',
      layout: { x: 2, y: 17, w: 2, h: 2 },
      options: {
        color: '#3b82f6',
        icon: 'check-circle',
        format: 'number',
        showTrend: true,
        trendComparison: 'previousQuarter'
      }
    },

    {
      title: 'Active Pipeline',
      type: 'metric',
      object: 'Opportunity',
      filter: {
        Stage: { $nin: ['Closed Won', 'Closed Lost'] }
      },
      valueField: 'Amount',
      aggregate: 'sum',
      layout: { x: 4, y: 17, w: 2, h: 2 },
      options: {
        color: '#8b5cf6',
        icon: 'funnel',
        format: 'currency'
      }
    },

    {
      title: 'Avg Deal Size',
      type: 'metric',
      object: 'Opportunity',
      filter: {
        $and: [
          { CreatedDate: { $gte: '$quarterStart', $lte: '$quarterEnd' } },
          { Stage: 'Closed Won' }
        ]
      },
      valueField: 'Amount',
      aggregate: 'avg',
      layout: { x: 6, y: 17, w: 2, h: 2 },
      options: {
        color: '#6366f1',
        icon: 'scale',
        format: 'currency'
      }
    },

    {
      title: 'Win Rate',
      type: 'gauge',
      object: 'Opportunity',
      filter: {
        CreatedDate: { $gte: '$quarterStart', $lte: '$quarterEnd' }
      },
      valueField: 'Id',
      aggregate: 'count',
      layout: { x: 8, y: 17, w: 2, h: 2 },
      options: {
        color: '#10b981',
        min: 0,
        max: 100,
        target: 35,
        calculation: 'winRatePercent',
        format: 'percent'
      }
    },

    {
      title: 'High-Risk Deals',
      type: 'metric',
      object: 'Opportunity',
      filter: {
        $and: [
          { Stage: { $nin: ['Closed Won', 'Closed Lost'] } },
          { DaysOpen: { $gt: 45 } }
        ]
      },
      valueField: 'Id',
      aggregate: 'count',
      layout: { x: 10, y: 17, w: 2, h: 2 },
      options: {
        color: '#ef4444',
        icon: 'exclamation-triangle',
        format: 'number',
        alert: true,
        threshold: 10
      }
    }
  ]
};

export default SalesIntelligenceDashboard;
