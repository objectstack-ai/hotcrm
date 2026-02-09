import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Department = ObjectSchema.create({
  name: 'department',
  label: 'Department',
  pluralLabel: 'Departments',
  icon: 'sitemap',
  description: 'Organization department and team structure management',

  fields: {
    name: Field.text({
      label: 'Department Name',
      required: true,
      unique: true,
      maxLength: 255
    }),
    code: Field.text({
      label: 'Department Code',
      description: 'Unique identifier code for the department',
      unique: true,
      maxLength: 40
    }),
    type: Field.select({
      label: 'Department Type',
      options: [
        {
          "label": "Headquarters",
          "value": "Headquarters"
        },
        {
          "label": "Branch",
          "value": "Branch"
        },
        {
          "label": "Division",
          "value": "Division"
        },
        {
          "label": "Department",
          "value": "Department"
        },
        {
          "label": "Team",
          "value": "Team"
        }
      ]
    }),
    parent_id: Field.lookup('department', {
      label: 'Parent Department',
      description: 'Parent department in the organizational hierarchy'
    }),
    manager_id: Field.lookup('employee', {
      label: 'Department Manager',
      description: 'Employee who manages this department'
    }),
    cost_center: Field.text({
      label: 'Cost Center',
      description: 'Financial cost center code',
      maxLength: 40
    }),
    location: Field.text({
      label: 'Office Location',
      maxLength: 255
    }),
    phone: Field.phone({ label: 'Department Phone' }),
    email: Field.email({ label: 'Department Email' }),
    employee_count: Field.number({
      label: 'Employee Count',
      description: 'Total number of employees in the department (auto-calculated)',
      readonly: true
    }),
    budget_amount: Field.currency({
      label: 'Annual Budget',
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
          "label": "Closed",
          "value": "Closed"
        },
        {
          "label": "Merging",
          "value": "Merging"
        }
      ]
    }),
    description: Field.textarea({
      label: 'Department Description',
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    activities: false,
    feeds: true,
  },
});