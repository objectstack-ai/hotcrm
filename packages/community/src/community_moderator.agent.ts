// Agent definition for @objectstack/spec/ai

/**
 * Community Moderator Agent
 * Handles content moderation, spam detection, and engagement analysis.
 * Part of Phase 13D-8: Community Cloud.
 */
export const CommunityModeratorAgent = {
  name: 'community_moderator',
  label: 'Community Moderator',
  role: 'Community Moderator',
  description: 'AI-powered community moderator that handles content moderation, spam detection, engagement analysis, topic suggestions, and sentiment assessment',

  instructions: `You are an expert community moderator with deep expertise in content moderation, spam detection, and community engagement analysis.

Your responsibilities:
1. Review and moderate community content for policy violations
2. Detect spam, abuse, and low-quality content patterns
3. Analyze community engagement metrics and trends
4. Suggest trending topics and content strategies
5. Assess sentiment across community discussions
6. Recommend actions to improve community health and participation

Guidelines:
- Apply moderation policies consistently and fairly
- Prioritize user safety and community standards
- Provide clear reasoning for moderation decisions
- Identify patterns of abuse or manipulation
- Balance free expression with community guidelines
- Escalate sensitive cases to human moderators

Tone: Fair, consistent, and community-focused.`,

  tools: [
    {
      type: 'action',
      name: 'moderateContent',
      description: 'Review and moderate community content for policy violations',
      action: 'content_moderation',
      parameters: {
        content_id: {
          type: 'string',
          required: true,
          description: 'The content ID to moderate'
        },
        content_type: {
          type: 'string',
          enum: ['topic', 'reply', 'idea', 'comment'],
          required: true,
          description: 'Type of content being moderated'
        }
      },
      returns: {
        verdict: 'string',
        confidence: 'number',
        violations: 'array',
        recommended_action: 'string',
        reasoning: 'string'
      }
    },

    {
      type: 'action',
      name: 'detectSpam',
      description: 'Detect spam, abuse, and low-quality content patterns',
      action: 'spam_detection',
      parameters: {
        content_id: {
          type: 'string',
          required: true,
          description: 'The content ID to analyze for spam'
        },
        include_user_history: {
          type: 'boolean',
          defaultValue: true,
          description: 'Whether to include user posting history in analysis'
        }
      },
      returns: {
        is_spam: 'boolean',
        spam_score: 'number',
        spam_indicators: 'array',
        user_risk_level: 'string',
        recommended_action: 'string'
      }
    },

    {
      type: 'action',
      name: 'analyzeEngagement',
      description: 'Analyze community engagement metrics and identify trends',
      action: 'engagement_analysis',
      parameters: {
        period: {
          type: 'string',
          enum: ['7d', '30d', '90d', '365d'],
          defaultValue: '30d',
          description: 'Analysis period'
        },
        category: {
          type: 'string',
          required: false,
          description: 'Optional category filter'
        }
      },
      returns: {
        engagement_score: 'number',
        active_users: 'number',
        trending_topics: 'array',
        engagement_trend: 'string',
        recommendations: 'array'
      }
    },

    {
      type: 'action',
      name: 'suggestTopics',
      description: 'Suggest trending topics and content strategies for the community',
      action: 'topic_suggestions',
      parameters: {
        category: {
          type: 'string',
          required: false,
          description: 'Category to generate suggestions for'
        },
        max_suggestions: {
          type: 'number',
          defaultValue: 5,
          description: 'Maximum number of suggestions'
        }
      },
      returns: {
        suggestions: 'array',
        trending_themes: 'array',
        content_gaps: 'array',
        engagement_potential: 'number'
      }
    },

    {
      type: 'action',
      name: 'assessSentiment',
      description: 'Assess sentiment across community discussions and content',
      action: 'sentiment_assessment',
      parameters: {
        scope: {
          type: 'string',
          enum: ['topic', 'category', 'community'],
          defaultValue: 'community',
          description: 'Scope of sentiment analysis'
        },
        target_id: {
          type: 'string',
          required: false,
          description: 'Target ID for topic or category scope'
        }
      },
      returns: {
        overall_sentiment: 'string',
        sentiment_score: 'number',
        positive_themes: 'array',
        negative_themes: 'array',
        sentiment_trend: 'string'
      }
    }
  ],

  model: {
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.3,
    maxTokens: 1500,
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
    allowedDomains: ['community', 'content_moderation', 'user_management'],
    restrictedActions: [
      'ban_user',
      'delete_all_content',
      'access_private_messages'
    ],
    requireApprovalFor: [
      'remove_content',
      'warn_user',
      'restrict_posting'
    ]
  },

  capabilities: {
    canModerateContent: true,
    canDetectSpam: true,
    canAnalyzeEngagement: true,
    canSuggestTopics: true,
    canAssessSentiment: true,
    canBanUsers: false,
    canAccessPrivateMessages: false
  },

  examples: [
    {
      user: 'Review the latest flagged posts in the community',
      assistant: '[Using moderateContent tool]\n\n🛡️ **Content Moderation Report**\n- 3 posts flagged for review\n- 1 confirmed policy violation (spam)\n- 2 false positives (legitimate content)\n\n[Using detectSpam tool]\n\n🚫 **Spam Detection:**\n- Post #1247: Spam score 0.92 - Commercial link spam\n- Recommended: Remove content, issue warning to user\n\n✅ **Cleared Posts:**\n- Post #1245: Heated but within guidelines\n- Post #1246: Technical discussion, no violations'
    },
    {
      user: 'How is our community engagement this month?',
      assistant: '[Using analyzeEngagement tool]\n\n📊 **Monthly Engagement Summary**\n- Engagement Score: 7.8/10 (+0.5 from last month)\n- Active Users: 1,245 (↑12%)\n- New Topics: 342 (↑8%)\n\n[Using assessSentiment tool]\n\n💬 **Community Sentiment: Positive (0.72)**\n- Top positive themes: Product updates, community events\n- Areas of concern: Response time on technical questions\n\n[Using suggestTopics tool]\n\n💡 **Recommended Actions:**\n1. Create a weekly technical Q&A thread\n2. Feature top contributors in monthly spotlight\n3. Launch a community challenge around the new feature release'
    }
  ],

  monitoring: {
    trackUsage: true,
    trackLatency: true,
    trackAccuracy: true,
    feedbackLoop: true
  }
};

export default CommunityModeratorAgent;
