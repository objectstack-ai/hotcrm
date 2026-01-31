
const Skill = {
  name: 'skill',
  label: 'Skill',
  labelPlural: 'Skills',
  icon: 'star',
  description: 'Skills for skill-based case routing and assignment',
  enable: {
    searchable: true,
    trackHistory: true
  },
  fields: {
    // Basic Information
    Name: {
      type: 'text',
      label: 'Skill Name',
      required: true,
      maxLength: 255,
      searchable: true
    },
    Description: {
      type: 'textarea',
      label: 'Description',
      maxLength: 2000
    },
    IsActive: {
      type: 'checkbox',
      label: 'Active',
      defaultValue: true
    },
    // Categorization
    SkillCategory: {
      type: 'select',
      label: 'Skill Category',
      required: true,
      options: [
        { label: '💻 Technical', value: 'Technical' },
        { label: '📦 Product', value: 'Product' },
        { label: '🌍 Language', value: 'Language' },
        { label: '🏢 Industry', value: 'Industry' },
        { label: '🛠️ Tool/Platform', value: 'Tool' },
        { label: '🎯 Soft Skill', value: 'Soft' },
        { label: '📚 Other', value: 'Other' }
      ]
    },
    SkillType: {
      type: 'select',
      label: 'Skill Type',
      defaultValue: 'Required',
      options: [
        { label: '✅ Required', value: 'Required' },
        { label: '⭐ Preferred', value: 'Preferred' },
        { label: '📋 Optional', value: 'Optional' }
      ]
    },
    // Related Product/Category
    RelatedProductIds: {
      type: 'text',
      label: 'Related Products',
      maxLength: 500,
      description: 'Comma-separated product IDs this skill applies to'
    },
    RelatedCategories: {
      type: 'multiselect',
      label: 'Related Categories',
      options: [
        { label: 'Technical', value: 'Technical' },
        { label: 'Product', value: 'Product' },
        { label: 'Billing', value: 'Billing' },
        { label: 'Feature', value: 'Feature' },
        { label: 'Complaint', value: 'Complaint' },
        { label: 'Other', value: 'Other' }
      ]
    },
    // Priority Weight
    RoutingWeight: {
      type: 'number',
      label: 'Routing Weight',
      precision: 0,
      min: 1,
      max: 10,
      defaultValue: 5,
      description: 'Weight in skill-based routing (1-10, higher = more important)'
    },
    // Certification
    RequiresCertification: {
      type: 'checkbox',
      label: 'Requires Certification',
      defaultValue: false
    },
    CertificationName: {
      type: 'text',
      label: 'Certification Name',
      maxLength: 255
    },
    // Statistics
    TotalAgents: {
      type: 'number',
      label: 'Total Agents',
      precision: 0,
      readonly: true,
      description: 'Number of agents with this skill'
    },
    CasesRequiring: {
      type: 'number',
      label: 'Cases Requiring Skill',
      precision: 0,
      readonly: true,
      description: 'Number of open cases requiring this skill'
    },
    AverageResolutionTime: {
      type: 'number',
      label: 'Avg Resolution Time (Minutes)',
      precision: 2,
      readonly: true,
      description: 'Average time to resolve cases requiring this skill'
    }
  },
  relationships: [
    {
      name: 'AgentSkills',
      type: 'hasMany',
      object: 'AgentSkill',
      foreignKey: 'SkillId',
      label: 'Agent Skills'
    }
  ],
  validationRules: [
    {
      name: 'CertificationNameRequired',
      errorMessage: 'Certification name is required when certification is required',
      formula: 'AND(RequiresCertification = true, ISBLANK(CertificationName))'
    }
  ],
  listViews: [
    {
      name: 'AllSkills',
      label: 'All Skills',
      filters: [],
      columns: ['Name', 'SkillCategory', 'SkillType', 'RoutingWeight', 'TotalAgents', 'IsActive'],
      sort: [['SkillCategory', 'asc'], ['Name', 'asc']]
    },
    {
      name: 'ActiveSkills',
      label: 'Active Skills',
      filters: [
        ['IsActive', '=', true]
      ],
      columns: ['Name', 'SkillCategory', 'TotalAgents', 'CasesRequiring', 'AverageResolutionTime'],
      sort: [['Name', 'asc']]
    },
    {
      name: 'ByCategory',
      label: 'By Category',
      filters: [],
      columns: ['Name', 'SkillCategory', 'SkillType', 'RoutingWeight', 'TotalAgents'],
      sort: [['SkillCategory', 'asc'], ['RoutingWeight', 'desc']]
    },
    {
      name: 'InDemand',
      label: 'High Demand',
      filters: [
        ['CasesRequiring', '>', 0],
        ['IsActive', '=', true]
      ],
      columns: ['Name', 'SkillCategory', 'CasesRequiring', 'TotalAgents', 'AverageResolutionTime'],
      sort: [['CasesRequiring', 'desc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Skill Information',
        columns: 2,
        fields: ['Name', 'Description', 'SkillCategory', 'SkillType', 'IsActive']
      },
      {
        label: 'Related Areas',
        columns: 2,
        fields: ['RelatedProductIds', 'RelatedCategories']
      },
      {
        label: 'Routing Configuration',
        columns: 2,
        fields: ['RoutingWeight', 'RequiresCertification', 'CertificationName']
      },
      {
        label: 'Statistics',
        columns: 3,
        fields: ['TotalAgents', 'CasesRequiring', 'AverageResolutionTime']
      }
    ]
  }
};

export default Skill;
