/**
 * Case AI Enhancement Actions
 * 
 * This ObjectStack Action provides AI-powered case management capabilities.
 * 
 * Functionality:
 * 1. Auto-Categorization - ML classification of case type and routing
 * 2. Intelligent Assignment - Match to best available agent
 * 3. Knowledge Base RAG - Semantic search and response generation
 * 4. SLA Breach Prediction - Proactive escalation
 * 5. Sentiment Analysis - Customer emotion tracking
 */

import { db } from '@hotcrm/core';

// ============================================================================
// 1. AUTO-CATEGORIZATION
// ============================================================================

export interface AutoCategorizationRequest {
  /** Case ID or case details */
  caseId?: string;
  subject?: string;
  description?: string;
}

export interface AutoCategorizationResponse {
  /** Predicted case type */
  caseType: string;
  /** Product area */
  product: string;
  /** Feature component */
  feature: string;
  /** Issue type */
  issueType: 'bug' | 'feature_request' | 'question' | 'configuration' | 'performance';
  /** Predicted priority */
  priority: 'low' | 'medium' | 'high' | 'critical';
  /** Predicted severity */
  severity: 'sev-1' | 'sev-2' | 'sev-3' | 'sev-4';
  /** Recommended queue */
  queue: string;
  /** Confidence score */
  confidence: number;
  /** Whether case was auto-updated */
  updated: boolean;
}

/**
 * Automatically categorize and classify cases
 */
export async function autoCategorizeCase(request: AutoCategorizationRequest): Promise<AutoCategorizationResponse> {
  let subject = request.subject;
  let description = request.description;

  // If case ID provided, fetch case details
  if (request.caseId) {
    const caseRecord = await db.doc.get('Case', request.caseId, {
      fields: ['Subject', 'Description']
    });
    subject = caseRecord.Subject;
    description = caseRecord.Description;
  }

  // Validate required parameters
  if (!subject && !description) {
    throw new Error('Either caseId or both subject and description must be provided');
  }

  const systemPrompt = `
You are an expert support case classification AI.

# Case Information

**Subject:** ${subject}

**Description:** ${description}

# Classification Categories

**Case Types:**
- Technical Issue
- How-To Question
- Feature Request
- Bug Report
- Account/Billing
- Integration Issue
- Performance Problem
- Security Concern

**Products:**
- CRM Core
- Sales Cloud
- Service Cloud
- Marketing Cloud
- Analytics
- Mobile App
- API/Integration

**Issue Types:**
- bug: System not working as expected
- feature_request: Request for new capability
- question: How to use existing feature
- configuration: Setup or settings issue
- performance: Speed or scalability concern

**Priority Levels:**
- critical: Production down, business stopped
- high: Major functionality impaired
- medium: Partial functionality affected
- low: Minor issue or enhancement

**Severity Levels:**
- sev-1: Critical business impact, immediate action required
- sev-2: High impact, significant functionality unavailable
- sev-3: Medium impact, workaround available
- sev-4: Low impact, cosmetic or minor issue

# Task

Classify the case and recommend routing.

# Output Format

{
  "caseType": "Technical Issue",
  "product": "Sales Cloud",
  "feature": "Opportunity Management",
  "issueType": "bug",
  "priority": "high",
  "severity": "sev-2",
  "queue": "Sales-Technical-Support",
  "confidence": 92
}
`.trim();

  const llmResponse = await callLLM(systemPrompt);
  const parsed = JSON.parse(llmResponse);

  // Auto-update case if ID provided
  let updated = false;
  if (request.caseId) {
    await db.doc.update('Case', request.caseId, {
      Type: parsed.caseType,
      Product: parsed.product,
      Feature: parsed.feature,
      Priority: parsed.priority,
      Severity: parsed.severity,
      Queue: parsed.queue
    });
    updated = true;
  }

  return {
    ...parsed,
    updated
  };
}

// ============================================================================
// 2. INTELLIGENT ASSIGNMENT
// ============================================================================

export interface IntelligentAssignmentRequest {
  /** Case ID to assign */
  caseId: string;
  /** Optional team ID to limit search */
  teamId?: string;
}

