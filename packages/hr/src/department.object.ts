
const Department = {
  name: 'department',
  label: '部门',
  labelPlural: '部门',
  icon: 'sitemap',
  description: '组织部门和团队结构管理',
  enable: {
    searchable: true,
    trackHistory: true,
    activities: false,
    feeds: true,
    files: false
  },
  fields: {
    name: {
      type: 'text',
      label: '部门名称',
      required: true,
      searchable: true,
      unique: true,
      maxLength: 255
    },
    code: {
      type: 'text',
      label: '部门编码',
      unique: true,
      maxLength: 40,
      description: '部门唯一标识代码'
    },
    type: {
      type: 'select',
      label: '部门类型',
      options: [
        { label: '总部', value: 'Headquarters' },
        { label: '分公司', value: 'Branch' },
        { label: '事业部', value: 'Division' },
        { label: '部门', value: 'Department' },
        { label: '团队', value: 'Team' }
      ]
    },
    parent_id: {
      type: 'lookup',
      label: '上级部门',
      reference: 'department',
      description: '组织层级结构中的上级部门'
    },
    manager_id: {
      type: 'lookup',
      label: '部门负责人',
      reference: 'employee',
      description: '管理该部门的员工'
    },
    cost_center: {
      type: 'text',
      label: '成本中心',
      maxLength: 40,
      description: '财务成本核算中心代码'
    },
    location: {
      type: 'text',
      label: '办公地点',
      maxLength: 255
    },
    phone: {
      type: 'phone',
      label: '部门电话'
    },
    email: {
      type: 'email',
      label: '部门邮箱'
    },
    employee_count: {
      type: 'number',
      label: '员工人数',
      readonly: true,
      description: '部门内员工总数（自动计算）'
    },
    budget_amount: {
      type: 'currency',
      label: '年度预算',
      precision: 2
    },
    status: {
      type: 'select',
      label: '状态',
      defaultValue: 'Active',
      options: [
        { label: '活跃', value: 'Active' },
        { label: '已关闭', value: 'Closed' },
        { label: '合并中', value: 'Merging' }
      ]
    },
    description: {
      type: 'textarea',
      label: '部门描述',
      rows: 4
    }
  },
  relationships: [
    {
      name: 'Employees',
      type: 'hasMany',
      object: 'Employee',
      foreignKey: 'department_id',
      label: '员工'
    },
    {
      name: 'Positions',
      type: 'hasMany',
      object: 'Position',
      foreignKey: 'department_id',
      label: '职位'
    },
    {
      name: 'SubDepartments',
      type: 'hasMany',
      object: 'Department',
      foreignKey: 'parent_id',
      label: '下级部门'
    }
  ],
  listViews: [
    {
      name: 'All',
      label: '所有部门',
      filters: [],
      columns: ['name', 'code', 'type', 'manager_id', 'employee_count', 'status']
    },
    {
      name: 'Active',
      label: '活跃部门',
      filters: [['status', '=', 'Active']],
      columns: ['name', 'type', 'manager_id', 'employee_count', 'location', 'budget_amount']
    }
  ],
  pageLayout: {
    sections: [
      {
        label: '基本信息',
        columns: 2,
        fields: ['name', 'code', 'type', 'status', 'parent_id', 'manager_id']
      },
      {
        label: '联系信息',
        columns: 2,
        fields: ['location', 'phone', 'email']
      },
      {
        label: '财务信息',
        columns: 2,
        fields: ['cost_center', 'budget_amount']
      },
      {
        label: '统计信息',
        columns: 2,
        fields: ['employee_count']
      },
      {
        label: '其他信息',
        columns: 1,
        fields: ['description']
      }
    ]
  }
};

export default Department;
