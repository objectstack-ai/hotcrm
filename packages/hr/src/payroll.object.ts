
const Payroll = {
  name: 'payroll',
  label: '工资',
  labelPlural: '工资记录',
  icon: 'money-bill-wave',
  description: '员工薪资和工资单管理',
  enable: {
    searchable: true,
    trackHistory: true,
    activities: false,
    feeds: false,
    files: true
  },
  fields: {
    payroll_number: {
      type: 'text',
      label: '工资单号',
      unique: true,
      maxLength: 40
    },
    employee_id: {
      type: 'lookup',
      label: '员工',
      reference: 'employee',
      required: true
    },
    pay_period_start: {
      type: 'date',
      label: '工资期开始',
      required: true
    },
    pay_period_end: {
      type: 'date',
      label: '工资期结束',
      required: true
    },
    pay_date: {
      type: 'date',
      label: '发薪日期',
      required: true
    },
    base_salary: {
      type: 'currency',
      label: '基本工资',
      precision: 2,
      required: true
    },
    overtime_pay: {
      type: 'currency',
      label: '加班工资',
      precision: 2
    },
    bonus: {
      type: 'currency',
      label: '奖金',
      precision: 2
    },
    commission: {
      type: 'currency',
      label: '佣金',
      precision: 2
    },
    allowances: {
      type: 'currency',
      label: '津贴',
      precision: 2,
      description: '交通、餐饮等补贴'
    },
    gross_pay: {
      type: 'currency',
      label: '应发工资',
      precision: 2,
      readonly: true,
      description: '税前总收入（自动计算）'
    },
    tax: {
      type: 'currency',
      label: '个人所得税',
      precision: 2
    },
    social_security: {
      type: 'currency',
      label: '社保',
      precision: 2
    },
    housing_fund: {
      type: 'currency',
      label: '公积金',
      precision: 2
    },
    other_deductions: {
      type: 'currency',
      label: '其他扣款',
      precision: 2
    },
    total_deductions: {
      type: 'currency',
      label: '扣款合计',
      precision: 2,
      readonly: true,
      description: '总扣款金额（自动计算）'
    },
    net_pay: {
      type: 'currency',
      label: '实发工资',
      precision: 2,
      readonly: true,
      description: '税后实际到手金额（自动计算）'
    },
    worked_days: {
      type: 'number',
      label: '出勤天数',
      precision: 1
    },
    overtime_hours: {
      type: 'number',
      label: '加班小时数',
      precision: 1
    },
    leave_days: {
      type: 'number',
      label: '请假天数',
      precision: 1
    },
    status: {
      type: 'select',
      label: '状态',
      defaultValue: 'Draft',
      options: [
        { label: '草稿', value: 'Draft' },
        { label: '待审核', value: 'Pending Approval' },
        { label: '已批准', value: 'Approved' },
        { label: '已支付', value: 'Paid' },
        { label: '已取消', value: 'Cancelled' }
      ]
    },
    payment_method: {
      type: 'select',
      label: '支付方式',
      defaultValue: 'Bank Transfer',
      options: [
        { label: '银行转账', value: 'Bank Transfer' },
        { label: '支票', value: 'Check' },
        { label: '现金', value: 'Cash' },
        { label: '其他', value: 'Other' }
      ]
    },
    bank_account: {
      type: 'text',
      label: '银行账号',
      maxLength: 100
    },
    payslip_url: {
      type: 'url',
      label: '工资条链接'
    },
    notes: {
      type: 'textarea',
      label: '备注',
      rows: 3
    }
  },
  listViews: [
    {
      name: 'All',
      label: '所有工资',
      filters: [],
      columns: ['payroll_number', 'employee_id', 'pay_period_end', 'gross_pay', 'net_pay', 'status']
    },
    {
      name: 'CurrentMonth',
      label: '本月工资',
      filters: [['pay_period_end', 'this_month']],
      columns: ['employee_id', 'pay_date', 'gross_pay', 'total_deductions', 'net_pay', 'status']
    },
    {
      name: 'PendingApproval',
      label: '待审核',
      filters: [['status', '=', 'Pending Approval']],
      columns: ['employee_id', 'pay_period_start', 'pay_period_end', 'gross_pay', 'net_pay']
    },
    {
      name: 'Approved',
      label: '已批准',
      filters: [['status', '=', 'Approved']],
      columns: ['employee_id', 'pay_date', 'gross_pay', 'net_pay', 'payment_method']
    },
    {
      name: 'Paid',
      label: '已支付',
      filters: [['status', '=', 'Paid']],
      columns: ['employee_id', 'pay_date', 'gross_pay', 'net_pay', 'payment_method']
    },
    {
      name: 'MyPayroll',
      label: '我的工资',
      filters: [['employee_id', '=', '$currentUser']],
      columns: ['pay_period_end', 'pay_date', 'gross_pay', 'total_deductions', 'net_pay', 'status'],
      sort: [['pay_period_end', 'desc']]
    }
  ],
  validationRules: [
    {
      name: 'ValidPayPeriod',
      errorMessage: '工资期结束日期不能早于开始日期',
      formula: 'pay_period_end < pay_period_start'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: '基本信息',
        columns: 2,
        fields: ['payroll_number', 'employee_id', 'pay_period_start', 'pay_period_end', 'pay_date']
      },
      {
        label: '收入项',
        columns: 2,
        fields: ['base_salary', 'overtime_pay', 'bonus', 'commission', 'allowances', 'gross_pay']
      },
      {
        label: '扣款项',
        columns: 2,
        fields: ['tax', 'social_security', 'housing_fund', 'other_deductions', 'total_deductions']
      },
      {
        label: '实发工资',
        columns: 2,
        fields: ['net_pay']
      },
      {
        label: '工时统计',
        columns: 2,
        fields: ['worked_days', 'overtime_hours', 'leave_days']
      },
      {
        label: '支付信息',
        columns: 2,
        fields: ['status', 'payment_method', 'bank_account', 'payslip_url']
      },
      {
        label: '备注',
        columns: 1,
        fields: ['notes']
      }
    ]
  }
};

export default Payroll;