export interface IntelligentAssignmentResponse {
  /** Recommended agent */
  recommendedAgent: {
    userId: string;
    userName: string;
    matchScore: number;
  };
  /** Alternative agent recommendations */
  alternatives: Array<{
    userId: string;
    userName: string;
    matchScore: number;
  }>;
  /** Match reasoning breakdown */
  reasoning: {
    skillMatch: number;
    workloadScore: number;
    successRateScore: number;
    availabilityScore: number;
  };
  /** Whether case was auto-assigned */
  assigned: boolean;
}

/**
 * Match case to best available agent based on skills, workload, and success rate
 */
export async function assignCaseIntelligently(request: IntelligentAssignmentRequest): Promise<IntelligentAssignmentResponse> {
  const { caseId } = request;

  // Fetch case data
  const caseRecord = await db.doc.get('Case', caseId, {
    fields: ['Subject', 'Description', 'Type', 'Product', 'Priority', 'Severity']
  });

  // Fetch available support agents (mock data - in production, query User object)
  const agents = [
    {
      userId: 'agent_001',
      userName: 'Emily Rodriguez',
      skills: ['Sales Cloud', 'API Integration', 'Technical Issue'],
      specialties: ['bug', 'performance'],
      currentCases: 8,
      avgResolutionTime: 24, // hours
      satisfactionRate: 4.7,
      caseSuccessRate: 0.92
    },
    {
      userId: 'agent_002',
      userName: 'David Kim',
      skills: ['Service Cloud', 'Marketing Cloud', 'How-To Question'],
      specialties: ['configuration', 'question'],
      currentCases: 12,
      avgResolutionTime: 18,
      satisfactionRate: 4.5,
      caseSuccessRate: 0.88
    },
    {
      userId: 'agent_003',
      userName: 'Sarah Thompson',
      skills: ['Sales Cloud', 'Analytics', 'Bug Report'],
      specialties: ['bug', 'feature_request'],
      currentCases: 6,
      avgResolutionTime: 20,
      satisfactionRate: 4.8,
      caseSuccessRate: 0.95
    },
    {
      userId: 'agent_004',
      userName: 'James Chen',
      skills: ['CRM Core', 'Mobile App', 'Performance Problem'],
      specialties: ['performance', 'bug'],
      currentCases: 10,
      avgResolutionTime: 22,
      satisfactionRate: 4.6,
      caseSuccessRate: 0.89
    }
  ];

  const systemPrompt = `
You are an expert support case routing AI that matches cases to agents.

# Case Information

- Type: ${caseRecord.Type}
- Product: ${caseRecord.Product}
- Priority: ${caseRecord.Priority}
- Severity: ${caseRecord.Severity}
- Subject: ${caseRecord.Subject}

# Available Agents

${agents.map((agent, i) => `
${i + 1}. ${agent.userName} (${agent.userId})
   - Skills: ${agent.skills.join(', ')}
   - Specialties: ${agent.specialties.join(', ')}
   - Current Workload: ${agent.currentCases} cases
   - Avg Resolution: ${agent.avgResolutionTime}h
   - Success Rate: ${(agent.caseSuccessRate * 100).toFixed(0)}%
   - Customer Satisfaction: ${agent.satisfactionRate}/5.0
`).join('\n')}

# Matching Criteria

1. **Skill Match (0-100)**: Agent expertise in product/case type
2. **Workload Score (0-100)**: Agent availability (lower cases = higher score)
   - 0-5 cases: 100
   - 6-10 cases: 80
   - 11-15 cases: 60
   - 16+ cases: 40
3. **Success Rate Score (0-100)**: Historical case resolution success
4. **Availability Score (0-100)**: Current capacity and response time

# Priority Weighting

For ${caseRecord.Priority} priority cases:
- Critical: Prioritize fastest avg resolution time
- High: Balance skills and workload
- Medium/Low: Optimize for best skill match

# Task

Select the best agent and provide top 3 alternatives with detailed scoring.

# Output Format

{
  "recommendedAgent": {
    "userId": "agent_XXX",
    "userName": "...",
    "matchScore": 94
  },
  "alternatives": [
    {"userId": "agent_YYY", "userName": "...", "matchScore": 88},
    {"userId": "agent_ZZZ", "userName": "...", "matchScore": 82}
  ],
  "reasoning": {
    "skillMatch": 95,
    "workloadScore": 92,
    "successRateScore": 95,
    "availabilityScore": 90
  }
}
`.trim();

  const llmResponse = await callLLM(systemPrompt);
  const parsed = JSON.parse(llmResponse);

  // Auto-assign case to recommended agent only if not already assigned
  const currentCase = await db.doc.get('Case', caseId, {
    fields: ['OwnerId']
  });

  if (!currentCase.OwnerId) {
    await db.doc.update('Case', caseId, {
      OwnerId: parsed.recommendedAgent.userId
    });
  }

  return {
    ...parsed,
    assigned: !currentCase.OwnerId
  };
}

