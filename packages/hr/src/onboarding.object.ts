
const Onboarding = {
  name: 'onboarding',
  label: '入职流程',
  labelPlural: '入职流程',
  icon: 'user-graduate',
  description: '新员工入职和培训流程管理',
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
      label: '入职流程名称',
      required: true,
      searchable: true,
      maxLength: 255
    },
    employee_id: {
      type: 'lookup',
      label: '员工',
      reference: 'employee',
      required: true
    },
    offer_id: {
      type: 'lookup',
      label: '关联Offer',
      reference: 'offer'
    },
    start_date: {
      type: 'date',
      label: '入职日期',
      required: true
    },
    buddy_id: {
      type: 'lookup',
      label: '入职导师',
      reference: 'employee',
      description: '帮助新员工熟悉环境的同事'
    },
    manager_id: {
      type: 'lookup',
      label: '直属经理',
      reference: 'employee',
      required: true
    },
    status: {
      type: 'select',
      label: '状态',
      defaultValue: 'Not Started',
      options: [
        { label: '未开始', value: 'Not Started' },
        { label: '进行中', value: 'In Progress' },
        { label: '已完成', value: 'Completed' },
        { label: '已取消', value: 'Cancelled' }
      ]
    },
    completion_percentage: {
      type: 'percent',
      label: '完成进度',
      readonly: true,
      description: '入职任务完成百分比'
    },
    paperwork_completed: {
      type: 'checkbox',
      label: '文件签署完成',
      defaultValue: false,
      description: '劳动合同、保密协议等'
    },
    it_setup_completed: {
      type: 'checkbox',
      label: 'IT设备配置完成',
      defaultValue: false,
      description: '电脑、邮箱、系统权限等'
    },
    workspace_setup_completed: {
      type: 'checkbox',
      label: '工位准备完成',
      defaultValue: false
    },
    training_completed: {
      type: 'checkbox',
      label: '基础培训完成',
      defaultValue: false,
      description: '公司文化、规章制度等培训'
    },
    system_access_granted: {
      type: 'checkbox',
      label: '系统访问权限已开通',
      defaultValue: false
    },
    first_day_checklist: {
      type: 'textarea',
      label: '首日任务清单',
      rows: 6,
      description: '第一天需要完成的任务'
    },
    first_week_goals: {
      type: 'textarea',
      label: '第一周目标',
      rows: 4
    },
    first_month_goals: {
      type: 'textarea',
      label: '第一个月目标',
      rows: 4
    },
    probation_end_date: {
      type: 'date',
      label: '试用期结束日期'
    },
    feedback: {
      type: 'textarea',
      label: '入职反馈',
      rows: 5,
      description: '新员工的入职体验反馈'
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
      label: '所有入职流程',
      filters: [],
      columns: ['title', 'employee_id', 'start_date', 'status', 'completion_percentage']
    },
    {
      name: 'InProgress',
      label: '进行中',
      filters: [['status', '=', 'In Progress']],
      columns: ['employee_id', 'start_date', 'manager_id', 'buddy_id', 'completion_percentage'],
      sort: [['start_date', 'desc']]
    },
    {
      name: 'Upcoming',
      label: '即将入职',
      filters: [
        ['status', '=', 'Not Started'],
        ['start_date', '>=', '$today']
      ],
      columns: ['employee_id', 'start_date', 'manager_id', 'buddy_id'],
      sort: [['start_date', 'asc']]
    },
    {
      name: 'Recent',
      label: '最近入职',
      filters: [
        ['start_date', 'last_30_days']
      ],
      columns: ['employee_id', 'start_date', 'status', 'completion_percentage', 'manager_id'],
      sort: [['start_date', 'desc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: '基本信息',
        columns: 2,
        fields: ['title', 'employee_id', 'offer_id', 'start_date', 'manager_id', 'buddy_id']
      },
      {
        label: '状态',
        columns: 2,
        fields: ['status', 'completion_percentage', 'probation_end_date']
      },
      {
        label: '任务完成情况',
        columns: 2,
        fields: ['paperwork_completed', 'it_setup_completed', 'workspace_setup_completed', 'training_completed', 'system_access_granted']
      },
      {
        label: '目标设定',
        columns: 1,
        fields: ['first_day_checklist', 'first_week_goals', 'first_month_goals']
      },
      {
        label: '反馈与备注',
        columns: 1,
        fields: ['feedback', 'notes']
      }
    ]
  }
};

export default Onboarding;
