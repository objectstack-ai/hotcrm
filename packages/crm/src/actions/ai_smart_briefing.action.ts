// Constants
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * AI Smart Briefing Action
 * 
 * This ObjectStack Action provides AI-powered customer insights.
 * 
 * Functionality:
 * - Analyzes recent customer activities
 * - Reviews email communications
 * - Considers industry context
 * - Generates personalized recommendations
 * 
 * Output:
 * - 200-word executive summary
 * - Next-step recommendations
 * - Industry-specific sales talking points
 */

import { broker } from '../db';

export interface SmartBriefingRequest {
  /** Account ID to analyze */
  accountId: string;
  
  /** Number of recent activities to analyze (default: 10) */
  activityLimit?: number;
}

export interface SmartBriefingResponse {
  /** AI-generated executive summary */
  summary: string;
  
  /** Recommended next steps */
  nextSteps: string[];
  
  /** Industry-specific talking points */
  talkingPoints: string[];
  
  /** Customer sentiment analysis */
  sentiment: 'positive' | 'neutral' | 'negative';
  
  /** Engagement score (0-100) */
  engagementScore: number;
  
  /** Metadata about the analysis */
  metadata: {
    activitiesAnalyzed: number;
    emailsAnalyzed: number;
    lastActivityDate: string;
    generatedAt: string;
  };
}

/**
 * System Prompt for LLM
 * 
 * This prompt is carefully designed to:
 * 1. Establish the AI's role as a sales intelligence assistant
 * 2. Provide context about the customer and industry
 * 3. Request specific, actionable outputs
 * 4. Ensure personalization based on industry
 */
function buildSystemPrompt(account: any, activities: any[], emails: any[], opportunities: any[] = []): string {
  return `
You are an expert sales intelligence assistant for a world-class CRM system. Your role is to analyze customer data and provide actionable insights to sales professionals.

# Customer Context

**Company:** ${account.Name}
**Industry:** ${account.Industry || 'unknown'}
**Annual Revenue:** ${account.AnnualRevenue ? `$${account.AnnualRevenue.toLocaleString()}` : 'unknown'}
**Customer Status:** ${account.CustomerStatus || 'unknown'}
**Rating:** ${account.Rating || 'unknown'}
**Health Score:** ${account.HealthScore || 'unknown'}
**SLA Tier:** ${account.SLATier || 'unknown'}

# Active Opportunities

${opportunities.length > 0 ? opportunities.map((opp, i) => `
${i + 1}. **${opp.Name}**
   Stage: ${opp.Stage}
   Amount: $${opp.Amount?.toLocaleString() || 'TBD'}
   Close Date: ${opp.CloseDate}
   Probability: ${opp.Probability}%
`).join('\n') : 'No active opportunities'}

# Recent Activities (Last ${activities.length} interactions)

${activities.map((activity, i) => `
${i + 1}. **${activity.Type}** - ${activity.Subject}
   Date: ${activity.ActivityDate}
   Status: ${activity.Status}
   Notes: ${activity.Description || 'No notes'}
`).join('\n')}

# Email Communications (Last ${emails.length} emails)

${emails.map((email, i) => `
${i + 1}. **${email.Subject}**
   Date: ${email.SentDate}
   Direction: ${email.Direction}
   Summary: ${email.Body ? email.Body.substring(0, 200) + '...' : 'No content'}
`).join('\n')}

# Your Task

Generate a comprehensive sales briefing with the following components:

1. **Executive Summary** (200 words max)
   - Current relationship status
   - Key concerns or interests identified
   - Overall health of the relationship
   - Critical context the sales rep should know

2. **Recommended Next Steps** (3-5 specific actions)
   - Prioritized list of what to do next
   - Time-sensitive actions should be highlighted
   - Include specific talking points or materials to prepare

3. **Industry-Specific Sales Talking Points** (3-5 points)
   - Customize based on the ${account.Industry} industry
   - Address common pain points in this industry
   - Highlight relevant product features/benefits
   - Use industry terminology and best practices

4. **Sentiment & Engagement Analysis**
   - Overall sentiment: positive/neutral/negative
   - Engagement level (0-100 score)
   - Justification for the assessment

# Output Format

Provide your response in JSON format:

{
  "summary": "...",
  "nextSteps": ["...", "...", "..."],
  "talkingPoints": ["...", "...", "..."],
  "sentiment": "positive|neutral|negative",
  "engagementScore": 0-100,
  "reasoning": "Brief explanation of your assessment"
}

# Guidelines

- Be specific and actionable
- Focus on recent patterns and trends
- Prioritize customer needs over product features
- Use professional but conversational tone
- Highlight time-sensitive opportunities or risks
- Consider industry-specific context
`.trim();
}

