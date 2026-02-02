import { ObjectSchema, Field } from '@objectstack/spec/data';

export const AgentSkill = ObjectSchema.create({
  name: 'agent_skill',
  label: 'Agent Skill',
  pluralLabel: 'Agent Skills',
  icon: 'user-check',
  description: 'Agent skill proficiency levels for skill-based routing',

  fields: {
    user_id: Field.lookup('users', {
      label: 'Agent',
      required: true
    }),
    skill_id: Field.lookup('Skill', {
      label: 'Skill',
      required: true
    }),
    proficiency_level: Field.select({
      label: 'Proficiency Level',
      required: true,
      defaultValue: 'Intermediate',
      options: [
        {
          "label": "🌟 Expert",
          "value": "Expert"
        },
        {
          "label": "⭐ Advanced",
          "value": "Advanced"
        },
        {
          "label": "📚 Intermediate",
          "value": "Intermediate"
        },
        {
          "label": "🎓 Beginner",
          "value": "Beginner"
        },
        {
          "label": "📖 Learning",
          "value": "Learning"
        }
      ]
    }),
    proficiency_score: Field.number({
      label: 'Proficiency Score',
      description: 'Numeric proficiency score (0-100)',
      min: 0,
      max: 100,
      precision: 0
    }),
    is_verified: Field.boolean({
      label: 'Verified',
      description: 'Skill has been verified by manager/system',
      defaultValue: false
    }),
    verified_date: Field.datetime({
      label: 'Verified Date',
      readonly: true
    }),
    verified_by_id: Field.lookup('users', {
      label: 'Verified By',
      readonly: true
    }),
    certification_number: Field.text({
      label: 'Certification Number',
      maxLength: 100
    }),
    certification_date: Field.date({ label: 'Certification Date' }),
    certification_expiry: Field.date({ label: 'Certification Expiry' }),
    is_certified: Field.boolean({
      label: 'Currently Certified',
      defaultValue: false,
      readonly: true
    }),
    years_of_experience: Field.number({
      label: 'Years of Experience',
      min: 0,
      precision: 1
    }),
    last_used_date: Field.datetime({
      label: 'Last Used',
      description: 'Last time this skill was used in case resolution',
      readonly: true
    }),
    last_training_date: Field.date({ label: 'Last Training' }),
    next_training_date: Field.date({ label: 'Next Training' }),
    training_required: Field.boolean({
      label: 'Training Required',
      defaultValue: false
    }),
    accept_cases: Field.boolean({
      label: 'Accept Cases',
      description: 'Accept cases requiring this skill',
      defaultValue: true
    }),
    max_concurrent_cases: Field.number({
      label: 'Max Concurrent Cases',
      description: 'Maximum concurrent cases using this skill (0 = unlimited)',
      min: 0,
      precision: 0
    }),
    cases_handled: Field.number({
      label: 'Cases Handled',
      description: 'Total cases handled using this skill',
      readonly: true,
      precision: 0
    }),
    average_resolution_time: Field.number({
      label: 'Avg Resolution Time (Minutes)',
      readonly: true,
      precision: 2
    }),
    customer_satisfaction_avg: Field.number({
      label: 'Avg CSAT Score',
      description: 'Average customer satisfaction score (1-5)',
      readonly: true,
      precision: 2
    }),
    success_rate: Field.number({
      label: 'Success Rate (%)',
      description: 'Percentage of cases resolved within SLA',
      readonly: true,
      precision: 2
    }),
    notes: Field.textarea({
      label: 'notes',
      maxLength: 2000
    })
  },

  enable: {
    searchable: true,
    trackHistory: true
  },
});