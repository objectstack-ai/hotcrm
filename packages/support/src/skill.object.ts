
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
    name: {
      type: 'text',
      label: 'Skill name',
      required: true,
      maxLength: 255,
      searchable: true
    },
    description: {
      type: 'textarea',
      label: 'description',
      maxLength: 2000
    },
    is_active: {
      type: 'checkbox',
      label: 'Active',
      defaultValue: true
    },
    // Categorization
    skill_category: {
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
    skill_type: {
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
    related_product_ids: {
      type: 'text',
      label: 'Related Products',
      maxLength: 500,
      description: 'Comma-separated product IDs this skill applies to'
    },
    related_categories: {
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
    routing_weight: {
      type: 'number',
      label: 'Routing Weight',
      precision: 0,
      min: 1,
      max: 10,
      defaultValue: 5,
      description: 'Weight in skill-based routing (1-10, higher = more important)'
    },
    // Certification
    requires_certification: {
      type: 'checkbox',
      label: 'Requires Certification',
      defaultValue: false
    },
    certification_name: {
      type: 'text',
      label: 'Certification name',
      maxLength: 255
    },
    // Statistics
    total_agents: {
      type: 'number',
      label: 'Total Agents',
      precision: 0,
      readonly: true,
      description: 'Number of agents with this skill'
    },
    cases_requiring: {
      type: 'number',
      label: 'Cases Requiring Skill',
      precision: 0,
      readonly: true,
      description: 'Number of open cases requiring this skill'
    },
    average_resolution_time: {
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
      foreignKey: 'skill_id',
      label: 'Agent Skills'
    }
  ],
  validationRules: [
    {
      name: 'CertificationNameRequired',
      errorMessage: 'Certification name is required when certification is required',
      formula: 'AND(requires_certification = true, ISBLANK(certification_name))'
    }
  ],
  listViews: [
    {
      name: 'AllSkills',
      label: 'All Skills',
      filters: [],
      columns: ['name', 'skill_category', 'skill_type', 'routing_weight', 'total_agents', 'is_active'],
      sort: [['skill_category', 'asc'], ['name', 'asc']]
    },
    {
      name: 'ActiveSkills',
      label: 'Active Skills',
      filters: [
        ['is_active', '=', true]
      ],
      columns: ['name', 'skill_category', 'total_agents', 'cases_requiring', 'average_resolution_time'],
      sort: [['name', 'asc']]
    },
    {
      name: 'ByCategory',
      label: 'By Category',
      filters: [],
      columns: ['name', 'skill_category', 'skill_type', 'routing_weight', 'total_agents'],
      sort: [['skill_category', 'asc'], ['routing_weight', 'desc']]
    },
    {
      name: 'InDemand',
      label: 'High Demand',
      filters: [
        ['cases_requiring', '>', 0],
        ['is_active', '=', true]
      ],
      columns: ['name', 'skill_category', 'cases_requiring', 'total_agents', 'average_resolution_time'],
      sort: [['cases_requiring', 'desc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Skill Information',
        columns: 2,
        fields: ['name', 'description', 'skill_category', 'skill_type', 'is_active']
      },
      {
        label: 'Related Areas',
        columns: 2,
        fields: ['related_product_ids', 'related_categories']
      },
      {
        label: 'Routing Configuration',
        columns: 2,
        fields: ['routing_weight', 'requires_certification', 'certification_name']
      },
      {
        label: 'Statistics',
        columns: 3,
        fields: ['total_agents', 'cases_requiring', 'average_resolution_time']
      }
    ]
  }
};

export default Skill;
