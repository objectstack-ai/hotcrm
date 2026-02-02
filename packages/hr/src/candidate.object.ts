
const Candidate = {
  name: 'candidate',
  label: '候选人',
  labelPlural: '候选人',
  icon: 'user-check',
  description: '求职候选人信息管理',
  enable: {
    searchable: true,
    trackHistory: true,
    activities: true,
    feeds: true,
    files: true
  },
  fields: {
    first_name: {
      type: 'text',
      label: '名',
      required: true,
      searchable: true,
      maxLength: 40
    },
    last_name: {
      type: 'text',
      label: '姓',
      required: true,
      searchable: true,
      maxLength: 80
    },
    email: {
      type: 'email',
      label: '邮箱',
      required: true,
      unique: true
    },
    phone: {
      type: 'phone',
      label: '电话'
    },
    mobile_phone: {
      type: 'phone',
      label: '手机',
      required: true
    },
    linkedin_url: {
      type: 'url',
      label: 'LinkedIn链接'
    },
    current_company: {
      type: 'text',
      label: '当前公司',
      maxLength: 255
    },
    current_title: {
      type: 'text',
      label: '当前职位',
      maxLength: 255
    },
    years_of_experience: {
      type: 'number',
      label: '工作年限',
      precision: 1,
      description: '总工作年限'
    },
    highest_education: {
      type: 'select',
      label: '最高学历',
      options: [
        { label: '博士', value: 'PhD' },
        { label: '硕士', value: 'Master' },
        { label: '本科', value: 'Bachelor' },
        { label: '专科', value: 'Associate' },
        { label: '高中', value: 'High School' },
        { label: '其他', value: 'Other' }
      ]
    },
    university: {
      type: 'text',
      label: '毕业院校',
      maxLength: 255
    },
    major: {
      type: 'text',
      label: '专业',
      maxLength: 255
    },
    current_salary: {
      type: 'currency',
      label: '当前薪资',
      precision: 2
    },
    expected_salary: {
      type: 'currency',
      label: '期望薪资',
      precision: 2
    },
    notice_period: {
      type: 'select',
      label: '离职周期',
      options: [
        { label: '立即到岗', value: 'Immediate' },
        { label: '1周', value: '1 Week' },
        { label: '2周', value: '2 Weeks' },
        { label: '1个月', value: '1 Month' },
        { label: '2个月', value: '2 Months' },
        { label: '3个月', value: '3 Months' }
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
    rating: {
      type: 'rating',
      label: '候选人评级',
      max: 5,
      description: '综合评分（1-5星）'
    },
    status: {
      type: 'select',
      label: '状态',
      defaultValue: 'New',
      options: [
        { label: '新候选人', value: 'New' },
        { label: '审核中', value: 'Under Review' },
        { label: '面试中', value: 'Interviewing' },
        { label: '已录用', value: 'Hired' },
        { label: '已拒绝', value: 'Rejected' },
        { label: '已撤回', value: 'Withdrawn' }
      ]
    },
    skills: {
      type: 'tags',
      label: '技能标签',
      description: '候选人的主要技能'
    },
    resume_url: {
      type: 'url',
      label: '简历链接'
    },
    city: {
      type: 'text',
      label: '所在城市',
      maxLength: 40
    },
    country: {
      type: 'text',
      label: '国家',
      maxLength: 40
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
      foreignKey: 'candidate_id',
      label: '申请记录'
    },
    {
      name: 'Interviews',
      type: 'hasMany',
      object: 'Interview',
      foreignKey: 'candidate_id',
      label: '面试记录'
    },
    {
      name: 'Offers',
      type: 'hasMany',
      object: 'Offer',
      foreignKey: 'candidate_id',
      label: 'Offer记录'
    }
  ],
  listViews: [
    {
      name: 'All',
      label: '所有候选人',
      filters: [],
      columns: ['first_name', 'last_name', 'email', 'current_company', 'current_title', 'status', 'rating']
    },
    {
      name: 'New',
      label: '新候选人',
      filters: [['status', '=', 'New']],
      columns: ['first_name', 'last_name', 'email', 'mobile_phone', 'current_company', 'years_of_experience', 'source']
    },
    {
      name: 'Interviewing',
      label: '面试中',
      filters: [['status', '=', 'Interviewing']],
      columns: ['first_name', 'last_name', 'current_company', 'current_title', 'rating', 'expected_salary']
    },
    {
      name: 'TopRated',
      label: '高评分',
      filters: [
        ['rating', '>=', 4],
        ['status', 'in', ['New', 'Under Review', 'Interviewing']]
      ],
      columns: ['first_name', 'last_name', 'current_company', 'rating', 'years_of_experience', 'expected_salary'],
      sort: [['rating', 'desc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: '基本信息',
        columns: 2,
        fields: ['first_name', 'last_name', 'email', 'phone', 'mobile_phone', 'linkedin_url']
      },
      {
        label: '当前状况',
        columns: 2,
        fields: ['current_company', 'current_title', 'years_of_experience', 'status', 'rating']
      },
      {
        label: '教育背景',
        columns: 2,
        fields: ['highest_education', 'university', 'major']
      },
      {
        label: '薪资期望',
        columns: 2,
        fields: ['current_salary', 'expected_salary', 'notice_period']
      },
      {
        label: '来源与位置',
        columns: 2,
        fields: ['source', 'city', 'country']
      },
      {
        label: '技能与简历',
        columns: 2,
        fields: ['skills', 'resume_url']
      },
      {
        label: '备注',
        columns: 1,
        fields: ['notes']
      }
    ]
  }
};

export default Candidate;
