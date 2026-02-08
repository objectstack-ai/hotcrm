// Agent definition for @objectstack/spec/ai

/**
 * Sales Co-Pilot Agent
 * Suggests next-best-actions based on Opportunity stage and deal velocity.
 * Part of Phase 2: Deep Intelligence.
 */
export const SalesCoPilotAgent = {
  name: 'sales_copilot',
  role: 'Sales Co-Pilot',
  description: 'Proactive sales intelligence agent that suggests next-best-actions based on opportunity stage, deal velocity, and historical win patterns',

  systemPrompt: `You are an elite sales co-pilot with expertise in B2B enterprise sales, pipeline management, and deal strategy.

Your responsibilities:
1. Analyze opportunity stage progression and identify stalled deals
2. Calculate deal velocity and compare against benchmarks
3. Suggest next-best-actions based on current stage and deal context
4. Identify risk signals and recommend mitigation strategies
5. Provide real-time coaching on deal strategy and stakeholder management
6. Forecast close dates based on historical patterns and current momentum

Guidelines:
- Always provide data-backed recommendations with confidence scores
- Prioritize actions by impact and urgency
- Consider the full context: deal size, industry, competition, and stakeholder map
- Suggest specific, actionable steps (not generic advice)
- Flag deals that deviate from successful patterns
- Adapt recommendations to the sales rep's experience level

Tone: Strategic, data-driven, and action-oriented.`,

  tools: [
    {
      name: 'analyzeVelocity',
      description: 'Analyze deal velocity by comparing stage progression against historical benchmarks',
      action: 'deal_velocity_analysis',
      parameters: {
        opportunity_id: {
          type: 'string',
          required: true,
          description: 'The opportunity ID to analyze'
        },
        benchmark_period: {
          type: 'string',
          enum: ['30d', '60d', '90d', '180d'],
          defaultValue: '90d',
          description: 'Historical benchmark period'
        }
      },
      returns: {
        velocity_score: 'number',
        days_in_stage: 'number',
        avg_days_for_stage: 'number',
        velocity_trend: 'string',
        stage_comparison: 'object',
        bottleneck_stages: 'array'
      }
    },

    {
      name: 'suggestNextActions',
      description: 'Suggest next-best-actions based on opportunity stage, context, and win patterns',
      action: 'next_best_actions',
      parameters: {
        opportunity_id: {
          type: 'string',
          required: true
        },
        include_email_drafts: {
          type: 'boolean',
          defaultValue: false
        },
        max_actions: {
          type: 'number',
          defaultValue: 5
        }
      },
      returns: {
        actions: 'array',
        priority_action: 'object',
        success_probability_impact: 'number',
        reasoning: 'string'
      }
    },

    {
      name: 'assessDealRisk',
      description: 'Identify risk signals in a deal and recommend mitigation strategies',
      action: 'deal_risk_assessment',
      parameters: {
        opportunity_id: {
          type: 'string',
          required: true
        }
      },
      returns: {
        risk_score: 'number',
        risk_factors: 'array',
        mitigation_actions: 'array',
        deal_health: 'string'
      }
    },

    {
      name: 'forecastCloseDate',
      description: 'Predict realistic close date based on deal velocity and historical patterns',
      action: 'close_date_forecast',
      parameters: {
        opportunity_id: {
          type: 'string',
          required: true
        }
      },
      returns: {
        predicted_close_date: 'string',
        confidence: 'number',
        factors: 'array',
        range: 'object'
      }
    },

    {
      name: 'getStakeholderMap',
      description: 'Analyze stakeholder engagement and identify missing personas',
      action: 'stakeholder_analysis',
      parameters: {
        opportunity_id: {
          type: 'string',
          required: true
        }
      },
      returns: {
        stakeholders: 'array',
        missing_personas: 'array',
        engagement_score: 'number',
        champion_status: 'string'
      }
    },

    {
      name: 'compareWinPatterns',
      description: 'Compare current deal against historically won deals for strategic insights',
      action: 'win_pattern_analysis',
      parameters: {
        opportunity_id: {
          type: 'string',
          required: true
        },
        similarity_factors: {
          type: 'array',
          items: ['deal_size', 'industry', 'stage', 'product', 'region'],
          defaultValue: ['deal_size', 'industry']
        }
      },
      returns: {
        similar_won_deals: 'array',
        success_patterns: 'array',
        deviation_warnings: 'array',
        recommended_playbook: 'string'
      }
    },

    {
      name: 'analyzePipeline',
      description: 'Provide pipeline-level insights including at-risk deals and forecast accuracy',
      action: 'pipeline_intelligence',
      parameters: {
        owner_id: {
          type: 'string',
          required: true,
          description: 'Sales rep ID for pipeline analysis'
        },
        period: {
          type: 'string',
          enum: ['current_quarter', 'next_quarter', 'current_month'],
          defaultValue: 'current_quarter'
        }
      },
      returns: {
        pipeline_value: 'number',
        weighted_forecast: 'number',
        at_risk_deals: 'array',
        stalled_deals: 'array',
        top_opportunities: 'array',
        coverage_ratio: 'number'
      }
    }
  ],

  model: {
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.5,
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
    allowedDomains: ['sales', 'crm', 'customer_data', 'pipeline'],
    restrictedActions: [
      'delete_opportunity',
      'modify_pricing_without_approval',
      'transfer_ownership',
      'override_forecast',
      'approve_discounts'
    ],
    requireApprovalFor: [
      'update_close_date',
      'change_opportunity_stage',
      'send_proposal'
    ]
  },

  capabilities: {
    canAccessCRM: true,
    canAnalyzePipeline: true,
    canSuggestActions: true,
    canForecast: true,
    canUpdateRecords: false,
    canAccessExternalAPIs: true
  },

  examples: [
    {
      user: 'What should I focus on for the Acme Corp $500K deal?',
      assistant: '[Using analyzeVelocity tool]\n\n📊 **Deal Velocity Analysis - Acme Corp ($500K)**\n- Current Stage: Negotiation (Day 18 of avg 12)\n- Velocity: 🔴 Below benchmark (67% of normal pace)\n\n[Using suggestNextActions tool]\n\n🎯 **Top 3 Priority Actions:**\n1. **Schedule executive alignment call** - CFO hasn\'t been engaged yet. Deals this size close 2.3x faster with CFO buy-in by this stage.\n2. **Send ROI business case** - Similar won deals all had ROI documentation shared before negotiation.\n3. **Address security concerns** - Technical evaluation flagged 2 open items.\n\n⚡ **Impact**: Completing action #1 could improve win probability from 45% to 68%.'
    },
    {
      user: 'Show me my pipeline health for this quarter',
      assistant: '[Using analyzePipeline tool]\n\n📈 **Q1 Pipeline Summary**\n- Total Pipeline: $2.4M\n- Weighted Forecast: $1.1M (vs $1.5M target)\n- Coverage Ratio: 1.6x (need 3x)\n\n⚠️ **Attention Required:**\n- 3 deals stalled 15+ days (total $680K)\n- 2 deals at risk of slipping to Q2\n\n🏆 **Top Opportunities to Accelerate:**\n1. TechStart Inc ($350K) - 78% win probability, needs proposal\n2. Global Systems ($280K) - Champion confirmed, demo scheduled\n\nWould you like me to suggest specific actions for any of these deals?'
    }
  ],

  monitoring: {
    trackUsage: true,
    trackLatency: true,
    trackAccuracy: true,
    feedbackLoop: true
  }
};

export default SalesCoPilotAgent;
