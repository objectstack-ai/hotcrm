
const TimeOff = {
  name: 'time_off',
  label: '请假',
  labelPlural: '请假记录',
  icon: 'calendar-times',
  description: '员工请假和休假管理',
  enable: {
    searchable: true,
    trackHistory: true,
    activities: true,
    feeds: true,
    files: true
  },
  fields: {
    request_number: {
      type: 'text',
      label: '请假单号',
      unique: true,
      maxLength: 40
    },
    employee_id: {
      type: 'lookup',
      label: '员工',
      reference: 'employee',
      required: true
    },
    leave_type: {
      type: 'select',
      label: '请假类型',
      required: true,
      options: [
        { label: '年假', value: 'Annual Leave' },
        { label: '病假', value: 'Sick Leave' },
        { label: '事假', value: 'Personal Leave' },
        { label: '婚假', value: 'Marriage Leave' },
        { label: '产假', value: 'Maternity Leave' },
        { label: '陪产假', value: 'Paternity Leave' },
        { label: '丧假', value: 'Bereavement Leave' },
        { label: '调休', value: 'Compensatory Leave' },
        { label: '无薪假', value: 'Unpaid Leave' },
        { label: '其他', value: 'Other' }
      ]
    },
    start_date: {
      type: 'date',
      label: '开始日期',
      required: true
    },
    end_date: {
      type: 'date',
      label: '结束日期',
      required: true
    },
    start_time: {
      type: 'select',
      label: '开始时段',
      defaultValue: 'Full Day',
      options: [
        { label: '全天', value: 'Full Day' },
        { label: '上午', value: 'Morning' },
        { label: '下午', value: 'Afternoon' }
      ]
    },
    end_time: {
      type: 'select',
      label: '结束时段',
      defaultValue: 'Full Day',
      options: [
        { label: '全天', value: 'Full Day' },
        { label: '上午', value: 'Morning' },
        { label: '下午', value: 'Afternoon' }
      ]
    },
    total_days: {
      type: 'number',
      label: '请假天数',
      precision: 1,
      readonly: true,
      description: '自动计算的请假天数'
    },
    request_date: {
      type: 'date',
      label: '申请日期',
      defaultValue: '$today',
      required: true
    },
    status: {
      type: 'select',
      label: '状态',
      defaultValue: 'Pending',
      options: [
        { label: '待审批', value: 'Pending' },
        { label: '已批准', value: 'Approved' },
        { label: '已拒绝', value: 'Rejected' },
        { label: '已取消', value: 'Cancelled' }
      ]
    },
    approver_id: {
      type: 'lookup',
      label: '审批人',
      reference: 'employee',
      description: '负责审批的经理'
    },
    approval_date: {
      type: 'date',
      label: '审批日期'
    },
    reason: {
      type: 'textarea',
      label: '请假原因',
      rows: 4,
      required: true
    },
    rejection_reason: {
      type: 'textarea',
      label: '拒绝原因',
      rows: 3,
      description: '如果被拒绝，记录原因'
    },
    contact_info: {
      type: 'text',
      label: '请假期间联系方式',
      maxLength: 255
    },
    backup_person_id: {
      type: 'lookup',
      label: '工作交接人',
      reference: 'employee',
      description: '临时负责工作的同事'
    },
    is_paid: {
      type: 'checkbox',
      label: '是否带薪',
      defaultValue: true
    },
    attachment_url: {
      type: 'url',
      label: '附件链接',
      description: '如病假证明等'
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
      label: '所有请假',
      filters: [],
      columns: ['request_number', 'employee_id', 'leave_type', 'start_date', 'total_days', 'status']
    },
    {
      name: 'Pending',
      label: '待审批',
      filters: [['status', '=', 'Pending']],
      columns: ['employee_id', 'leave_type', 'start_date', 'end_date', 'total_days', 'request_date', 'approver_id']
    },
    {
      name: 'Approved',
      label: '已批准',
      filters: [['status', '=', 'Approved']],
      columns: ['employee_id', 'leave_type', 'start_date', 'end_date', 'total_days', 'approval_date']
    },
    {
      name: 'MyRequests',
      label: '我的请假',
      filters: [['employee_id', '=', '$currentUser']],
      columns: ['leave_type', 'start_date', 'end_date', 'total_days', 'status', 'approval_date']
    },
    {
      name: 'MyApprovals',
      label: '待我审批',
      filters: [
        ['approver_id', '=', '$currentUser'],
        ['status', '=', 'Pending']
      ],
      columns: ['employee_id', 'leave_type', 'start_date', 'total_days', 'request_date', 'reason']
    },
    {
      name: 'Upcoming',
      label: '即将开始',
      filters: [
        ['status', '=', 'Approved'],
        ['start_date', '>=', '$today']
      ],
      columns: ['employee_id', 'leave_type', 'start_date', 'end_date', 'total_days', 'backup_person_id'],
      sort: [['start_date', 'asc']]
    }
  ],
  validationRules: [
    {
      name: 'ValidDateRange',
      errorMessage: '结束日期必须在开始日期之后或相同',
      formula: 'end_date < start_date'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: '基本信息',
        columns: 2,
        fields: ['request_number', 'employee_id', 'leave_type', 'is_paid']
      },
      {
        label: '请假时间',
        columns: 2,
        fields: ['start_date', 'start_time', 'end_date', 'end_time', 'total_days']
      },
      {
        label: '审批信息',
        columns: 2,
        fields: ['status', 'request_date', 'approver_id', 'approval_date']
      },
      {
        label: '工作安排',
        columns: 2,
        fields: ['backup_person_id', 'contact_info']
      },
      {
        label: '详细说明',
        columns: 1,
        fields: ['reason', 'rejection_reason']
      },
      {
        label: '附件与备注',
        columns: 1,
        fields: ['attachment_url', 'notes']
      }
    ]
  }
};

export default TimeOff;
