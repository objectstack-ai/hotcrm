import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Skill = ObjectSchema.create({
  name: 'skill',
  label: 'Skill',
  pluralLabel: 'Skills',
  icon: 'star',
  description: 'Skills for skill-based case routing and assignment',

  fields: {
    name: Field.text({
      label: 'Skill name',
      required: true,
      maxLength: 255
    }),
    description: Field.textarea({
      label: 'description',
      maxLength: 2000
    }),
    is_active: Field.boolean({
      label: 'Active',
      defaultValue: true
    }),
    skill_category: Field.select({
      label: 'Skill Category',
      required: true,
      options: [
        {
          "label": "💻 Technical",
          "value": "Technical"
        },
        {
          "label": "📦 Product",
          "value": "Product"
        },
        {
          "label": "🌍 Language",
          "value": "Language"
        },
        {
          "label": "🏢 Industry",
          "value": "Industry"
        },
        {
          "label": "🛠️ Tool/Platform",
          "value": "Tool"
        },
        {
          "label": "🎯 Soft Skill",
          "value": "Soft"
        },
        {
          "label": "📚 Other",
          "value": "Other"
        }
      ]
    }),
    skill_type: Field.select({
      label: 'Skill Type',
      defaultValue: 'Required',
      options: [
        {
          "label": "✅ Required",
          "value": "Required"
        },
        {
          "label": "⭐ Preferred",
          "value": "Preferred"
        },
        {
          "label": "📋 Optional",
          "value": "Optional"
        }
      ]
    }),
    related_product_ids: Field.text({
      label: 'Related Products',
      description: 'Comma-separated product IDs this skill applies to',
      maxLength: 500
    }),
    related_categories: /* TODO: Unknown type 'multiselect' */ null,
    routing_weight: Field.number({
      label: 'Routing Weight',
      description: 'Weight in skill-based routing (1-10, higher = more important)',
      defaultValue: 5,
      min: 1,
      max: 10,
      precision: 0
    }),
    requires_certification: Field.boolean({
      label: 'Requires Certification',
      defaultValue: false
    }),
    certification_name: Field.text({
      label: 'Certification name',
      maxLength: 255
    }),
    total_agents: Field.number({
      label: 'Total Agents',
      description: 'Number of agents with this skill',
      readonly: true,
      precision: 0
    }),
    cases_requiring: Field.number({
      label: 'Cases Requiring Skill',
      description: 'Number of open cases requiring this skill',
      readonly: true,
      precision: 0
    }),
    average_resolution_time: Field.number({
      label: 'Avg Resolution Time (Minutes)',
      description: 'Average time to resolve cases requiring this skill',
      readonly: true,
      precision: 2
    })
  },

  enable: {
    searchEnabled: true,
    trackHistory: true
  },
});