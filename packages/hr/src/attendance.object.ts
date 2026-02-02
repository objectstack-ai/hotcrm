import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Attendance = ObjectSchema.create({
  name: 'attendance',
  label: '考勤',
  pluralLabel: '考勤记录',
  icon: 'clock',
  description: '员工考勤和工时跟踪',

  fields: {
    employee_id: Field.lookup('employee', {
      label: '员工',
      required: true
    }),
    attendance_date: Field.date({
      label: '考勤日期',
      required: true
    }),
    check_in_time: Field.datetime({ label: '签到时间' }),
    check_out_time: Field.datetime({ label: '签退时间' }),
    work_hours: Field.number({
      label: '工作时长（小时）',
      description: '自动计算的工作时长',
      readonly: true,
      precision: 2
    }),
    status: Field.select({
      label: '考勤状态',
      defaultValue: 'Present',
      options: [
        {
          "label": "正常",
          "value": "Present"
        },
        {
          "label": "迟到",
          "value": "Late"
        },
        {
          "label": "早退",
          "value": "Early Leave"
        },
        {
          "label": "缺勤",
          "value": "Absent"
        },
        {
          "label": "请假",
          "value": "On Leave"
        },
        {
          "label": "出差",
          "value": "Business Trip"
        },
        {
          "label": "远程办公",
          "value": "Remote Work"
        },
        {
          "label": "加班",
          "value": "Overtime"
        }
      ]
    }),
    late_minutes: Field.number({
      label: '迟到分钟数',
      precision: 0
    }),
    early_leave_minutes: Field.number({
      label: '早退分钟数',
      precision: 0
    }),
    overtime_hours: Field.number({
      label: '加班时长（小时）',
      precision: 2
    }),
    location: Field.select({
      label: '工作地点',
      options: [
        {
          "label": "办公室",
          "value": "Office"
        },
        {
          "label": "远程",
          "value": "Remote"
        },
        {
          "label": "客户现场",
          "value": "Client Site"
        },
        {
          "label": "出差",
          "value": "Business Trip"
        }
      ]
    }),
    check_in_location: /* TODO: Unknown type 'location' */ null,
    check_out_location: /* TODO: Unknown type 'location' */ null,
    is_approved: Field.checkbox({
      label: '是否已审核',
      defaultValue: false
    }),
    approver_id: Field.lookup('employee', { label: '审核人' }),
    notes: Field.textarea({
      label: '备注',
      description: '异常情况说明等',
      rows: 3
    })
  },

  enable: {
    searchEnabled: true,
    trackHistory: false,
    allowActivities: false,
    allowFeeds: false,
    allowAttachments: false
  },
});