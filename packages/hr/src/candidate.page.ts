import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Candidate Detail Page Layout
 */
export const CandidatePage = {
  name: 'candidate_detail',
  object: 'candidate',
  type: 'record' as const,
  label: 'Candidate Detail Page',
  template: 'record_detail',
  isDefault: true,
  assignedProfiles: ['hr_specialist', 'hr_manager', 'admin'],

  regions: [
    {
      name: 'header',
      components: [
        {
          type: 'record:highlights' as const,
          properties: {
            fields: ['first_name', 'last_name', 'current_title', 'status', 'source']
          }
        }
      ]
    },
    {
      name: 'tabs',
      components: [
        {
          type: 'page:tabs' as const,
          properties: {
            tabs: ['candidate_info', 'education_info', 'compensation_info']
          }
        }
      ]
    },
    {
      name: 'candidate_info',
      components: [
        {
          type: 'record:details' as const,
          label: 'Candidate Information',
          properties: {
            fields: [
              'first_name', 'last_name', 'email', 'phone',
              'mobile_phone', 'linkedin_url', 'current_company', 'current_title',
              'years_of_experience', 'source', 'status', 'skills'
            ],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'education_info',
      components: [
        {
          type: 'record:details' as const,
          label: 'Education Information',
          properties: {
            fields: [
              'highest_education', 'university', 'major', 'resume_url'
            ],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'compensation_info',
      components: [
        {
          type: 'record:details' as const,
          label: 'Compensation Information',
          properties: {
            fields: [
              'current_salary', 'expected_salary', 'notice_period',
              'city', 'country', 'notes'
            ],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'related_lists',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Applications',
          properties: {
            object: 'application',
            columns: ['position', 'status', 'applied_date', 'stage'],
            sort: [{ field: 'applied_date', direction: 'desc' }],
            actions: ['new', 'edit', 'delete']
          }
        },
        {
          type: 'record:related_list' as const,
          label: 'Interviews',
          properties: {
            object: 'interview',
            columns: ['date', 'type', 'interviewer', 'status', 'rating'],
            sort: [{ field: 'date', direction: 'desc' }],
            actions: ['new', 'edit', 'delete']
          }
        },
        {
          type: 'record:related_list' as const,
          label: 'Offers',
          properties: {
            object: 'offer',
            columns: ['position', 'salary', 'status', 'offer_date', 'expiration_date'],
            actions: ['new', 'edit']
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(CandidatePage);

export default CandidatePage;
