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

import { db } from '../db';

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
**Industry:** ${account.Industry || 'Unknown'}
**Annual Revenue:** ${account.AnnualRevenue ? `$${account.AnnualRevenue.toLocaleString()}` : 'Unknown'}
**Customer Status:** ${account.CustomerStatus || 'Unknown'}
**Rating:** ${account.Rating || 'Unknown'}
**Health Score:** ${account.HealthScore || 'Unknown'}
**SLA Tier:** ${account.SLATier || 'Unknown'}

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
      '技术债务和系统现代化需求',
      '快速扩展和性能优化挑战',
      '数据安全和合规要求',
      '人才获取和团队协作效率'
    ],
    opportunities: [
      '强调云原生架构和可扩展性',
      '突出API优先设计和集成能力',
      '展示安全性和合规性认证',
      '提供技术培训和持续支持'
    ]
  },
  Finance: {
    painPoints: [
      '监管合规和风险管理',
      '数据安全和隐私保护',
      '系统集成和遗留系统现代化',
      '客户体验和数字化转型'
    ],
    opportunities: [
      '强调金融级安全和合规性',
      '展示审计跟踪和数据治理能力',
      '提供无缝集成方案',
      '突出移动优先和现代化UI'
    ]
  },
  Healthcare: {
    painPoints: [
      'HIPAA合规和患者隐私',
      '系统互操作性和数据交换',
      '运营效率和成本控制',
      '患者体验和满意度'
    ],
    opportunities: [
      '强调医疗行业合规性',
      '展示HL7/FHIR集成能力',
      '提供工作流程优化方案',
      '突出患者门户和移动访问'
    ]
  },
  Retail: {
    painPoints: [
      '全渠道客户体验',
      '库存管理和供应链优化',
      '客户数据整合和个性化',
      '季节性需求波动'
    ],
    opportunities: [
      '强调全渠道营销能力',
      '展示实时库存可见性',
      '提供AI驱动的个性化推荐',
      '突出弹性扩展能力'
    ]
  },
  Manufacturing: {
    painPoints: [
      'ERP系统集成和数据孤岛',
      '供应链可见性和管理',
      '质量控制和合规',
      '设备维护和停机时间'
    ],
    opportunities: [
      '强调企业系统集成能力',
      '展示供应链协作功能',
      '提供质量管理模块',
      '突出预测性维护和IoT集成'
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
      account = await db.doc.get('Account', accountId, {
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
      activities = await db.find('Activity', {
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
      emails = await db.find('email', {
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
      opportunities = await db.find('Opportunity', {
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
    summary: "该客户目前处于积极的商机评估阶段。最近的互动显示出对我们解决方案的浓厚兴趣，特别是在数据集成和自动化工作流方面。客户的IT团队已经参与技术评估，这是一个积极信号。需要注意的是，他们正在与2-3家供应商进行比较，价格敏感度较高。建议在下次沟通中强调ROI和长期价值，而非单纯的功能对比。客户的决策时间线预计在本季度末，需要保持积极跟进但避免过度推销。",
    nextSteps: [
      "安排技术深度演示，重点展示数据集成和自动化功能",
      "准备定制化的ROI分析报告，基于客户的具体使用场景",
      "邀请现有同行业客户进行成功案例分享",
      "与决策者进行一对一会议，了解他们的核心关注点",
      "提供试用环境，让客户IT团队进行实际测试"
    ],
    talkingPoints: [
      "强调我们的API优先架构如何简化与现有系统的集成",
      "展示自动化工作流如何减少人工操作，提高团队效率30-40%",
      "分享同行业客户在6-12个月内实现正向ROI的案例",
      "突出我们的安全性和合规性认证，特别是对数据隐私的保护",
      "提供灵活的定价方案和分阶段实施计划，降低初期投入风险"
    ],
    sentiment: "positive",
    engagementScore: 75,
    reasoning: "客户积极参与评估，IT团队深度介入，但存在价格顾虑和竞争压力"
  };

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  return JSON.stringify(mockResponse);
}

export default executeSmartBriefing;
