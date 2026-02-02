
const Goal = {
  name: 'goal',
  label: '目标',
  labelPlural: '目标',
  icon: 'bullseye',
  description: 'OKR和个人目标管理',
  enable: {
    searchable: true,
    trackHistory: true,
    activities: true,
    feeds: true,
    files: false
  },
  fields: {
    title: {
      type: 'text',
      label: '目标名称',
      required: true,
      searchable: true,
      maxLength: 255
    },
    employee_id: {
      type: 'lookup',
      label: '负责员工',
      reference: 'employee',
      required: true
    },
    manager_id: {
      type: 'lookup',
      label: '目标设定人',
      reference: 'employee',
      description: '通常是直属经理'
    },
    goal_type: {
      type: 'select',
      label: '目标类型',
      defaultValue: 'Individual',
      options: [
        { label: '个人目标', value: 'Individual' },
        { label: '团队目标', value: 'Team' },
        { label: 'OKR', value: 'OKR' },
        { label: '发展目标', value: 'Development' },
        { label: '项目目标', value: 'Project' }
      ]
    },
    category: {
      type: 'select',
      label: '目标类别',
      options: [
        { label: '业绩', value: 'Performance' },
        { label: '技能发展', value: 'Skill Development' },
        { label: '领导力', value: 'Leadership' },
        { label: '创新', value: 'Innovation' },
        { label: '团队协作', value: 'Teamwork' },
        { label: '客户满意度', value: 'Customer Satisfaction' },
        { label: '其他', value: 'Other' }
      ]
    },
    priority: {
      type: 'select',
      label: '优先级',
      defaultValue: 'Medium',
      options: [
        { label: '高', value: 'High' },
        { label: '中', value: 'Medium' },
        { label: '低', value: 'Low' }
      ]
    },
    start_date: {
      type: 'date',
      label: '开始日期',
      required: true
    },
    target_date: {
      type: 'date',
      label: '目标日期',
      required: true
    },
    completion_date: {
      type: 'date',
      label: '完成日期'
    },
    status: {
      type: 'select',
      label: '状态',
      defaultValue: 'Not Started',
      options: [
        { label: '未开始', value: 'Not Started' },
        { label: '进行中', value: 'In Progress' },
        { label: '有风险', value: 'At Risk' },
        { label: '已完成', value: 'Completed' },
        { label: '未完成', value: 'Not Achieved' },
        { label: '已取消', value: 'Cancelled' }
      ]
    },
    progress: {
      type: 'percent',
      label: '完成进度',
      defaultValue: 0,
      description: '目标完成百分比'
    },
    target_value: {
      type: 'number',
      label: '目标值',
      precision: 2,
      description: '量化的目标数值'
    },
    current_value: {
      type: 'number',
      label: '当前值',
      precision: 2,
      description: '当前达成的数值'
    },
    unit: {
      type: 'text',
      label: '单位',
      maxLength: 40,
      description: '目标值的单位，如：个、万元、%'
    },
    description: {
      type: 'textarea',
      label: '目标描述',
      rows: 5,
      description: '详细的目标说明和期望结果'
    },
    key_results: {
      type: 'textarea',
      label: '关键结果（KR）',
      rows: 5,
      description: 'OKR的关键结果，可列出多个'
    },
    performance_review_id: {
      type: 'lookup',
      label: '关联绩效评估',
      reference: 'performance_review'
    },
    weight: {
      type: 'percent',
      label: '权重',
      description: '在绩效考核中的权重'
    },
    achievement_notes: {
      type: 'textarea',
      label: '达成情况说明',
      rows: 4
    },
    notes: {
      type: 'textarea',
      label: '备注',
      rows: 4
    }
  },
  listViews: [
    {
      name: 'All',
      label: '所有目标',
      filters: [],
      columns: ['title', 'employee_id', 'goal_type', 'status', 'progress', 'target_date']
    },
    {
      name: 'MyGoals',
      label: '我的目标',
      filters: [['employee_id', '=', '$currentUser']],
      columns: ['title', 'goal_type', 'priority', 'status', 'progress', 'target_date']
    },
    {
      name: 'InProgress',
      label: '进行中',
      filters: [['status', '=', 'In Progress']],
      columns: ['title', 'employee_id', 'goal_type', 'priority', 'progress', 'target_date']
    },
    {
      name: 'AtRisk',
      label: '有风险',
      filters: [['status', '=', 'At Risk']],
      columns: ['title', 'employee_id', 'priority', 'progress', 'target_date', 'manager_id']
    },
    {
      name: 'DueSoon',
      label: '即将到期',
      filters: [
        ['status', 'in', ['Not Started', 'In Progress']],
        ['target_date', 'next_30_days']
      ],
      columns: ['title', 'employee_id', 'priority', 'progress', 'target_date'],
      sort: [['target_date', 'asc']]
    }
  ],
  validationRules: [
    {
      name: 'ValidTargetDate',
      errorMessage: '目标日期必须在开始日期之后',
      formula: 'target_date < start_date'
    },
    {
      name: 'ValidCompletion',
      errorMessage: '完成状态必须设置完成日期',
      formula: 'AND(status = "Completed", ISBLANK(completion_date))'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: '基本信息',
        columns: 2,
        fields: ['title', 'employee_id', 'manager_id', 'goal_type', 'category', 'priority']
      },
      {
        label: '时间信息',
        columns: 2,
        fields: ['start_date', 'target_date', 'completion_date']
      },
      {
        label: '进度跟踪',
        columns: 2,
        fields: ['status', 'progress', 'target_value', 'current_value', 'unit']
      },
      {
        label: '绩效关联',
        columns: 2,
        fields: ['performance_review_id', 'weight']
      },
      {
        label: '目标详情',
        columns: 1,
        fields: ['description', 'key_results']
      },
      {
        label: '达成情况',
        columns: 1,
        fields: ['achievement_notes', 'notes']
      }
    ]
  }
};

export default Goal;
