
const Interview = {
  name: 'interview',
  label: '面试',
  labelPlural: '面试',
  icon: 'comments',
  description: '面试安排和记录管理',
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
      label: '面试标题',
      required: true,
      searchable: true,
      maxLength: 255
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
    interview_type: {
      type: 'select',
      label: '面试类型',
      defaultValue: 'First Round',
      options: [
        { label: '电话面试', value: 'Phone Screen' },
        { label: '视频面试', value: 'Video Interview' },
        { label: '初试', value: 'First Round' },
        { label: '复试', value: 'Second Round' },
        { label: '终试', value: 'Final Round' },
        { label: '技术面试', value: 'Technical' },
        { label: 'HR面试', value: 'HR' }
      ]
    },
    scheduled_date: {
      type: 'datetime',
      label: '面试时间',
      required: true
    },
    duration: {
      type: 'number',
      label: '时长（分钟）',
      defaultValue: 60
    },
    location: {
      type: 'text',
      label: '面试地点',
      maxLength: 255,
      description: '线下地点或线上会议链接'
    },
    interviewer_id: {
      type: 'lookup',
      label: '主面试官',
      reference: 'employee',
      required: true
    },
    panel_members: {
      type: 'text',
      label: '面试官小组',
      maxLength: 500,
      description: '多位面试官用逗号分隔'
    },
    status: {
      type: 'select',
      label: '状态',
      defaultValue: 'Scheduled',
      options: [
        { label: '已安排', value: 'Scheduled' },
        { label: '已确认', value: 'Confirmed' },
        { label: '进行中', value: 'In Progress' },
        { label: '已完成', value: 'Completed' },
        { label: '已取消', value: 'Cancelled' },
        { label: '候选人未到', value: 'No Show' },
        { label: '需重新安排', value: 'Rescheduled' }
      ]
    },
    result: {
      type: 'select',
      label: '面试结果',
      options: [
        { label: '强烈推荐', value: 'Strong Hire' },
        { label: '推荐', value: 'Hire' },
        { label: '待定', value: 'Maybe' },
        { label: '不推荐', value: 'No Hire' },
        { label: '强烈不推荐', value: 'Strong No Hire' }
      ]
    },
    overall_rating: {
      type: 'rating',
      label: '综合评分',
      max: 5
    },
    technical_rating: {
      type: 'rating',
      label: '技术能力',
      max: 5
    },
    communication_rating: {
      type: 'rating',
      label: '沟通能力',
      max: 5
    },
    cultural_fit_rating: {
      type: 'rating',
      label: '文化契合度',
      max: 5
    },
    feedback: {
      type: 'textarea',
      label: '面试反馈',
      rows: 8,
      description: '详细的面试评价和建议'
    },
    strengths: {
      type: 'textarea',
      label: '优势',
      rows: 3
    },
    weaknesses: {
      type: 'textarea',
      label: '不足',
      rows: 3
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
      label: '所有面试',
      filters: [],
      columns: ['title', 'candidate_id', 'recruitment_id', 'interview_type', 'scheduled_date', 'status']
    },
    {
      name: 'Upcoming',
      label: '即将进行',
      filters: [
        ['status', 'in', ['Scheduled', 'Confirmed']],
        ['scheduled_date', '>=', '$today']
      ],
      columns: ['candidate_id', 'recruitment_id', 'interview_type', 'scheduled_date', 'interviewer_id', 'location'],
      sort: [['scheduled_date', 'asc']]
    },
    {
      name: 'Completed',
      label: '已完成',
      filters: [['status', '=', 'Completed']],
      columns: ['candidate_id', 'recruitment_id', 'interview_type', 'scheduled_date', 'result', 'overall_rating']
    },
    {
      name: 'MyInterviews',
      label: '我的面试',
      filters: [['interviewer_id', '=', '$currentUser']],
      columns: ['candidate_id', 'recruitment_id', 'interview_type', 'scheduled_date', 'status', 'result']
    }
  ],
  pageLayout: {
    sections: [
      {
        label: '基本信息',
        columns: 2,
        fields: ['title', 'candidate_id', 'application_id', 'recruitment_id', 'interview_type']
      },
      {
        label: '安排信息',
        columns: 2,
        fields: ['scheduled_date', 'duration', 'location', 'interviewer_id', 'panel_members']
      },
      {
        label: '状态与结果',
        columns: 2,
        fields: ['status', 'result', 'overall_rating']
      },
      {
        label: '能力评分',
        columns: 2,
        fields: ['technical_rating', 'communication_rating', 'cultural_fit_rating']
      },
      {
        label: '面试评价',
        columns: 1,
        fields: ['feedback', 'strengths', 'weaknesses']
      },
      {
        label: '备注',
        columns: 1,
        fields: ['notes']
      }
    ]
  }
};

export default Interview;
