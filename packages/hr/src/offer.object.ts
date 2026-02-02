
const Offer = {
  name: 'offer',
  label: 'Offer',
  labelPlural: 'Offers',
  icon: 'file-contract',
  description: '录用通知和Offer管理',
  enable: {
    searchable: true,
    trackHistory: true,
    activities: true,
    feeds: true,
    files: true
  },
  fields: {
    offer_number: {
      type: 'text',
      label: 'Offer编号',
      unique: true,
      maxLength: 40
    },
    candidate_id: {
      type: 'lookup',
      label: '候选人',
      reference: 'candidate',
      required: true
    },
    application_id: {
      type: 'lookup',
      label: '申请',
      reference: 'application',
      required: true
    },
    recruitment_id: {
      type: 'lookup',
      label: '招聘需求',
      reference: 'recruitment',
      required: true
    },
    position_id: {
      type: 'lookup',
      label: '职位',
      reference: 'position',
      required: true
    },
    department_id: {
      type: 'lookup',
      label: '部门',
      reference: 'department',
      required: true
    },
    hiring_manager_id: {
      type: 'lookup',
      label: '招聘负责人',
      reference: 'employee',
      required: true
    },
    offer_date: {
      type: 'date',
      label: 'Offer日期',
      required: true,
      defaultValue: '$today'
    },
    expiry_date: {
      type: 'date',
      label: '截止日期',
      description: 'Offer有效期截止日期'
    },
    start_date: {
      type: 'date',
      label: '期望入职日期',
      required: true
    },
    base_salary: {
      type: 'currency',
      label: '基本工资',
      precision: 2,
      required: true
    },
    bonus: {
      type: 'currency',
      label: '奖金',
      precision: 2
    },
    equity: {
      type: 'text',
      label: '股权/期权',
      maxLength: 255,
      description: '股权或期权描述'
    },
    benefits: {
      type: 'textarea',
      label: '福利待遇',
      rows: 4,
      description: '医疗保险、带薪休假等福利'
    },
    employment_type: {
      type: 'select',
      label: '雇佣类型',
      defaultValue: 'Full-time',
      options: [
        { label: '全职', value: 'Full-time' },
        { label: '兼职', value: 'Part-time' },
        { label: '合同', value: 'Contract' },
        { label: '实习', value: 'Intern' }
      ]
    },
    probation_period: {
      type: 'select',
      label: '试用期',
      options: [
        { label: '无试用期', value: 'None' },
        { label: '1个月', value: '1 Month' },
        { label: '2个月', value: '2 Months' },
        { label: '3个月', value: '3 Months' },
        { label: '6个月', value: '6 Months' }
      ]
    },
    status: {
      type: 'select',
      label: '状态',
      defaultValue: 'Draft',
      options: [
        { label: '草稿', value: 'Draft' },
        { label: '审批中', value: 'Pending Approval' },
        { label: '已发送', value: 'Extended' },
        { label: '已接受', value: 'Accepted' },
        { label: '已拒绝', value: 'Rejected' },
        { label: '已撤回', value: 'Withdrawn' },
        { label: '已过期', value: 'Expired' }
      ]
    },
    response_date: {
      type: 'date',
      label: '候选人回复日期'
    },
    rejection_reason: {
      type: 'textarea',
      label: '拒绝原因',
      rows: 3,
      description: '如果候选人拒绝，记录原因'
    },
    offer_letter_url: {
      type: 'url',
      label: 'Offer Letter链接'
    },
    notes: {
      type: 'textarea',
      label: '备注',
      rows: 4
    }
  },
  relationships: [
    {
      name: 'Onboarding',
      type: 'hasOne',
      object: 'Onboarding',
      foreignKey: 'offer_id',
      label: '入职流程'
    }
  ],
  listViews: [
    {
      name: 'All',
      label: '所有Offer',
      filters: [],
      columns: ['offer_number', 'candidate_id', 'position_id', 'offer_date', 'status', 'base_salary']
    },
    {
      name: 'Extended',
      label: '已发送',
      filters: [['status', '=', 'Extended']],
      columns: ['candidate_id', 'position_id', 'department_id', 'offer_date', 'expiry_date', 'base_salary']
    },
    {
      name: 'Accepted',
      label: '已接受',
      filters: [['status', '=', 'Accepted']],
      columns: ['candidate_id', 'position_id', 'start_date', 'base_salary', 'response_date']
    },
    {
      name: 'PendingResponse',
      label: '待回复',
      filters: [
        ['status', '=', 'Extended'],
        ['expiry_date', '>=', '$today']
      ],
      columns: ['candidate_id', 'position_id', 'offer_date', 'expiry_date', 'base_salary'],
      sort: [['expiry_date', 'asc']]
    }
  ],
  validationRules: [
    {
      name: 'ValidExpiryDate',
      errorMessage: '截止日期必须在Offer日期之后',
      formula: 'AND(NOT(ISBLANK(expiry_date)), expiry_date <= offer_date)'
    },
    {
      name: 'ValidStartDate',
      errorMessage: '入职日期必须在Offer日期之后',
      formula: 'start_date <= offer_date'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: '基本信息',
        columns: 2,
        fields: ['offer_number', 'candidate_id', 'application_id', 'recruitment_id']
      },
      {
        label: '职位信息',
        columns: 2,
        fields: ['position_id', 'department_id', 'hiring_manager_id', 'employment_type']
      },
      {
        label: '时间信息',
        columns: 2,
        fields: ['offer_date', 'expiry_date', 'start_date', 'response_date']
      },
      {
        label: '薪资与福利',
        columns: 2,
        fields: ['base_salary', 'bonus', 'equity', 'probation_period']
      },
      {
        label: '状态',
        columns: 2,
        fields: ['status', 'offer_letter_url']
      },
      {
        label: '福利待遇',
        columns: 1,
        fields: ['benefits']
      },
      {
        label: '其他信息',
        columns: 1,
        fields: ['rejection_reason', 'notes']
      }
    ]
  }
};

export default Offer;
