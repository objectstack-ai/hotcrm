import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Attendance = ObjectSchema.create({
  name: 'attendance',
  label: 'Attendance',
  pluralLabel: 'Attendance Records',
  icon: 'clock',
  description: 'Employee attendance and work hour tracking',

  fields: {
    employee_id: Field.lookup('employee', {
      label: 'Employee',
      required: true
    }),
    attendance_date: Field.date({
      label: 'Attendance Date',
      required: true
    }),
    check_in_time: Field.datetime({ label: 'Check-in Time' }),
    check_out_time: Field.datetime({ label: 'Check-out Time' }),
    work_hours: Field.number({
      label: 'Work Hours',
      description: 'Automatically calculated work duration',
      readonly: true,
      precision: 2
    }),
    status: Field.select({
      label: 'Attendance Status',
      defaultValue: 'present',
      options: [
        {
          "label": "Present",
          "value": "present"
        },
        {
          "label": "Late",
          "value": "late"
        },
        {
          "label": "Early Leave",
          "value": "early_leave"
        },
        {
          "label": "Absent",
          "value": "absent"
        },
        {
          "label": "Time Off",
          "value": "on_leave"
        },
        {
          "label": "Business Trip",
          "value": "business_trip"
        },
        {
          "label": "Remote Work",
          "value": "remote_work"
        },
        {
          "label": "Overtime",
          "value": "overtime"
        }
      ]
    }),
    late_minutes: Field.number({
      label: 'Late Minutes',
      precision: 0
    }),
    early_leave_minutes: Field.number({
      label: 'Early Leave Minutes',
      precision: 0
    }),
    overtime_hours: Field.number({
      label: 'Overtime Hours',
      precision: 2
    }),
    location: Field.select({
      label: 'Work Location',
      options: [
        {
          "label": "Office",
          "value": "office"
        },
        {
          "label": "Remote",
          "value": "remote"
        },
        {
          "label": "Client Site",
          "value": "client_site"
        },
        {
          "label": "Business Trip",
          "value": "business_trip"
        }
      ]
    }),
    is_approved: Field.boolean({
      label: 'Is Approved',
      defaultValue: false
    }),
    approver_id: Field.lookup('employee', { label: 'Approver' }),
    notes: Field.textarea({
      label: 'Notes',
      description: 'Notes for anomalies or exceptions',
    })
  },

  enable: {
    searchable: true,
    trackHistory: false,
    activities: false,
    feeds: false,
  },
});