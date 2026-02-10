import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Employee = ObjectSchema.create({
  name: 'employee',
  label: 'Employee',
  pluralLabel: 'Employees',
  icon: 'user-tie',
  description: 'Employee master data and information management',

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
          "value": "male"
        },
        {
          "label": "Female",
          "value": "female"
        },
        {
          "label": "Other",
          "value": "other"
        }
      ]
    }),
    national_id: Field.text({
      label: 'National ID',
      description: 'National ID or passport number',
      unique: true,
      maxLength: 40
    }),
    marital_status: Field.select({
      label: 'Marital Status',
      options: [
        {
          "label": "Single",
          "value": "single"
        },
        {
          "label": "Married",
          "value": "married"
        },
        {
          "label": "Divorced",
          "value": "divorced"
        },
        {
          "label": "Other",
          "value": "other"
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
      description: 'Direct reporting supervisor'
    }),
    hire_date: Field.date({
      label: 'Hire Date',
      required: true
    }),
    termination_date: Field.date({ label: 'Termination Date' }),
    employment_status: Field.select({
      label: 'Employment Status',
      defaultValue: 'active',
      options: [
        {
          "label": "Active",
          "value": "active"
        },
        {
          "label": "Probation",
          "value": "probation"
        },
        {
          "label": "On Leave",
          "value": "on_leave"
        },
        {
          "label": "Terminated",
          "value": "terminated"
        }
      ]
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