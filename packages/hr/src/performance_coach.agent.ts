import { Agent } from '@objectstack/spec/ai';

/**
 * Performance Coach Agent
 * AI-driven OKR recommendations and performance insights.
 * Part of Phase 2: Deep Intelligence.
 */
export const PerformanceCoachAgent = Agent.create({
  name: 'performance_coach',
  role: 'Performance Coach',
  description: 'AI-driven performance coaching agent that provides OKR recommendations, performance insights, and personalized development guidance',

  systemPrompt: `You are an expert performance coach with deep knowledge of OKR methodology, performance management, and professional development.

Your responsibilities:
1. Generate personalized OKR recommendations aligned with company and team objectives
2. Analyze performance trends and provide actionable insights
3. Identify skill gaps and recommend targeted development activities
4. Provide coaching on goal-setting best practices (SMART criteria)
5. Benchmark individual performance against team and industry standards
6. Suggest recognition and feedback strategies for managers

Guidelines:
- Base all recommendations on data and measurable outcomes
- Ensure OKRs are ambitious yet achievable (70% target achievement rate)
- Consider both individual growth and organizational alignment
- Provide specific, actionable development recommendations
- Respect confidentiality of performance data
- Encourage a growth mindset and continuous improvement

Tone: Supportive, constructive, and data-informed.`,

  tools: [
    {
      name: 'recommendOKRs',
      description: 'Generate personalized OKR recommendations based on role, department goals, and past performance',
      action: 'okr_recommendation',
      parameters: {
        employee_id: {
          type: 'string',
          required: true,
          description: 'The employee ID to generate OKRs for'
        },
        period: {
          type: 'string',
          enum: ['quarterly', 'half_yearly', 'annual'],
          defaultValue: 'quarterly'
        },
        focus_areas: {
          type: 'array',
          description: 'Specific areas to focus OKRs on',
          items: ['performance', 'development', 'leadership', 'innovation', 'collaboration']
        }
      },
      returns: {
        objectives: 'array',
        alignment_score: 'number',
        stretch_factor: 'number',
        rationale: 'string'
      }
    },

    {
      name: 'analyzePerformanceTrends',
      description: 'Analyze performance trends over time and identify patterns',
      action: 'performance_trend_analysis',
      parameters: {
        employee_id: {
          type: 'string',
          required: true
        },
        period: {
          type: 'string',
          enum: ['6_months', '1_year', '2_years'],
          defaultValue: '1_year'
        }
      },
      returns: {
        trend_direction: 'string',
        performance_score: 'number',
        strengths: 'array',
        improvement_areas: 'array',
        peer_comparison: 'object',
        trajectory: 'string'
      }
    },

    {
      name: 'identifySkillGaps',
      description: 'Identify skill gaps between current capabilities and role requirements or career goals',
      action: 'skill_gap_analysis',
      parameters: {
        employee_id: {
          type: 'string',
          required: true
        },
        target_role: {
          type: 'string',
          description: 'Optional target role for career progression analysis'
        }
      },
      returns: {
        current_skills: 'array',
        required_skills: 'array',
        gaps: 'array',
        recommended_training: 'array',
        estimated_time_to_close: 'string'
      }
    },

    {
      name: 'generateDevelopmentPlan',
      description: 'Create a personalized development plan with milestones and resources',
      action: 'development_plan',
      parameters: {
        employee_id: {
          type: 'string',
          required: true
        },
        goals: {
          type: 'array',
          description: 'Development goals to plan for'
        },
        timeline: {
          type: 'string',
          enum: ['3_months', '6_months', '12_months'],
          defaultValue: '6_months'
        }
      },
      returns: {
        plan: 'object',
        milestones: 'array',
        resources: 'array',
        success_metrics: 'array',
        check_in_schedule: 'array'
      }
    },

    {
      name: 'benchmarkPerformance',
      description: 'Benchmark individual performance against team, department, and industry standards',
      action: 'performance_benchmark',
      parameters: {
        employee_id: {
          type: 'string',
          required: true
        },
        benchmark_scope: {
          type: 'string',
          enum: ['team', 'department', 'company', 'industry'],
          defaultValue: 'team'
        }
      },
      returns: {
        percentile: 'number',
        benchmark_data: 'object',
        standout_areas: 'array',
        development_areas: 'array',
        peer_insights: 'object'
      }
    },

    {
      name: 'suggestRecognition',
      description: 'Suggest recognition and feedback strategies based on employee achievements',
      action: 'recognition_suggestion',
      parameters: {
        employee_id: {
          type: 'string',
          required: true
        },
        achievement_type: {
          type: 'string',
          enum: ['goal_completion', 'exceptional_performance', 'team_contribution', 'innovation', 'milestone']
        }
      },
      returns: {
        recognition_type: 'string',
        suggested_message: 'string',
        visibility: 'string',
        timing: 'string',
        follow_up_actions: 'array'
      }
    }
  ],

  model: {
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.5,
    maxTokens: 2000,
    topP: 1.0
  },

  memory: {
    type: 'conversational',
    maxMessages: 10,
    summaryThreshold: 8,
    persistAcrossSessions: true
  },

  safety: {
    enableContentFilter: true,
    allowedDomains: ['hr', 'performance', 'development', 'training'],
    restrictedActions: [
      'modify_salary',
      'change_performance_rating',
      'access_disciplinary_records',
      'share_performance_data_externally',
      'override_manager_decisions'
    ],
    requireApprovalFor: [
      'submit_performance_review',
      'assign_training_budget',
      'escalate_performance_concern'
    ]
  },

  capabilities: {
    canAccessPerformanceData: true,
    canRecommendOKRs: true,
    canAnalyzeTrends: true,
    canGeneratePlans: true,
    canUpdateRecords: false,
    canAccessTrainingCatalog: true
  },

  examples: [
    {
      user: 'Suggest OKRs for the upcoming quarter for John in Engineering',
      assistant: '[Using analyzePerformanceTrends tool]\n[Using recommendOKRs tool]\n\n📊 **Q2 OKR Recommendations - John (Senior Engineer)**\n\n**Objective 1: Improve System Reliability**\n- KR1: Reduce P1 incidents by 40% (from 5 to 3/month)\n- KR2: Achieve 99.95% uptime for core services\n- KR3: Complete chaos engineering framework by end of quarter\n\n**Objective 2: Accelerate Technical Growth**\n- KR1: Lead 2 architecture design reviews\n- KR2: Mentor 1 junior engineer through onboarding\n- KR3: Complete AWS Solutions Architect certification\n\n**Alignment Score**: 92% with team objectives\n**Stretch Factor**: 1.3x (ambitious but achievable)\n\nThese OKRs build on John\'s strong system design skills while addressing the team\'s reliability goals.'
    },
    {
      user: 'What development areas should I focus on for my team?',
      assistant: '[Using analyzePerformanceTrends tool for team]\n[Using identifySkillGaps tool]\n\n📈 **Team Development Insights**\n\n**Top 3 Team Gaps:**\n1. **Cloud Architecture** - 60% of team below target proficiency\n   - Recommended: AWS/GCP certification program\n   - Timeline: 3 months\n2. **Technical Communication** - Feedback shows inconsistent documentation\n   - Recommended: Technical writing workshop\n   - Timeline: 1 month\n3. **Leadership Skills** - 3 senior members ready for growth\n   - Recommended: Leadership development track\n   - Timeline: 6 months\n\n**Quick Wins:**\n- Pair programming sessions (addresses skill transfer)\n- Weekly tech talks (builds presentation skills)\n\nWould you like me to generate individual development plans?'
    }
  ],

  monitoring: {
    trackUsage: true,
    trackLatency: true,
    trackAccuracy: true,
    feedbackLoop: true
  }
});

export default PerformanceCoachAgent;
