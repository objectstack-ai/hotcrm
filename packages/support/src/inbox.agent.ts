import { Agent } from '@objectstack/spec/ai';

/**
 * Inbox Agent
 * Automatically categorizes incoming emails and drafts intelligent replies for Support Cases.
 * Part of Phase 2: Deep Intelligence.
 */
export const InboxAgent = Agent.create({
  name: 'inbox_agent',
  role: 'Support Inbox AI Agent',
  description: 'Automatically categorizes incoming emails, routes them to the correct queue, and drafts context-aware replies for Support Cases',

  systemPrompt: `You are an expert customer support inbox agent with deep knowledge of case management and customer communication.

Your responsibilities:
1. Automatically categorize incoming emails by type, priority, and product area
2. Route emails to the appropriate support queue based on content analysis
3. Draft professional, empathetic replies for support cases
4. Identify urgent issues that require immediate escalation
5. Extract key information (order numbers, account IDs, error codes) from emails
6. Detect customer sentiment to prioritize responses appropriately

Guidelines:
- Always maintain a professional and empathetic tone
- Extract structured data from unstructured email content
- Prioritize urgent and high-impact issues
- Reference knowledge base articles when applicable
- Never share internal information or system details with customers
- Escalate sensitive issues (legal threats, data breaches) immediately

Tone: Professional, empathetic, solution-oriented.`,

  tools: [
    {
      name: 'categorizeEmail',
      description: 'Analyze and categorize an incoming email based on content, intent, and urgency',
      action: 'email_categorization',
      parameters: {
        email_id: {
          type: 'string',
          required: true,
          description: 'The ID of the incoming email to categorize'
        },
        subject: {
          type: 'string',
          required: true,
          description: 'Email subject line'
        },
        body: {
          type: 'string',
          required: true,
          description: 'Email body content'
        },
        sender: {
          type: 'string',
          required: true,
          description: 'Sender email address'
        }
      },
      returns: {
        category: 'string',
        subcategory: 'string',
        priority: 'string',
        sentiment: 'string',
        confidence: 'number',
        extracted_entities: 'array'
      }
    },

    {
      name: 'draftReply',
      description: 'Generate a context-aware reply draft for a support case email',
      action: 'draft_reply',
      parameters: {
        case_id: {
          type: 'string',
          required: true,
          description: 'The support case ID'
        },
        email_thread: {
          type: 'array',
          required: true,
          description: 'Previous email messages in the thread'
        },
        tone: {
          type: 'string',
          enum: ['empathetic', 'professional', 'urgent', 'apologetic'],
          defaultValue: 'professional'
        }
      },
      returns: {
        subject: 'string',
        body: 'string',
        suggested_articles: 'array',
        confidence: 'number'
      }
    },

    {
      name: 'routeToQueue',
      description: 'Route a case to the most appropriate support queue based on content analysis',
      action: 'intelligent_routing',
      parameters: {
        case_id: {
          type: 'string',
          required: true
        },
        category: {
          type: 'string',
          required: true
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical']
        }
      },
      returns: {
        queue_id: 'string',
        queue_name: 'string',
        assigned_agent: 'string',
        routing_reason: 'string'
      }
    },

    {
      name: 'detectEscalation',
      description: 'Detect if an email requires immediate escalation based on content and sentiment',
      action: 'escalation_detection',
      parameters: {
        email_id: {
          type: 'string',
          required: true
        },
        sentiment_score: {
          type: 'number',
          description: 'Sentiment score from -1 (negative) to 1 (positive)'
        }
      },
      returns: {
        requires_escalation: 'boolean',
        escalation_reason: 'string',
        escalation_level: 'string',
        recommended_action: 'string'
      }
    },

    {
      name: 'extractEntities',
      description: 'Extract structured entities from email content (order numbers, account IDs, error codes)',
      action: 'entity_extraction',
      parameters: {
        content: {
          type: 'string',
          required: true
        }
      },
      returns: {
        entities: 'array',
        account_id: 'string',
        order_number: 'string',
        error_codes: 'array',
        product_mentions: 'array'
      }
    },

    {
      name: 'searchKnowledgeBase',
      description: 'Search the knowledge base for relevant articles to include in the reply',
      action: 'knowledge_search',
      parameters: {
        query: {
          type: 'string',
          required: true
        },
        category: {
          type: 'string'
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
    }
  ],

  model: {
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.3,
    maxTokens: 2000,
    topP: 1.0
  },

  memory: {
    type: 'conversational',
    maxMessages: 20,
    summaryThreshold: 15,
    persistAcrossSessions: true
  },

  safety: {
    enableContentFilter: true,
    allowedDomains: ['support', 'customer_data', 'knowledge_base'],
    restrictedActions: [
      'delete_case',
      'close_case_without_resolution',
      'share_internal_notes',
      'modify_sla',
      'access_billing'
    ],
    requireApprovalFor: [
      'send_reply',
      'escalate_to_manager',
      'issue_refund'
    ]
  },

  capabilities: {
    canAccessCases: true,
    canReadEmails: true,
    canDraftReplies: true,
    canRouteToQueue: true,
    canSendReplies: false,
    canSearchKnowledgeBase: true
  },

  examples: [
    {
      user: 'New email from customer about billing issue',
      assistant: '[Using categorizeEmail tool]\n\nEmail categorized:\n- **Category**: Billing\n- **Priority**: Medium\n- **Sentiment**: Frustrated (-0.4)\n\n[Using searchKnowledgeBase tool]\n\nFound 2 relevant articles about billing disputes.\n\n[Using draftReply tool]\n\nDraft reply generated with empathetic tone acknowledging the billing concern, referencing their account history, and providing resolution steps.\n\nWould you like me to send this reply or would you prefer to review it first?'
    },
    {
      user: 'Urgent email about service outage affecting production',
      assistant: '[Using categorizeEmail tool]\n\n⚠️ **CRITICAL** - Service outage detected\n- **Category**: Technical / Outage\n- **Priority**: Critical\n- **Sentiment**: Very Negative (-0.9)\n\n[Using detectEscalation tool]\n\n🚨 Immediate escalation required. Routing to Tier 3 support.\n\n[Using draftReply tool]\n\nUrgent acknowledgment drafted confirming we are aware and investigating. Includes estimated response time and direct support line.'
    }
  ],

  monitoring: {
    trackUsage: true,
    trackLatency: true,
    trackAccuracy: true,
    feedbackLoop: true
  }
});

export default InboxAgent;
