
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
    UserId: {
      type: 'lookup',
      label: 'Agent',
      reference: 'User',
      required: true
    },
    SkillId: {
      type: 'lookup',
      label: 'Skill',
      reference: 'Skill',
      required: true
    },
    // Proficiency
    ProficiencyLevel: {
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
    ProficiencyScore: {
      type: 'number',
      label: 'Proficiency Score',
      precision: 0,
      min: 0,
      max: 100,
      description: 'Numeric proficiency score (0-100)'
    },
    // Verification
    IsVerified: {
      type: 'checkbox',
      label: 'Verified',
      defaultValue: false,
      description: 'Skill has been verified by manager/system'
    },
    VerifiedDate: {
      type: 'datetime',
      label: 'Verified Date',
      readonly: true
    },
    VerifiedById: {
      type: 'lookup',
      label: 'Verified By',
      reference: 'User',
      readonly: true
    },
    // Certification
    CertificationNumber: {
      type: 'text',
      label: 'Certification Number',
      maxLength: 100
    },
    CertificationDate: {
      type: 'date',
      label: 'Certification Date'
    },
    CertificationExpiry: {
      type: 'date',
      label: 'Certification Expiry'
    },
    IsCertified: {
      type: 'checkbox',
      label: 'Currently Certified',
      readonly: true,
      defaultValue: false
    },
    // Experience
    YearsOfExperience: {
      type: 'number',
      label: 'Years of Experience',
      precision: 1,
      min: 0
    },
    LastUsedDate: {
      type: 'datetime',
      label: 'Last Used',
      readonly: true,
      description: 'Last time this skill was used in case resolution'
    },
    // Training
    LastTrainingDate: {
      type: 'date',
      label: 'Last Training'
    },
    NextTrainingDate: {
      type: 'date',
      label: 'Next Training'
    },
    TrainingRequired: {
      type: 'checkbox',
      label: 'Training Required',
      defaultValue: false
    },
    // Routing Preferences
    AcceptCases: {
      type: 'checkbox',
      label: 'Accept Cases',
      defaultValue: true,
      description: 'Accept cases requiring this skill'
    },
    MaxConcurrentCases: {
      type: 'number',
      label: 'Max Concurrent Cases',
      precision: 0,
      min: 0,
      description: 'Maximum concurrent cases using this skill (0 = unlimited)'
    },
    // Performance Statistics
    CasesHandled: {
      type: 'number',
      label: 'Cases Handled',
      precision: 0,
      readonly: true,
      description: 'Total cases handled using this skill'
    },
    AverageResolutionTime: {
      type: 'number',
      label: 'Avg Resolution Time (Minutes)',
      precision: 2,
      readonly: true
    },
    CustomerSatisfactionAvg: {
      type: 'number',
      label: 'Avg CSAT Score',
      precision: 2,
      readonly: true,
      description: 'Average customer satisfaction score (1-5)'
    },
    SuccessRate: {
      type: 'number',
      label: 'Success Rate (%)',
      precision: 2,
      readonly: true,
      description: 'Percentage of cases resolved within SLA'
    },
    // Notes
    Notes: {
      type: 'textarea',
      label: 'Notes',
      maxLength: 2000
    }
  },
  validationRules: [
    {
      name: 'UniqueUserSkill',
      errorMessage: 'This agent already has this skill assigned',
      formula: 'AND(NOT(ISNEW()), EXISTS(SELECT Id FROM AgentSkill WHERE UserId = $UserId AND SkillId = $SkillId AND Id != $Id))'
    },
    {
      name: 'CertificationNumberRequired',
      errorMessage: 'Certification number is required when skill requires certification',
      formula: 'AND(Skill.RequiresCertification = true, ISBLANK(CertificationNumber))'
    },
    {
      name: 'CertificationDateRequired',
      errorMessage: 'Certification date is required when certification number is provided',
      formula: 'AND(NOT(ISBLANK(CertificationNumber)), ISBLANK(CertificationDate))'
    },
    {
      name: 'ProficiencyScoreRange',
      errorMessage: 'Proficiency score must be between 0 and 100',
      formula: 'OR(ProficiencyScore < 0, ProficiencyScore > 100)'
    }
  ],
  listViews: [
    {
      name: 'AllAgentSkills',
      label: 'All Agent Skills',
      filters: [],
      columns: ['UserId', 'SkillId', 'ProficiencyLevel', 'ProficiencyScore', 'IsVerified', 'AcceptCases'],
      sort: [['UserId', 'asc'], ['ProficiencyScore', 'desc']]
    },
    {
      name: 'ByAgent',
      label: 'By Agent',
      filters: [],
      columns: ['UserId', 'SkillId', 'ProficiencyLevel', 'CasesHandled', 'SuccessRate', 'CustomerSatisfactionAvg'],
      sort: [['UserId', 'asc']]
    },
    {
      name: 'BySkill',
      label: 'By Skill',
      filters: [],
      columns: ['SkillId', 'UserId', 'ProficiencyLevel', 'ProficiencyScore', 'IsVerified', 'AcceptCases'],
      sort: [['SkillId', 'asc'], ['ProficiencyScore', 'desc']]
    },
    {
      name: 'VerifiedExperts',
      label: 'Verified Experts',
      filters: [
        ['IsVerified', '=', true],
        ['ProficiencyLevel', 'in', ['Expert', 'Advanced']],
        ['AcceptCases', '=', true]
      ],
      columns: ['UserId', 'SkillId', 'ProficiencyLevel', 'CasesHandled', 'SuccessRate', 'CustomerSatisfactionAvg'],
      sort: [['ProficiencyScore', 'desc']]
    },
    {
      name: 'NeedTraining',
      label: 'Need Training',
      filters: [
        ['TrainingRequired', '=', true]
      ],
      columns: ['UserId', 'SkillId', 'LastTrainingDate', 'NextTrainingDate', 'ProficiencyLevel'],
      sort: [['NextTrainingDate', 'asc']]
    },
    {
      name: 'ExpiringCertifications',
      label: 'Expiring Certifications',
      filters: [
        ['CertificationExpiry', 'next_n_days', 90],
        ['CertificationExpiry', '!=', null]
      ],
      columns: ['UserId', 'SkillId', 'CertificationNumber', 'CertificationExpiry', 'IsCertified'],
      sort: [['CertificationExpiry', 'asc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Agent & Skill',
        columns: 2,
        fields: ['UserId', 'SkillId']
      },
      {
        label: 'Proficiency',
        columns: 2,
        fields: ['ProficiencyLevel', 'ProficiencyScore', 'YearsOfExperience']
      },
      {
        label: 'Verification',
        columns: 3,
        fields: ['IsVerified', 'VerifiedDate', 'VerifiedById']
      },
      {
        label: 'Certification',
        columns: 2,
        fields: ['CertificationNumber', 'CertificationDate', 'CertificationExpiry', 'IsCertified']
      },
      {
        label: 'Training',
        columns: 3,
        fields: ['LastTrainingDate', 'NextTrainingDate', 'TrainingRequired']
      },
      {
        label: 'Routing Preferences',
        columns: 2,
        fields: ['AcceptCases', 'MaxConcurrentCases', 'LastUsedDate']
      },
      {
        label: 'Performance',
        columns: 2,
        fields: ['CasesHandled', 'AverageResolutionTime', 'CustomerSatisfactionAvg', 'SuccessRate']
      },
      {
        label: 'Additional Information',
        columns: 1,
        fields: ['Notes']
      }
    ]
  }
};

export default AgentSkill;