/**
 * Industry-specific sales insights
 */
const INDUSTRY_INSIGHTS: Record<string, { painPoints: string[]; opportunities: string[] }> = {
  Technology: {
    painPoints: [
      'Technical debt and system modernization needs',
      'Rapid scaling and performance optimization challenges',
      'Data security and compliance requirements',
      'Talent acquisition and team collaboration efficiency'
    ],
    opportunities: [
      'Emphasize cloud-native architecture and scalability',
      'Highlight API-first design and integration capabilities',
      'Showcase security and compliance certifications',
      'Provide technical training and ongoing support'
    ]
  },
  Finance: {
    painPoints: [
      'Regulatory compliance and risk management',
      'Data security and privacy protection',
      'System integration and legacy system modernization',
      'Customer experience and digital transformation'
    ],
    opportunities: [
      'Emphasize financial-grade security and compliance',
      'Showcase audit trail and data governance capabilities',
      'Provide seamless integration solutions',
      'Highlight mobile-first and modern UI'
    ]
  },
  Healthcare: {
    painPoints: [
      'HIPAA compliance and patient privacy',
      'System interoperability and data exchange',
      'Operational efficiency and cost control',
      'Patient experience and satisfaction'
    ],
    opportunities: [
      'Emphasize healthcare industry compliance',
      'Showcase HL7/FHIR integration capabilities',
      'Provide workflow optimization solutions',
      'Highlight patient portal and mobile access'
    ]
  },
  Retail: {
    painPoints: [
      'Omni-channel customer experience',
      'Inventory management and supply chain optimization',
      'Customer data integration and personalization',
      'Seasonal demand fluctuations'
    ],
    opportunities: [
      'Emphasize omni-channel marketing capabilities',
      'Showcase real-time inventory visibility',
      'Provide AI-driven personalized recommendations',
      'Highlight elastic scaling capabilities'
    ]
  },
  Manufacturing: {
    painPoints: [
      'ERP system integration and data silos',
      'Supply chain visibility and management',
      'Quality control and compliance',
      'Equipment maintenance and downtime'
    ],
    opportunities: [
      'Emphasize enterprise system integration capabilities',
      'Showcase supply chain collaboration features',
      'Provide quality management modules',
      'Highlight predictive maintenance and IoT integration'
    ]
  }
};

/**
 * Main Smart Briefing Action Handler
 */
