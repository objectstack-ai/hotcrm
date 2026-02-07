import { Agent } from '@objectstack/spec/ai';

/**
 * Sales Assistant AI Agent
 * An intelligent AI assistant to help sales reps with lead qualification,
 * opportunity management, and deal intelligence.
 */
export const SalesAssistantAgent = Agent.create({
  name: 'sales_assistant',
  role: 'Sales AI Assistant',
  description: 'Intelligent sales assistant to help reps qualify leads, manage opportunities, and close deals faster',

  // System prompt defines the agent's behavior and personality
  systemPrompt: `You are an expert sales assistant with deep knowledge of CRM and sales processes.

Your responsibilities:
1. Help sales representatives qualify leads efficiently
2. Provide insights on opportunities and suggest next best actions
3. Find similar successful deals for strategy insights
4. Generate personalized emails and outreach content
5. Answer questions about accounts, contacts, and deals

Guidelines:
- Always provide actionable, data-backed insights
- Be concise and professional in your responses
- Focus on helping reps close more deals faster
- When unsure, ask clarifying questions
- Reference specific data points from the CRM when available

Tone: Professional, helpful, and results-oriented.`,

  // Tools the agent can use
  tools: [
    {
      name: 'scoreLeads',
      description: 'Score leads based on fit, intent, and engagement signals',
      action: 'lead_scoring',
      parameters: {
        lead_id: {
          type: 'string',
          required: true,
          description: 'The ID of the lead to score'
        },
        factors: {
          type: 'array',
          items: ['company_size', 'industry', 'engagement', 'budget', 'authority', 'need', 'timeline'],
          description: 'Factors to consider in scoring'
        }
      },
      returns: {
        score: 'number',
        rating: 'string',
        insights: 'array'
      }
    },

    {
      name: 'analyzeOpportunity',
      description: 'Analyze an opportunity and suggest next best actions',
      action: 'opportunity_next_steps',
      parameters: {
        opportunity_id: {
          type: 'string',
          required: true
        }
      },
      returns: {
        win_probability: 'number',
        risk_factors: 'array',
        next_steps: 'array',
        talking_points: 'array'
      }
    },

    {
      name: 'findSimilarDeals',
      description: 'Find similar won deals for strategic insights',
      action: 'deal_intelligence',
      parameters: {
        opportunity_id: {
          type: 'string',
          required: true
        },
        similarity_factors: {
          type: 'array',
          items: ['industry', 'deal_size', 'region', 'product', 'use_case'],
          defaultValue: ['industry', 'deal_size']
        },
        limit: {
          type: 'number',
          defaultValue: 5
        }
      },
      returns: {
        similar_deals: 'array',
        success_patterns: 'array',
        avg_cycle_time: 'number'
      }
    },

    {
      name: 'generateEmail',
      description: 'Generate personalized email templates',
      action: 'email_generation',
      parameters: {
        context: {
          type: 'string',
          required: true,
          description: 'Context or purpose of the email'
        },
        recipient_type: {
          type: 'string',
          enum: ['lead', 'contact', 'decision_maker', 'technical_buyer'],
          required: true
        },
        tone: {
          type: 'string',
          enum: ['professional', 'friendly', 'urgent', 'consultative'],
          defaultValue: 'professional'
        },
        include_case_study: {
          type: 'boolean',
          defaultValue: false
        }
      },
      returns: {
        subject: 'string',
        body: 'string',
        call_to_action: 'string'
      }
    },

    {
      name: 'getAccountInsights',
      description: 'Get comprehensive insights about an account',
      action: 'account_ai',
      parameters: {
        account_id: {
          type: 'string',
          required: true
        },
        include_health_score: {
          type: 'boolean',
          defaultValue: true
        },
        include_churn_risk: {
          type: 'boolean',
          defaultValue: true
        },
        include_upsell_opportunities: {
          type: 'boolean',
          defaultValue: true
        }
      },
      returns: {
        health_score: 'number',
        churn_risk: 'number',
        insights: 'array',
        recommendations: 'array'
      }
    },

    {
      name: 'searchKnowledge',
      description: 'Search the knowledge base for relevant information',
      action: 'knowledge_search',
      parameters: {
        query: {
          type: 'string',
          required: true
        },
        category: {
          type: 'string',
          enum: ['product', 'competitor', 'objection_handling', 'pricing', 'case_studies']
        },
        top_k: {
          type: 'number',
          defaultValue: 3
        }
      },
      returns: {
        articles: 'array',
        summary: 'string'
      }
    },

    {
      name: 'analyzeCompetitor',
      description: 'Get competitive intelligence and positioning',
      action: 'competitor_analysis',
      parameters: {
        competitor_name: {
          type: 'string',
          required: true
        },
        our_product: {
          type: 'string'
        }
      },
      returns: {
        strengths: 'array',
        weaknesses: 'array',
        positioning: 'string',
        battle_cards: 'array'
      }
    }
  ],

  // LLM Configuration
  model: {
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2000,
    topP: 1.0
  },

  // Memory configuration for conversation context
  memory: {
    type: 'conversational',
    maxMessages: 10,
    summaryThreshold: 8,
    persistAcrossSessions: true
  },

  // Safety and security settings
  safety: {
    enableContentFilter: true,
    allowedDomains: ['sales', 'crm', 'customer_data', 'marketing'],
    restrictedActions: [
      'delete_account',
      'delete_opportunity',
      'transfer_ownership_without_approval',
      'modify_pricing',
      'approve_contracts'
    ],
    requireApprovalFor: [
      'send_bulk_emails',
      'update_opportunity_amounts',
      'create_quotes'
    ]
  },

  // Capabilities
  capabilities: {
    canAccessCRM: true,
    canSendEmails: true,
    canCreateTasks: true,
    canUpdateRecords: false,  // Read-only by default
    canAccessExternalAPIs: true
  },

  // Example conversations for training/context
  examples: [
    {
      user: 'Should I pursue this lead from TechCorp?',
      assistant: 'Let me analyze that lead for you. [Using scoreLeads tool]\n\nBased on the analysis:\n- Score: 85/100 (Hot)\n- Industry Fit: Excellent match\n- Company Size: 500 employees, ideal for our Enterprise plan\n- Engagement: Visited pricing page 3x this week\n\nRecommendation: Yes, prioritize this lead. They show strong buying intent. I suggest reaching out within 24 hours with a personalized demo offer.'
    },
    {
      user: 'What should I focus on for the Acme Corp deal?',
      assistant: '[Using analyzeOpportunity tool]\n\nFor Acme Corp ($250K opportunity):\n\n**Win Probability:** 68%\n\n**Top Priorities:**\n1. Schedule technical deep-dive with their IT team\n2. Address security compliance concerns\n3. Provide ROI calculator showing 18-month payback\n\n**Risk Factors:**\n- No engagement from CFO yet\n- Competitor (Competitor X) is also in the mix\n\n**Next Steps:**\nWould you like me to draft an email to their CFO highlighting our TCO advantage?'
    },
    {
      user: 'Generate a follow-up email for my demo yesterday',
      assistant: 'I\'d be happy to help! A few quick questions:\n1. Who was the primary contact in the demo?\n2. What features did they show the most interest in?\n3. What were their main pain points?\n4. Any specific next steps agreed upon?\n\nThis will help me personalize the email effectively.'
    }
  ],

  // Performance monitoring
  monitoring: {
    trackUsage: true,
    trackLatency: true,
    trackAccuracy: true,
    feedbackLoop: true
  }
});

export default SalesAssistantAgent;
