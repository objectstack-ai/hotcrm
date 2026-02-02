import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Payroll = ObjectSchema.create({
  name: 'payroll',
  label: '工资',
  pluralLabel: '工资记录',
  icon: 'money-bill-wave',
  description: '员工薪资和工资单管理',

  fields: {
    payroll_number: Field.text({
      label: '工资单号',
      unique: true,
      maxLength: 40
    }),
    employee_id: Field.lookup('employee', {
      label: '员工',
      required: true
    }),
    pay_period_start: Field.date({
      label: '工资期开始',
      required: true
    }),
    pay_period_end: Field.date({
      label: '工资期结束',
      required: true
    }),
    pay_date: Field.date({
      label: '发薪日期',
      required: true
    }),
    base_salary: Field.currency({
      label: '基本工资',
      required: true,
      precision: 2
    }),
    overtime_pay: Field.currency({
      label: '加班工资',
      precision: 2
    }),
    bonus: Field.currency({
      label: '奖金',
      precision: 2
    }),
    commission: Field.currency({
      label: '佣金',
      precision: 2
    }),
    allowances: Field.currency({
      label: '津贴',
      description: '交通、餐饮等补贴',
      precision: 2
    }),
    gross_pay: Field.currency({
      label: '应发工资',
      description: '税前总收入（自动计算）',
      readonly: true,
      precision: 2
    }),
    tax: Field.currency({
      label: '个人所得税',
      precision: 2
    }),
    social_security: Field.currency({
      label: '社保',
      precision: 2
    }),
    housing_fund: Field.currency({
      label: '公积金',
      precision: 2
    }),
    other_deductions: Field.currency({
      label: '其他扣款',
      precision: 2
    }),
    total_deductions: Field.currency({
      label: '扣款合计',
      description: '总扣款金额（自动计算）',
      readonly: true,
      precision: 2
    }),
    net_pay: Field.currency({
      label: '实发工资',
      description: '税后实际到手金额（自动计算）',
      readonly: true,
      precision: 2
    }),
    worked_days: Field.number({
      label: '出勤天数',
      precision: 1
    }),
    overtime_hours: Field.number({
      label: '加班小时数',
      precision: 1
    }),
    leave_days: Field.number({
      label: '请假天数',
      precision: 1
    }),
    status: Field.select({
      label: '状态',
      defaultValue: 'Draft',
      options: [
        {
          "label": "草稿",
          "value": "Draft"
        },
        {
          "label": "待审核",
          "value": "Pending Approval"
        },
        {
          "label": "已批准",
          "value": "Approved"
        },
        {
          "label": "已支付",
          "value": "Paid"
        },
        {
          "label": "已取消",
          "value": "Cancelled"
        }
      ]
    }),
    payment_method: Field.select({
      label: '支付方式',
      defaultValue: 'Bank Transfer',
      options: [
        {
          "label": "银行转账",
          "value": "Bank Transfer"
        },
        {
          "label": "支票",
          "value": "Check"
        },
        {
          "label": "现金",
          "value": "Cash"
        },
        {
          "label": "其他",
          "value": "Other"
        }
      ]
    }),
    bank_account: Field.text({
      label: '银行账号',
      maxLength: 100
    }),
    payslip_url: Field.url({ label: '工资条链接' }),
    notes: Field.textarea({
      label: '备注',
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    activities: false,
    feeds: false,
  },
});