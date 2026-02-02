import { ObjectSchema, Field } from '@objectstack/spec/data';

export const TimeOff = ObjectSchema.create({
  name: 'time_off',
  label: '请假',
  pluralLabel: '请假记录',
  icon: 'calendar-times',
  description: '员工请假和休假管理',

  fields: {
    request_number: Field.text({
      label: '请假单号',
      unique: true,
      maxLength: 40
    }),
    employee_id: Field.lookup('employee', {
      label: '员工',
      required: true
    }),
    leave_type: Field.select({
      label: '请假类型',
      required: true,
      options: [
        {
          "label": "年假",
          "value": "Annual Leave"
        },
        {
          "label": "病假",
          "value": "Sick Leave"
        },
        {
          "label": "事假",
          "value": "Personal Leave"
        },
        {
          "label": "婚假",
          "value": "Marriage Leave"
        },
        {
          "label": "产假",
          "value": "Maternity Leave"
        },
        {
          "label": "陪产假",
          "value": "Paternity Leave"
        },
        {
          "label": "丧假",
          "value": "Bereavement Leave"
        },
        {
          "label": "调休",
          "value": "Compensatory Leave"
        },
        {
          "label": "无薪假",
          "value": "Unpaid Leave"
        },
        {
          "label": "其他",
          "value": "Other"
        }
      ]
    }),
    start_date: Field.date({
      label: '开始日期',
      required: true
    }),
    end_date: Field.date({
      label: '结束日期',
      required: true
    }),
    start_time: Field.select({
      label: '开始时段',
      defaultValue: 'Full Day',
      options: [
        {
          "label": "全天",
          "value": "Full Day"
        },
        {
          "label": "上午",
          "value": "Morning"
        },
        {
          "label": "下午",
          "value": "Afternoon"
        }
      ]
    }),
    end_time: Field.select({
      label: '结束时段',
      defaultValue: 'Full Day',
      options: [
        {
          "label": "全天",
          "value": "Full Day"
        },
        {
          "label": "上午",
          "value": "Morning"
        },
        {
          "label": "下午",
          "value": "Afternoon"
        }
      ]
    }),
    total_days: Field.number({
      label: '请假天数',
      description: '自动计算的请假天数',
      readonly: true,
      precision: 1
    }),
    request_date: Field.date({
      label: '申请日期',
      required: true,
      defaultValue: '$today'
    }),
    status: Field.select({
      label: '状态',
      defaultValue: 'Pending',
      options: [
        {
          "label": "待审批",
          "value": "Pending"
        },
        {
          "label": "已批准",
          "value": "Approved"
        },
        {
          "label": "已拒绝",
          "value": "Rejected"
        },
        {
          "label": "已取消",
          "value": "Cancelled"
        }
      ]
    }),
    approver_id: Field.lookup('employee', {
      label: '审批人',
      description: '负责审批的经理'
    }),
    approval_date: Field.date({ label: '审批日期' }),
    reason: Field.textarea({
      label: '请假原因',
      required: true,
      rows: 4
    }),
    rejection_reason: Field.textarea({
      label: '拒绝原因',
      description: '如果被拒绝，记录原因',
      rows: 3
    }),
    contact_info: Field.text({
      label: '请假期间联系方式',
      maxLength: 255
    }),
    backup_person_id: Field.lookup('employee', {
      label: '工作交接人',
      description: '临时负责工作的同事'
    }),
    is_paid: Field.checkbox({
      label: '是否带薪',
      defaultValue: true
    }),
    attachment_url: Field.url({
      label: '附件链接',
      description: '如病假证明等'
    }),
    notes: Field.textarea({
      label: '备注',
      rows: 3
    })
  },

  enable: {
    searchEnabled: true,
    trackHistory: true,
    allowActivities: true,
    allowFeeds: true,
    allowAttachments: true
  },
});