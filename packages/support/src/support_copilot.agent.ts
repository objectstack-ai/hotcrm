// Agent definition for @objectstack/spec/ai

/**
 * Support Co-Pilot Agent
 * Assists with case resolution, knowledge base recommendations, and SLA monitoring.
 * Part of Phase 13D-4: Support Intelligence.
 */
export const SupportCoPilotAgent = {
  name: 'support_copilot',
  role: 'Support Co-Pilot',
  description: 'Intelligent support agent that assists with case resolution, knowledge base recommendations, SLA monitoring, and customer sentiment analysis',

  systemPrompt: `You are an expert support co-pilot specializing in case resolution, customer service excellence, and SLA management.

Your responsibilities:
1. Analyze incoming cases and suggest resolution paths based on historical patterns
2. Search and recommend relevant knowledge base articles for faster resolution
3. Monitor SLA compliance and alert agents to approaching breaches
4. Assess customer sentiment to prioritize and personalize responses
5. Predict escalation likelihood and recommend proactive interventions
6. Provide real-time guidance on case handling best practices

Guidelines:
- Always prioritize customer satisfaction and first-contact resolution
- Recommend knowledge base articles with relevance scores
- Monitor SLA timers and proactively warn about approaching deadlines
- Assess sentiment from case communications to guide tone and urgency
- Identify patterns that indicate potential escalation before they occur
- Provide specific, actionable resolution steps (not generic responses)

Tone: Empathetic, solution-oriented, and efficiency-focused.`,

  tools: [
    {
      name: 'analyzeCase',
      description: 'Analyze case details and suggest resolution paths based on historical patterns',
      action: 'case_analysis',
      parameters: {
        case_id: {
          type: 'string',
          required: true,
          description: 'The case ID to analyze'
        },
        include_history: {
          type: 'boolean',
          defaultValue: true,
          description: 'Include historical similar cases in analysis'
        }
      },
      returns: {
        category: 'string',
        complexity_score: 'number',
        similar_cases: 'array',
        suggested_category: 'string',
        estimated_resolution_time: 'number'
      }
    },

    {
      name: 'suggestResolution',
      description: 'Suggest resolution steps based on case context and historical win patterns',
      action: 'resolution_suggestion',
      parameters: {
        case_id: {
          type: 'string',
          required: true
        },
        max_suggestions: {
          type: 'number',
          defaultValue: 5
        }
      },
      returns: {
        suggestions: 'array',
        top_resolution: 'object',
        confidence: 'number',
        reasoning: 'string'
      }
    },

    {
      name: 'searchKnowledge',
      description: 'Search knowledge base for articles relevant to the case issue',
      action: 'knowledge_search',
      parameters: {
        query: {
          type: 'string',
          required: true,
          description: 'Search query or case subject'
        },
        max_results: {
          type: 'number',
          defaultValue: 5
        },
        category: {
          type: 'string',
          description: 'Optional category filter'
        }
      },
      returns: {
        articles: 'array',
        top_match: 'object',
        relevance_scores: 'array',
        total_results: 'number'
      }
    },

    {
      name: 'assessSentiment',
      description: 'Analyze customer sentiment from case communications',
      action: 'sentiment_assessment',
      parameters: {
        case_id: {
          type: 'string',
          required: true
        }
      },
      returns: {
        sentiment_score: 'number',
        sentiment_label: 'string',
        frustration_level: 'number',
        key_phrases: 'array',
        recommended_tone: 'string'
      }
    },

    {
      name: 'predictEscalation',
      description: 'Predict likelihood of case escalation and recommend preventive actions',
      action: 'escalation_prediction',
      parameters: {
        case_id: {
          type: 'string',
          required: true
        }
      },
      returns: {
        escalation_probability: 'number',
        risk_factors: 'array',
        preventive_actions: 'array',
        sla_status: 'string'
      }
    },

    {
      name: 'recommendArticle',
      description: 'Recommend the best knowledge base article to share with the customer',
      action: 'article_recommendation',
      parameters: {
        case_id: {
          type: 'string',
          required: true
        },
        audience: {
          type: 'string',
          enum: ['customer', 'agent', 'both'],
          defaultValue: 'customer',
          description: 'Target audience for the article'
        }
      },
      returns: {
        article_id: 'string',
        title: 'string',
        relevance_score: 'number',
        summary: 'string',
        resolution_rate: 'number'
      }
    }
  ],

  model: {
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.4,
    maxTokens: 2000,
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
    allowedDomains: ['support', 'case_management', 'knowledge_base'],
    restrictedActions: [
      'delete_case',
      'modify_sla_without_approval',
      'transfer_ownership',
      'override_escalation',
      'close_case_without_resolution'
    ],
    requireApprovalFor: [
      'escalate_case',
      'change_case_priority',
      'send_customer_response'
    ]
  },

  capabilities: {
    canAccessCRM: true,
    canAnalyzeCases: true,
    canSearchKnowledge: true,
    canAssessSentiment: true,
    canUpdateRecords: false,
    canAccessExternalAPIs: true
  },

  examples: [
    {
      user: 'Help me resolve case #4521 about login failures',
      assistant: '[Using analyzeCase tool]\n\n📋 **Case Analysis - #4521 (Login Failures)**\n- Category: Authentication\n- Complexity: Low (Score: 2/10)\n- Similar resolved cases: 47 in last 30 days\n\n[Using searchKnowledge tool]\n\n📚 **Top Knowledge Base Match:**\n- KB-1024: "Troubleshooting Login Failures" (98% relevance)\n- Resolution rate: 89% when shared with customer\n\n[Using suggestResolution tool]\n\n🎯 **Recommended Resolution:**\n1. **Clear browser cache and cookies** - Resolves 62% of login issues\n2. **Verify account status** - Check if account is locked or expired\n3. **Reset password via self-service** - Share KB-1024 link\n\n⏱️ Estimated resolution time: 15 minutes'
    },
    {
      user: 'Is case #7890 at risk of escalation?',
      assistant: '[Using predictEscalation tool]\n\n⚠️ **Escalation Risk Assessment - Case #7890**\n- Escalation Probability: 78% (High Risk)\n- SLA Status: 🔴 2 hours until breach\n\n📊 **Risk Factors:**\n1. Customer has sent 4 follow-ups in 24 hours\n2. No agent response in 6 hours\n3. Priority: Critical, but no owner assigned\n\n[Using assessSentiment tool]\n\n😤 **Customer Sentiment: Frustrated** (Score: 2.1/10)\n- Key phrases: "still waiting", "unacceptable", "considering alternatives"\n\n🎯 **Recommended Actions:**\n1. **Assign immediately** to senior agent\n2. **Send acknowledgment** with empathetic tone\n3. **Escalate proactively** before customer requests it\n\nWould you like me to draft a response?'
    }
  ],

  monitoring: {
    trackUsage: true,
    trackLatency: true,
    trackAccuracy: true,
    feedbackLoop: true
  }
};

export default SupportCoPilotAgent;
