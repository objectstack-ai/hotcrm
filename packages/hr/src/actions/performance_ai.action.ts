/**
 * Performance AI Enhancement Actions
 * 
 * This ObjectStack Action provides AI-powered performance management capabilities.
 * 
 * Functionality:
 * 1. Performance Insights - Generate insights from review data
 * 2. Goal Recommendations - Suggest SMART goals based on role and performance
 * 3. Development Plan Generation - Create personalized development plans
 * 4. Feedback Analysis - Analyze and categorize feedback
 * 5. Calibration Support - Assist with performance calibration across teams
 * 6. 360 Review Synthesis - Synthesize multi-rater feedback
 */

// Mock database interface
const db = {
  doc: {
    get: async (object: string, id: string, options?: any): Promise<any> => ({}),
    update: async (object: string, id: string, data: any): Promise<any> => ({}),
    create: async (object: string, data: any): Promise<any> => ({ id: 'mock-id', ...data })
  },
  find: async (object: string, options?: any): Promise<any[]> => []
};

// ============================================================================
// 1. PERFORMANCE INSIGHTS
// ============================================================================

export interface PerformanceInsightsRequest {
  /** Employee ID or team ID */
  employeeId?: string;
  departmentId?: string;
  /** Time period */
  periodMonths?: number;
}

export interface PerformanceInsightsResponse {
  /** Key insights */
  insights: Array<{
    category: 'strength' | 'opportunity' | 'trend' | 'concern';
    title: string;
    description: string;
    evidence: string[];
    priority: 'high' | 'medium' | 'low';
  }>;
  /** Performance trends */
  trends: {
    overall: 'improving' | 'stable' | 'declining';
    technical_skills: 'improving' | 'stable' | 'declining';
    soft_skills: 'improving' | 'stable' | 'declining';
    leadership: 'improving' | 'stable' | 'declining';
  };
  /** Benchmarking */
  benchmarks: {
    peer_comparison: 'above_average' | 'average' | 'below_average';
    department_percentile: number;
    company_percentile: number;
  };
  /** Action items */
  actionItems: string[];
}

/**
 * Generate performance insights from review data
 */
export async function generatePerformanceInsights(request: PerformanceInsightsRequest): Promise<PerformanceInsightsResponse> {
  const { employeeId, departmentId, periodMonths = 12 } = request;

  if (!employeeId && !departmentId) {
    throw new Error('Either employeeId or departmentId must be provided');
  }

  // Fetch employee or team data
  let context = '';
  if (employeeId) {
    const employee = await db.doc.get('employee', employeeId);
    const reviews = await db.find('performance_review', {
      filters: [['employee_id', '=', employeeId]],
      sort: 'end_date desc',
      limit: 3
    });
    context = `
Employee: ${employee.full_name}
Role: ${employee.position_title}
Recent Reviews: ${reviews.map(r => `${r.review_period}: ${r.overall_rating}/5`).join(', ')}
`;
  } else {
    const employees = await db.find('employee', {
      filters: [['department_id', '=', departmentId]]
    });
    context = `
Department Analysis
Total Employees: ${employees.length}
Average Rating: ${calculateAverage(employees.map(e => e.last_review_rating || 0))}
`;
  }

  const systemPrompt = `
You are an expert performance analyst generating insights.

# Context

${context}

# Time Period

Last ${periodMonths} months

# Task

Generate performance insights:

1. **Key Insights:** Identify 4-6 important findings
   - Strengths: What's working well
   - Opportunities: Areas for growth
   - Trends: Patterns over time
   - Concerns: Red flags or issues

2. **Trends:** Direction of performance
   - Overall, technical skills, soft skills, leadership

3. **Benchmarking:** How does performance compare?
   - Peer comparison
   - Department and company percentiles

4. **Action Items:** Specific recommendations

# Output Format

{
  "insights": [
    {
      "category": "strength",
      "title": "Exceptional Technical Excellence",
      "description": "Consistently delivers high-quality code with minimal defects",
      "evidence": [
        "Average review rating 4.7/5 on technical skills",
        "Code review feedback consistently positive",
        "Zero production incidents in last 6 months"
      ],
      "priority": "high"
    },
    {
      "category": "opportunity",
      "title": "Leadership Skills Development Needed",
      "description": "Strong individual contributor but limited team leadership experience",
      "evidence": [
        "Leadership rating 3.2/5",
        "Has not led any major projects",
        "Peer feedback requests more initiative"
      ],
      "priority": "medium"
    }
  ],
  "trends": {
    "overall": "improving",
    "technical_skills": "stable",
    "soft_skills": "improving",
    "leadership": "stable"
  },
  "benchmarks": {
    "peer_comparison": "above_average",
    "department_percentile": 78,
    "company_percentile": 72
  },
  "actionItems": [
    "Assign leadership role on upcoming project",
    "Enroll in leadership development program",
    "Continue technical mentorship activities"
  ]
}
`.trim();

  const llmResponse = await callLLM(systemPrompt);
  const parsed = JSON.parse(llmResponse);

  return parsed;
}

