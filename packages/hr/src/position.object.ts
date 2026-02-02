
const Position = {
  name: 'position',
  label: '职位',
  labelPlural: '职位',
  icon: 'briefcase',
  description: '职位和岗位定义管理',
  enable: {
    searchable: true,
    trackHistory: true,
    activities: false,
    feeds: true,
    files: true
  },
  fields: {
    title: {
      type: 'text',
      label: '职位名称',
      required: true,
      searchable: true,
      maxLength: 255
    },
    code: {
      type: 'text',
      label: '职位编码',
      unique: true,
      maxLength: 40
    },
    department_id: {
      type: 'lookup',
      label: '所属部门',
      reference: 'department',
      required: true
    },
    level: {
      type: 'select',
      label: '职级',
      options: [
        { label: 'C级高管', value: 'C-Level' },
        { label: 'VP级', value: 'VP' },
        { label: '总监', value: 'Director' },
        { label: '经理', value: 'Manager' },
        { label: '主管', value: 'Supervisor' },
        { label: '专员', value: 'Staff' },
        { label: '助理', value: 'Assistant' }
      ]
    },
    job_family: {
      type: 'select',
      label: '职位族',
      options: [
        { label: '管理', value: 'Management' },
        { label: '技术', value: 'Technical' },
        { label: '销售', value: 'Sales' },
        { label: '营销', value: 'Marketing' },
        { label: '财务', value: 'Finance' },
        { label: '人力资源', value: 'HR' },
        { label: '运营', value: 'Operations' },
        { label: '客户服务', value: 'Customer Service' },
        { label: '其他', value: 'Other' }
      ]
    },
    reports_to_id: {
      type: 'lookup',
      label: '汇报给',
      reference: 'position',
      description: '直接汇报的上级职位'
    },
    employment_type: {
      type: 'select',
      label: '雇佣类型',
      defaultValue: 'Full-time',
      options: [
        { label: '全职', value: 'Full-time' },
        { label: '兼职', value: 'Part-time' },
        { label: '合同', value: 'Contract' },
        { label: '实习', value: 'Intern' },
        { label: '临时', value: 'Temporary' }
      ]
    },
    headcount: {
      type: 'number',
      label: '计划编制',
      defaultValue: 1,
      description: '该职位的计划人数'
    },
    current_headcount: {
      type: 'number',
      label: '当前人数',
      readonly: true,
      description: '当前在职人数（自动计算）'
    },
    min_salary: {
      type: 'currency',
      label: '最低薪资',
      precision: 2
    },
    max_salary: {
      type: 'currency',
      label: '最高薪资',
      precision: 2
    },
    status: {
      type: 'select',
      label: '状态',
      defaultValue: 'Active',
      options: [
        { label: '活跃', value: 'Active' },
        { label: '招聘中', value: 'Hiring' },
        { label: '暂停', value: 'On Hold' },
        { label: '已关闭', value: 'Closed' }
      ]
    },
    description: {
      type: 'textarea',
      label: '职位描述',
      rows: 5,
      description: '职位职责和要求'
    },
    requirements: {
      type: 'textarea',
      label: '任职要求',
      rows: 5,
      description: '学历、技能、经验等要求'
    }
  },
  relationships: [
    {
      name: 'Employees',
      type: 'hasMany',
      object: 'Employee',
      foreignKey: 'position_id',
      label: '在职员工'
    },
    {
      name: 'Recruitments',
      type: 'hasMany',
      object: 'Recruitment',
      foreignKey: 'position_id',
      label: '招聘需求'
    }
  ],
  listViews: [
    {
      name: 'All',
      label: '所有职位',
      filters: [],
      columns: ['title', 'code', 'department_id', 'level', 'current_headcount', 'headcount', 'status']
    },
    {
      name: 'Active',
      label: '活跃职位',
      filters: [['status', '=', 'Active']],
      columns: ['title', 'department_id', 'level', 'job_family', 'current_headcount', 'headcount']
    },
    {
      name: 'Hiring',
      label: '招聘中',
      filters: [['status', '=', 'Hiring']],
      columns: ['title', 'department_id', 'level', 'employment_type', 'min_salary', 'max_salary']
    }
  ],
  validationRules: [
    {
      name: 'ValidSalaryRange',
      errorMessage: '最高薪资必须大于最低薪资',
      formula: 'AND(NOT(ISBLANK(min_salary)), NOT(ISBLANK(max_salary)), max_salary < min_salary)'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: '基本信息',
        columns: 2,
        fields: ['title', 'code', 'department_id', 'level', 'job_family', 'reports_to_id']
      },
      {
        label: '雇佣信息',
        columns: 2,
        fields: ['employment_type', 'status', 'headcount', 'current_headcount']
      },
      {
        label: '薪资范围',
        columns: 2,
        fields: ['min_salary', 'max_salary']
      },
      {
        label: '职位描述',
        columns: 1,
        fields: ['description', 'requirements']
      }
    ]
  }
};

export default Position;
