
const Employee = {
  name: 'employee',
  label: '员工',
  labelPlural: '员工',
  icon: 'user-tie',
  description: '员工主数据和信息管理',
  enable: {
    searchable: true,
    trackHistory: true,
    activities: true,
    feeds: true,
    files: true
  },
  fields: {
    employee_number: {
      type: 'text',
      label: '工号',
      required: true,
      unique: true,
      maxLength: 40
    },
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
    full_name: {
      type: 'formula',
      label: '全名',
      formula: 'CONCATENATE(last_name, first_name)',
      readonly: true
    },
    email: {
      type: 'email',
      label: '公司邮箱',
      required: true,
      unique: true
    },
    personal_email: {
      type: 'email',
      label: '个人邮箱'
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
    date_of_birth: {
      type: 'date',
      label: '出生日期'
    },
    gender: {
      type: 'select',
      label: '性别',
      options: [
        { label: '男', value: 'Male' },
        { label: '女', value: 'Female' },
        { label: '其他', value: 'Other' }
      ]
    },
    national_id: {
      type: 'text',
      label: '身份证号',
      unique: true,
      maxLength: 40,
      description: '身份证或护照号码'
    },
    marital_status: {
      type: 'select',
      label: '婚姻状况',
      options: [
        { label: '未婚', value: 'Single' },
        { label: '已婚', value: 'Married' },
        { label: '离异', value: 'Divorced' },
        { label: '其他', value: 'Other' }
      ]
    },
    department_id: {
      type: 'lookup',
      label: '所属部门',
      reference: 'department',
      required: true
    },
    position_id: {
      type: 'lookup',
      label: '职位',
      reference: 'position',
      required: true
    },
    manager_id: {
      type: 'lookup',
      label: '直属经理',
      reference: 'employee',
      description: '直接汇报的上级'
    },
    hire_date: {
      type: 'date',
      label: '入职日期',
      required: true
    },
    termination_date: {
      type: 'date',
      label: '离职日期'
    },
    employment_status: {
      type: 'select',
      label: '雇佣状态',
      defaultValue: 'Active',
      options: [
        { label: '在职', value: 'Active' },
        { label: '试用期', value: 'Probation' },
        { label: '休假', value: 'On Leave' },
        { label: '已离职', value: 'Terminated' }
      ]
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
    work_location: {
      type: 'text',
      label: '工作地点',
      maxLength: 255
    },
    base_salary: {
      type: 'currency',
      label: '基本工资',
      precision: 2
    },
    street: {
      type: 'textarea',
      label: '地址（街道）',
      rows: 2
    },
    city: {
      type: 'text',
      label: '城市',
      maxLength: 40
    },
    state: {
      type: 'text',
      label: '省份',
      maxLength: 40
    },
    postal_code: {
      type: 'text',
      label: '邮编',
      maxLength: 20
    },
    country: {
      type: 'text',
      label: '国家',
      maxLength: 40
    },
    emergency_contact_name: {
      type: 'text',
      label: '紧急联系人',
      maxLength: 80
    },
    emergency_contact_phone: {
      type: 'phone',
      label: '紧急联系电话'
    },
    emergency_contact_relationship: {
      type: 'text',
      label: '紧急联系人关系',
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
      name: 'DirectReports',
      type: 'hasMany',
      object: 'Employee',
      foreignKey: 'manager_id',
      label: '下属'
    },
    {
      name: 'PerformanceReviews',
      type: 'hasMany',
      object: 'PerformanceReview',
      foreignKey: 'employee_id',
      label: '绩效评估'
    },
    {
      name: 'Goals',
      type: 'hasMany',
      object: 'Goal',
      foreignKey: 'employee_id',
      label: '目标'
    },
    {
      name: 'Trainings',
      type: 'hasMany',
      object: 'Training',
      foreignKey: 'employee_id',
      label: '培训记录'
    },
    {
      name: 'Certifications',
      type: 'hasMany',
      object: 'Certification',
      foreignKey: 'employee_id',
      label: '认证'
    },
    {
      name: 'TimeOffs',
      type: 'hasMany',
      object: 'TimeOff',
      foreignKey: 'employee_id',
      label: '请假记录'
    },
    {
      name: 'Attendances',
      type: 'hasMany',
      object: 'Attendance',
      foreignKey: 'employee_id',
      label: '考勤记录'
    },
    {
      name: 'Payrolls',
      type: 'hasMany',
      object: 'Payroll',
      foreignKey: 'employee_id',
      label: '工资记录'
    }
  ],
  listViews: [
    {
      name: 'All',
      label: '所有员工',
      filters: [],
      columns: ['employee_number', 'full_name', 'department_id', 'position_id', 'employment_status', 'hire_date']
    },
    {
      name: 'Active',
      label: '在职员工',
      filters: [['employment_status', '=', 'Active']],
      columns: ['employee_number', 'full_name', 'department_id', 'position_id', 'manager_id', 'hire_date']
    },
    {
      name: 'Probation',
      label: '试用期员工',
      filters: [['employment_status', '=', 'Probation']],
      columns: ['employee_number', 'full_name', 'department_id', 'position_id', 'hire_date', 'manager_id']
    },
    {
      name: 'Terminated',
      label: '已离职',
      filters: [['employment_status', '=', 'Terminated']],
      columns: ['employee_number', 'full_name', 'department_id', 'termination_date', 'hire_date']
    }
  ],
  validationRules: [
    {
      name: 'ValidTerminationDate',
      errorMessage: '离职日期必须在入职日期之后',
      formula: 'AND(NOT(ISBLANK(termination_date)), termination_date < hire_date)'
    },
    {
      name: 'TerminatedMustHaveDate',
      errorMessage: '离职状态必须填写离职日期',
      formula: 'AND(employment_status = "Terminated", ISBLANK(termination_date))'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: '基本信息',
        columns: 2,
        fields: ['employee_number', 'first_name', 'last_name', 'email', 'mobile_phone', 'date_of_birth', 'gender', 'marital_status']
      },
      {
        label: '雇佣信息',
        columns: 2,
        fields: ['department_id', 'position_id', 'manager_id', 'hire_date', 'employment_status', 'employment_type', 'work_location']
      },
      {
        label: '薪资信息',
        columns: 2,
        fields: ['base_salary']
      },
      {
        label: '联系地址',
        columns: 2,
        fields: ['street', 'city', 'state', 'postal_code', 'country']
      },
      {
        label: '紧急联系人',
        columns: 2,
        fields: ['emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship']
      },
      {
        label: '其他信息',
        columns: 1,
        fields: ['notes']
      }
    ]
  }
};

export default Employee;
