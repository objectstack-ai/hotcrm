
const AgentSkill = {
  name: 'agent_skill',
  label: 'Agent Skill',
  labelPlural: 'Agent Skills',
  icon: 'user-check',
  description: 'Agent skill proficiency levels for skill-based routing',
  enable: {
    searchable: true,
    trackHistory: true
  },
  fields: {
    // Relationships
    user_id: {
      type: 'lookup',
      label: 'Agent',
      reference: 'User',
      required: true
    },
    skill_id: {
      type: 'lookup',
      label: 'Skill',
      reference: 'Skill',
      required: true
    },
    // Proficiency
    proficiency_level: {
      type: 'select',
      label: 'Proficiency Level',
      required: true,
      defaultValue: 'Intermediate',
      options: [
        { label: '🌟 Expert', value: 'Expert' },
        { label: '⭐ Advanced', value: 'Advanced' },
        { label: '📚 Intermediate', value: 'Intermediate' },
        { label: '🎓 Beginner', value: 'Beginner' },
        { label: '📖 Learning', value: 'Learning' }
      ]
    },
    proficiency_score: {
      type: 'number',
      label: 'Proficiency Score',
      precision: 0,
      min: 0,
      max: 100,
      description: 'Numeric proficiency score (0-100)'
    },
    // Verification
    is_verified: {
      type: 'checkbox',
      label: 'Verified',
      defaultValue: false,
      description: 'Skill has been verified by manager/system'
    },
    verified_date: {
      type: 'datetime',
      label: 'Verified Date',
      readonly: true
    },
    verified_by_id: {
      type: 'lookup',
      label: 'Verified By',
      reference: 'User',
      readonly: true
    },
    // Certification
    certification_number: {
      type: 'text',
      label: 'Certification Number',
      maxLength: 100
    },
    certification_date: {
      type: 'date',
      label: 'Certification Date'
    },
    certification_expiry: {
      type: 'date',
      label: 'Certification Expiry'
    },
    is_certified: {
      type: 'checkbox',
      label: 'Currently Certified',
      readonly: true,
      defaultValue: false
    },
    // Experience
    years_of_experience: {
      type: 'number',
      label: 'Years of Experience',
      precision: 1,
      min: 0
    },
    last_used_date: {
      type: 'datetime',
      label: 'Last Used',
      readonly: true,
      description: 'Last time this skill was used in case resolution'
    },
    // Training
    last_training_date: {
      type: 'date',
      label: 'Last Training'
    },
    next_training_date: {
      type: 'date',
      label: 'Next Training'
    },
    training_required: {
      type: 'checkbox',
      label: 'Training Required',
      defaultValue: false
    },
    // Routing Preferences
    accept_cases: {
      type: 'checkbox',
      label: 'Accept Cases',
      defaultValue: true,
      description: 'Accept cases requiring this skill'
    },
    max_concurrent_cases: {
      type: 'number',
      label: 'Max Concurrent Cases',
      precision: 0,
      min: 0,
      description: 'Maximum concurrent cases using this skill (0 = unlimited)'
    },
    // Performance Statistics
    cases_handled: {
      type: 'number',
      label: 'Cases Handled',
      precision: 0,
      readonly: true,
      description: 'Total cases handled using this skill'
    },
    average_resolution_time: {
      type: 'number',
      label: 'Avg Resolution Time (Minutes)',
      precision: 2,
      readonly: true
    },
    customer_satisfaction_avg: {
      type: 'number',
      label: 'Avg CSAT Score',
      precision: 2,
      readonly: true,
      description: 'Average customer satisfaction score (1-5)'
    },
    success_rate: {
      type: 'number',
      label: 'Success Rate (%)',
      precision: 2,
      readonly: true,
      description: 'Percentage of cases resolved within SLA'
    },
    // notes
    notes: {
      type: 'textarea',
      label: 'notes',
      maxLength: 2000
    }
  },
  validationRules: [
    {
      name: 'UniqueUserSkill',
      errorMessage: 'This agent already has this skill assigned',
      formula: 'AND(NOT(ISNEW()), EXISTS(SELECT Id FROM AgentSkill WHERE user_id = $user_id AND skill_id = $skill_id AND Id != $Id))'
    },
    {
      name: 'CertificationNumberRequired',
      errorMessage: 'Certification number is required when skill requires certification',
      formula: 'AND(Skill.RequiresCertification = true, ISBLANK(certification_number))'
    },
    {
      name: 'CertificationDateRequired',
      errorMessage: 'Certification date is required when certification number is provided',
      formula: 'AND(NOT(ISBLANK(certification_number)), ISBLANK(certification_date))'
    },
    {
      name: 'ProficiencyScoreRange',
      errorMessage: 'Proficiency score must be between 0 and 100',
      formula: 'OR(proficiency_score < 0, proficiency_score > 100)'
    }
  ],
  listViews: [
    {
      name: 'AllAgentSkills',
      label: 'All Agent Skills',
      filters: [],
      columns: ['user_id', 'skill_id', 'proficiency_level', 'proficiency_score', 'is_verified', 'accept_cases'],
      sort: [['user_id', 'asc'], ['proficiency_score', 'desc']]
    },
    {
      name: 'ByAgent',
      label: 'By Agent',
      filters: [],
      columns: ['user_id', 'skill_id', 'proficiency_level', 'cases_handled', 'success_rate', 'customer_satisfaction_avg'],
      sort: [['user_id', 'asc']]
    },
    {
      name: 'BySkill',
      label: 'By Skill',
      filters: [],
      columns: ['skill_id', 'user_id', 'proficiency_level', 'proficiency_score', 'is_verified', 'accept_cases'],
      sort: [['skill_id', 'asc'], ['proficiency_score', 'desc']]
    },
    {
      name: 'VerifiedExperts',
      label: 'Verified Experts',
      filters: [
        ['is_verified', '=', true],
        ['proficiency_level', 'in', ['Expert', 'Advanced']],
        ['accept_cases', '=', true]
      ],
      columns: ['user_id', 'skill_id', 'proficiency_level', 'cases_handled', 'success_rate', 'customer_satisfaction_avg'],
      sort: [['proficiency_score', 'desc']]
    },
    {
      name: 'NeedTraining',
      label: 'Need Training',
      filters: [
        ['training_required', '=', true]
      ],
      columns: ['user_id', 'skill_id', 'last_training_date', 'next_training_date', 'proficiency_level'],
      sort: [['next_training_date', 'asc']]
    },
    {
      name: 'ExpiringCertifications',
      label: 'Expiring Certifications',
      filters: [
        ['certification_expiry', 'next_n_days', 90],
        ['certification_expiry', '!=', null]
      ],
      columns: ['user_id', 'skill_id', 'certification_number', 'certification_expiry', 'is_certified'],
      sort: [['certification_expiry', 'asc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Agent & Skill',
        columns: 2,
        fields: ['user_id', 'skill_id']
      },
      {
        label: 'Proficiency',
        columns: 2,
        fields: ['proficiency_level', 'proficiency_score', 'years_of_experience']
      },
      {
        label: 'Verification',
        columns: 3,
        fields: ['is_verified', 'verified_date', 'verified_by_id']
      },
      {
        label: 'Certification',
        columns: 2,
        fields: ['certification_number', 'certification_date', 'certification_expiry', 'is_certified']
      },
      {
        label: 'Training',
        columns: 3,
        fields: ['last_training_date', 'next_training_date', 'training_required']
      },
      {
        label: 'Routing Preferences',
        columns: 2,
        fields: ['accept_cases', 'max_concurrent_cases', 'last_used_date']
      },
      {
        label: 'Performance',
        columns: 2,
        fields: ['cases_handled', 'average_resolution_time', 'customer_satisfaction_avg', 'success_rate']
      },
      {
        label: 'Additional Information',
        columns: 1,
        fields: ['notes']
      }
    ]
  }
};

export default AgentSkill;
