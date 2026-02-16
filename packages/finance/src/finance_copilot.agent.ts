// Agent definition for @objectstack/spec/ai

/**
 * Finance Co-Pilot Agent
 * Provides AR/AP assistance, invoice management, payment tracking, and revenue forecasting.
 * Part of Phase 2: Deep Intelligence.
 */
export const FinanceCoPilotAgent = {
  name: 'finance_copilot',
  role: 'Finance Co-Pilot',
  description: 'Proactive finance intelligence agent that assists with accounts receivable, accounts payable, invoice management, and revenue forecasting',

  systemPrompt: `You are an expert finance co-pilot with deep knowledge of accounts receivable, accounts payable, revenue recognition, and cash flow management.

Your responsibilities:
1. Look up invoice details and payment history for any account
2. Track payment status and identify overdue invoices
3. Analyze AR aging to highlight collection risks
4. Forecast revenue based on pipeline and historical patterns
5. Provide cash position summaries and trend analysis
6. Recommend actions to improve DSO and cash collection

Guidelines:
- Always provide data-backed financial insights with confidence scores
- Prioritize actions by financial impact and urgency
- Consider payment terms, credit limits, and account history
- Flag invoices at risk of becoming overdue
- Comply with ASC 606 and GAAP standards in all recommendations
- Never approve payments or issue credits without human authorization

Tone: Precise, analytical, and action-oriented.`,

  tools: [
    {
      name: 'lookupInvoice',
      description: 'Look up invoice details including line items, payment status, and aging information',
      action: 'invoice_lookup',
      parameters: {
        invoice_id: {
          type: 'string',
          required: true,
          description: 'The invoice ID or invoice number to look up'
        },
        include_line_items: {
          type: 'boolean',
          defaultValue: true,
          description: 'Include line item details'
        }
      },
      returns: {
        invoice: 'object',
        line_items: 'array',
        payment_history: 'array',
        aging_days: 'number',
        balance_due: 'number'
      }
    },

    {
      name: 'trackPayments',
      description: 'Track payment status and history for an account or invoice',
      action: 'payment_tracking',
      parameters: {
        account_id: {
          type: 'string',
          required: true,
          description: 'The account ID to track payments for'
        },
        period: {
          type: 'string',
          enum: ['30d', '60d', '90d', '180d', '1y'],
          defaultValue: '90d',
          description: 'Time period for payment history'
        }
      },
      returns: {
        payments: 'array',
        total_received: 'number',
        total_outstanding: 'number',
        avg_days_to_pay: 'number',
        on_time_rate: 'number'
      }
    },

    {
      name: 'analyzeArAging',
      description: 'Analyze accounts receivable aging by bucket and identify collection risks',
      action: 'ar_aging_analysis',
      parameters: {
        account_id: {
          type: 'string',
          description: 'Optional account ID to filter by specific account'
        },
        group_by: {
          type: 'string',
          enum: ['account', 'aging_bucket', 'sales_rep', 'region'],
          defaultValue: 'aging_bucket',
          description: 'Grouping dimension for the analysis'
        }
      },
      returns: {
        buckets: 'array',
        total_outstanding: 'number',
        dso: 'number',
        at_risk_accounts: 'array',
        collection_recommendations: 'array'
      }
    },

    {
      name: 'forecastRevenue',
      description: 'Forecast revenue based on pipeline, contracts, and historical patterns',
      action: 'revenue_forecast',
      parameters: {
        period: {
          type: 'string',
          enum: ['current_quarter', 'next_quarter', 'current_year', 'next_year'],
          defaultValue: 'current_quarter',
          description: 'Forecast period'
        },
        include_pipeline: {
          type: 'boolean',
          defaultValue: true,
          description: 'Include weighted pipeline in forecast'
        }
      },
      returns: {
        forecast_amount: 'number',
        recognized_revenue: 'number',
        deferred_revenue: 'number',
        pipeline_weighted: 'number',
        confidence: 'number',
        breakdown_by_source: 'array'
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
    allowedDomains: ['finance', 'invoicing', 'payments', 'revenue'],
    restrictedActions: [
      'approve_payment',
      'issue_credit_note',
      'write_off_invoice',
      'modify_payment_terms',
      'override_credit_limit'
    ],
    requireApprovalFor: [
      'send_collection_notice',
      'apply_late_fee',
      'adjust_invoice'
    ]
  },

  capabilities: {
    canAccessInvoices: true,
    canAccessPayments: true,
    canAnalyzeAging: true,
    canForecastRevenue: true,
    canUpdateRecords: false,
    canAccessExternalAPIs: true
  },

  examples: [
    {
      user: 'What is the current AR aging summary?',
      assistant: '[Using analyzeArAging tool]\n\n📊 **AR Aging Summary**\n- Current (0-30 days): $1.2M (45%)\n- 31-60 days: $480K (18%)\n- 61-90 days: $320K (12%)\n- 90+ days: $650K (25%)\n\n**Total Outstanding**: $2.65M\n**DSO**: 47 days (target: 35 days)\n\n⚠️ **At-Risk Accounts:**\n1. Acme Corp - $180K overdue 90+ days\n2. TechStart Inc - $95K overdue 60 days\n\n🎯 **Recommended Actions:**\n1. Escalate Acme Corp to collections team\n2. Schedule follow-up call with TechStart billing contact'
    },
    {
      user: 'Show me the revenue forecast for this quarter',
      assistant: '[Using forecastRevenue tool]\n\n📈 **Q1 Revenue Forecast**\n- Recognized Revenue: $4.2M\n- Deferred Revenue: $1.8M\n- Weighted Pipeline: $2.1M\n- **Total Forecast**: $8.1M (vs $9M target)\n\n📊 **Breakdown by Source:**\n- Existing Contracts: $5.4M (67%)\n- New Business: $1.5M (19%)\n- Renewals: $1.2M (14%)\n\n⚡ **Gap to Target**: $900K — need to accelerate 3 deals in negotiation stage.'
    }
  ],

  monitoring: {
    trackUsage: true,
    trackLatency: true,
    trackAccuracy: true,
    feedbackLoop: true
  }
};

export default FinanceCoPilotAgent;
