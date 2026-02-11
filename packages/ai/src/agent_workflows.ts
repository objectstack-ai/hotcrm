/**
 * Advanced AI Agent Workflows
 *
 * Cross-package AI orchestration workflows that enable intelligent
 * automation spanning multiple business domains (CRM, Support, HR,
 * Finance, Marketing, Products).
 *
 * These workflows define multi-step agent pipelines that coordinate
 * AI tools, resources, and prompts from the MCP server to deliver
 * end-to-end business outcomes.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentStep {
  /** Unique step identifier */
  id: string;
  /** Human-readable label */
  label: string;
  /** MCP tool to invoke */
  tool: string;
  /** Parameters passed to the tool (may reference prior step outputs via ${stepId.field}) */
  parameters: Record<string, unknown>;
  /** Condition for executing this step (evaluated against prior outputs) */
  condition?: string;
  /** Maximum execution time in seconds */
  timeout?: number;
  /** Steps that must complete before this step runs */
  dependsOn?: string[];
}

export interface AgentWorkflow {
  /** Unique workflow name (snake_case) */
  name: string;
  /** Human-readable label */
  label: string;
  /** Workflow description */
  description: string;
  /** Business domain category */
  category: string;
  /** Tags for discoverability */
  tags: string[];
  /** Trigger that initiates the workflow */
  trigger: {
    type: 'manual' | 'scheduled' | 'event';
    /** Event name or cron expression (for scheduled) */
    source?: string;
    /** Schedule details (for scheduled type) */
    schedule?: { frequency: string; time: string; timezone: string };
  };
  /** Ordered list of agent steps */
  steps: AgentStep[];
  /** Workflow is enabled */
  active: boolean;
  /** Version of the workflow definition */
  version: string;
}

// ---------------------------------------------------------------------------
// Workflow 1: Lead-to-Close Pipeline
// ---------------------------------------------------------------------------

/**
 * Orchestrates the entire lead-to-close journey:
 * 1. Score the lead with AI
 * 2. Enrich with account context
 * 3. Forecast opportunity close probability
 * 4. Generate a sales briefing
 * 5. Recommend pricing
 */
export const LeadToClosePipeline: AgentWorkflow = {
  name: 'lead_to_close_pipeline',
  label: 'Lead-to-Close AI Pipeline',
  description:
    'End-to-end AI pipeline that scores a lead, enriches context, forecasts close probability, generates a briefing, and recommends pricing',
  category: 'sales',
  tags: ['crm', 'sales', 'pipeline', 'ai-agent'],
  trigger: { type: 'event', source: 'lead.status_changed_to_qualified' },
  steps: [
    {
      id: 'score_lead',
      label: 'AI Lead Scoring',
      tool: 'lead_scoring',
      parameters: { lead_id: '${trigger.lead_id}', include_factors: true },
      timeout: 10,
    },
    {
      id: 'enrich_account',
      label: 'Fetch Account Context',
      tool: 'account_context',
      parameters: { account_id: '${trigger.account_id}' },
      dependsOn: ['score_lead'],
      timeout: 10,
    },
    {
      id: 'forecast_deal',
      label: 'Opportunity Forecast',
      tool: 'opportunity_forecast',
      parameters: {
        opportunity_id: '${trigger.opportunity_id}',
        horizon_days: 90,
        include_similar_deals: true,
      },
      dependsOn: ['enrich_account'],
      timeout: 15,
    },
    {
      id: 'generate_briefing',
      label: 'Sales Briefing Generation',
      tool: 'sales_briefing',
      parameters: {
        account_id: '${trigger.account_id}',
        contact_name: '${trigger.contact_name}',
        meeting_date: '${trigger.meeting_date}',
        focus_areas: 'deal_strategy,competitive_landscape',
      },
      dependsOn: ['forecast_deal'],
      timeout: 20,
    },
    {
      id: 'recommend_pricing',
      label: 'Pricing Recommendation',
      tool: 'pricing_recommendation',
      parameters: {
        product_id: '${trigger.product_id}',
        strategy: 'value',
        include_elasticity: true,
      },
      condition: 'score_lead.score >= 70',
      dependsOn: ['forecast_deal'],
      timeout: 10,
    },
  ],
  active: true,
  version: '1.0.0',
};

// ---------------------------------------------------------------------------
// Workflow 2: Customer 360 Intelligence
// ---------------------------------------------------------------------------

/**
 * Aggregates intelligence across all packages to build a complete
 * customer picture: account health, support sentiment, revenue
 * forecast, and campaign engagement.
 */