// ============================================================================
// 3. KNOWLEDGE BASE RAG (RETRIEVAL-AUGMENTED GENERATION)
// ============================================================================

export interface KnowledgeBaseRequest {
  /** Case ID or search query */
  caseId?: string;
  query?: string;
}

export interface KnowledgeBaseResponse {
  /** Relevant knowledge articles found */
  articles: Array<{
    articleId: string;
    title: string;
    summary: string;
    relevanceScore: number;
    category: string;
    viewCount: number;
  }>;
  /** AI-generated response using RAG */
  suggestedResponse: {
    response: string;
    confidence: number;
    sources: string[]; // Article IDs used
  };
  /** Related topics */
  relatedTopics: string[];
  /** Whether response was auto-posted to case */
  responsePosted: boolean;
}

/**
 * Search knowledge base using semantic search and generate AI response
 */
export async function searchKnowledgeBase(request: KnowledgeBaseRequest): Promise<KnowledgeBaseResponse> {
  let query = request.query;

  // If case ID provided, build query from case
  if (request.caseId && !query) {
    const caseRecord = await db.doc.get('Case', request.caseId, {
      fields: ['Subject', 'Description']
    });
    query = `${caseRecord.Subject} ${caseRecord.Description}`;
  }

  if (!query) {
    throw new Error('Either caseId or query must be provided');
  }

  const systemPrompt = `
You are a knowledge base AI assistant using Retrieval-Augmented Generation (RAG).

# Customer Query

${query}

# Knowledge Base Search

Perform semantic search across our knowledge base and identify the most relevant articles.

# Mock Knowledge Base (In production, this would use vector embeddings)

1. **KB-1001**: "How to resolve API authentication errors"
   - Category: Integration
   - Content: "API authentication failures typically occur due to expired tokens or incorrect credentials..."
   - Views: 1,245

2. **KB-1002**: "Opportunity not syncing to Sales Cloud"
   - Category: Technical Issue
   - Content: "Sync issues often relate to field mapping or permission errors..."
   - Views: 892

3. **KB-1003**: "Performance optimization for large data volumes"
   - Category: Performance
   - Content: "When handling >100k records, consider implementing pagination and indexing..."
   - Views: 654

4. **KB-1004**: "Mobile app login troubleshooting"
   - Category: Mobile
   - Content: "Common mobile login issues include cached credentials and network timeouts..."
   - Views: 2,103

5. **KB-1005**: "Setting up email-to-case functionality"
   - Category: Configuration
   - Content: "Email-to-case setup requires configuring email services and routing rules..."
   - Views: 1,567

# RAG Process

1. **Retrieval**: Find top 3-5 most relevant articles using semantic similarity
2. **Augmentation**: Extract key information from articles
3. **Generation**: Synthesize a helpful response combining article knowledge

# Task

1. Identify top 3-5 relevant articles with relevance scores
2. Generate a comprehensive response using RAG
3. Cite article sources
4. Suggest related topics

# Output Format

{
  "articles": [
    {
      "articleId": "KB-1001",
      "title": "...",
      "summary": "Brief summary of article content",
      "relevanceScore": 95,
      "category": "Integration",
      "viewCount": 1245
    }
  ],
  "suggestedResponse": {
    "response": "Based on our knowledge base, here's how to resolve this issue:\\n\\n1. First, check...\\n2. Next, verify...\\n\\nFor more details, see KB-1001.",
    "confidence": 88,
    "sources": ["KB-1001", "KB-1002"]
  },
  "relatedTopics": ["API Integration", "Authentication", "Troubleshooting"]
}
`.trim();

  const llmResponse = await callLLM(systemPrompt);
  const parsed = JSON.parse(llmResponse);

  // Optionally post response as case comment (as internal suggestion)
  let responsePosted = false;
  if (request.caseId && parsed.suggestedResponse.confidence > 75) {
    // Note: Using system user ID - in production, configure actual AI assistant user
    await db.doc.create('CaseComment', {
      ParentId: request.caseId,
      CommentBody: parsed.suggestedResponse.response,
      IsPublished: false, // Internal suggestion only
      CreatedById: 'system' // System user ID
    });
    responsePosted = true;
  }

  return {
    ...parsed,
    responsePosted
  };
}

