import { Agent } from '@objectstack/spec/ai';

/**
 * Recruitment Assistant Agent
 * Auto-screens resumes and schedules interviews based on fit scores.
 * Part of Phase 2: Deep Intelligence.
 */
export const RecruitmentAssistantAgent = Agent.create({
  name: 'recruitment_assistant',
  role: 'Recruitment AI Assistant',
  description: 'Intelligent recruitment agent that auto-screens resumes, scores candidates against job requirements, and schedules interviews based on fit scores',

  systemPrompt: `You are an expert recruitment assistant with deep knowledge of talent acquisition, candidate evaluation, and hiring best practices.

Your responsibilities:
1. Auto-screen resumes against job requirements and generate fit scores
2. Extract and validate candidate skills, experience, and qualifications
3. Rank candidates and recommend interview shortlists
4. Schedule interviews based on fit scores and interviewer availability
5. Generate interview preparation kits with tailored questions
6. Identify potential red flags and highlight standout qualifications

Guidelines:
- Evaluate candidates objectively based on skills and experience
- Ensure fair and unbiased screening across all demographics
- Prioritize candidates with the highest fit scores for scheduling
- Consider both hard skills (technical) and soft skills (cultural fit)
- Flag candidates who exceed requirements as potential fast-track hires
- Respect candidate privacy and handle data in compliance with regulations

Tone: Professional, objective, and efficient.`,

  tools: [
    {
      name: 'screenResume',
      description: 'Auto-screen a resume against job requirements and generate a detailed fit score',
      action: 'resume_screening',
      parameters: {
        candidate_id: {
          type: 'string',
          required: true,
          description: 'The candidate ID to screen'
        },
        position_id: {
          type: 'string',
          required: true,
          description: 'The position to screen against'
        },
        resume_text: {
          type: 'string',
          required: true,
          description: 'Resume content as text'
        }
      },
      returns: {
        fit_score: 'number',
        skill_match: 'object',
        experience_match: 'object',
        education_match: 'object',
        recommendation: 'string',
        highlights: 'array',
        gaps: 'array'
      }
    },

    {
      name: 'rankCandidates',
      description: 'Rank and score multiple candidates for a position based on fit analysis',
      action: 'candidate_ranking',
      parameters: {
        position_id: {
          type: 'string',
          required: true
        },
        candidate_ids: {
          type: 'array',
          required: true,
          description: 'List of candidate IDs to rank'
        },
        criteria_weights: {
          type: 'object',
          description: 'Custom weights for ranking criteria',
          defaultValue: {
            skills: 0.35,
            experience: 0.30,
            education: 0.15,
            cultural_fit: 0.20
          }
        }
      },
      returns: {
        rankings: 'array',
        top_candidates: 'array',
        shortlist_recommendation: 'array',
        diversity_metrics: 'object'
      }
    },

    {
      name: 'scheduleInterview',
      description: 'Schedule an interview based on candidate fit score and interviewer availability',
      action: 'interview_scheduling',
      parameters: {
        candidate_id: {
          type: 'string',
          required: true
        },
        position_id: {
          type: 'string',
          required: true
        },
        interview_type: {
          type: 'string',
          enum: ['phone_screen', 'technical', 'behavioral', 'panel', 'final'],
          required: true
        },
        preferred_dates: {
          type: 'array',
          description: 'Preferred date ranges for scheduling'
        }
      },
      returns: {
        interview_id: 'string',
        scheduled_date: 'string',
        interviewers: 'array',
        interview_kit: 'object',
        calendar_link: 'string'
      }
    },

    {
      name: 'generateInterviewKit',
      description: 'Generate tailored interview questions and evaluation criteria for a candidate',
      action: 'interview_preparation',
      parameters: {
        candidate_id: {
          type: 'string',
          required: true
        },
        position_id: {
          type: 'string',
          required: true
        },
        interview_type: {
          type: 'string',
          enum: ['phone_screen', 'technical', 'behavioral', 'panel', 'final'],
          required: true
        }
      },
      returns: {
        questions: 'array',
        evaluation_rubric: 'object',
        candidate_brief: 'object',
        red_flags_to_probe: 'array',
        key_skills_to_assess: 'array'
      }
    },

    {
      name: 'assessCulturalFit',
      description: 'Evaluate candidate cultural fit based on communication, values alignment, and team dynamics',
      action: 'cultural_fit_assessment',
      parameters: {
        candidate_id: {
          type: 'string',
          required: true
        },
        department_id: {
          type: 'string',
          required: true
        }
      },
      returns: {
        cultural_fit_score: 'number',
        strengths: 'array',
        potential_concerns: 'array',
        team_compatibility: 'object'
      }
    },

    {
      name: 'getHiringPipelineInsights',
      description: 'Provide analytics and insights on the current hiring pipeline for a position',
      action: 'pipeline_analytics',
      parameters: {
        position_id: {
          type: 'string',
          required: true
        }
      },
      returns: {
        total_applicants: 'number',
        stage_breakdown: 'object',
        avg_time_to_hire: 'number',
        conversion_rates: 'object',
        bottleneck_stages: 'array',
        quality_metrics: 'object'
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
    maxMessages: 15,
    summaryThreshold: 12,
    persistAcrossSessions: true
  },

  safety: {
    enableContentFilter: true,
    allowedDomains: ['hr', 'recruitment', 'candidate_data'],
    restrictedActions: [
      'reject_candidate_without_review',
      'access_salary_data',
      'modify_offer_terms',
      'share_candidate_data_externally',
      'bypass_approval_workflow'
    ],
    requireApprovalFor: [
      'send_rejection_email',
      'extend_offer',
      'schedule_final_round'
    ]
  },

  capabilities: {
    canScreenResumes: true,
    canRankCandidates: true,
    canScheduleInterviews: true,
    canGenerateQuestions: true,
    canUpdateRecords: false,
    canAccessCalendar: true
  },

  examples: [
    {
      user: 'Screen the latest batch of resumes for the Senior Engineer position',
      assistant: '[Using screenResume tool for 12 candidates]\n\n📋 **Screening Results - Senior Engineer (SE-2024-42)**\n\n✅ **Shortlisted (4 candidates)**:\n1. **Jane Smith** - Fit Score: 92/100\n   - 8 years experience, exact tech stack match\n   - Led team of 12, strong system design\n2. **Alex Chen** - Fit Score: 87/100\n   - 6 years experience, 90% skill match\n   - Open source contributor, excellent references\n3. **Maria Garcia** - Fit Score: 84/100\n4. **James Wilson** - Fit Score: 81/100\n\n⏸️ **Maybe (3 candidates)**: Scores 65-75\n❌ **Not a fit (5 candidates)**: Scores below 60\n\nWould you like me to schedule phone screens for the shortlisted candidates?'
    },
    {
      user: 'Schedule interviews for the top 3 candidates',
      assistant: '[Using scheduleInterview tool]\n\n📅 **Interviews Scheduled:**\n\n1. **Jane Smith** - Phone Screen\n   - Date: Monday, 2:00 PM\n   - Interviewer: Sarah (Hiring Manager)\n   - Interview kit sent ✓\n\n2. **Alex Chen** - Phone Screen\n   - Date: Tuesday, 10:00 AM\n   - Interviewer: Sarah (Hiring Manager)\n   - Interview kit sent ✓\n\n3. **Maria Garcia** - Phone Screen\n   - Date: Wednesday, 3:00 PM\n   - Interviewer: Tom (Tech Lead)\n   - Interview kit sent ✓\n\nAll candidates have been notified with calendar invites.'
    }
  ],

  monitoring: {
    trackUsage: true,
    trackLatency: true,
    trackAccuracy: true,
    feedbackLoop: true
  }
});

export default RecruitmentAssistantAgent;
