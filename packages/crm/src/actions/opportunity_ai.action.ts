/**
 * Opportunity AI Enhancement Actions
 * 
 * This ObjectStack Action provides AI-powered opportunity management capabilities.
 * 
 * Functionality:
 * 1. Win Probability Prediction - ML model for win likelihood
 * 2. Deal Risk Assessment - Identify and score risk factors
 * 3. Next Step Recommendations - Context-aware action suggestions
 * 4. Competitive Intelligence - Competitor analysis and talking points
 * 5. Optimal Close Date Prediction - Realistic timeline forecasting
 */

import { db } from '@hotcrm/core';

// ============================================================================
// 1. WIN PROBABILITY PREDICTION
// ============================================================================

export interface WinProbabilityRequest {
  /** Opportunity ID to analyze */
  opportunityId: string;
}

export interface WinProbabilityResponse {
  /** Predicted win probability (0-100) */
  winProbability: number;
  /** Confidence in prediction */
  confidence: number;
  /** Key factors influencing the prediction */
  factors: Array<{
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
    description: string;
  }>;
  /** Comparison to stage-based probability */
  stageComparison: {
    stageProbability: number;
    aiProbability: number;
    variance: number;
  };
  /** Historical context */
  historicalContext: {
    similarDealsWon: number;
    similarDealsTotal: number;
    avgTimeToClose: number;
  };
}

/**
 * Predict win probability using ML model
 */
