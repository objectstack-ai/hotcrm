import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Skill = ObjectSchema.create({
  name: 'skill',
  label: 'Skill',
  pluralLabel: 'Skills',
  icon: 'star',
  description: 'Skills for skill-based case routing and assignment',

  fields: {
    name: Field.text({
      label: 'Skill Name',
      required: true,
      maxLength: 255
    }),
    description: Field.textarea({
      label: 'Description',
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
          "value": "technical"
        },
        {
          "label": "📦 Product",
          "value": "product"
        },
        {
          "label": "🌍 Language",
          "value": "language"
        },
        {
          "label": "🏢 Industry",
          "value": "industry"
        },
        {
          "label": "🛠️ Tool/Platform",
          "value": "tool"
        },
        {
          "label": "🎯 Soft Skill",
          "value": "soft"
        },
        {
          "label": "📚 Other",
          "value": "other"
        }
      ]
    }),
    skill_type: Field.select({
      label: 'Skill Type',
      defaultValue: 'required',
      options: [
        {
          "label": "✅ Required",
          "value": "required"
        },
        {
          "label": "⭐ Preferred",
          "value": "preferred"
        },
        {
          "label": "📋 Optional",
          "value": "optional"
        }
      ]
    }),
    related_product_ids: Field.text({
      label: 'Related Products',
      description: 'Comma-separated product IDs this skill applies to',
      maxLength: 500
    }),
    related_categories: Field.select({ label: 'Related Categories', multiple: true, options: [] }),
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
      label: 'Certification Name',
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
    searchable: true,
    trackHistory: true
  },
});