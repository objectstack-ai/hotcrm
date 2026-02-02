import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Position = ObjectSchema.create({
  name: 'position',
  label: '职位',
  pluralLabel: '职位',
  icon: 'briefcase',
  description: '职位和岗位定义管理',

  fields: {
    title: Field.text({
      label: '职位名称',
      required: true,
      maxLength: 255
    }),
    code: Field.text({
      label: '职位编码',
      unique: true,
      maxLength: 40
    }),
    department_id: Field.lookup('department', {
      label: '所属部门',
      required: true
    }),
    level: Field.select({
      label: '职级',
      options: [
        {
          "label": "C级高管",
          "value": "C-Level"
        },
        {
          "label": "VP级",
          "value": "VP"
        },
        {
          "label": "总监",
          "value": "Director"
        },
        {
          "label": "经理",
          "value": "Manager"
        },
        {
          "label": "主管",
          "value": "Supervisor"
        },
        {
          "label": "专员",
          "value": "Staff"
        },
        {
          "label": "助理",
          "value": "Assistant"
        }
      ]
    }),
    job_family: Field.select({
      label: '职位族',
      options: [
        {
          "label": "管理",
          "value": "Management"
        },
        {
          "label": "技术",
          "value": "Technical"
        },
        {
          "label": "销售",
          "value": "Sales"
        },
        {
          "label": "营销",
          "value": "Marketing"
        },
        {
          "label": "财务",
          "value": "Finance"
        },
        {
          "label": "人力资源",
          "value": "HR"
        },
        {
          "label": "运营",
          "value": "Operations"
        },
        {
          "label": "客户服务",
          "value": "Customer Service"
        },
        {
          "label": "其他",
          "value": "Other"
        }
      ]
    }),
    reports_to_id: Field.lookup('position', {
      label: '汇报给',
      description: '直接汇报的上级职位'
    }),
    employment_type: Field.select({
      label: '雇佣类型',
      defaultValue: 'Full-time',
      options: [
        {
          "label": "全职",
          "value": "Full-time"
        },
        {
          "label": "兼职",
          "value": "Part-time"
        },
        {
          "label": "合同",
          "value": "Contract"
        },
        {
          "label": "实习",
          "value": "Intern"
        },
        {
          "label": "临时",
          "value": "Temporary"
        }
      ]
    }),
    headcount: Field.number({
      label: '计划编制',
      description: '该职位的计划人数',
      defaultValue: 1
    }),
    current_headcount: Field.number({
      label: '当前人数',
      description: '当前在职人数（自动计算）',
      readonly: true
    }),
    min_salary: Field.currency({
      label: '最低薪资',
      precision: 2
    }),
    max_salary: Field.currency({
      label: '最高薪资',
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
          "label": "招聘中",
          "value": "Hiring"
        },
        {
          "label": "暂停",
          "value": "On Hold"
        },
        {
          "label": "已关闭",
          "value": "Closed"
        }
      ]
    }),
    description: Field.textarea({
      label: '职位描述',
      description: '职位职责和要求',
    }),
    requirements: Field.textarea({
      label: '任职要求',
      description: '学历、技能、经验等要求',
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    activities: false,
    feeds: true,
  },
});