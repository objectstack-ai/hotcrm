import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Education Home Page Layout
 * Admissions landing page with metrics, application pipeline, and upcoming events.
 */
export const EducationHomePage = {
  name: 'education_home',
  type: 'home' as const,
  label: 'Education Home Page',
  template: 'default',
  isDefault: false,
  assignedProfiles: ['faculty', 'registrar', 'financial_aid', 'admin'],

  regions: [
    {
      name: 'header',
      components: [
        {
          type: 'page:header' as const,
          properties: {}
        }
      ]
    },
    {
      name: 'summary',
      components: [
        {
          type: 'page:card' as const,
          label: 'Total Applications',
          properties: {}
        },
        {
          type: 'page:card' as const,
          label: 'Active Enrollments',
          properties: {}
        },
        {
          type: 'page:card' as const,
          label: 'Average GPA',
          properties: {}
        },
        {
          type: 'page:card' as const,
          label: 'Scholarships Awarded',
          properties: {}
        }
      ]
    },
    {
      name: 'insights',
      components: [
        {
          type: 'ai:suggestion' as const,
          label: 'Admissions Insights',
          properties: {
            context: 'admissions_pipeline'
          }
        }
      ]
    },
    {
      name: 'pipeline',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Application Pipeline',
          properties: {
            object: 'application_form',
            columns: ['applicant_name', 'program', 'status', 'gpa', 'application_date']
          }
        }
      ]
    },
    {
      name: 'events',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Upcoming Campus Events',
          properties: {
            object: 'campus_event',
            columns: ['name', 'event_type', 'event_date', 'location', 'rsvp_count']
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(EducationHomePage);

export default EducationHomePage;
