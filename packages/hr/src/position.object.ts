import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Position = ObjectSchema.create({
  name: 'position',
  label: 'Position',
  pluralLabel: 'Positions',
  icon: 'briefcase',
  description: 'Position and role definition management',

  fields: {
    title: Field.text({
      label: 'Position Title',
      required: true,
      maxLength: 255
    }),
    code: Field.text({
      label: 'Position Code',
      unique: true,
      maxLength: 40
    }),
    department_id: Field.lookup('department', {
      label: 'Department',
      required: true
    }),
    level: Field.select({
      label: 'Job Level',
      options: [
        {
          "label": "C-Level",
          "value": "c_level"
        },
        {
          "label": "VP",
          "value": "vp"
        },
        {
          "label": "Director",
          "value": "director"
        },
        {
          "label": "Manager",
          "value": "manager"
        },
        {
          "label": "Supervisor",
          "value": "supervisor"
        },
        {
          "label": "Staff",
          "value": "staff"
        },
        {
          "label": "Assistant",
          "value": "assistant"
        }
      ]
    }),
    job_family: Field.select({
      label: 'Job Family',
      options: [
        {
          "label": "Management",
          "value": "management"
        },
        {
          "label": "Technical",
          "value": "technical"
        },
        {
          "label": "Sales",
          "value": "sales"
        },
        {
          "label": "Marketing",
          "value": "marketing"
        },
        {
          "label": "Finance",
          "value": "finance"
        },
        {
          "label": "HR",
          "value": "hr"
        },
        {
          "label": "Operations",
          "value": "operations"
        },
        {
          "label": "Customer Service",
          "value": "customer_service"
        },
        {
          "label": "Other",
          "value": "other"
        }
      ]
    }),
    reports_to_id: Field.lookup('position', {
      label: 'Reports To',
      description: 'Direct reporting supervisor position'
    }),
    employment_type: Field.select({
      label: 'Employment Type',
      defaultValue: 'full_time',
      options: [
        {
          "label": "Full-time",
          "value": "full_time"
        },
        {
          "label": "Part-time",
          "value": "part_time"
        },
        {
          "label": "Contract",
          "value": "contract"
        },
        {
          "label": "Intern",
          "value": "intern"
        },
        {
          "label": "Ad-hoc",
          "value": "temporary"
        }
      ]
    }),
    headcount: Field.number({
      label: 'Planned Headcount',
      description: 'Planned headcount for this position',
      defaultValue: 1
    }),
    current_headcount: Field.number({
      label: 'Current Headcount',
      description: 'Current headcount (auto-calculated)',
      readonly: true
    }),
    min_salary: Field.currency({
      label: 'Minimum Salary',
      precision: 2
    }),
    max_salary: Field.currency({
      label: 'Maximum Salary',
      precision: 2
    }),
    status: Field.select({
      label: 'Status',
      defaultValue: 'active',
      options: [
        {
          "label": "Active",
          "value": "active"
        },
        {
          "label": "Hiring",
          "value": "hiring"
        },
        {
          "label": "On Hold",
          "value": "on_hold"
        },
        {
          "label": "Closed",
          "value": "closed"
        }
      ]
    }),
    description: Field.textarea({
      label: 'Position Description',
      description: 'Position responsibilities and requirements',
    }),
    requirements: Field.textarea({
      label: 'Requirements',
      description: 'Education, skills, experience, and other requirements',
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    activities: false,
    feeds: true,
  },
});