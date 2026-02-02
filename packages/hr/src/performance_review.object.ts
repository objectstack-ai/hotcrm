
const PerformanceReview = {
  name: 'performance_review',
  label: '绩效评估',
  labelPlural: '绩效评估',
  icon: 'chart-line',
  description: '员工绩效评估和考核管理',
  enable: {
    searchable: true,
    trackHistory: true,
    activities: true,
    feeds: true,
    files: true
  },
  fields: {
    review_name: {
      type: 'text',
      label: '评估名称',
      required: true,
      searchable: true,
      maxLength: 255
    },
    employee_id: {
      type: 'lookup',
      label: '被评估员工',
      reference: 'employee',
      required: true
    },
    reviewer_id: {
      type: 'lookup',
      label: '评估人',
      reference: 'employee',
      required: true,
      description: '通常是直属经理'
    },
    review_period: {
      type: 'select',
      label: '评估周期',
      defaultValue: 'Annual',
      options: [
        { label: '季度', value: 'Quarterly' },
        { label: '半年度', value: 'Semi-Annual' },
        { label: '年度', value: 'Annual' },
        { label: '试用期', value: 'Probation' },
        { label: '临时', value: 'Ad-hoc' }
      ]
    },
    review_type: {
      type: 'select',
      label: '评估类型',
      options: [
        { label: '自评', value: 'Self Review' },
        { label: '经理评估', value: 'Manager Review' },
        { label: '360度评估', value: '360 Review' },
        { label: '试用期评估', value: 'Probation Review' }
      ]
    },
    start_date: {
      type: 'date',
      label: '评估开始日期',
      required: true
    },
    end_date: {
      type: 'date',
      label: '评估结束日期',
      required: true
    },
    due_date: {
      type: 'date',
      label: '提交截止日期'
    },
    status: {
      type: 'select',
      label: '状态',
      defaultValue: 'Not Started',
      options: [
        { label: '未开始', value: 'Not Started' },
        { label: '进行中', value: 'In Progress' },
        { label: '待审核', value: 'Pending Review' },
        { label: '已完成', value: 'Completed' },
        { label: '已取消', value: 'Cancelled' }
      ]
    },
    overall_rating: {
      type: 'select',
      label: '总体评级',
      options: [
        { label: '优秀', value: 'Outstanding' },
        { label: '超出期望', value: 'Exceeds Expectations' },
        { label: '达到期望', value: 'Meets Expectations' },
        { label: '需要改进', value: 'Needs Improvement' },
        { label: '不满意', value: 'Unsatisfactory' }
      ]
    },
    overall_score: {
      type: 'number',
      label: '总体评分',
      precision: 2,
      min: 0,
      max: 100,
      description: '综合评分（0-100）'
    },
    goals_rating: {
      type: 'rating',
      label: '目标完成度',
      max: 5,
      description: 'OKR/目标达成评分'
    },
    competency_rating: {
      type: 'rating',
      label: '能力评估',
      max: 5
    },
    values_rating: {
      type: 'rating',
      label: '价值观契合度',
      max: 5
    },
    achievements: {
      type: 'textarea',
      label: '主要成就',
      rows: 6,
      description: '评估期内的关键成就和贡献'
    },
    strengths: {
      type: 'textarea',
      label: '优势',
      rows: 4
    },
    areas_for_improvement: {
      type: 'textarea',
      label: '改进方向',
      rows: 4
    },
    development_plan: {
      type: 'textarea',
      label: '发展计划',
      rows: 5,
      description: '下一阶段的发展目标和行动计划'
    },
    employee_comments: {
      type: 'textarea',
      label: '员工自评/反馈',
      rows: 5
    },
    manager_comments: {
      type: 'textarea',
      label: '经理评语',
      rows: 5
    },
    promotion_recommendation: {
      type: 'checkbox',
      label: '推荐晋升',
      defaultValue: false
    },
    salary_increase_recommendation: {
      type: 'percent',
      label: '建议加薪比例'
    },
    notes: {
      type: 'textarea',
      label: '备注',
      rows: 4
    }
  },
  relationships: [
    {
      name: 'Goals',
      type: 'hasMany',
      object: 'Goal',
      foreignKey: 'performance_review_id',
      label: '关联目标'
    }
  ],
  listViews: [
    {
      name: 'All',
      label: '所有评估',
      filters: [],
      columns: ['review_name', 'employee_id', 'reviewer_id', 'review_period', 'status', 'overall_rating']
    },
    {
      name: 'InProgress',
      label: '进行中',
      filters: [['status', '=', 'In Progress']],
      columns: ['employee_id', 'reviewer_id', 'review_period', 'due_date', 'overall_score']
    },
    {
      name: 'Completed',
      label: '已完成',
      filters: [['status', '=', 'Completed']],
      columns: ['employee_id', 'reviewer_id', 'review_period', 'overall_rating', 'overall_score', 'end_date']
    },
    {
      name: 'MyReviews',
      label: '我负责的评估',
      filters: [['reviewer_id', '=', '$currentUser']],
      columns: ['employee_id', 'review_period', 'status', 'due_date', 'overall_rating']
    },
    {
      name: 'Outstanding',
      label: '优秀员工',
      filters: [
        ['overall_rating', '=', 'Outstanding'],
        ['status', '=', 'Completed']
      ],
      columns: ['employee_id', 'reviewer_id', 'review_period', 'overall_score', 'end_date'],
      sort: [['overall_score', 'desc']]
    }
  ],
  validationRules: [
    {
      name: 'ValidReviewPeriod',
      errorMessage: '结束日期必须在开始日期之后',
      formula: 'end_date <= start_date'
    },
    {
      name: 'ScoreRange',
      errorMessage: '总体评分必须在0-100之间',
      formula: 'OR(overall_score < 0, overall_score > 100)'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: '基本信息',
        columns: 2,
        fields: ['review_name', 'employee_id', 'reviewer_id', 'review_period', 'review_type']
      },
      {
        label: '时间信息',
        columns: 2,
        fields: ['start_date', 'end_date', 'due_date', 'status']
      },
      {
        label: '评估评级',
        columns: 2,
        fields: ['overall_rating', 'overall_score', 'goals_rating', 'competency_rating', 'values_rating']
      },
      {
        label: '评估内容',
        columns: 1,
        fields: ['achievements', 'strengths', 'areas_for_improvement', 'development_plan']
      },
      {
        label: '反馈意见',
        columns: 1,
        fields: ['employee_comments', 'manager_comments']
      },
      {
        label: '建议',
        columns: 2,
        fields: ['promotion_recommendation', 'salary_increase_recommendation']
      },
      {
        label: '备注',
        columns: 1,
        fields: ['notes']
      }
    ]
  }
};

export default PerformanceReview;
