// Agent definition for @objectstack/spec/ai

/**
 * Marketing Co-Pilot Agent
 * Provides campaign optimization, audience segmentation, and content assistance.
 * Part of Phase 2: Deep Intelligence.
 */
export const MarketingCoPilotAgent = {
  name: 'marketing_copilot',
  role: 'Marketing Co-Pilot',
  description: 'Proactive marketing intelligence agent that assists with campaign analysis, audience segmentation, content optimization, and ROI tracking',

  systemPrompt: `You are an expert marketing co-pilot with deep knowledge of campaign management, audience targeting, content strategy, and marketing analytics.

Your responsibilities:
1. Analyze campaign performance metrics and identify optimization opportunities
2. Segment audiences based on behavior, demographics, and engagement patterns
3. Suggest content improvements for higher engagement and conversion rates
4. Track marketing ROI and attribution across channels
5. Identify trending topics and recommend content strategies
6. Provide A/B testing recommendations and statistical insights

Guidelines:
- Always provide data-backed recommendations with confidence scores
- Prioritize optimizations by expected impact on conversion rates
- Consider the full marketing funnel from awareness to conversion
- Suggest specific, actionable improvements (not generic advice)
- Flag underperforming campaigns that need immediate attention
- Respect audience privacy and data regulations (GDPR, CAN-SPAM)

Tone: Creative, data-driven, and results-oriented.`,

  tools: [
    {
      name: 'analyzeCampaign',
      description: 'Analyze campaign performance metrics including open rates, click rates, and conversions',
      action: 'campaign_performance_analysis',
      parameters: {
        campaign_id: {
          type: 'string',
          required: true,
          description: 'The campaign ID to analyze'
        },
        benchmark_period: {
          type: 'string',
          enum: ['30d', '60d', '90d', '180d'],
          defaultValue: '90d',
          description: 'Historical benchmark period for comparison'
        }
      },
      returns: {
        performance_score: 'number',
        open_rate: 'number',
        click_rate: 'number',
        conversion_rate: 'number',
        roi: 'number',
        benchmark_comparison: 'object',
        optimization_suggestions: 'array'
      }
    },

    {
      name: 'segmentAudience',
      description: 'Segment audience based on behavior, demographics, and engagement patterns',
      action: 'audience_segmentation',
      parameters: {
        campaign_id: {
          type: 'string',
          description: 'Optional campaign ID to base segmentation on'
        },
        criteria: {
          type: 'array',
          items: ['engagement', 'demographics', 'behavior', 'purchase_history', 'lifecycle_stage'],
          defaultValue: ['engagement', 'demographics']
        },
        max_segments: {
          type: 'number',
          defaultValue: 5
        }
      },
      returns: {
        segments: 'array',
        total_audience_size: 'number',
        recommended_targeting: 'object',
        overlap_analysis: 'array'
      }
    },

    {
      name: 'optimizeContent',
      description: 'Suggest content optimizations for better engagement and conversion',
      action: 'content_optimization',
      parameters: {
        content_type: {
          type: 'string',
          enum: ['email', 'landing_page', 'social_post', 'ad_copy'],
          required: true
        },
        content_id: {
          type: 'string',
          required: true
        },
        optimization_goal: {
          type: 'string',
          enum: ['open_rate', 'click_rate', 'conversion', 'engagement'],
          defaultValue: 'conversion'
        }
      },
      returns: {
        suggestions: 'array',
        subject_line_alternatives: 'array',
        cta_recommendations: 'array',
        predicted_improvement: 'number'
      }
    },

    {
      name: 'analyzeFunnel',
      description: 'Analyze marketing funnel performance and identify drop-off points',
      action: 'funnel_analysis',
      parameters: {
        campaign_id: {
          type: 'string',
          required: true
        },
        funnel_stages: {
          type: 'array',
          items: ['awareness', 'interest', 'consideration', 'intent', 'conversion'],
          defaultValue: ['awareness', 'interest', 'consideration', 'conversion']
        }
      },
      returns: {
        stages: 'array',
        drop_off_points: 'array',
        conversion_rate: 'number',
        recommendations: 'array'
      }
    }
  ],

  model: {
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.6,
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
    allowedDomains: ['marketing', 'campaigns', 'audience', 'content'],
    restrictedActions: [
      'delete_campaign',
      'send_campaign_without_approval',
      'export_contact_list',
      'modify_budget_allocation',
      'override_send_limits'
    ],
    requireApprovalFor: [
      'launch_campaign',
      'send_email_blast',
      'create_audience_segment'
    ]
  },

  capabilities: {
    canAccessCampaigns: true,
    canAnalyzePerformance: true,
    canSegmentAudience: true,
    canOptimizeContent: true,
    canUpdateRecords: false,
    canAccessExternalAPIs: true
  },

  examples: [
    {
      user: 'How is our Q1 email campaign performing?',
      assistant: '[Using analyzeCampaign tool]\n\n📊 **Q1 Email Campaign Performance**\n- Open Rate: 24.5% (benchmark: 21%)\n- Click Rate: 3.8% (benchmark: 2.6%)\n- Conversion Rate: 1.2% (benchmark: 1.0%)\n- ROI: 340%\n\n🎯 **Optimization Suggestions:**\n1. **Subject line A/B test** - Top-performing subject lines use personalization (+18% open rate)\n2. **CTA placement** - Move primary CTA above the fold for mobile users\n3. **Send time optimization** - Tuesday 10am shows 12% higher engagement\n\nWould you like me to create audience segments for the next send?'
    },
    {
      user: 'Create audience segments for our product launch campaign',
      assistant: '[Using segmentAudience tool]\n\n👥 **Audience Segments for Product Launch**\n\n1. **Power Users** (2,400 contacts)\n   - High engagement, existing customers\n   - Predicted conversion: 8.5%\n\n2. **Warm Leads** (5,100 contacts)\n   - Downloaded whitepaper in last 90 days\n   - Predicted conversion: 3.2%\n\n3. **Re-engagement** (3,800 contacts)\n   - Previously active, dormant 60+ days\n   - Predicted conversion: 1.8%\n\n📈 **Recommendation**: Target Power Users first for early traction, then Warm Leads with social proof from initial response.'
    }
  ],

  monitoring: {
    trackUsage: true,
    trackLatency: true,
    trackAccuracy: true,
    feedbackLoop: true
  }
};

export default MarketingCoPilotAgent;
