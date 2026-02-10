import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Onboarding = ObjectSchema.create({
  name: 'onboarding',
  label: 'Onboarding',
  pluralLabel: 'Onboardings',
  icon: 'user-graduate',
  description: 'New employee onboarding and orientation process management',

  fields: {
    title: Field.text({
      label: 'Onboarding Title',
      required: true,
      maxLength: 255
    }),
    employee_id: Field.lookup('employee', {
      label: 'Employee',
      required: true
    }),
    offer_id: Field.lookup('offer', { label: 'Related Offer' }),
    start_date: Field.date({
      label: 'Hire Date',
      required: true
    }),
    buddy_id: Field.lookup('employee', {
      label: 'Onboarding Buddy',
      description: 'Colleague assigned to help the new employee acclimate'
    }),
    manager_id: Field.lookup('employee', {
      label: 'Direct Manager',
      required: true
    }),
    status: Field.select({
      label: 'Status',
      defaultValue: 'not_started',
      options: [
        {
          "label": "Not Started",
          "value": "not_started"
        },
        {
          "label": "In Progress",
          "value": "in_progress"
        },
        {
          "label": "Completed",
          "value": "completed"
        },
        {
          "label": "Cancelled",
          "value": "cancelled"
        }
      ]
    }),
    completion_percentage: Field.percent({
      label: 'Completion Progress',
      description: 'Onboarding task completion percentage',
      readonly: true
    }),
    paperwork_completed: Field.boolean({
      label: 'Paperwork Completed',
      description: 'Employment contract, NDA, and related documents',
      defaultValue: false
    }),
    it_setup_completed: Field.boolean({
      label: 'IT Setup Completed',
      description: 'Computer, email, system access, etc.',
      defaultValue: false
    }),
    workspace_setup_completed: Field.boolean({
      label: 'Workspace Setup Completed',
      defaultValue: false
    }),
    training_completed: Field.boolean({
      label: 'Basic Training Completed',
      description: 'Training on company culture, policies, and procedures',
      defaultValue: false
    }),
    system_access_granted: Field.boolean({
      label: 'System Access Granted',
      defaultValue: false
    }),
    first_day_checklist: Field.textarea({
      label: 'First Day Checklist',
      description: 'Tasks to complete on the first day',
    }),
    first_week_goals: Field.textarea({
      label: 'First Week Goals',
    }),
    first_month_goals: Field.textarea({
      label: 'First Month Goals',
    }),
    probation_end_date: Field.date({ label: 'Probation End Date' }),
    feedback: Field.textarea({
      label: 'Onboarding Feedback',
      description: 'New employee onboarding experience feedback',
    }),
    notes: Field.textarea({
      label: 'Notes',
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    activities: true,
    feeds: true,
  },
});