export async function executeSmartBriefing(request: SmartBriefingRequest): Promise<SmartBriefingResponse> {
  try {
    const { accountId, activityLimit = 10 } = request;

    // Input validation
    if (!accountId) {
      throw new Error('accountId is required');
    }

    // 1. Fetch Account data with error handling
    let account;
    try {
      account = await broker.findOne('Account', accountId, {
        fields: ['Name', 'Industry', 'AnnualRevenue', 'CustomerStatus', 'Rating', 'Description', 'HealthScore', 'SLATier']
      });
    } catch (error) {
      throw new Error(`Failed to fetch account: ${error}`);
    }

    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }

    // 2. Fetch recent Activities (Refactored to Protocol Compliant 'find')
    let activities = [];
    try {
      activities = await broker.find('Activity', {
        fields: ['Type', 'Subject', 'ActivityDate', 'Status', 'Description'],
        filters: [['AccountId', '=', accountId]],
        sort: 'ActivityDate desc',
        limit: activityLimit
      });
    } catch (error) {
      console.warn('⚠️ Failed to fetch activities, continuing without them:', error);
      activities = [];
    }

    // 3. Fetch recent Emails (Refactored to Protocol Compliant 'find')
    let emails = [];
    try {
      emails = await broker.find('email', {
        fields: ['Subject', 'SentDate', 'Direction', 'Body'],
        filters: [['AccountId', '=', accountId]],
        sort: 'SentDate desc',
        limit: 5
      });
    } catch (error) {
      console.warn('⚠️ Failed to fetch emails, continuing without them:', error);
      emails = [];
    }

    // 4. Fetch recent Opportunities for context
    let opportunities = [];
    try {
      opportunities = await broker.find('Opportunity', {
        fields: ['Name', 'Stage', 'Amount', 'CloseDate', 'Probability'],
        filters: [
          ['AccountId', '=', accountId],
          ['Stage', 'not in', ['closed_lost']]
        ],
        sort: 'CloseDate asc',
        limit: 5
      });
    } catch (error) {
      console.warn('⚠️ Failed to fetch opportunities, continuing without them:', error);
      opportunities = [];
    }

    // 5. Build System Prompt with all context
    const systemPrompt = buildSystemPrompt(account, activities, emails, opportunities);

    // 6. Call LLM API (mock implementation with retry logic)
    let llmResponse: string | undefined;
    let retries = MAX_RETRIES;
    while (retries > 0) {
      try {
        llmResponse = await callLLM(systemPrompt);
        break;
      } catch (error) {
        retries--;
        if (retries === 0) {
          throw new Error(`LLM API failed after ${MAX_RETRIES} retries: ${error}`);
        }
        console.warn(`⚠️ LLM call failed, retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }

    if (!llmResponse) {
      throw new Error('LLM API returned empty response');
    }

    // 7. Parse and validate response
    let briefing;
    try {
      briefing = JSON.parse(llmResponse);
      
      // Validate required fields
      if (!briefing.summary || !briefing.nextSteps || !briefing.talkingPoints) {
        throw new Error('Invalid LLM response format');
      }
    } catch (error) {
      throw new Error(`Failed to parse LLM response: ${error}`);
    }

    // 8. Add industry-specific insights if available
    const industryData = INDUSTRY_INSIGHTS[account.Industry as string];
    if (industryData && briefing.talkingPoints.length < 5) {
      // Enhance talking points with industry insights
      briefing.talkingPoints = [
        ...briefing.talkingPoints,
        ...industryData.opportunities.slice(0, 5 - briefing.talkingPoints.length)
      ];
    }

    // 9. Build final response
    const response: SmartBriefingResponse = {
      summary: briefing.summary,
      nextSteps: briefing.nextSteps,
      talkingPoints: briefing.talkingPoints,
      sentiment: briefing.sentiment,
      engagementScore: Math.max(0, Math.min(100, Number(briefing.engagementScore) || 0)), // Clamp to 0-100
      metadata: {
        activitiesAnalyzed: activities.length,
        emailsAnalyzed: emails.length,
        lastActivityDate: activities[0]?.ActivityDate || 'N/A',
        generatedAt: new Date().toISOString()
      }
    };

    console.log('✨ Smart Briefing generated successfully');
    return response;

  } catch (error) {
    console.error('❌ Error generating Smart Briefing:', error);
    throw error;
  }
}

/**
 * Mock LLM API call
 * In production, replace with actual OpenAI/Anthropic API
 */
async function callLLM(prompt: string): Promise<string> {
  console.log('🤖 Calling LLM with prompt...');
  
  // Mock response for demonstration
  const mockResponse = {
    summary: "The customer is currently in an active opportunity evaluation phase. Recent interactions show strong interest in our solution, particularly in data integration and workflow automation. The customer's IT team is already involved in technical evaluation, which is a positive signal. It's worth noting that they are comparing 2-3 vendors with relatively high price sensitivity. It is recommended to emphasize ROI and long-term value in the next communication rather than pure feature comparison. The customer's decision timeline is expected by end of this quarter, requiring active follow-up while avoiding over-selling.",
    nextSteps: [
      "Schedule an in-depth technical demo focusing on data integration and automation features",
      "Prepare a customized ROI analysis report based on the customer's specific use cases",
      "Invite existing customers from the same industry to share success stories",
      "Arrange a one-on-one meeting with the decision maker to understand their core concerns",
      "Provide a trial environment for the customer's IT team to conduct hands-on testing"
    ],
    talkingPoints: [
      "Emphasize how our API-first architecture simplifies integration with existing systems",
      "Demonstrate how automated workflows reduce manual operations and improve team efficiency by 30-40%",
      "Share case studies of same-industry customers achieving positive ROI within 6-12 months",
      "Highlight our security and compliance certifications, especially data privacy protection",
      "Offer flexible pricing plans and phased implementation to reduce initial investment risk"
    ],
    sentiment: "positive",
    engagementScore: 75,
    reasoning: "Customer is actively participating in evaluation, IT team is deeply involved, but there are price concerns and competitive pressure"
  };

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  return JSON.stringify(mockResponse);
}

export default executeSmartBriefing;
