import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Position = ObjectSchema.create({
  name: 'position',
  label: 'Position',
  pluralLabel: 'Positions',
  icon: 'briefcase',
  description: '职位和岗位定义管理',

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
          "value": "C-Level"
        },
        {
          "label": "VP",
          "value": "VP"
        },
        {
          "label": "Director",
          "value": "Director"
        },
        {
          "label": "Manager",
          "value": "Manager"
        },
        {
          "label": "Supervisor",
          "value": "Supervisor"
        },
        {
          "label": "Staff",
          "value": "Staff"
        },
        {
          "label": "Assistant",
          "value": "Assistant"
        }
      ]
    }),
    job_family: Field.select({
      label: 'Job Family',
      options: [
        {
          "label": "Management",
          "value": "Management"
        },
        {
          "label": "Technical",
          "value": "Technical"
        },
        {
          "label": "Sales",
          "value": "Sales"
        },
        {
          "label": "Marketing",
          "value": "Marketing"
        },
        {
          "label": "Finance",
          "value": "Finance"
        },
        {
          "label": "HR",
          "value": "HR"
        },
        {
          "label": "Operations",
          "value": "Operations"
        },
        {
          "label": "Customer Service",
          "value": "Customer Service"
        },
        {
          "label": "Other",
          "value": "Other"
        }
      ]
    }),
    reports_to_id: Field.lookup('position', {
      label: 'Reports To',
      description: '直接汇报的上级职位'
    }),
    employment_type: Field.select({
      label: 'Employment Type',
      defaultValue: 'Full-time',
      options: [
        {
          "label": "Full-time",
          "value": "Full-time"
        },
        {
          "label": "Part-time",
          "value": "Part-time"
        },
        {
          "label": "Contract",
          "value": "Contract"
        },
        {
          "label": "Intern",
          "value": "Intern"
        },
        {
          "label": "Ad-hoc",
          "value": "Temporary"
        }
      ]
    }),
    headcount: Field.number({
      label: 'Planned Headcount',
      description: '该职位的计划人数',
      defaultValue: 1
    }),
    current_headcount: Field.number({
      label: 'Current Headcount',
      description: '当前在职人数（自动计算）',
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
      defaultValue: 'Active',
      options: [
        {
          "label": "Active",
          "value": "Active"
        },
        {
          "label": "Hiring",
          "value": "Hiring"
        },
        {
          "label": "On Hold",
          "value": "On Hold"
        },
        {
          "label": "Closed",
          "value": "Closed"
        }
      ]
    }),
    description: Field.textarea({
      label: 'Position Description',
      description: '职位职责和要求',
    }),
    requirements: Field.textarea({
      label: 'Requirements',
      description: '学历、技能、经验等要求',
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    activities: false,
    feeds: true,
  },
});