// Agent definition for @objectstack/spec/ai

/**
 * Analytics Co-Pilot Agent
 * Natural language data queries, insight generation, and anomaly detection.
 * Part of Phase 13D-6: Analytics Cloud.
 */
export const AnalyticsCoPilotAgent = {
  name: 'analytics_copilot',
  label: 'Analytics Co-Pilot',
  role: 'Analytics Co-Pilot',
  description: 'Intelligent analytics agent that enables natural language data queries, automated insight generation, anomaly detection, and visualization recommendations',

  instructions: `You are an expert analytics co-pilot specializing in data analysis, business intelligence, and data visualization.

Your responsibilities:
1. Translate natural language questions into data queries across CRM objects
2. Generate actionable insights from query results and trend analysis
3. Detect anomalies and outliers in metrics, KPIs, and business data
4. Recommend optimal visualizations for different data types and questions
5. Explain complex metrics and calculations in plain language
6. Proactively surface important data trends and patterns

Guidelines:
- Always validate data context before generating insights
- Provide confidence levels for anomaly detection results
- Suggest follow-up questions to deepen analysis
- Use appropriate chart types based on data characteristics
- Explain statistical methods used in plain language
- Respect data access permissions and security boundaries

Tone: Analytical, precise, and insightful.`,

  tools: [
    {
      type: 'action',
      name: 'queryData',
      description: 'Execute a natural language query against CRM data objects',
      action: 'analytics_query',
      parameters: {
        query: {
          type: 'string',
          required: true,
          description: 'Natural language data query'
        },
        object_name: {
          type: 'string',
          required: false,
          description: 'Target object to query'
        },
        time_range: {
          type: 'string',
          enum: ['7d', '30d', '90d', '365d', 'all'],
          defaultValue: '30d',
          description: 'Time range for the query'
        }
      },
      returns: {
        results: 'array',
        total_records: 'number',
        query_time_ms: 'number',
        sql_equivalent: 'string'
      }
    },

    {
      type: 'action',
      name: 'generateInsight',
      description: 'Generate actionable insights from data patterns and trends',
      action: 'analytics_insight',
      parameters: {
        dataset: {
          type: 'string',
          required: true,
          description: 'Dataset or report to analyze'
        },
        insight_type: {
          type: 'string',
          enum: ['trend', 'comparison', 'correlation', 'forecast'],
          defaultValue: 'trend',
          description: 'Type of insight to generate'
        }
      },
      returns: {
        insights: 'array',
        confidence: 'number',
        supporting_data: 'object',
        recommendations: 'array'
      }
    },

    {
      type: 'action',
      name: 'detectAnomaly',
      description: 'Detect anomalies and outliers in metrics and KPI data',
      action: 'analytics_anomaly_detection',
      parameters: {
        metric_name: {
          type: 'string',
          required: true,
          description: 'Metric or KPI to analyze for anomalies'
        },
        sensitivity: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          defaultValue: 'medium',
          description: 'Anomaly detection sensitivity'
        }
      },
      returns: {
        anomalies: 'array',
        severity: 'string',
        baseline: 'object',
        deviation_score: 'number'
      }
    },

    {
      type: 'action',
      name: 'buildVisualization',
      description: 'Recommend and build optimal visualization for a given dataset',
      action: 'analytics_build_visualization',
      parameters: {
        data_source: {
          type: 'string',
          required: true,
          description: 'Data source or query results to visualize'
        },
        chart_preference: {
          type: 'string',
          enum: ['bar', 'line', 'pie', 'scatter', 'heatmap', 'auto'],
          defaultValue: 'auto',
          description: 'Preferred chart type or auto-detect'
        }
      },
      returns: {
        chart_config: 'object',
        chart_type: 'string',
        reasoning: 'string',
        alternatives: 'array'
      }
    },

    {
      type: 'action',
      name: 'explainMetric',
      description: 'Explain a metric or KPI definition, calculation, and context in plain language',
      action: 'analytics_explain_metric',
      parameters: {
        metric_name: {
          type: 'string',
          required: true,
          description: 'Name of the metric or KPI to explain'
        }
      },
      returns: {
        definition: 'string',
        calculation: 'string',
        context: 'string',
        related_metrics: 'array'
      }
    }
  ],

  model: {
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.3,
    maxTokens: 2500,
    topP: 1.0
  },

  memory: {
    type: 'conversational',
    maxMessages: 15,
    summaryThreshold: 12,
    persistAcrossSessions: true
  },

  safety: {
    enableContentFilter: true,
    allowedDomains: ['analytics', 'reporting', 'data_visualization'],
    restrictedActions: [
      'delete_report',
      'modify_data_source',
      'export_raw_data'
    ],
    requireApprovalFor: [
      'schedule_report',
      'share_dashboard',
      'create_data_source'
    ]
  },

  capabilities: {
    canQueryData: true,
    canGenerateInsights: true,
    canDetectAnomalies: true,
    canBuildVisualizations: true,
    canExplainMetrics: true,
    canUpdateRecords: false,
    canAccessExternalAPIs: false
  },

  examples: [
    {
      user: 'What were our top 5 accounts by revenue last quarter?',
      assistant: '[Using queryData tool]\n\n📊 **Top 5 Accounts by Revenue (Last Quarter)**\n\n| Rank | Account | Revenue |\n|------|---------|----------|\n| 1 | Acme Corp | $1.2M |\n| 2 | TechStart Inc | $890K |\n| 3 | Global Systems | $750K |\n| 4 | Pinnacle Ltd | $620K |\n| 5 | Summit Partners | $580K |\n\n💡 **Insight**: Top 5 accounts represent 68% of total quarterly revenue. Acme Corp grew 23% QoQ.\n\nWould you like me to analyze trends or drill into any specific account?'
    },
    {
      user: 'Are there any anomalies in our case volume this month?',
      assistant: '[Using detectAnomaly tool]\n\n🔴 **Anomaly Detected: Case Volume Spike**\n- Current month: 847 cases (vs 520 avg)\n- Deviation: +63% above baseline\n- Severity: High\n\n📈 **Root Cause Analysis:**\n- 72% of spike attributed to "Billing" category\n- Correlated with product release on Mar 15\n- Similar pattern observed in previous release cycles\n\n🎯 **Recommendation**: Investigate billing-related cases post-release. Consider proactive communication for next release.\n\nWould you like me to build a visualization of the trend?'
    }
  ],

  monitoring: {
    trackUsage: true,
    trackLatency: true,
    trackAccuracy: true,
    feedbackLoop: true
  }
};

export default AnalyticsCoPilotAgent;
