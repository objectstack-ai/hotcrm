
const Application = {
  name: 'application',
  label: '求职申请',
  labelPlural: '求职申请',
  icon: 'file-alt',
  description: '候选人职位申请记录管理',
  enable: {
    searchable: true,
    trackHistory: true,
    activities: true,
    feeds: true,
    files: true
  },
  fields: {
    application_number: {
      type: 'text',
      label: '申请编号',
      unique: true,
      maxLength: 40
    },
    candidate_id: {
      type: 'lookup',
      label: '候选人',
      reference: 'candidate',
      required: true
    },
    recruitment_id: {
      type: 'lookup',
      label: '招聘需求',
      reference: 'recruitment',
      required: true
    },
    applied_date: {
      type: 'date',
      label: '申请日期',
      required: true,
      defaultValue: '$today'
    },
    status: {
      type: 'select',
      label: '状态',
      defaultValue: 'Submitted',
      options: [
        { label: '已提交', value: 'Submitted' },
        { label: '筛选中', value: 'Screening' },
        { label: '待面试', value: 'Interview Scheduled' },
        { label: '面试中', value: 'Interviewing' },
        { label: '通过初选', value: 'Shortlisted' },
        { label: '已录用', value: 'Offer Extended' },
        { label: '已拒绝', value: 'Rejected' },
        { label: '已撤回', value: 'Withdrawn' }
      ]
    },
    stage: {
      type: 'select',
      label: '当前阶段',
      options: [
        { label: '简历筛选', value: 'Resume Review' },
        { label: '电话面试', value: 'Phone Screen' },
        { label: '初试', value: 'First Interview' },
        { label: '复试', value: 'Second Interview' },
        { label: '终试', value: 'Final Interview' },
        { label: 'Offer沟通', value: 'Offer Discussion' },
        { label: '背景调查', value: 'Background Check' }
      ]
    },
    source: {
      type: 'select',
      label: '来源渠道',
      options: [
        { label: '招聘网站', value: 'Job Board' },
        { label: '内推', value: 'Employee Referral' },
        { label: '猎头', value: 'Headhunter' },
        { label: '社交媒体', value: 'Social Media' },
        { label: '校园招聘', value: 'Campus' },
        { label: '主动投递', value: 'Direct Application' },
        { label: '其他', value: 'Other' }
      ]
    },
    referrer_id: {
      type: 'lookup',
      label: '内推人',
      reference: 'employee',
      description: '如果是内推，记录推荐人'
    },
    rating: {
      type: 'rating',
      label: '综合评分',
      max: 5
    },
    resume_url: {
      type: 'url',
      label: '简历链接'
    },
    cover_letter: {
      type: 'textarea',
      label: '求职信',
      rows: 6
    },
    rejection_reason: {
      type: 'textarea',
      label: '拒绝原因',
      rows: 3,
      description: '如果被拒绝，记录原因'
    },
    notes: {
      type: 'textarea',
      label: '备注',
      rows: 4
    }
  },
  relationships: [
    {
      name: 'Interviews',
      type: 'hasMany',
      object: 'Interview',
      foreignKey: 'application_id',
      label: '面试记录'
    }
  ],
  listViews: [
    {
      name: 'All',
      label: '所有申请',
      filters: [],
      columns: ['application_number', 'candidate_id', 'recruitment_id', 'applied_date', 'status', 'stage']
    },
    {
      name: 'Screening',
      label: '筛选中',
      filters: [['status', '=', 'Screening']],
      columns: ['candidate_id', 'recruitment_id', 'applied_date', 'source', 'rating']
    },
    {
      name: 'Interviewing',
      label: '面试中',
      filters: [['status', 'in', ['Interview Scheduled', 'Interviewing']]],
      columns: ['candidate_id', 'recruitment_id', 'stage', 'rating', 'applied_date']
    },
    {
      name: 'Shortlisted',
      label: '已通过初选',
      filters: [['status', '=', 'Shortlisted']],
      columns: ['candidate_id', 'recruitment_id', 'stage', 'rating', 'applied_date'],
      sort: [['rating', 'desc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: '基本信息',
        columns: 2,
        fields: ['application_number', 'candidate_id', 'recruitment_id', 'applied_date']
      },
      {
        label: '申请状态',
        columns: 2,
        fields: ['status', 'stage', 'rating']
      },
      {
        label: '来源信息',
        columns: 2,
        fields: ['source', 'referrer_id']
      },
      {
        label: '申请材料',
        columns: 1,
        fields: ['resume_url', 'cover_letter']
      },
      {
        label: '其他信息',
        columns: 1,
        fields: ['rejection_reason', 'notes']
      }
    ]
  }
};

export default Application;
