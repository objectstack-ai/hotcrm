import { ObjectSchema, Field } from '@objectstack/spec/data';

export const TimeOff = ObjectSchema.create({
  name: 'time_off',
  label: 'Time Off',
  pluralLabel: 'Time Off Records',
  icon: 'calendar-times',
  description: '员工请假和休假管理',

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
          "value": "Annual Leave"
        },
        {
          "label": "Sick Leave",
          "value": "Sick Leave"
        },
        {
          "label": "Personal Leave",
          "value": "Personal Leave"
        },
        {
          "label": "Marriage Leave",
          "value": "Marriage Leave"
        },
        {
          "label": "Maternity Leave",
          "value": "Maternity Leave"
        },
        {
          "label": "Paternity Leave",
          "value": "Paternity Leave"
        },
        {
          "label": "Bereavement Leave",
          "value": "Bereavement Leave"
        },
        {
          "label": "Compensatory Leave",
          "value": "Compensatory Leave"
        },
        {
          "label": "Unpaid Leave",
          "value": "Unpaid Leave"
        },
        {
          "label": "Other",
          "value": "Other"
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
      defaultValue: 'Full Day',
      options: [
        {
          "label": "Full Day",
          "value": "Full Day"
        },
        {
          "label": "Morning",
          "value": "Morning"
        },
        {
          "label": "Afternoon",
          "value": "Afternoon"
        }
      ]
    }),
    end_time: Field.select({
      label: 'End Period',
      defaultValue: 'Full Day',
      options: [
        {
          "label": "Full Day",
          "value": "Full Day"
        },
        {
          "label": "Morning",
          "value": "Morning"
        },
        {
          "label": "Afternoon",
          "value": "Afternoon"
        }
      ]
    }),
    total_days: Field.number({
      label: 'Total Days',
      description: '自动计算的请假天数',
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
      defaultValue: 'Pending',
      options: [
        {
          "label": "Pending",
          "value": "Pending"
        },
        {
          "label": "Approved",
          "value": "Approved"
        },
        {
          "label": "Rejected",
          "value": "Rejected"
        },
        {
          "label": "Cancelled",
          "value": "Cancelled"
        }
      ]
    }),
    approver_id: Field.lookup('employee', {
      label: 'Approver',
      description: '负责审批的经理'
    }),
    approval_date: Field.date({ label: 'Approval Date' }),
    reason: Field.textarea({
      label: 'Leave Reason',
      required: true,
    }),
    rejection_reason: Field.textarea({
      label: 'Rejection Reason',
      description: '如果被拒绝，记录原因',
    }),
    contact_info: Field.text({
      label: 'Contact During Leave',
      maxLength: 255
    }),
    backup_person_id: Field.lookup('employee', {
      label: 'Backup Person',
      description: '临时负责工作的同事'
    }),
    is_paid: Field.boolean({
      label: 'Is Paid',
      defaultValue: true
    }),
    attachment_url: Field.url({
      label: 'Attachment URL',
      description: '如病假证明等'
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