export const Customer360Intelligence: AgentWorkflow = {
  name: 'customer_360_intelligence',
  label: 'Customer 360 Intelligence',
  description:
    'Aggregate cross-package intelligence for a 360-degree customer view combining CRM, Support, Finance, and Marketing data',
  category: 'analytics',
  tags: ['crm', 'support', 'finance', 'marketing', 'customer-360'],
  trigger: { type: 'manual' },
  steps: [
    {
      id: 'account_context',
      label: 'CRM Account Context',
      tool: 'account_context',
      parameters: { account_id: '${input.account_id}' },
      timeout: 10,
    },
    {
      id: 'pipeline_summary',
      label: 'Sales Pipeline Summary',
      tool: 'pipeline_summary',
      parameters: { account_id: '${input.account_id}' },
      timeout: 10,
    },
    {
      id: 'case_metrics',
      label: 'Support Case Metrics',
      tool: 'case_metrics',
      parameters: { account_id: '${input.account_id}' },
      timeout: 10,
    },
    {
      id: 'revenue_forecast',
      label: 'Revenue Forecast',
      tool: 'revenue_forecast',
      parameters: { period: '${input.period}', segment: '${input.segment}' },
      dependsOn: ['pipeline_summary'],
      timeout: 15,
    },
    {
      id: 'campaign_performance',
      label: 'Campaign Engagement',
      tool: 'campaign_optimization',
      parameters: { campaign_id: '${input.campaign_id}', objective: 'roi' },
      condition: 'input.campaign_id != null',
      timeout: 10,
    },
  ],
  active: true,
  version: '1.0.0',
};

// ---------------------------------------------------------------------------
// Workflow 3: Churn Prevention
// ---------------------------------------------------------------------------

/**
 * Proactive churn prevention workflow:
 * 1. Analyze contract risk
 * 2. Check support case sentiment
 * 3. Predict renewal probability
 * 4. Suggest resolution steps if at-risk
 */
export const ChurnPreventionWorkflow: AgentWorkflow = {
  name: 'churn_prevention',
  label: 'Churn Prevention Agent',
  description:
    'Proactively detect at-risk customers by analyzing contract risk, support sentiment, and renewal probability, then recommend retention actions',
  category: 'retention',
  tags: ['finance', 'support', 'crm', 'churn', 'retention'],
  trigger: {
    type: 'scheduled',
    schedule: { frequency: 'weekly', time: '07:00', timezone: 'UTC' },
  },
  steps: [
    {
      id: 'contract_risk',
      label: 'Analyze Contract Risk',
      tool: 'contract_ai',
      parameters: { contract_id: '${input.contract_id}', action: 'analyzeContractRisk' },
      timeout: 15,
    },
    {
      id: 'case_sentiment',
      label: 'Support Case Sentiment',
      tool: 'case_classification',
      parameters: { case_id: '${input.latest_case_id}', reclassify: false },
      condition: 'input.latest_case_id != null',
      timeout: 10,
    },
    {
      id: 'renewal_prediction',
      label: 'Predict Renewal',
      tool: 'contract_ai',
      parameters: { contract_id: '${input.contract_id}', action: 'predictRenewal' },
      dependsOn: ['contract_risk'],
      timeout: 15,
    },
    {
      id: 'resolution_plan',
      label: 'Suggest Retention Actions',
      tool: 'case_resolution',
      parameters: {
        case_id: '${input.latest_case_id}',
        priority: 'high',
        context: 'Customer at risk of churn. Contract risk: ${contract_risk.risk_level}. Renewal probability: ${renewal_prediction.probability}.',
      },
      condition: 'renewal_prediction.probability < 0.6',
      dependsOn: ['renewal_prediction', 'case_sentiment'],
      timeout: 20,
    },
  ],
  active: true,
  version: '1.0.0',
};

// ---------------------------------------------------------------------------
// Workflow 4: Intelligent Case Resolution
// ---------------------------------------------------------------------------

/**
 * AI-powered support case resolution:
 * 1. Classify the case
 * 2. Search knowledge base
 * 3. Suggest resolution steps
 */