/**
 * Helper to calculate average
 */
function calculateAverage(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

// ============================================================================
// 2. GOAL RECOMMENDATIONS
// ============================================================================

export interface GoalRecommendationRequest {
  /** Employee ID */
  employeeId: string;
  /** Goal period (quarterly, annual, etc.) */
  goalPeriod: 'quarterly' | 'semi-annual' | 'annual';
  /** Focus areas (optional) */
  focusAreas?: string[];
}

export interface GoalRecommendationResponse {
  /** Recommended goals */
  goals: Array<{
    goal_name: string;
    goal_type: 'performance' | 'development' | 'strategic' | 'behavioral';
    description: string;
    success_criteria: string[];
    timeline_weeks: number;
    priority: 'must_have' | 'should_have' | 'nice_to_have';
    alignment: string;
    resources_needed: string[];
  }>;
  /** Overall strategy */
  strategy: {
    primary_focus: string;
    secondary_focus: string;
    balance_score: number;
  };
}

/**
 * Recommend SMART goals for employee
 */
export async function recommendGoals(request: GoalRecommendationRequest): Promise<GoalRecommendationResponse> {
  const { employeeId, goalPeriod, focusAreas = [] } = request;

  // Fetch employee and context
  const employee = await db.doc.get('employee', employeeId, {
    fields: ['full_name', 'position_title', 'department_name']
  });

  const latestReview = await db.find('performance_review', {
    filters: [['employee_id', '=', employeeId]],
    sort: 'end_date desc',
    limit: 1
  });

  const systemPrompt = `
You are an expert performance coach recommending SMART goals.

# Employee Profile

- Name: ${employee.full_name}
- Role: ${employee.position_title}
- Department: ${employee.department_name}

# Recent Performance Review

${latestReview.length > 0 ? `
- Overall Rating: ${latestReview[0].overall_rating}/5
- Performance Level: ${latestReview[0].performance_level}
- Areas for Improvement: ${latestReview[0].areas_for_improvement || 'Not specified'}
- Development Plan: ${latestReview[0].development_plan || 'Not specified'}
` : 'No recent review available'}

# Goal Period

${goalPeriod}

# Focus Areas

${focusAreas.length > 0 ? focusAreas.join(', ') : 'General performance and development'}

# Task

Recommend 4-6 SMART goals (Specific, Measurable, Achievable, Relevant, Time-bound):

1. **Performance Goals:** Deliver specific outcomes
2. **Development Goals:** Build skills and capabilities
3. **Strategic Goals:** Align with company/department objectives
4. **Behavioral Goals:** Improve soft skills and behaviors

For each goal:
- Write clear, specific goal statement
- Define measurable success criteria
- Set realistic timeline
- Identify required resources
- Explain alignment with broader objectives

# Output Format

{
  "goals": [
    {
      "goal_name": "Lead Migration to Microservices Architecture",
      "goal_type": "performance",
      "description": "Successfully migrate 3 monolithic services to microservices architecture, improving scalability and maintainability",
      "success_criteria": [
        "Complete migration of 3 services by Q3",
        "Achieve 99.9% uptime during migration",
        "Reduce deployment time by 50%",
        "Document architecture decisions"
      ],
      "timeline_weeks": 24,
      "priority": "must_have",
      "alignment": "Aligns with company cloud-native transformation initiative",
      "resources_needed": [
        "Dedicated project team (2-3 engineers)",
        "AWS infrastructure budget",
        "Architecture review support"
      ]
    },
    {
      "goal_name": "Complete Advanced System Design Certification",
      "goal_type": "development",
      "description": "Earn advanced system design certification to deepen architectural expertise",
      "success_criteria": [
        "Complete course by end of Q2",
        "Pass certification exam with 90%+ score",
        "Present learnings to team",
        "Apply concepts to current project"
      ],
      "timeline_weeks": 12,
      "priority": "should_have",
      "alignment": "Supports career progression to senior technical role",
      "resources_needed": [
        "Training budget ($2,500)",
        "Study time allocation (4 hrs/week)"
      ]
    }
  ],
  "strategy": {
    "primary_focus": "Technical leadership and architecture",
    "secondary_focus": "Team mentorship and collaboration",
    "balance_score": 85
  }
}
`.trim();

  const llmResponse = await callLLM(systemPrompt);
  const parsed = JSON.parse(llmResponse);

  return parsed;
}

// ============================================================================
// 3. DEVELOPMENT PLAN GENERATION
// ============================================================================

export interface DevelopmentPlanRequest {
  /** Employee ID */
  employeeId: string;
  /** Performance review ID (optional) */
  reviewId?: string;
  /** Plan duration in months */
  durationMonths?: number;
}

export interface DevelopmentPlanResponse {
  /** Development plan */
  plan: {
    objectives: string[];
    timeline_months: number;
    milestones: Array<{
      milestone: string;
      target_month: number;
      deliverables: string[];
    }>;
  };
  /** Learning activities */
  activities: Array<{
    activity_name: string;
    activity_type: 'training' | 'project' | 'mentoring' | 'reading' | 'certification';
    description: string;
    start_month: number;
    duration_weeks: number;
    cost_estimate: number;
  }>;
  /** Success metrics */
  metrics: Array<{
    metric: string;
    baseline: string;
    target: string;
    measurement_method: string;
  }>;
  /** Resources */
  resources: {
    budget_needed: number;
    time_commitment_hours_per_week: number;
    support_needed: string[];
  };
}

/**
 * Generate comprehensive development plan
 */
export async function generateDevelopmentPlan(request: DevelopmentPlanRequest): Promise<DevelopmentPlanResponse> {
  const { employeeId, reviewId, durationMonths = 6 } = request;

  // Fetch employee data
  const employee = await db.doc.get('employee', employeeId);

  // Fetch performance review if provided
  let reviewData = '';
  if (reviewId) {
    const review = await db.doc.get('performance_review', reviewId);
    reviewData = `
Recent Review:
- Rating: ${review.overall_rating}/5
- Areas for Improvement: ${review.areas_for_improvement}
- Development Plan: ${review.development_plan}
`;
  }

  const systemPrompt = `
You are an expert L&D specialist creating personalized development plans.

# Employee Profile

- Name: ${employee.full_name}
- Role: ${employee.position_title}
- Current Skills: ${employee.skills}

${reviewData}

# Plan Duration

${durationMonths} months

# Task

Create comprehensive development plan:

1. **Objectives:** 3-5 clear development objectives
2. **Milestones:** Key checkpoints over timeline
3. **Learning Activities:** Mix of training, projects, mentoring
4. **Success Metrics:** How to measure progress
5. **Resources:** Budget, time, support needed

# Output Format

{
  "plan": {
    "objectives": [
      "Develop advanced system design capabilities",
      "Build leadership and mentoring skills",
      "Expand cloud architecture expertise"
    ],
    "timeline_months": 6,
    "milestones": [
      {
        "milestone": "Complete system design fundamentals",
        "target_month": 2,
        "deliverables": [
          "Finish online course",
          "Design sample system",
          "Present to team"
        ]
      }
    ]
  },
  "activities": [
    {
      "activity_name": "Advanced System Design Course",
      "activity_type": "training",
      "description": "Online course covering distributed systems, scalability patterns",
      "start_month": 1,
      "duration_weeks": 8,
      "cost_estimate": 2500
    },
    {
      "activity_name": "Lead Architecture Review Project",
      "activity_type": "project",
      "description": "Conduct architecture review of legacy system",
      "start_month": 3,
      "duration_weeks": 12,
      "cost_estimate": 0
    }
  ],
  "metrics": [
    {
      "metric": "System Design Proficiency",
      "baseline": "Intermediate",
      "target": "Advanced",
      "measurement_method": "Certification exam + peer review"
    }
  ],
  "resources": {
    "budget_needed": 5000,
    "time_commitment_hours_per_week": 4,
    "support_needed": [
      "Manager approval for training budget",
      "Senior architect mentorship",
      "Project assignment for practice"
    ]
  }
}
`.trim();

  const llmResponse = await callLLM(systemPrompt);
  const parsed = JSON.parse(llmResponse);

  return parsed;
}

// ============================================================================
// 4. FEEDBACK ANALYSIS
// ============================================================================

export interface FeedbackAnalysisRequest {
  /** Feedback text to analyze */
  feedbackText: string;
  /** Feedback type */
  feedbackType: 'peer' | 'manager' | 'self' | '360' | 'upward';
}

export interface FeedbackAnalysisResponse {
  /** Categorized feedback */
  categories: {
    strengths: string[];
    areas_for_improvement: string[];
    achievements: string[];
    concerns: string[];
  };
  /** Sentiment analysis */
  sentiment: {
    overall: 'very_positive' | 'positive' | 'neutral' | 'constructive' | 'negative';
    tone: string;
    supportiveness: number;
  };
  /** Key themes */
  themes: Array<{
    theme: string;
    frequency: number;
    examples: string[];
  }>;
  /** Actionable items */
  actionableItems: string[];
  /** Summary */
  summary: string;
}

/**
 * Analyze and categorize performance feedback
 */
export async function analyzeFeedback(request: FeedbackAnalysisRequest): Promise<FeedbackAnalysisResponse> {
  const { feedbackText, feedbackType } = request;

  const systemPrompt = `
You are an expert at analyzing performance feedback.

# Feedback Type

${feedbackType}

# Feedback Text

${feedbackText}

# Task

Analyze the feedback:

1. **Categorize:** Separate into strengths, improvements, achievements, concerns
2. **Sentiment:** Assess tone and supportiveness
3. **Themes:** Identify recurring themes
4. **Actions:** Extract actionable recommendations
5. **Summary:** Brief overview

# Output Format

{
  "categories": {
    "strengths": [
      "Excellent technical problem-solving abilities",
      "Strong collaboration with cross-functional teams"
    ],
    "areas_for_improvement": [
      "Could improve time management on large projects",
      "More proactive communication needed"
    ],
    "achievements": [
      "Successfully delivered Q3 migration project",
      "Mentored 2 junior engineers"
    ],
    "concerns": []
  },
  "sentiment": {
    "overall": "positive",
    "tone": "Constructive and supportive",
    "supportiveness": 85
  },
  "themes": [
    {
      "theme": "Technical Excellence",
      "frequency": 5,
      "examples": [
        "Deep understanding of system architecture",
        "High-quality code reviews",
        "Innovative problem-solving"
      ]
    },
    {
      "theme": "Communication",
      "frequency": 3,
      "examples": [
        "Clear technical explanations",
        "Could update stakeholders more frequently"
      ]
    }
  ],
  "actionableItems": [
    "Implement weekly status updates for large projects",
    "Continue technical mentorship activities",
    "Explore project management training"
  ],
  "summary": "Strong technical performer with excellent problem-solving skills and team collaboration. Focus areas include improving project communication and time management for complex initiatives."
}
`.trim();

  const llmResponse = await callLLM(systemPrompt);
  const parsed = JSON.parse(llmResponse);

  return parsed;
}

// ============================================================================
// 5. CALIBRATION SUPPORT
// ============================================================================

export interface CalibrationRequest {
  /** Department or team ID */
  departmentId: string;
  /** Review period */
  reviewPeriod: string;
}

export interface CalibrationResponse {
  /** Rating distribution */
  distribution: {
    outstanding: number;
    exceeds_expectations: number;
    meets_expectations: number;
    needs_improvement: number;
    unsatisfactory: number;
  };
  /** Distribution analysis */
  analysis: {
    follows_curve: boolean;
    skew: 'high' | 'balanced' | 'low';
    potential_issues: string[];
    recommendations: string[];
  };
  /** Outliers */
  outliers: Array<{
    employee_id: string;
    employee_name: string;
    rating: number;
    concern: string;
    suggested_action: string;
  }>;
  /** Calibration suggestions */
  suggestions: Array<{
    employee_id: string;
    current_rating: number;
    suggested_rating: number;
    reasoning: string;
  }>;
}

/**
 * Support performance calibration across team
 */
export async function supportCalibration(request: CalibrationRequest): Promise<CalibrationResponse> {
  const { departmentId, reviewPeriod } = request;

  // Fetch reviews for the period
  const reviews = await db.find('performance_review', {
    filters: [
      ['review_period', '=', reviewPeriod]
      // Would also filter by department in production
    ]
  });

  const systemPrompt = `
You are an expert at performance calibration ensuring fair and consistent ratings.

# Reviews to Calibrate

Total Reviews: ${reviews.length}

${reviews.map((r, i) => `
${i + 1}. ${r.employee_name || 'Employee ' + (i + 1)}
   - Rating: ${r.overall_rating}/5 (${r.performance_level})
   - Manager: ${r.reviewer_name}
`).join('\n')}

# Task

Analyze rating distribution and provide calibration support:

1. **Distribution:** Count ratings by level
2. **Analysis:** Check for balanced distribution (typical: 10% outstanding, 20% exceeds, 60% meets, 10% needs improvement)
3. **Outliers:** Identify potential rating inflation/deflation
4. **Suggestions:** Recommend adjustments for fairness

# Output Format

{
  "distribution": {
    "outstanding": 2,
    "exceeds_expectations": 4,
    "meets_expectations": 10,
    "needs_improvement": 2,
    "unsatisfactory": 0
  },
  "analysis": {
    "follows_curve": true,
    "skew": "balanced",
    "potential_issues": [],
    "recommendations": [
      "Distribution is well-balanced",
      "No significant calibration issues detected"
    ]
  },
  "outliers": [],
  "suggestions": []
}
`.trim();

  const llmResponse = await callLLM(systemPrompt);
  const parsed = JSON.parse(llmResponse);

  return parsed;
}

// ============================================================================
// 6. 360 REVIEW SYNTHESIS
// ============================================================================

export interface Review360SynthesisRequest {
  /** Performance review ID */
  reviewId: string;
}

export interface Review360SynthesisResponse {
  /** Synthesized feedback by category */
  synthesis: {
    strengths: Array<{
      theme: string;
      mentions: number;
      sources: string[];
      quotes: string[];
    }>;
    improvements: Array<{
      theme: string;
      mentions: number;
      sources: string[];
      quotes: string[];
    }>;
  };
  /** Consensus areas */
  consensus: {
    strong_agreement: string[];
    some_agreement: string[];
    divergent_views: Array<{
      topic: string;
      perspectives: string[];
    }>;
  };
  /** Blind spots */
  blindSpots: Array<{
    area: string;
    self_rating: number;
    others_rating: number;
    gap: number;
    implication: string;
  }>;
  /** Overall summary */
  summary: {
    key_strengths: string[];
    priority_development_areas: string[];
    recommendations: string[];
  };
}

/**
 * Synthesize 360-degree review feedback
 */
export async function synthesize360Review(request: Review360SynthesisRequest): Promise<Review360SynthesisResponse> {
  const { reviewId } = request;

  // Fetch review and related feedback
  const review = await db.doc.get('performance_review', reviewId);
  
  // In production, would fetch actual 360 feedback from related records
  const feedback = {
    self: review.self_assessment || '',
    manager: review.manager_feedback || '',
    peers: [],
    direct_reports: []
  };

  const systemPrompt = `
You are an expert at synthesizing 360-degree feedback.

# Review Data

Employee: ${review.employee_name}
Self-Assessment: ${feedback.self}
Manager Feedback: ${feedback.manager}
Peer Feedback: ${feedback.peers.length} responses
Direct Report Feedback: ${feedback.direct_reports.length} responses

# Task

Synthesize multi-rater feedback:

1. **Themes:** Identify common strengths and improvement areas
2. **Consensus:** What do multiple raters agree on?
3. **Blind Spots:** Where does self-perception differ from others?
4. **Summary:** Key insights and recommendations

# Output Format

{
  "synthesis": {
    "strengths": [
      {
        "theme": "Technical Excellence",
        "mentions": 8,
        "sources": ["self", "manager", "6 peers"],
        "quotes": [
          "Exceptional problem-solving abilities",
          "Deep technical knowledge",
          "Consistently delivers high-quality work"
        ]
      }
    ],
    "improvements": [
      {
        "theme": "Communication",
        "mentions": 5,
        "sources": ["manager", "4 peers"],
        "quotes": [
          "Could provide more frequent updates",
          "Sometimes unclear in written communication"
        ]
      }
    ]
  },
  "consensus": {
    "strong_agreement": [
      "Outstanding technical skills",
      "Reliable and dependable",
      "Positive team player"
    ],
    "some_agreement": [
      "Could improve stakeholder communication",
      "More initiative on process improvements"
    ],
    "divergent_views": [
      {
        "topic": "Leadership abilities",
        "perspectives": [
          "Self: Sees self as informal leader",
          "Manager: Wants to see more formal leadership",
          "Peers: Mixed views on leadership style"
        ]
      }
    ]
  },
  "blindSpots": [
    {
      "area": "Communication Skills",
      "self_rating": 4,
      "others_rating": 3.2,
      "gap": 0.8,
      "implication": "May not be aware of communication challenges others experience"
    }
  ],
  "summary": {
    "key_strengths": [
      "Exceptional technical capabilities",
      "Strong team collaboration",
      "Consistent high-quality delivery"
    ],
    "priority_development_areas": [
      "Enhance stakeholder communication",
      "Develop formal leadership skills",
      "Increase proactive problem identification"
    ],
    "recommendations": [
      "Enroll in executive communication workshop",
      "Take on team lead role on next project",
      "Implement weekly stakeholder updates"
    ]
  }
}
`.trim();

  const llmResponse = await callLLM(systemPrompt);
  const parsed = JSON.parse(llmResponse);

  return parsed;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Mock LLM API call
 * In production, replace with actual OpenAI/Anthropic API
 */
async function callLLM(prompt: string): Promise<string> {
  console.log('🤖 Calling LLM API for performance AI...');
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Mock responses based on prompt type
  if (prompt.includes('performance analyst') || prompt.includes('performance insights')) {
    return JSON.stringify({
      insights: [
        {
          category: 'strength',
          title: 'Exceptional Technical Excellence',
          description: 'Consistently delivers high-quality technical work with minimal defects',
          evidence: [
            'Average technical skills rating: 4.8/5 across last 3 reviews',
            'Zero production incidents attributed to code in last 12 months',
            'Peer code reviews consistently rated as thorough and helpful'
          ],
          priority: 'high'
        },
        {
          category: 'opportunity',
          title: 'Leadership Development Opportunity',
          description: 'Strong IC but limited formal leadership experience',
          evidence: [
            'Leadership rating: 3.3/5',
            'Has not led cross-team initiatives',
            'Manager feedback suggests readiness for team lead role'
          ],
          priority: 'medium'
        },
        {
          category: 'trend',
          title: 'Improving Communication Skills',
          description: 'Steady improvement in stakeholder communication',
          evidence: [
            'Communication rating improved from 3.5 to 4.2 over last year',
            'Recent feedback highlights better status updates',
            'Successfully presented at team tech talk'
          ],
          priority: 'medium'
        }
      ],
      trends: {
        overall: 'improving',
        technical_skills: 'stable',
        soft_skills: 'improving',
        leadership: 'stable'
      },
      benchmarks: {
        peer_comparison: 'above_average',
        department_percentile: 78,
        company_percentile: 72
      },
      actionItems: [
        'Assign team lead role on Q2 migration project',
        'Enroll in leadership development program',
        'Continue technical mentorship activities',
        'Nominate for senior engineer promotion track'
      ]
    });
  }

  if (prompt.includes('SMART goals') || prompt.includes('performance coach')) {
    return JSON.stringify({
      goals: [
        {
          goal_name: 'Lead Migration to Microservices Architecture',
          goal_type: 'performance',
          description: 'Successfully migrate 3 monolithic services to microservices, improving scalability and reducing deployment time by 50%',
          success_criteria: [
            'Complete migration of UserService, OrderService, PaymentService by Q3',
            'Maintain 99.9% uptime during migration',
            'Reduce average deployment time from 2 hours to 1 hour',
            'Document architecture decisions and migration playbook'
          ],
          timeline_weeks: 24,
          priority: 'must_have',
          alignment: 'Critical for company cloud-native transformation initiative',
          resources_needed: [
            'Dedicated project team (2-3 engineers)',
            'AWS infrastructure budget ($15K)',
            'Senior architect review support'
          ]
        },
        {
          goal_name: 'Mentor 2 Junior Engineers to Productivity',
          goal_type: 'behavioral',
          description: 'Provide structured mentorship to help 2 junior engineers become productive team contributors',
          success_criteria: [
            'Establish bi-weekly 1:1 mentoring sessions',
            'Both mentees complete onboarding within 60 days',
            'Mentees independently deliver 2+ features',
            'Positive feedback from mentees and manager'
          ],
          timeline_weeks: 26,
          priority: 'should_have',
          alignment: 'Supports team scaling and develops leadership capabilities',
          resources_needed: [
            'Time allocation (2 hours/week)',
            'Mentorship training materials'
          ]
        },
        {
          goal_name: 'Achieve AWS Solutions Architect Professional Certification',
          goal_type: 'development',
          description: 'Earn advanced AWS certification to deepen cloud architecture expertise',
          success_criteria: [
            'Complete certification by end of Q2',
            'Pass exam with score >= 850/1000',
            'Present learnings to team (30-min tech talk)',
            'Apply 3+ new patterns to current projects'
          ],
          timeline_weeks: 16,
          priority: 'should_have',
          alignment: 'Aligns with career progression to senior technical role',
          resources_needed: [
            'Training budget ($2,500)',
            'Study time (5 hours/week)',
            'Practice exam licenses'
          ]
        }
      ],
      strategy: {
        primary_focus: 'Technical leadership and architecture expertise',
        secondary_focus: 'Team development and mentorship',
        balance_score: 88
      }
    });
  }

  if (prompt.includes('development plan') || prompt.includes('L&D specialist')) {
    return JSON.stringify({
      plan: {
        objectives: [
          'Develop advanced system design and architecture capabilities',
          'Build leadership and mentoring skills for senior role progression',
          'Expand cloud-native and DevOps expertise'
        ],
        timeline_months: 6,
        milestones: [
          {
            milestone: 'System Design Fundamentals Complete',
            target_month: 2,
            deliverables: [
              'Complete "Designing Data-Intensive Applications" course',
              'Design and present sample distributed system',
              'Apply learnings to current project architecture'
            ]
          },
          {
            milestone: 'Leadership Competency Development',
            target_month: 4,
            deliverables: [
              'Complete leadership fundamentals training',
              'Lead first cross-team project kickoff',
              'Establish mentoring relationship with 2 junior engineers'
            ]
          },
          {
            milestone: 'AWS Certification Achieved',
            target_month: 6,
            deliverables: [
              'Pass AWS Solutions Architect Professional exam',
              'Present certification learnings to team',
              'Implement 3 new AWS patterns in production'
            ]
          }
        ]
      },
      activities: [
        {
          activity_name: 'Advanced System Design Course',
          activity_type: 'training',
          description: 'Comprehensive online course covering distributed systems, scalability patterns, and architectural trade-offs',
          start_month: 1,
          duration_weeks: 8,
          cost_estimate: 2500
        },
        {
          activity_name: 'AWS Solutions Architect Professional Prep',
          activity_type: 'certification',
          description: 'Self-paced certification preparation with practice exams',
          start_month: 3,
          duration_weeks: 12,
          cost_estimate: 1500
        },
        {
          activity_name: 'Leadership Fundamentals Workshop',
          activity_type: 'training',
          description: 'Two-day workshop on technical leadership essentials',
          start_month: 3,
          duration_weeks: 1,
          cost_estimate: 1200
        },
        {
          activity_name: 'Lead Architecture Review Project',
          activity_type: 'project',
          description: 'Conduct comprehensive architecture review of legacy payment system',
          start_month: 2,
          duration_weeks: 16,
          cost_estimate: 0
        },
        {
          activity_name: 'Shadow Senior Architect',
          activity_type: 'mentoring',
          description: 'Monthly architecture review sessions with principal architect',
          start_month: 1,
          duration_weeks: 24,
          cost_estimate: 0
        }
      ],
      metrics: [
        {
          metric: 'System Design Proficiency',
          baseline: 'Intermediate',
          target: 'Advanced',
          measurement_method: 'AWS certification + architecture review quality assessment'
        },
        {
          metric: 'Leadership Effectiveness',
          baseline: 'Informal contributor',
          target: 'Project lead capability',
          measurement_method: '360 feedback from project team + manager assessment'
        },
        {
          metric: 'Cloud Architecture Expertise',
          baseline: '3 AWS services proficient',
          target: '10+ AWS services proficient',
          measurement_method: 'Certification exam + production implementations'
        }
      ],
      resources: {
        budget_needed: 5200,
        time_commitment_hours_per_week: 5,
        support_needed: [
          'Manager approval for training budget and time allocation',
          'Principal architect mentorship commitment',
          'Project assignment for architecture review',
          'Team lead opportunity on upcoming initiative'
        ]
      }
    });
  }

  if (prompt.includes('analyzing performance feedback') || prompt.includes('Analyze the feedback')) {
    return JSON.stringify({
      categories: {
        strengths: [
          'Exceptional technical problem-solving and debugging skills',
          'Strong collaboration with product and design teams',
          'Proactive in identifying and fixing technical debt',
          'Mentors junior team members effectively'
        ],
        areas_for_improvement: [
          'Could improve time estimation accuracy on complex projects',
          'Sometimes focuses on perfection over timely delivery',
          'More frequent status updates needed during long-running tasks'
        ],
        achievements: [
          'Successfully delivered Q3 microservices migration ahead of schedule',
          'Reduced production incidents by 40% through improved monitoring',
          'Mentored 2 junior engineers to independent productivity'
        ],
        concerns: []
      },
      sentiment: {
        overall: 'positive',
        tone: 'Constructive, supportive, and encouraging',
        supportiveness: 88
      },
      themes: [
        {
          theme: 'Technical Excellence',
          frequency: 7,
          examples: [
            'Deep understanding of system architecture',
            'High-quality, well-tested code',
            'Innovative solutions to complex problems'
          ]
        },
        {
          theme: 'Collaboration',
          frequency: 5,
          examples: [
            'Works well across teams',
            'Helps unblock teammates',
            'Clear technical communication'
          ]
        },
        {
          theme: 'Time Management',
          frequency: 3,
          examples: [
            'Sometimes underestimates complexity',
            'Could improve project timeline communication'
          ]
        }
      ],
      actionableItems: [
        'Implement weekly status updates for multi-week projects',
        'Use Agile estimation techniques (story points, planning poker)',
        'Continue and formalize mentorship activities',
        'Balance quality with delivery timelines using "good enough" principle'
      ],
      summary: 'Outstanding technical performer with excellent problem-solving abilities and strong team collaboration. Demonstrates leadership through effective mentoring. Primary development areas include improving project time estimation and communication cadence for complex initiatives.'
    });
  }

  if (prompt.includes('calibration') || prompt.includes('consistent ratings')) {
    return JSON.stringify({
      distribution: {
        outstanding: 2,
        exceeds_expectations: 5,
        meets_expectations: 11,
        needs_improvement: 2,
        unsatisfactory: 0
      },
      analysis: {
        follows_curve: true,
        skew: 'balanced',
        potential_issues: [
          'Manager A rated all 5 direct reports as "Exceeds Expectations" - possible inflation'
        ],
        recommendations: [
          'Overall distribution is healthy (10% outstanding, 25% exceeds, 55% meets, 10% needs improvement)',
          'Review Manager A\'s ratings for potential inflation',
          'Consider relative ranking within peer groups'
        ]
      },
      outliers: [
        {
          employee_id: 'emp_001',
          employee_name: 'Jane Smith',
          rating: 5.0,
          concern: 'Perfect 5.0 rating is unusual; ensure rating is well-justified',
          suggested_action: 'Review supporting evidence with manager'
        }
      ],
      suggestions: [
        {
          employee_id: 'emp_003',
          current_rating: 4.5,
          suggested_rating: 4.0,
          reasoning: 'Rating may be inflated compared to peers with similar achievements; consider recalibration to "Exceeds Expectations" (4.0) vs "Outstanding" (4.5+)'
        }
      ]
    });
  }

  // 360 Review Synthesis
  return JSON.stringify({
    synthesis: {
      strengths: [
        {
          theme: 'Technical Excellence',
          mentions: 9,
          sources: ['self', 'manager', '5 peers', '2 direct reports'],
          quotes: [
            'Exceptional problem-solving abilities and deep technical knowledge',
            'Consistently delivers high-quality, well-architected solutions',
            'Go-to person for complex technical challenges'
          ]
        },
        {
          theme: 'Team Collaboration',
          mentions: 7,
          sources: ['self', 'manager', '4 peers', '1 direct report'],
          quotes: [
            'Great team player who helps unblock others',
            'Positive, supportive attitude',
            'Makes complex topics accessible to non-technical stakeholders'
          ]
        },
        {
          theme: 'Mentorship',
          mentions: 5,
          sources: ['manager', '2 peers', '2 direct reports'],
          quotes: [
            'Patient and effective mentor',
            'Takes time to explain concepts thoroughly',
            'Helped me grow significantly as an engineer'
          ]
        }
      ],
      improvements: [
        {
          theme: 'Communication Frequency',
          mentions: 6,
          sources: ['manager', '4 peers', '1 self-identified'],
          quotes: [
            'Could provide more frequent project status updates',
            'Sometimes unclear on timeline expectations',
            'Would benefit from more proactive communication'
          ]
        },
        {
          theme: 'Delegation',
          mentions: 3,
          sources: ['manager', '2 direct reports'],
          quotes: [
            'Tends to take on too much work personally',
            'Could delegate more to help team members grow',
            'Sometimes becomes a bottleneck on critical path'
          ]
        }
      ]
    },
    consensus: {
      strong_agreement: [
        'Outstanding technical skills and problem-solving',
        'Positive team player and collaborator',
        'Effective mentor for junior engineers',
        'High-quality work output'
      ],
      some_agreement: [
        'Could improve communication frequency',
        'Ready for more leadership responsibility',
        'Sometimes perfection gets in way of timely delivery'
      ],
      divergent_views: [
        {
          topic: 'Leadership readiness',
          perspectives: [
            'Self: Feels ready for team lead role',
            'Manager: Wants to see more delegation before promoting',
            'Peers: Mixed views - some see strong leadership, others want more initiative'
          ]
        }
      ]
    },
    blindSpots: [
      {
        area: 'Communication Frequency',
        self_rating: 4.0,
        others_rating: 3.2,
        gap: 0.8,
        implication: 'Not fully aware of how communication gaps impact stakeholders'
      },
      {
        area: 'Delegation Skills',
        self_rating: 3.5,
        others_rating: 2.8,
        gap: 0.7,
        implication: 'Underestimates the bottleneck created by not delegating more'
      }
    ],
    summary: {
      key_strengths: [
        'Exceptional technical capabilities and problem-solving',
        'Strong team collaboration and mentorship',
        'Consistent high-quality delivery',
        'Positive influence on team culture'
      ],
      priority_development_areas: [
        'Improve stakeholder communication cadence',
        'Develop delegation skills to scale impact',
        'Balance quality with timely delivery',
        'Build formal leadership capabilities'
      ],
      recommendations: [
        'Implement weekly stakeholder update routine',
        'Take on team lead role with mentorship on delegation',
        'Enroll in executive communication workshop',
        'Work with manager on leadership development plan'
      ]
    }
  });
}

// Export all functions
export default {
  generatePerformanceInsights,
  recommendGoals,
  generateDevelopmentPlan,
  analyzeFeedback,
  supportCalibration,
  synthesize360Review
};
