import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Department = ObjectSchema.create({
  name: 'department',
  label: '部门',
  pluralLabel: '部门',
  icon: 'sitemap',
  description: '组织部门和团队结构管理',

  fields: {
    name: Field.text({
      label: '部门名称',
      required: true,
      unique: true,
      maxLength: 255
    }),
    code: Field.text({
      label: '部门编码',
      description: '部门唯一标识代码',
      unique: true,
      maxLength: 40
    }),
    type: Field.select({
      label: '部门类型',
      options: [
        {
          "label": "总部",
          "value": "Headquarters"
        },
        {
          "label": "分公司",
          "value": "Branch"
        },
        {
          "label": "事业部",
          "value": "Division"
        },
        {
          "label": "部门",
          "value": "Department"
        },
        {
          "label": "团队",
          "value": "Team"
        }
      ]
    }),
    parent_id: Field.lookup('department', {
      label: '上级部门',
      description: '组织层级结构中的上级部门'
    }),
    manager_id: Field.lookup('employee', {
      label: '部门负责人',
      description: '管理该部门的员工'
    }),
    cost_center: Field.text({
      label: '成本中心',
      description: '财务成本核算中心代码',
      maxLength: 40
    }),
    location: Field.text({
      label: '办公地点',
      maxLength: 255
    }),
    phone: Field.phone({ label: '部门电话' }),
    email: Field.email({ label: '部门邮箱' }),
    employee_count: Field.number({
      label: '员工人数',
      description: '部门内员工总数（自动计算）',
      readonly: true
    }),
    budget_amount: Field.currency({
      label: '年度预算',
      precision: 2
    }),
    status: Field.select({
      label: '状态',
      defaultValue: 'Active',
      options: [
        {
          "label": "活跃",
          "value": "Active"
        },
        {
          "label": "已关闭",
          "value": "Closed"
        },
        {
          "label": "合并中",
          "value": "Merging"
        }
      ]
    }),
    description: Field.textarea({
      label: '部门描述',
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    activities: false,
    feeds: true,
  },
});