export const IntelligentCaseResolution: AgentWorkflow = {
  name: 'intelligent_case_resolution',
  label: 'Intelligent Case Resolution',
  description:
    'Automatically classify incoming cases, search the knowledge base for solutions, and suggest resolution steps to agents',
  category: 'support',
  tags: ['support', 'case', 'knowledge', 'resolution', 'ai-agent'],
  trigger: { type: 'event', source: 'case.created' },
  steps: [
    {
      id: 'classify',
      label: 'Classify Case',
      tool: 'case_classification',
      parameters: { case_id: '${trigger.case_id}', reclassify: false },
      timeout: 10,
    },
    {
      id: 'search_kb',
      label: 'Search Knowledge Base',
      tool: 'knowledge_search',
      parameters: {
        query: '${trigger.subject} ${trigger.description}',
        top_k: 5,
        min_score: 0.7,
      },
      dependsOn: ['classify'],
      timeout: 10,
    },
    {
      id: 'suggest_resolution',
      label: 'Suggest Resolution',
      tool: 'case_resolution',
      parameters: {
        case_id: '${trigger.case_id}',
        priority: '${classify.priority}',
        context: 'Category: ${classify.category}. Sentiment: ${classify.sentiment}.',
      },
      dependsOn: ['search_kb'],
      timeout: 20,
    },
  ],
  active: true,
  version: '1.0.0',
};

// ---------------------------------------------------------------------------
// Workflow 5: Talent Acquisition Pipeline
// ---------------------------------------------------------------------------

/**
 * End-to-end talent acquisition:
 * 1. Screen candidate
 * 2. Evaluate against job requirements
 * 3. Generate HR dashboard context
 */
export const TalentAcquisitionPipeline: AgentWorkflow = {
  name: 'talent_acquisition_pipeline',
  label: 'Talent Acquisition AI Pipeline',
  description:
    'Screen candidates, evaluate against job requirements, and provide HR dashboard context for hiring decisions',
  category: 'hr',
  tags: ['hr', 'recruitment', 'candidate', 'screening', 'ai-agent'],
  trigger: { type: 'event', source: 'application.submitted' },
  steps: [
    {
      id: 'screen_candidate',
      label: 'AI Candidate Screening',
      tool: 'candidate_screening',
      parameters: {
        candidate_id: '${trigger.candidate_id}',
        job_id: '${trigger.job_id}',
        include_bias_check: true,
      },
      timeout: 15,
    },
    {
      id: 'evaluate_candidate',
      label: 'Structured Evaluation',
      tool: 'candidate_evaluation',
      parameters: {
        candidate_id: '${trigger.candidate_id}',
        job_id: '${trigger.job_id}',
        criteria: 'skills,experience,culture_fit',
      },
      dependsOn: ['screen_candidate'],
      timeout: 20,
    },
    {
      id: 'hr_context',
      label: 'HR Dashboard Context',
      tool: 'hr_dashboard',
      parameters: {},
      dependsOn: ['evaluate_candidate'],
      timeout: 10,
    },
  ],
  active: true,
  version: '1.0.0',
};

// ---------------------------------------------------------------------------
// Workflow 6: Revenue Optimization
// ---------------------------------------------------------------------------

/**
 * Cross-package revenue optimization:
 * 1. Forecast revenue
 * 2. Optimize campaign spend
 * 3. Recommend pricing adjustments
 */
export const RevenueOptimizationWorkflow: AgentWorkflow = {
  name: 'revenue_optimization',
  label: 'Revenue Optimization Agent',
  description:
    'Optimize revenue by combining financial forecasts, marketing campaign ROI, and product pricing recommendations',
  category: 'finance',
  tags: ['finance', 'marketing', 'products', 'revenue', 'optimization'],
  trigger: {
    type: 'scheduled',
    schedule: { frequency: 'monthly', time: '06:00', timezone: 'UTC' },
  },
  steps: [
    {
      id: 'forecast',
      label: 'Revenue Forecast',
      tool: 'revenue_forecast',
      parameters: { period: '${input.period}', model: 'ensemble' },
      timeout: 15,
    },
    {
      id: 'campaign_roi',
      label: 'Campaign ROI Analysis',
      tool: 'campaign_optimization',
      parameters: {
        campaign_id: '${input.campaign_id}',
        objective: 'roi',
      },
      condition: 'input.campaign_id != null',
      timeout: 10,
    },
    {
      id: 'pricing',
      label: 'Pricing Recommendation',
      tool: 'pricing_recommendation',
      parameters: {
        product_id: '${input.product_id}',
        strategy: 'competitive',
        include_elasticity: true,
      },
      condition: 'input.product_id != null',
      dependsOn: ['forecast'],
      timeout: 10,
    },
  ],
  active: true,
  version: '1.0.0',
};

// ---------------------------------------------------------------------------
// Grouped Export
// ---------------------------------------------------------------------------

export const AgentWorkflows = {
  leadToClose: LeadToClosePipeline,
  customer360: Customer360Intelligence,
  churnPrevention: ChurnPreventionWorkflow,
  intelligentCaseResolution: IntelligentCaseResolution,
  talentAcquisition: TalentAcquisitionPipeline,
  revenueOptimization: RevenueOptimizationWorkflow,
};

export default AgentWorkflows;