// ============================================================================
// 4. SLA BREACH PREDICTION
// ============================================================================

export interface SLABreachPredictionRequest {
  /** Case ID to analyze */
  caseId: string;
}

export interface SLABreachPredictionResponse {
  /** Probability of SLA breach (0-100) */
  breachProbability: number;
  /** Risk level */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  /** Predicted breach time (if applicable) */
  predictedBreachTime?: string;
  /** Current SLA status */
  slaStatus: {
    responseTimeSLA: {
      target: number; // hours
      elapsed: number;
      remaining: number;
      status: 'met' | 'at_risk' | 'breached';
    };
    resolutionTimeSLA: {
      target: number; // hours
      elapsed: number;
      remaining: number;
      status: 'met' | 'at_risk' | 'breached';
    };
  };
  /** Risk factors */
  riskFactors: Array<{
    factor: string;
    impact: 'high' | 'medium' | 'low';
    description: string;
  }>;
  /** Recommended actions to prevent breach */
  recommendations: Array<{
    priority: number;
    action: string;
    expectedImpact: string;
  }>;
  /** Escalation suggested */
  escalationSuggested: boolean;
}

/**
 * Predict if case will breach SLA and recommend preventive actions
 */
export async function predictSLABreach(request: SLABreachPredictionRequest): Promise<SLABreachPredictionResponse> {
  const { caseId } = request;

  // Fetch case data
  const caseRecord = await db.doc.get('Case', caseId, {
    fields: [
      'CreatedDate', 'Priority', 'Severity', 'Status', 'Type', 
      'Product', 'OwnerId', 'FirstResponseDate'
    ]
  });

  // Calculate time metrics
  const createdDate = new Date(caseRecord.CreatedDate);
  const now = new Date();
  const hoursOpen = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);

  // Define SLA targets based on priority
  const slaTargets: Record<string, { response: number; resolution: number }> = {
    critical: { response: 1, resolution: 4 },
    high: { response: 4, resolution: 24 },
    medium: { response: 8, resolution: 48 },
    low: { response: 24, resolution: 120 }
  };

  const priority = (caseRecord.Priority || 'medium').toLowerCase();
  const targets = slaTargets[priority] || slaTargets.medium;

  // Calculate first response time
  const firstResponseTime = caseRecord.FirstResponseDate
    ? (new Date(caseRecord.FirstResponseDate).getTime() - createdDate.getTime()) / (1000 * 60 * 60)
    : hoursOpen;

  const responseRemaining = targets.response - firstResponseTime;
  const resolutionRemaining = targets.resolution - hoursOpen;

  // Fetch recent activities to assess progress
  const activities = await db.find('Activity', {
    filters: [['WhatId', '=', caseId]],
    sort: 'ActivityDate desc',
    limit: 10
  });

  const daysSinceLastActivity = activities.length > 0
    ? (now.getTime() - new Date(activities[0].ActivityDate).getTime()) / (1000 * 60 * 60 * 24)
    : hoursOpen / 24;

  const systemPrompt = `
You are an SLA breach prediction AI for customer support.

# Case Information

- Priority: ${caseRecord.Priority}
- Severity: ${caseRecord.Severity}
- Status: ${caseRecord.Status}
- Type: ${caseRecord.Type}
- Product: ${caseRecord.Product}
- Hours Open: ${hoursOpen.toFixed(1)}

# SLA Targets

- First Response SLA: ${targets.response} hours
- Resolution SLA: ${targets.resolution} hours

# Current Metrics

- First Response Time: ${firstResponseTime.toFixed(1)}h (${responseRemaining > 0 ? 'remaining: ' + responseRemaining.toFixed(1) + 'h' : 'BREACHED by ' + Math.abs(responseRemaining).toFixed(1) + 'h'})
- Resolution Time Remaining: ${resolutionRemaining > 0 ? resolutionRemaining.toFixed(1) + 'h' : 'BREACHED by ' + Math.abs(resolutionRemaining).toFixed(1) + 'h'}
- Recent Activity Count: ${activities.length}
- Days Since Last Activity: ${daysSinceLastActivity.toFixed(1)}

# Risk Factors to Consider

1. **Time Remaining**: How much time until SLA breach?
2. **Activity Level**: Is the case being actively worked?
3. **Case Complexity**: Type and severity indicate difficulty
4. **Stagnation**: Days without activity suggests risk
5. **Priority**: Higher priority = stricter SLA

# Prediction Task

Assess breach probability (0-100) and risk level:
- 0-25%: low risk
- 26-50%: medium risk  
- 51-75%: high risk
- 76-100%: critical risk

# Output Format

{
  "breachProbability": 65,
  "riskLevel": "high",
  "predictedBreachTime": "2024-01-22T15:30:00Z",
  "slaStatus": {
    "responseTimeSLA": {
      "target": ${targets.response},
      "elapsed": ${firstResponseTime.toFixed(1)},
      "remaining": ${Math.max(0, responseRemaining).toFixed(1)},
      "status": "${responseRemaining > 2 ? 'met' : responseRemaining > 0 ? 'at_risk' : 'breached'}"
    },
    "resolutionTimeSLA": {
      "target": ${targets.resolution},
      "elapsed": ${hoursOpen.toFixed(1)},
      "remaining": ${Math.max(0, resolutionRemaining).toFixed(1)},
      "status": "${resolutionRemaining > targets.resolution * 0.25 ? 'met' : resolutionRemaining > 0 ? 'at_risk' : 'breached'}"
    }
  },
  "riskFactors": [
    {
      "factor": "Limited time remaining",
      "impact": "high",
      "description": "Only X hours until SLA breach"
    },
    {
      "factor": "Case stagnation",
      "impact": "medium",
      "description": "No activity in ${daysSinceLastActivity.toFixed(0)} days"
    }
  ],
  "recommendations": [
    {
      "priority": 1,
      "action": "Immediately assign to senior technician",
      "expectedImpact": "Increase resolution speed by 40%"
    },
    {
      "priority": 2,
      "action": "Escalate to support manager for review",
      "expectedImpact": "Ensure adequate resources allocated"
    }
  ],
  "escalationSuggested": true
}
`.trim();

  const llmResponse = await callLLM(systemPrompt);
  const parsed = JSON.parse(llmResponse);

  // Auto-escalate if breach probability is high and not already escalated
  if (parsed.breachProbability > 70) {
    const currentCase = await db.doc.get('Case', caseId, {
      fields: ['IsEscalated']
    });

    if (!currentCase.IsEscalated) {
      await db.doc.update('Case', caseId, {
        IsEscalated: true,
        EscalationReason: `AI Predicted SLA Breach: ${parsed.breachProbability}% probability`
      });
    }
  }

  return parsed;
}

