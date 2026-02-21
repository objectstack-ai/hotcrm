// Agent definition for @objectstack/spec/ai

/**
 * HR Co-Pilot Agent
 * Provides talent management intelligence, employee engagement insights, and retention analysis.
 * Part of Phase 13D-5: HR Intelligence.
 */
export const HRCoPilotAgent = {
  name: 'hr_copilot',
  role: 'HR Co-Pilot',
  description: 'Intelligent HR co-pilot that provides talent management insights, employee engagement analysis, retention strategies, and workforce planning recommendations',

  systemPrompt: `You are an expert HR co-pilot specializing in talent management, employee engagement, and workforce analytics.

Your responsibilities:
1. Analyze employee retention patterns and identify flight risks
2. Suggest personalized development plans based on skills gaps and career aspirations
3. Assess team and organizational engagement levels
4. Benchmark compensation against market data and internal equity
5. Predict attrition risk and recommend preventive actions
6. Analyze workforce composition, diversity metrics, and succession readiness

Guidelines:
- Always provide data-backed recommendations with confidence scores
- Prioritize actions by impact on retention and engagement
- Consider the full context: tenure, performance history, compensation, team dynamics
- Suggest specific, actionable steps (not generic advice)
- Flag employees or teams that deviate from healthy patterns
- Respect employee privacy and handle sensitive data appropriately

Tone: Empathetic, data-driven, and action-oriented.`,

  tools: [
    {
      name: 'analyzeRetention',
      description: 'Analyze employee retention patterns and identify flight risks across teams',
      action: 'retention_analysis',
      parameters: {
        department_id: {
          type: 'string',
          required: false,
          description: 'Department ID to scope analysis (optional, defaults to org-wide)'
        },
        period: {
          type: 'string',
          enum: ['6m', '12m', '24m'],
          defaultValue: '12m',
          description: 'Historical period for retention analysis'
        }
      },
      returns: {
        retention_rate: 'number',
        flight_risk_employees: 'array',
        top_risk_factors: 'array',
        trend: 'string',
        recommendations: 'array'
      }
    },

    {
      name: 'suggestDevelopmentPlan',
      description: 'Generate a personalized development plan based on skills gaps and career goals',
      action: 'development_plan_suggestion',
      parameters: {
        employee_id: {
          type: 'string',
          required: true,
          description: 'The employee ID to create a development plan for'
        },
        target_role: {
          type: 'string',
          required: false,
          description: 'Target role for career progression'
        }
      },
      returns: {
        current_skills: 'array',
        skill_gaps: 'array',
        recommended_training: 'array',
        milestones: 'array',
        timeline_months: 'number'
      }
    },

    {
      name: 'assessEngagement',
      description: 'Assess employee or team engagement levels and suggest improvement actions',
      action: 'engagement_assessment',
      parameters: {
        scope: {
          type: 'string',
          enum: ['individual', 'team', 'department', 'organization'],
          defaultValue: 'team',
          description: 'Scope of the engagement assessment'
        },
        target_id: {
          type: 'string',
          required: true,
          description: 'ID of the employee, team, or department to assess'
        }
      },
      returns: {
        engagement_score: 'number',
        key_drivers: 'array',
        detractors: 'array',
        benchmark_comparison: 'object',
        action_items: 'array'
      }
    },

    {
      name: 'benchmarkCompensation',
      description: 'Benchmark compensation against market data and internal equity',
      action: 'compensation_benchmark',
      parameters: {
        employee_id: {
          type: 'string',
          required: false,
          description: 'Individual employee to benchmark'
        },
        job_title: {
          type: 'string',
          required: false,
          description: 'Job title to benchmark across the organization'
        },
        market: {
          type: 'string',
          enum: ['local', 'national', 'global'],
          defaultValue: 'national'
        }
      },
      returns: {
        current_compensation: 'object',
        market_percentile: 'number',
        market_range: 'object',
        internal_equity_score: 'number',
        recommendations: 'array'
      }
    },

    {
      name: 'predictAttrition',
      description: 'Predict attrition probability for individuals or teams using historical patterns',
      action: 'attrition_prediction',
      parameters: {
        employee_id: {
          type: 'string',
          required: false,
          description: 'Specific employee to predict attrition for'
        },
        department_id: {
          type: 'string',
          required: false,
          description: 'Department to predict attrition across'
        },
        horizon: {
          type: 'string',
          enum: ['3m', '6m', '12m'],
          defaultValue: '6m',
          description: 'Prediction time horizon'
        }
      },
      returns: {
        attrition_probability: 'number',
        risk_level: 'string',
        contributing_factors: 'array',
        preventive_actions: 'array',
        confidence: 'number'
      }
    },

    {
      name: 'analyzeWorkforce',
      description: 'Analyze workforce composition, diversity metrics, and succession readiness',
      action: 'workforce_analysis',
      parameters: {
        department_id: {
          type: 'string',
          required: false,
          description: 'Scope to a specific department'
        },
        metrics: {
          type: 'array',
          items: ['headcount', 'diversity', 'tenure', 'skills', 'succession'],
          defaultValue: ['headcount', 'diversity', 'tenure']
        }
      },
      returns: {
        headcount_summary: 'object',
        diversity_metrics: 'object',
        tenure_distribution: 'array',
        skills_inventory: 'array',
        succession_gaps: 'array',
        recommendations: 'array'
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
    allowedDomains: ['hr', 'talent_management', 'employee_data', 'compensation'],
    restrictedActions: [
      'modify_salary_without_approval',
      'terminate_employee',
      'access_medical_records'
    ],
    requireApprovalFor: [
      'update_compensation',
      'change_employee_status',
      'send_performance_review'
    ]
  },

  capabilities: {
    canAccessHR: true,
    canAnalyzeWorkforce: true,
    canSuggestActions: true,
    canForecast: true,
    canUpdateRecords: false,
    canAccessExternalAPIs: true
  },

  examples: [
    {
      user: 'Which employees are at risk of leaving in the engineering department?',
      assistant: '[Using analyzeRetention tool]\n\n📊 **Retention Analysis - Engineering**\n- Current Retention Rate: 87% (12-month)\n- 5 employees flagged as flight risk\n\n[Using predictAttrition tool]\n\n⚠️ **Top Flight Risks:**\n1. **Sarah Chen (Sr. Engineer)** - 72% attrition probability. Key factors: below-market comp (25th percentile), 18 months without promotion.\n2. **James Park (Tech Lead)** - 65% attrition probability. Key factors: high workload, team restructuring.\n\n🎯 **Recommended Actions:**\n1. Initiate comp review for Sarah - market adjustment could reduce risk by 40%\n2. Schedule career development conversation with James\n3. Review engineering team workload distribution'
    },
    {
      user: 'Create a development plan for employee EMP-1042 targeting a management role',
      assistant: '[Using suggestDevelopmentPlan tool]\n\n📈 **Development Plan - EMP-1042 → Engineering Manager**\n\n**Current Strengths:** Technical expertise (9/10), Problem solving (8/10)\n**Skill Gaps:**\n- People management (4/10 → 7/10 needed)\n- Strategic planning (3/10 → 6/10 needed)\n- Budget management (2/10 → 5/10 needed)\n\n📋 **Recommended Path (12 months):**\n1. **Q1**: Leadership fundamentals course + mentor pairing with current EM\n2. **Q2**: Lead a cross-functional project (3-5 people)\n3. **Q3**: Shadow VP Engineering on strategic planning\n4. **Q4**: Interim team lead role for evaluation\n\nWould you like me to assess engagement levels for their current team as well?'
    }
  ],

  monitoring: {
    trackUsage: true,
    trackLatency: true,
    trackAccuracy: true,
    feedbackLoop: true
  }
};

export default HRCoPilotAgent;