export async function predictWinProbability(request: WinProbabilityRequest): Promise<WinProbabilityResponse> {
  const { opportunityId } = request;

  // Fetch opportunity data
  const opp = await db.doc.get('Opportunity', opportunityId, {
    fields: [
      'Name', 'Stage', 'Amount', 'CloseDate', 'Probability', 'Type',
      'LeadSource', 'CreatedDate', 'AccountId', 'ContactId', 'Age'
    ]
  });

  // Fetch account data
  const account = await db.doc.get('Account', opp.AccountId, {
    fields: ['Industry', 'AnnualRevenue', 'NumberOfEmployees']
  });

  // Fetch recent activities
  const activities = await db.find('Activity', {
    filters: [['WhatId', '=', opportunityId]],
    sort: 'ActivityDate desc',
    limit: 20
  });

  // Count activities by type
  const activityCounts = {
    calls: activities.filter(a => a.Type === 'Call').length,
    emails: activities.filter(a => a.Type === 'Email').length,
    meetings: activities.filter(a => a.Type === 'Meeting').length
  };

  // Days since last activity
  const daysSinceLastActivity = activities.length > 0 
    ? Math.floor((Date.now() - new Date(activities[0].ActivityDate).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  const systemPrompt = `
You are an expert sales forecasting AI trained on thousands of deals.

# Opportunity Analysis

**Deal Information:**
- Name: ${opp.Name}
- Stage: ${opp.Stage}
- Amount: $${opp.Amount?.toLocaleString() || '0'}
- Close Date: ${opp.CloseDate}
- Age: ${opp.Age || 0} days
- Type: ${opp.Type}
- Source: ${opp.LeadSource}

**Account Context:**
- Industry: ${account?.Industry || 'Unknown'}
- Revenue: $${account?.AnnualRevenue?.toLocaleString() || 'Unknown'}
- Size: ${account?.NumberOfEmployees || 'Unknown'} employees

**Engagement Metrics:**
- Total Activities: ${activities.length}
- Calls: ${activityCounts.calls}
- Emails: ${activityCounts.emails}
- Meetings: ${activityCounts.meetings}
- Days Since Last Activity: ${daysSinceLastActivity}

**Stage-Based Probability:** ${opp.Probability}%

# ML Features to Consider

1. **Stage Progression**: Current stage indicates deal maturity
2. **Deal Age**: ${opp.Age} days (typical sales cycle: 30-90 days)
3. **Activity Level**: Engagement frequency and recency
4. **Deal Size**: $${opp.Amount?.toLocaleString()} relative to account size
5. **Contact Level**: Stakeholder engagement
6. **Stagnation Risk**: ${daysSinceLastActivity} days without activity

# Task

Predict win probability (0-100) and explain key factors.

# Output Format

{
  "winProbability": 75,
  "confidence": 85,
  "factors": [
    {
      "factor": "Strong Engagement",
      "impact": "positive",
      "weight": 30,
      "description": "High frequency of meetings and calls indicates buyer interest"
    },
    {
      "factor": "Deal Stagnation",
      "impact": "negative",
      "weight": -15,
      "description": "No activity in 10+ days suggests momentum loss"
    }
  ],
  "stageComparison": {
    "stageProbability": ${opp.Probability},
    "aiProbability": 75,
    "variance": 10
  },
  "historicalContext": {
    "similarDealsWon": 12,
    "similarDealsTotal": 20,
    "avgTimeToClose": 45
  }
}
`.trim();

  const llmResponse = await callLLM(systemPrompt);
  const parsed = JSON.parse(llmResponse);

  // Update opportunity with AI probability
  await db.doc.update('Opportunity', opportunityId, {
    AIProbability: parsed.winProbability
  });

  return parsed;
}

// ============================================================================
// 2. DEAL RISK ASSESSMENT
// ============================================================================

export interface DealRiskRequest {
  /** Opportunity ID to assess */
  opportunityId: string;
}

export interface DealRiskResponse {
  /** Overall risk score (0-100, higher = more risk) */
  riskScore: number;
  /** Risk level category */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  /** Identified risk factors */
  risks: Array<{
    type: 'stagnation' | 'competitor' | 'budget' | 'decision_maker' | 'timeline';
    severity: 'low' | 'medium' | 'high';
    description: string;
    detected: boolean;
  }>;
  /** Recommended mitigation actions */
  mitigationActions: Array<{
    priority: number;
    action: string;
    reasoning: string;
  }>;
}

/**
 * Assess deal risks and provide mitigation recommendations
 */
export async function assessDealRisk(request: DealRiskRequest): Promise<DealRiskResponse> {
  const { opportunityId } = request;

  // Fetch opportunity
  const opp = await db.doc.get('Opportunity', opportunityId);

  // Fetch activities
  const activities = await db.find('Activity', {
    filters: [['WhatId', '=', opportunityId]],
    sort: 'ActivityDate desc',
    limit: 30
  });

  // Calculate days since last activity
  const daysSinceActivity = activities.length > 0
    ? Math.floor((Date.now() - new Date(activities[0].ActivityDate).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  // Days until close date
  const daysUntilClose = opp.CloseDate
    ? Math.floor((new Date(opp.CloseDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  const systemPrompt = `
You are a sales risk assessment expert.

# Opportunity Status

- Stage: ${opp.Stage}
- Amount: $${opp.Amount?.toLocaleString()}
- Close Date: ${opp.CloseDate} (${daysUntilClose} days away)
- Age: ${opp.Age} days
- Last Activity: ${daysSinceActivity} days ago
- Total Activities: ${activities.length}

# Risk Factors to Assess

1. **Stagnation Risk**: No activity in ${daysSinceActivity} days
   - Critical: > 14 days
   - High: 7-14 days
   - Medium: 3-7 days

2. **Competitor Threats**: Check for mentions in notes/activities

3. **Budget Concerns**: Deal size, approval status, CFO involvement

4. **Decision Maker Engagement**: Contact level, stakeholder involvement

5. **Timeline Risk**: ${daysUntilClose} days to close, realistic?

# Task

Assess risk level (0-100) and provide mitigation actions.

# Output Format

{
  "riskScore": 65,
  "riskLevel": "medium",
  "risks": [
    {
      "type": "stagnation",
      "severity": "high",
      "description": "No activity in 10 days - deal losing momentum",
      "detected": true
    },
    {
      "type": "competitor",
      "severity": "medium",
      "description": "Competitor mentioned in recent notes",
      "detected": true
    },
    {
      "type": "budget",
      "severity": "low",
      "description": "No budget concerns identified",
      "detected": false
    }
  ],
  "mitigationActions": [
    {
      "priority": 1,
      "action": "Schedule urgent call with decision maker",
      "reasoning": "Re-engage stagnant deal and assess current status"
    },
    {
      "priority": 2,
      "action": "Prepare competitive battle card",
      "reasoning": "Address competitor threat proactively"
    }
  ]
}
`.trim();

  const llmResponse = await callLLM(systemPrompt);
  return JSON.parse(llmResponse);
}

// ============================================================================
// 3. NEXT STEP RECOMMENDATIONS
// ============================================================================

export interface NextStepRequest {
  /** Opportunity ID */
  opportunityId: string;
}

export interface NextStepResponse {
  /** Top recommended action */
  primaryRecommendation: {
    action: string;
    type: 'call' | 'meeting' | 'demo' | 'proposal' | 'contract' | 'email';
    priority: 'critical' | 'high' | 'medium';
    reasoning: string;
  };
  /** Alternative next steps */
  alternatives: Array<{
    action: string;
    type: string;
    relevance: number;
  }>;
  /** Success patterns from similar deals */
  successPatterns: string[];
}

/**
 * Recommend next best action based on deal stage and context
 */
export async function recommendNextStep(request: NextStepRequest): Promise<NextStepResponse> {
  const { opportunityId } = request;

  const opp = await db.doc.get('Opportunity', opportunityId);
  const activities = await db.find('Activity', {
    filters: [['WhatId', '=', opportunityId]],
    sort: 'ActivityDate desc',
    limit: 10
  });

  const systemPrompt = `
You are an expert sales coach providing next-step guidance.

# Current Deal Status

- Stage: ${opp.Stage}
- Amount: $${opp.Amount?.toLocaleString()}
- Close Date: ${opp.CloseDate}

# Recent Activities

${activities.map((a, i) => `${i + 1}. ${a.Type} - ${a.Subject}`).join('\n')}

# Stage-Specific Best Practices

**Prospecting**: Discovery calls, needs assessment
**Qualification**: Budget discussion, timeline confirmation
**Needs Analysis**: Deep-dive demos, requirement gathering
**Proposal**: Send proposal, review with stakeholders
**Negotiation**: Address objections, negotiate terms
**Closed Won**: Onboarding kickoff

# Task

Recommend the next best action for this ${opp.Stage} deal.

# Output Format

{
  "primaryRecommendation": {
    "action": "Schedule executive sponsor meeting",
    "type": "meeting",
    "priority": "high",
    "reasoning": "..."
  },
  "alternatives": [
    {"action": "Send ROI calculator", "type": "email", "relevance": 85},
    {"action": "Arrange technical demo", "type": "demo", "relevance": 80}
  ],
  "successPatterns": [
    "Similar deals closed faster with executive involvement",
    "ROI validation at this stage increased win rate by 30%"
  ]
}
`.trim();

  const llmResponse = await callLLM(systemPrompt);
  return JSON.parse(llmResponse);
}

// ============================================================================
// 4. COMPETITIVE INTELLIGENCE
// ============================================================================

export interface CompetitiveIntelRequest {
  /** Opportunity ID */
  opportunityId: string;
}

export interface CompetitiveIntelResponse {
  /** Detected competitors */
  competitors: Array<{
    name: string;
    mentioned: number;
    lastMentioned: string;
  }>;
  /** Competitive positioning */
  positioning: {
    strengths: string[];
    weaknesses: string[];
    differentiators: string[];
  };
  /** Battle card talking points */
  talkingPoints: Array<{
    competitor: string;
    point: string;
    category: 'feature' | 'price' | 'service' | 'integration';
  }>;
  /** Win/loss insights */
  insights: {
    winRate: number;
    commonWinFactors: string[];
    commonLossFactors: string[];
  };
}

/**
 * Analyze competitive landscape and provide talking points
 */
export async function analyzeCompetition(request: CompetitiveIntelRequest): Promise<CompetitiveIntelResponse> {
  const { opportunityId } = request;

  // Fetch opportunity and notes/activities that might mention competitors
  const opp = await db.doc.get('Opportunity', opportunityId);
  const activities = await db.find('Activity', {
    filters: [['WhatId', '=', opportunityId]],
    limit: 50
  });

  const systemPrompt = `
You are a competitive intelligence analyst.

# Opportunity Context

- Name: ${opp.Name}
- Industry: ${opp.Industry || 'Unknown'}
- Amount: $${opp.Amount?.toLocaleString()}

# Activities/Notes (analyze for competitor mentions)

${activities.map(a => `${a.Type}: ${a.Subject} - ${a.Description || ''}`).join('\n')}

# Known Competitors

- Salesforce
- HubSpot
- Microsoft Dynamics
- Zoho CRM
- Pipedrive

# Task

1. Identify mentioned competitors
2. Provide competitive differentiation
3. Generate battle card talking points
4. Share win/loss insights

# Output Format

{
  "competitors": [
    {"name": "Salesforce", "mentioned": 3, "lastMentioned": "2024-01-15"}
  ],
  "positioning": {
    "strengths": ["Superior AI capabilities", "Modern UX", "Better pricing"],
    "weaknesses": ["Newer in market", "Smaller ecosystem"],
    "differentiators": ["AI-native architecture", "ObjectQL query language"]
  },
  "talkingPoints": [
    {
      "competitor": "Salesforce",
      "point": "Our AI is built-in, not bolted-on. No Einstein license needed.",
      "category": "feature"
    },
    {
      "competitor": "Salesforce",
      "point": "50% lower TCO with transparent pricing",
      "category": "price"
    }
  ],
  "insights": {
    "winRate": 65,
    "commonWinFactors": ["Better UX", "Faster implementation", "Price"],
    "commonLossFactors": ["Incumbent relationship", "Integration requirements"]
  }
}
`.trim();

  const llmResponse = await callLLM(systemPrompt);
  return JSON.parse(llmResponse);
}

// ============================================================================
// 5. OPTIMAL CLOSE DATE PREDICTION
// ============================================================================

export interface CloseDatePredictionRequest {
  /** Opportunity ID */
  opportunityId: string;
}

export interface CloseDatePredictionResponse {
  /** Predicted close date */
  predictedCloseDate: string;
  /** Current close date */
  currentCloseDate: string;
  /** Variance in days */
  variance: number;
  /** Is current forecast realistic? */
  isRealistic: boolean;
  /** Confidence in prediction */
  confidence: number;
  /** Factors considered */
  factors: {
    avgSalesCycle: number;
    dealSize: string;
    industry: string;
    currentStage: string;
    daysInCurrentStage: number;
  };
  /** Recommended forecast category */
  forecastCategory: 'Pipeline' | 'Best Case' | 'Commit' | 'Omitted';
}

/**
 * Predict realistic close date based on historical patterns
 */
export async function predictCloseDate(request: CloseDatePredictionRequest): Promise<CloseDatePredictionResponse> {
  const { opportunityId } = request;

  const opp = await db.doc.get('Opportunity', opportunityId);
  const account = await db.doc.get('Account', opp.AccountId, {
    fields: ['Industry']
  });

  // Calculate deal age
  const dealAge = Math.floor(
    (Date.now() - new Date(opp.CreatedDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  const systemPrompt = `
You are a sales forecasting expert specializing in timeline prediction.

# Deal Information

- Current Stage: ${opp.Stage}
- Current Close Date: ${opp.CloseDate}
- Deal Age: ${dealAge} days
- Amount: $${opp.Amount?.toLocaleString()}
- Industry: ${account?.Industry || 'Unknown'}

# Historical Sales Cycle Data

**Industry Averages:**
- Technology: 45 days
- Finance: 60 days  
- Healthcare: 75 days
- Retail: 30 days
- Manufacturing: 50 days

**Deal Size Impact:**
- < $25K: -10 days
- $25K-$100K: baseline
- $100K-$500K: +15 days
- $500K+: +30 days

**Stage-Based Time Remaining:**
- Prospecting: 30+ days
- Qualification: 25 days
- Needs Analysis: 20 days
- Proposal: 15 days
- Negotiation: 10 days
- Verbal Commit: 5 days

# Task

Predict realistic close date and assess if current forecast is achievable.

# Output Format

{
  "predictedCloseDate": "2024-03-15",
  "currentCloseDate": "${opp.CloseDate}",
  "variance": 15,
  "isRealistic": false,
  "confidence": 85,
  "factors": {
    "avgSalesCycle": 45,
    "dealSize": "$100K-$500K",
    "industry": "${account?.Industry}",
    "currentStage": "${opp.Stage}",
    "daysInCurrentStage": 12
  },
  "forecastCategory": "Best Case"
}

**Forecast Categories:**
- Pipeline: < 50% probability
- Best Case: 50-74% probability
- Commit: 75-100% probability, high confidence
- Omitted: Deal likely won't close this quarter
`.trim();

  const llmResponse = await callLLM(systemPrompt);
  const parsed = JSON.parse(llmResponse);

  // Update opportunity with predicted date if variance is significant
  if (Math.abs(parsed.variance) > 7) {
    await db.doc.update('Opportunity', opportunityId, {
      AIPredictedCloseDate: parsed.predictedCloseDate,
      ForecastCategory: parsed.forecastCategory
    });
  }

  return parsed;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Mock LLM API call
 */
async function callLLM(prompt: string): Promise<string> {
  console.log('🤖 Calling LLM API for opportunity AI...');
  await new Promise(resolve => setTimeout(resolve, 500));

  if (prompt.includes('win probability')) {
    return JSON.stringify({
      winProbability: 75,
      confidence: 85,
      factors: [
        {
          factor: 'Strong Engagement',
          impact: 'positive',
          weight: 30,
          description: 'High frequency of meetings indicates buyer interest'
        },
        {
          factor: 'Appropriate Deal Size',
          impact: 'positive',
          weight: 20,
          description: 'Deal size aligns with account revenue'
        },
        {
          factor: 'Deal Stagnation',
          impact: 'negative',
          weight: -15,
          description: 'No activity in recent days suggests momentum loss'
        }
      ],
      stageComparison: {
        stageProbability: 60,
        aiProbability: 75,
        variance: 15
      },
      historicalContext: {
        similarDealsWon: 12,
        similarDealsTotal: 20,
        avgTimeToClose: 45
      }
    });
  }

  if (prompt.includes('risk assessment')) {
    return JSON.stringify({
      riskScore: 45,
      riskLevel: 'medium',
      risks: [
        {
          type: 'stagnation',
          severity: 'medium',
          description: 'No activity in 5 days - follow up needed',
          detected: true
        },
        {
          type: 'competitor',
          severity: 'low',
          description: 'No competitive threats identified',
          detected: false
        },
        {
          type: 'budget',
          severity: 'low',
          description: 'Budget approved, CFO aligned',
          detected: false
        },
        {
          type: 'decision_maker',
          severity: 'medium',
          description: 'Need VP-level engagement',
          detected: true
        }
      ],
      mitigationActions: [
        {
          priority: 1,
          action: 'Schedule follow-up call within 48 hours',
          reasoning: 'Prevent further stagnation and maintain momentum'
        },
        {
          priority: 2,
          action: 'Request introduction to VP of Sales',
          reasoning: 'Elevate deal to decision-maker level'
        }
      ]
    });
  }

  if (prompt.includes('next-step')) {
    return JSON.stringify({
      primaryRecommendation: {
        action: 'Schedule executive business review meeting',
        type: 'meeting',
        priority: 'high',
        reasoning: 'Deal is in proposal stage - executive alignment critical for close'
      },
      alternatives: [
        {
          action: 'Send detailed ROI analysis',
          type: 'email',
          relevance: 88
        },
        {
          action: 'Provide customer reference call',
          type: 'call',
          relevance: 85
        }
      ],
      successPatterns: [
        'Similar deals closed 40% faster with executive sponsorship',
        'ROI validation increased win rate by 30% at this stage'
      ]
    });
  }

  if (prompt.includes('competitive intelligence')) {
    return JSON.stringify({
      competitors: [
        { name: 'Salesforce', mentioned: 2, lastMentioned: '2024-01-20' }
      ],
      positioning: {
        strengths: ['Superior AI capabilities', 'Modern UX', 'Better pricing', 'Faster implementation'],
        weaknesses: ['Newer in market', 'Smaller partner ecosystem'],
        differentiators: [
          'AI-native architecture (not bolted-on)',
          'ObjectQL query language',
          'TypeScript-first metadata'
        ]
      },
      talkingPoints: [
        {
          competitor: 'Salesforce',
          point: 'Our AI is built into every feature, not an expensive add-on',
          category: 'feature'
        },
        {
          competitor: 'Salesforce',
          point: '50% lower total cost of ownership with transparent pricing',
          category: 'price'
        },
        {
          competitor: 'Salesforce',
          point: '90-day implementation vs 6-12 months',
          category: 'service'
        }
      ],
      insights: {
        winRate: 68,
        commonWinFactors: ['Better UX', 'Faster implementation', 'Price', 'AI capabilities'],
        commonLossFactors: ['Incumbent relationship', 'Ecosystem requirements', 'Enterprise mandates']
      }
    });
  }

  // Close date prediction
  return JSON.stringify({
    predictedCloseDate: '2024-03-15',
    currentCloseDate: '2024-02-28',
    variance: 15,
    isRealistic: false,
    confidence: 82,
    factors: {
      avgSalesCycle: 45,
      dealSize: '$100K-$500K',
      industry: 'Technology',
      currentStage: 'Proposal',
      daysInCurrentStage: 8
    },
    forecastCategory: 'Best Case'
  });
}

export default {
  predictWinProbability,
  assessDealRisk,
  recommendNextStep,
  analyzeCompetition,
  predictCloseDate
};