// ============================================================================
// 5. SENTIMENT ANALYSIS
// ============================================================================

export interface SentimentAnalysisRequest {
  /** Case ID to analyze */
  caseId?: string;
  /** Direct text to analyze */
  text?: string;
}

export interface SentimentAnalysisResponse {
  /** Overall sentiment */
  sentiment: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
  /** Sentiment score (-100 to +100) */
  sentimentScore: number;
  /** Confidence in analysis */
  confidence: number;
  /** Detected emotions */
  emotions: Array<{
    emotion: 'anger' | 'frustration' | 'satisfaction' | 'confusion' | 'urgency' | 'gratitude';
    intensity: number; // 0-100
  }>;
  /** Urgency level detected */
  urgency: 'low' | 'medium' | 'high' | 'critical';
  /** Detected sentiment indicators */
  indicators: {
    positiveKeywords: string[];
    negativeKeywords: string[];
    urgencyKeywords: string[];
  };
  /** Customer health assessment */
  customerHealth: {
    healthScore: number; // 0-100
    riskLevel: 'low' | 'medium' | 'high';
    churnRisk: boolean;
  };
  /** Recommended response tone */
  recommendedTone: 'empathetic' | 'professional' | 'urgent' | 'apologetic' | 'celebratory';
  /** Whether case priority was auto-adjusted */
  priorityAdjusted: boolean;
}

