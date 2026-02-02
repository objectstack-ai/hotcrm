
const Recruitment = {
  name: 'recruitment',
  label: '招聘需求',
  labelPlural: '招聘需求',
  icon: 'user-plus',
  description: '职位招聘需求和招聘计划管理',
  enable: {
    searchable: true,
    trackHistory: true,
    activities: true,
    feeds: true,
    files: true
  },
  fields: {
    title: {
      type: 'text',
      label: '招聘标题',
      required: true,
      searchable: true,
      maxLength: 255
    },
    requisition_number: {
      type: 'text',
      label: '需求编号',
      unique: true,
      maxLength: 40
    },
    position_id: {
      type: 'lookup',
      label: '招聘职位',
      reference: 'position',
      required: true
    },
    department_id: {
      type: 'lookup',
      label: '所属部门',
      reference: 'department',
      required: true
    },
    hiring_manager_id: {
      type: 'lookup',
      label: '招聘负责人',
      reference: 'employee',
      required: true,
      description: '负责此次招聘的经理'
    },
    headcount: {
      type: 'number',
      label: '招聘人数',
      defaultValue: 1,
      required: true
    },
    priority: {
      type: 'select',
      label: '优先级',
      defaultValue: 'Medium',
      options: [
        { label: '紧急', value: 'Urgent' },
        { label: '高', value: 'High' },
        { label: '中', value: 'Medium' },
        { label: '低', value: 'Low' }
      ]
    },
    status: {
      type: 'select',
      label: '状态',
      defaultValue: 'Open',
      options: [
        { label: '草稿', value: 'Draft' },
        { label: '审批中', value: 'Pending Approval' },
        { label: '开放', value: 'Open' },
        { label: '进行中', value: 'In Progress' },
        { label: '暂停', value: 'On Hold' },
        { label: '已完成', value: 'Filled' },
        { label: '已取消', value: 'Cancelled' }
      ]
    },
    target_start_date: {
      type: 'date',
      label: '期望到岗日期'
    },
    posted_date: {
      type: 'date',
      label: '发布日期'
    },
    close_date: {
      type: 'date',
      label: '关闭日期'
    },
    job_description: {
      type: 'textarea',
      label: '职位描述',
      rows: 8,
      description: '详细的职位职责和要求'
    },
    requirements: {
      type: 'textarea',
      label: '任职要求',
      rows: 5,
      description: '学历、经验、技能等要求'
    },
    salary_range_min: {
      type: 'currency',
      label: '薪资范围（最低）',
      precision: 2
    },
    salary_range_max: {
      type: 'currency',
      label: '薪资范围（最高）',
      precision: 2
    },
    notes: {
      type: 'textarea',
      label: '备注',
      rows: 4
    }
  },
  relationships: [
    {
      name: 'Applications',
      type: 'hasMany',
      object: 'Application',
      foreignKey: 'recruitment_id',
      label: '申请'
    },
    {
      name: 'Interviews',
      type: 'hasMany',
      object: 'Interview',
      foreignKey: 'recruitment_id',
      label: '面试'
    }
  ],
  listViews: [
    {
      name: 'All',
      label: '所有招聘',
      filters: [],
      columns: ['requisition_number', 'title', 'position_id', 'department_id', 'headcount', 'status', 'priority']
    },
    {
      name: 'Open',
      label: '开放招聘',
      filters: [['status', '=', 'Open']],
      columns: ['title', 'position_id', 'department_id', 'hiring_manager_id', 'headcount', 'priority', 'posted_date']
    },
    {
      name: 'InProgress',
      label: '进行中',
      filters: [['status', '=', 'In Progress']],
      columns: ['title', 'position_id', 'department_id', 'hiring_manager_id', 'headcount', 'priority']
    },
    {
      name: 'Urgent',
      label: '紧急招聘',
      filters: [
        ['priority', 'in', ['Urgent', 'High']],
        ['status', 'in', ['Open', 'In Progress']]
      ],
      columns: ['title', 'position_id', 'department_id', 'hiring_manager_id', 'priority', 'target_start_date'],
      sort: [['priority', 'asc']]
    }
  ],
  validationRules: [
    {
      name: 'ValidSalaryRange',
      errorMessage: '最高薪资必须大于最低薪资',
      formula: 'AND(NOT(ISBLANK(salary_range_min)), NOT(ISBLANK(salary_range_max)), salary_range_max <= salary_range_min)'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: '基本信息',
        columns: 2,
        fields: ['title', 'requisition_number', 'position_id', 'department_id', 'hiring_manager_id', 'headcount']
      },
      {
        label: '状态与优先级',
        columns: 2,
        fields: ['status', 'priority', 'target_start_date', 'posted_date', 'close_date']
      },
      {
        label: '薪资范围',
        columns: 2,
        fields: ['salary_range_min', 'salary_range_max']
      },
      {
        label: '职位信息',
        columns: 1,
        fields: ['job_description', 'requirements']
      },
      {
        label: '备注',
        columns: 1,
        fields: ['notes']
      }
    ]
  }
};

export default Recruitment;
