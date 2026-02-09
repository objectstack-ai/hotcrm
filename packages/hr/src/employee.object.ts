import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Employee = ObjectSchema.create({
  name: 'employee',
  label: 'Employee',
  pluralLabel: 'Employees',
  icon: 'user-tie',
  description: '员工主数据和信息管理',

  fields: {
    employee_number: Field.text({
      label: 'Employee Number',
      required: true,
      unique: true,
      maxLength: 40
    }),
    first_name: Field.text({
      label: 'First Name',
      required: true,
      maxLength: 40
    }),
    last_name: Field.text({
      label: 'Last Name',
      required: true,
      maxLength: 80
    }),
    full_name: Field.formula({
      label: 'Full Name',
      readonly: true,
      expression: 'CONCATENATE(last_name, first_name)'
    }),
    email: Field.email({
      label: 'Work Email',
      required: true,
      unique: true
    }),
    personal_email: Field.email({ label: 'Personal Email' }),
    phone: Field.phone({ label: 'Phone' }),
    mobile_phone: Field.phone({
      label: 'Mobile',
      required: true
    }),
    date_of_birth: Field.date({ label: 'Date of Birth' }),
    gender: Field.select({
      label: 'Gender',
      options: [
        {
          "label": "Male",
          "value": "Male"
        },
        {
          "label": "Female",
          "value": "Female"
        },
        {
          "label": "Other",
          "value": "Other"
        }
      ]
    }),
    national_id: Field.text({
      label: 'National ID',
      description: '身份证或护照号码',
      unique: true,
      maxLength: 40
    }),
    marital_status: Field.select({
      label: 'Marital Status',
      options: [
        {
          "label": "Single",
          "value": "Single"
        },
        {
          "label": "Married",
          "value": "Married"
        },
        {
          "label": "Divorced",
          "value": "Divorced"
        },
        {
          "label": "Other",
          "value": "Other"
        }
      ]
    }),
    department_id: Field.lookup('department', {
      label: 'Department',
      required: true
    }),
    position_id: Field.lookup('position', {
      label: 'Position',
      required: true
    }),
    manager_id: Field.lookup('employee', {
      label: 'Direct Manager',
      description: '直接汇报的上级'
    }),
    hire_date: Field.date({
      label: 'Hire Date',
      required: true
    }),
    termination_date: Field.date({ label: 'Termination Date' }),
    employment_status: Field.select({
      label: 'Employment Status',
      defaultValue: 'Active',
      options: [
        {
          "label": "Active",
          "value": "Active"
        },
        {
          "label": "Probation",
          "value": "Probation"
        },
        {
          "label": "On Leave",
          "value": "On Leave"
        },
        {
          "label": "Terminated",
          "value": "Terminated"
        }
      ]
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
        }
      ]
    }),
    work_location: Field.text({
      label: 'Work Location',
      maxLength: 255
    }),
    base_salary: Field.currency({
      label: 'Base Salary',
      precision: 2
    }),
    street: Field.textarea({
      label: 'Street Address',
    }),
    city: Field.text({
      label: 'City',
      maxLength: 40
    }),
    state: Field.text({
      label: 'State/Province',
      maxLength: 40
    }),
    postal_code: Field.text({
      label: 'Postal Code',
      maxLength: 20
    }),
    country: Field.text({
      label: 'Country',
      maxLength: 40
    }),
    emergency_contact_name: Field.text({
      label: 'Emergency Contact Name',
      maxLength: 80
    }),
    emergency_contact_phone: Field.phone({ label: 'Emergency Contact Phone' }),
    emergency_contact_relationship: Field.text({
      label: 'Emergency Contact Relationship',
      maxLength: 40
    }),
    notes: Field.textarea({
      label: 'Notes',
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    activities: true,
    feeds: true,
  },
});