/**
 * Analyze customer sentiment and emotion from case text
 */
export async function analyzeSentiment(request: SentimentAnalysisRequest): Promise<SentimentAnalysisResponse> {
  let textToAnalyze = request.text;

  // If case ID provided, fetch case description and comments
  if (request.caseId && !textToAnalyze) {
    const caseRecord = await db.doc.get('Case', request.caseId, {
      fields: ['Subject', 'Description']
    });

    // Fetch recent comments
    const comments = await db.find('CaseComment', {
      filters: [['ParentId', '=', request.caseId]],
      sort: 'CreatedDate desc',
      limit: 5
    });

    // Combine case text and comments
    const commentTexts = comments.map(c => c.CommentBody).join('\n\n');
    textToAnalyze = `${caseRecord.Subject}\n\n${caseRecord.Description}\n\n${commentTexts}`;
  }

  if (!textToAnalyze) {
    throw new Error('Either caseId or text must be provided');
  }

  const systemPrompt = `
You are an expert sentiment analysis AI specializing in customer support interactions.

# Text to Analyze

${textToAnalyze}

# Analysis Framework

## Sentiment Scale
- **Very Negative (-100 to -60)**: Extreme dissatisfaction, threats to cancel, legal threats
- **Negative (-59 to -20)**: Frustration, disappointment, unmet expectations
- **Neutral (-19 to +19)**: Factual, informational, no strong emotion
- **Positive (+20 to +59)**: Satisfied, appreciative, hopeful
- **Very Positive (+60 to +100)**: Delighted, enthusiastic praise, advocacy

## Emotion Detection
Identify and score (0-100) these emotions:
- **Anger**: Hostile language, ALL CAPS, exclamation marks!!!
- **Frustration**: Repeated issues, "still not working", "again"
- **Satisfaction**: "thank you", "resolved", "working now"
- **Confusion**: Questions, "I don't understand", "how do I"
- **Urgency**: "ASAP", "urgent", "immediately", "critical"
- **Gratitude**: "appreciate", "thank you", "excellent"

## Urgency Indicators
- **Critical**: Business stopped, revenue impact, executive escalation
- **High**: Multiple failures, repeated attempts, deadline pressure
- **Medium**: Important but not blocking, workarounds possible
- **Low**: General inquiry, enhancement request

## Customer Health Signals

Positive Signals (+):
- Polite language
- Acknowledgment of help
- Engagement and questions
- Patience with process

Negative Signals (-):
- Threat to cancel/switch
- Comparison to competitors
- Multiple unresolved issues
- Executive involvement demanded
- Legal language

## Churn Risk Indicators
- Mentions of competitors
- "fed up", "had enough", "unacceptable"
- Threats to cancel/leave
- Request to speak to management
- Multiple escalations

# Task

Provide comprehensive sentiment analysis with:
1. Overall sentiment classification and score
2. Detected emotions with intensity
3. Urgency assessment
4. Customer health score (0-100)
5. Recommended response tone

# Output Format

{
  "sentiment": "negative",
  "sentimentScore": -45,
  "confidence": 88,
  "emotions": [
    {"emotion": "frustration", "intensity": 75},
    {"emotion": "urgency", "intensity": 60},
    {"emotion": "anger", "intensity": 30}
  ],
  "urgency": "high",
  "indicators": {
    "positiveKeywords": ["please", "help"],
    "negativeKeywords": ["frustrated", "doesn't work", "third time"],
    "urgencyKeywords": ["urgent", "ASAP", "critical"]
  },
  "customerHealth": {
    "healthScore": 45,
    "riskLevel": "medium",
    "churnRisk": true
  },
  "recommendedTone": "empathetic"
}

**Response Tone Guide:**
- **empathetic**: High frustration/anger - acknowledge feelings, apologize
- **professional**: Neutral - clear, helpful, efficient
- **urgent**: Critical urgency - immediate action, senior involvement
- **apologetic**: Service failure - own mistake, make it right
- **celebratory**: Very positive - celebrate success, reinforce relationship
`.trim();

  const llmResponse = await callLLM(systemPrompt);
  const parsed = JSON.parse(llmResponse);

  // Auto-adjust case priority if sentiment is very negative or urgency is critical
  // Note: SentimentScore and ChurnRisk are custom fields that should be added to Case schema
  let priorityAdjusted = false;
  if (request.caseId) {
    const caseRecord = await db.doc.get('Case', request.caseId, {
      fields: ['Priority', 'IsEscalated']
    });

    const shouldEscalate = 
      parsed.sentimentScore < -60 || 
      parsed.urgency === 'critical' ||
      parsed.customerHealth.churnRisk;

    if (shouldEscalate && caseRecord.Priority !== 'critical' && !caseRecord.IsEscalated) {
      await db.doc.update('Case', request.caseId, {
        Priority: parsed.urgency === 'critical' ? 'critical' : 'high',
        SentimentScore: parsed.sentimentScore, // Custom field
        ChurnRisk: parsed.customerHealth.churnRisk // Custom field
      });
      priorityAdjusted = true;
    } else {
      // Just update sentiment tracking fields
      await db.doc.update('Case', request.caseId, {
        SentimentScore: parsed.sentimentScore,
        ChurnRisk: parsed.customerHealth.churnRisk
      });
    }
  }

  return {
    ...parsed,
    priorityAdjusted
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Mock LLM API call
 * In production, replace with actual OpenAI/Anthropic/Claude API
 * 
 * Note: This mock function uses pattern matching on prompts to determine responses.
 * The patterns are case-sensitive and should match the prompts in the functions above.
 */
async function callLLM(prompt: string): Promise<string> {
  console.log('🤖 Calling LLM API for case AI...');
  await new Promise(resolve => setTimeout(resolve, 500));

  // Pattern matching for different AI functions (case-sensitive)
  
  // Auto-Categorization
  if (prompt.includes('Classification Categories')) {
    return JSON.stringify({
      caseType: 'Technical Issue',
      product: 'Sales Cloud',
      feature: 'Opportunity Management',
      issueType: 'bug',
      priority: 'high',
      severity: 'sev-2',
      queue: 'Sales-Technical-Support',
      confidence: 92
    });
  }

  // Intelligent Assignment
  if (prompt.includes('support case routing')) {
    return JSON.stringify({
      recommendedAgent: {
        userId: 'agent_003',
        userName: 'Sarah Thompson',
        matchScore: 94
      },
      alternatives: [
        { userId: 'agent_001', userName: 'Emily Rodriguez', matchScore: 88 },
        { userId: 'agent_004', userName: 'James Chen', matchScore: 82 }
      ],
      reasoning: {
        skillMatch: 95,
        workloadScore: 92,
        successRateScore: 95,
        availabilityScore: 90
      }
    });
  }

  // Knowledge Base RAG
  if (prompt.includes('Retrieval-Augmented Generation')) {
    return JSON.stringify({
      articles: [
        {
          articleId: 'KB-1001',
          title: 'How to resolve API authentication errors',
          summary: 'Step-by-step guide for troubleshooting API authentication failures',
          relevanceScore: 95,
          category: 'Integration',
          viewCount: 1245
        },
        {
          articleId: 'KB-1002',
          title: 'Opportunity not syncing to Sales Cloud',
          summary: 'Common sync issues and resolution steps',
          relevanceScore: 88,
          category: 'Technical Issue',
          viewCount: 892
        },
        {
          articleId: 'KB-1003',
          title: 'Performance optimization for large data volumes',
          summary: 'Best practices for handling high-volume data operations',
          relevanceScore: 75,
          category: 'Performance',
          viewCount: 654
        }
      ],
      suggestedResponse: {
        response: 'Based on our knowledge base, here are the steps to resolve your issue:\n\n1. **Verify API Credentials**: Check that your API token hasn\'t expired (KB-1001)\n2. **Check Field Mappings**: Ensure all required fields are properly mapped (KB-1002)\n3. **Review Error Logs**: Look for specific error codes in the integration logs\n\nIf the issue persists after these steps, please provide:\n- The exact error message\n- Timestamp of when the error occurred\n- Your API endpoint URL\n\nI\'ll escalate to our integration team for further investigation.\n\nRelated articles: KB-1001, KB-1002',
        confidence: 88,
        sources: ['KB-1001', 'KB-1002']
      },
      relatedTopics: ['API Integration', 'Authentication', 'Troubleshooting', 'Data Sync']
    });
  }

  // SLA Breach Prediction
  if (prompt.includes('SLA breach prediction')) {
    return JSON.stringify({
      breachProbability: 65,
      riskLevel: 'high',
      predictedBreachTime: '2024-01-22T15:30:00Z',
      slaStatus: {
        responseTimeSLA: {
          target: 4,
          elapsed: 3.2,
          remaining: 0.8,
          status: 'at_risk'
        },
        resolutionTimeSLA: {
          target: 24,
          elapsed: 18.5,
          remaining: 5.5,
          status: 'at_risk'
        }
      },
      riskFactors: [
        {
          factor: 'Limited time remaining',
          impact: 'high',
          description: 'Only 5.5 hours until resolution SLA breach'
        },
        {
          factor: 'Case complexity',
          impact: 'medium',
          description: 'Technical integration issue requires specialized expertise'
        },
        {
          factor: 'Resource availability',
          impact: 'medium',
          description: 'Peak support hours - queue backlog present'
        }
      ],
      recommendations: [
        {
          priority: 1,
          action: 'Immediately assign to senior integration specialist',
          expectedImpact: 'Increase resolution speed by 40%'
        },
        {
          priority: 2,
          action: 'Escalate to support manager for review',
          expectedImpact: 'Ensure adequate resources allocated'
        },
        {
          priority: 3,
          action: 'Prepare customer communication about timeline',
          expectedImpact: 'Manage expectations proactively'
        }
      ],
      escalationSuggested: true
    });
  }

  // Sentiment Analysis
  if (prompt.includes('sentiment analysis')) {
    return JSON.stringify({
      sentiment: 'negative',
      sentimentScore: -45,
      confidence: 88,
      emotions: [
        { emotion: 'frustration', intensity: 75 },
        { emotion: 'urgency', intensity: 60 },
        { emotion: 'anger', intensity: 30 },
        { emotion: 'confusion', intensity: 20 }
      ],
      urgency: 'high',
      indicators: {
        positiveKeywords: ['please', 'help', 'appreciate'],
        negativeKeywords: ['frustrated', 'not working', 'third time', 'unacceptable', 'disappointed'],
        urgencyKeywords: ['urgent', 'ASAP', 'immediately', 'critical']
      },
      customerHealth: {
        healthScore: 45,
        riskLevel: 'medium',
        churnRisk: true
      },
      recommendedTone: 'empathetic'
    });
  }

  // Default fallback
  return JSON.stringify({
    caseType: 'General',
    product: 'Unknown',
    feature: 'Unknown',
    issueType: 'question',
    priority: 'medium',
    severity: 'sev-3',
    queue: 'General-Support',
    confidence: 50
  });
}

// Export all functions
export default {
  autoCategorizeCase,
  assignCaseIntelligently,
  searchKnowledgeBase,
  predictSLABreach,
  analyzeSentiment
};
