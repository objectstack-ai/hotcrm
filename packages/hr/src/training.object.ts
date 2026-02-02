
const Training = {
  name: 'training',
  label: '培训',
  labelPlural: '培训',
  icon: 'graduation-cap',
  description: '员工培训和学习发展管理',
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
      label: '培训名称',
      required: true,
      searchable: true,
      maxLength: 255
    },
    training_code: {
      type: 'text',
      label: '培训编号',
      unique: true,
      maxLength: 40
    },
    employee_id: {
      type: 'lookup',
      label: '参训员工',
      reference: 'employee',
      required: true
    },
    training_type: {
      type: 'select',
      label: '培训类型',
      options: [
        { label: '入职培训', value: 'Onboarding' },
        { label: '技能培训', value: 'Skills Training' },
        { label: '领导力培训', value: 'Leadership' },
        { label: '合规培训', value: 'Compliance' },
        { label: '产品培训', value: 'Product' },
        { label: '销售培训', value: 'Sales' },
        { label: '安全培训', value: 'Safety' },
        { label: '其他', value: 'Other' }
      ]
    },
    category: {
      type: 'select',
      label: '培训分类',
      options: [
        { label: '内部培训', value: 'Internal' },
        { label: '外部培训', value: 'External' },
        { label: '在线课程', value: 'Online' },
        { label: '研讨会', value: 'Workshop' },
        { label: '会议', value: 'Conference' },
        { label: '认证课程', value: 'Certification' }
      ]
    },
    provider: {
      type: 'text',
      label: '培训机构/讲师',
      maxLength: 255
    },
    start_date: {
      type: 'datetime',
      label: '开始时间',
      required: true
    },
    end_date: {
      type: 'datetime',
      label: '结束时间',
      required: true
    },
    duration_hours: {
      type: 'number',
      label: '培训时长（小时）',
      precision: 1
    },
    location: {
      type: 'text',
      label: '培训地点',
      maxLength: 255,
      description: '线下地点或线上会议链接'
    },
    status: {
      type: 'select',
      label: '状态',
      defaultValue: 'Scheduled',
      options: [
        { label: '已安排', value: 'Scheduled' },
        { label: '进行中', value: 'In Progress' },
        { label: '已完成', value: 'Completed' },
        { label: '已取消', value: 'Cancelled' },
        { label: '未参加', value: 'No Show' }
      ]
    },
    attendance_status: {
      type: 'select',
      label: '出勤状态',
      options: [
        { label: '已参加', value: 'Attended' },
        { label: '部分参加', value: 'Partial' },
        { label: '未参加', value: 'Absent' }
      ]
    },
    completion_percentage: {
      type: 'percent',
      label: '完成进度'
    },
    is_mandatory: {
      type: 'checkbox',
      label: '是否必修',
      defaultValue: false
    },
    cost: {
      type: 'currency',
      label: '培训费用',
      precision: 2
    },
    rating: {
      type: 'rating',
      label: '培训评分',
      max: 5,
      description: '员工对培训的评分'
    },
    exam_score: {
      type: 'number',
      label: '考试成绩',
      precision: 2,
      min: 0,
      max: 100,
      description: '如有考试，记录成绩'
    },
    passed: {
      type: 'checkbox',
      label: '是否通过',
      defaultValue: false
    },
    certificate_url: {
      type: 'url',
      label: '证书链接'
    },
    description: {
      type: 'textarea',
      label: '培训描述',
      rows: 4
    },
    learning_objectives: {
      type: 'textarea',
      label: '学习目标',
      rows: 3
    },
    feedback: {
      type: 'textarea',
      label: '培训反馈',
      rows: 5,
      description: '员工的培训体验和收获'
    },
    notes: {
      type: 'textarea',
      label: '备注',
      rows: 3
    }
  },
  relationships: [
    {
      name: 'Certifications',
      type: 'hasMany',
      object: 'Certification',
      foreignKey: 'training_id',
      label: '相关认证'
    }
  ],
  listViews: [
    {
      name: 'All',
      label: '所有培训',
      filters: [],
      columns: ['title', 'employee_id', 'training_type', 'start_date', 'status', 'completion_percentage']
    },
    {
      name: 'Upcoming',
      label: '即将开始',
      filters: [
        ['status', '=', 'Scheduled'],
        ['start_date', '>=', '$today']
      ],
      columns: ['title', 'employee_id', 'training_type', 'start_date', 'location', 'provider'],
      sort: [['start_date', 'asc']]
    },
    {
      name: 'Completed',
      label: '已完成',
      filters: [['status', '=', 'Completed']],
      columns: ['title', 'employee_id', 'training_type', 'end_date', 'passed', 'rating']
    },
    {
      name: 'MyTraining',
      label: '我的培训',
      filters: [['employee_id', '=', '$currentUser']],
      columns: ['title', 'training_type', 'start_date', 'status', 'completion_percentage', 'rating']
    },
    {
      name: 'Mandatory',
      label: '必修培训',
      filters: [['is_mandatory', '=', true]],
      columns: ['title', 'employee_id', 'training_type', 'start_date', 'status', 'passed']
    }
  ],
  validationRules: [
    {
      name: 'ValidDates',
      errorMessage: '结束时间必须在开始时间之后',
      formula: 'end_date < start_date'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: '基本信息',
        columns: 2,
        fields: ['title', 'training_code', 'employee_id', 'training_type', 'category', 'is_mandatory']
      },
      {
        label: '时间与地点',
        columns: 2,
        fields: ['start_date', 'end_date', 'duration_hours', 'location', 'provider']
      },
      {
        label: '状态与进度',
        columns: 2,
        fields: ['status', 'attendance_status', 'completion_percentage']
      },
      {
        label: '成本',
        columns: 2,
        fields: ['cost']
      },
      {
        label: '考核结果',
        columns: 2,
        fields: ['exam_score', 'passed', 'rating', 'certificate_url']
      },
      {
        label: '培训详情',
        columns: 1,
        fields: ['description', 'learning_objectives']
      },
      {
        label: '反馈与备注',
        columns: 1,
        fields: ['feedback', 'notes']
      }
    ]
  }
};

export default Training;
