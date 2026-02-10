import { ObjectSchema, Field } from '@objectstack/spec/data';

export const TimeOff = ObjectSchema.create({
  name: 'time_off',
  label: 'Time Off',
  pluralLabel: 'Time Off Records',
  icon: 'calendar-times',
  description: 'Employee leave and time-off management',

  fields: {
    request_number: Field.text({
      label: 'Request Number',
      unique: true,
      maxLength: 40
    }),
    employee_id: Field.lookup('employee', {
      label: 'Employee',
      required: true
    }),
    leave_type: Field.select({
      label: 'Leave Type',
      required: true,
      options: [
        {
          "label": "Annual Leave",
          "value": "annual_leave"
        },
        {
          "label": "Sick Leave",
          "value": "sick_leave"
        },
        {
          "label": "Personal Leave",
          "value": "personal_leave"
        },
        {
          "label": "Marriage Leave",
          "value": "marriage_leave"
        },
        {
          "label": "Maternity Leave",
          "value": "maternity_leave"
        },
        {
          "label": "Paternity Leave",
          "value": "paternity_leave"
        },
        {
          "label": "Bereavement Leave",
          "value": "bereavement_leave"
        },
        {
          "label": "Compensatory Leave",
          "value": "compensatory_leave"
        },
        {
          "label": "Unpaid Leave",
          "value": "unpaid_leave"
        },
        {
          "label": "Other",
          "value": "other"
        }
      ]
    }),
    start_date: Field.date({
      label: 'Start Date',
      required: true
    }),
    end_date: Field.date({
      label: 'End Date',
      required: true
    }),
    start_time: Field.select({
      label: 'Start Period',
      defaultValue: 'full_day',
      options: [
        {
          "label": "Full Day",
          "value": "full_day"
        },
        {
          "label": "Morning",
          "value": "morning"
        },
        {
          "label": "Afternoon",
          "value": "afternoon"
        }
      ]
    }),
    end_time: Field.select({
      label: 'End Period',
      defaultValue: 'full_day',
      options: [
        {
          "label": "Full Day",
          "value": "full_day"
        },
        {
          "label": "Morning",
          "value": "morning"
        },
        {
          "label": "Afternoon",
          "value": "afternoon"
        }
      ]
    }),
    total_days: Field.number({
      label: 'Total Days',
      description: 'Automatically calculated leave days',
      readonly: true,
      precision: 1
    }),
    request_date: Field.date({
      label: 'Application Date',
      required: true,
      defaultValue: '$today'
    }),
    status: Field.select({
      label: 'Status',
      defaultValue: 'pending',
      options: [
        {
          "label": "Pending",
          "value": "pending"
        },
        {
          "label": "Approved",
          "value": "approved"
        },
        {
          "label": "Rejected",
          "value": "rejected"
        },
        {
          "label": "Cancelled",
          "value": "cancelled"
        }
      ]
    }),
    approver_id: Field.lookup('employee', {
      label: 'Approver',
      description: 'Manager responsible for approval'
    }),
    approval_date: Field.date({ label: 'Approval Date' }),
    reason: Field.textarea({
      label: 'Leave Reason',
      required: true,
    }),
    rejection_reason: Field.textarea({
      label: 'Rejection Reason',
      description: 'Records the reason if rejected',
    }),
    contact_info: Field.text({
      label: 'Contact During Leave',
      maxLength: 255
    }),
    backup_person_id: Field.lookup('employee', {
      label: 'Backup Person',
      description: 'Colleague temporarily covering responsibilities'
    }),
    is_paid: Field.boolean({
      label: 'Is Paid',
      defaultValue: true
    }),
    attachment_url: Field.url({
      label: 'Attachment URL',
      description: 'Supporting documents such as medical certificates'
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