import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Employee = ObjectSchema.create({
  name: 'employee',
  label: '员工',
  pluralLabel: '员工',
  icon: 'user-tie',
  description: '员工主数据和信息管理',

  fields: {
    employee_number: Field.text({
      label: '工号',
      required: true,
      unique: true,
      maxLength: 40
    }),
    first_name: Field.text({
      label: '名',
      required: true,
      maxLength: 40
    }),
    last_name: Field.text({
      label: '姓',
      required: true,
      maxLength: 80
    }),
    full_name: Field.formula({
      label: '全名',
      readonly: true,
      expression: 'CONCATENATE(last_name, first_name)'
    }),
    email: Field.email({
      label: '公司邮箱',
      required: true,
      unique: true
    }),
    personal_email: Field.email({ label: '个人邮箱' }),
    phone: Field.phone({ label: '电话' }),
    mobile_phone: Field.phone({
      label: '手机',
      required: true
    }),
    date_of_birth: Field.date({ label: '出生日期' }),
    gender: Field.select({
      label: '性别',
      options: [
        {
          "label": "男",
          "value": "Male"
        },
        {
          "label": "女",
          "value": "Female"
        },
        {
          "label": "其他",
          "value": "Other"
        }
      ]
    }),
    national_id: Field.text({
      label: '身份证号',
      description: '身份证或护照号码',
      unique: true,
      maxLength: 40
    }),
    marital_status: Field.select({
      label: '婚姻状况',
      options: [
        {
          "label": "未婚",
          "value": "Single"
        },
        {
          "label": "已婚",
          "value": "Married"
        },
        {
          "label": "离异",
          "value": "Divorced"
        },
        {
          "label": "其他",
          "value": "Other"
        }
      ]
    }),
    department_id: Field.lookup('department', {
      label: '所属部门',
      required: true
    }),
    position_id: Field.lookup('position', {
      label: '职位',
      required: true
    }),
    manager_id: Field.lookup('employee', {
      label: '直属经理',
      description: '直接汇报的上级'
    }),
    hire_date: Field.date({
      label: '入职日期',
      required: true
    }),
    termination_date: Field.date({ label: '离职日期' }),
    employment_status: Field.select({
      label: '雇佣状态',
      defaultValue: 'Active',
      options: [
        {
          "label": "在职",
          "value": "Active"
        },
        {
          "label": "试用期",
          "value": "Probation"
        },
        {
          "label": "休假",
          "value": "On Leave"
        },
        {
          "label": "已离职",
          "value": "Terminated"
        }
      ]
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
        }
      ]
    }),
    work_location: Field.text({
      label: '工作地点',
      maxLength: 255
    }),
    base_salary: Field.currency({
      label: '基本工资',
      precision: 2
    }),
    street: Field.textarea({
      label: '地址（街道）',
      rows: 2
    }),
    city: Field.text({
      label: '城市',
      maxLength: 40
    }),
    state: Field.text({
      label: '省份',
      maxLength: 40
    }),
    postal_code: Field.text({
      label: '邮编',
      maxLength: 20
    }),
    country: Field.text({
      label: '国家',
      maxLength: 40
    }),
    emergency_contact_name: Field.text({
      label: '紧急联系人',
      maxLength: 80
    }),
    emergency_contact_phone: Field.phone({ label: '紧急联系电话' }),
    emergency_contact_relationship: Field.text({
      label: '紧急联系人关系',
      maxLength: 40
    }),
    notes: Field.textarea({
      label: '备注',
      rows: 4
    })
  },

  enable: {
    searchEnabled: true,
    trackHistory: true,
    allowActivities: true,
    allowFeeds: true,
    allowAttachments: true
  },
});