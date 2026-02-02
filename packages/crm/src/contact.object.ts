import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Contact = ObjectSchema.create({
  name: 'contact',
  label: '联系人',
  pluralLabel: '联系人',
  icon: 'user',
  description: '个人联系人管理',

  fields: {
    first_name: Field.text({
      label: '名',
      maxLength: 40
    }),
    last_name: Field.text({
      label: '姓',
      required: true,
      maxLength: 80
    }),
    salutation: Field.select({
      label: '称谓',
      options: [
        {
          "label": "先生",
          "value": "Mr."
        },
        {
          "label": "女士",
          "value": "Ms."
        },
        {
          "label": "博士",
          "value": "Dr."
        },
        {
          "label": "教授",
          "value": "Prof."
        }
      ]
    }),
    account_id: /* TODO: Unknown type 'master_detail' */ null,
    title: Field.text({
      label: '职位',
      maxLength: 128
    }),
    department: Field.text({
      label: '部门',
      maxLength: 80
    }),
    level: Field.select({
      label: '职级',
      options: [
        {
          "label": "C级高管",
          "value": "C-level"
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
          "label": "专员",
          "value": "Individual Contributor"
        }
      ]
    }),
    email: Field.email({
      label: '邮箱',
      unique: true
    }),
    phone: Field.phone({ label: '电话' }),
    mobile_phone: Field.phone({ label: '手机' }),
    fax: Field.phone({ label: '传真' }),
    is_decision_maker: Field.boolean({
      label: '决策者',
      description: '是否为主要决策者',
      defaultValue: false
    }),
    influence_level: Field.select({
      label: '影响力',
      options: [
        {
          "label": "高 - 最终决策者",
          "value": "High"
        },
        {
          "label": "中 - 关键影响者",
          "value": "Medium"
        },
        {
          "label": "低 - 普通参与者",
          "value": "Low"
        }
      ]
    }),
    relationship_strength: Field.select({
      label: '关系强度',
      defaultValue: 'Unknown',
      options: [
        {
          "label": "强 - 战略伙伴",
          "value": "Strong"
        },
        {
          "label": "中 - 良好关系",
          "value": "Medium"
        },
        {
          "label": "弱 - 初步接触",
          "value": "Weak"
        },
        {
          "label": "未知",
          "value": "Unknown"
        }
      ]
    }),
    preferred_contact: Field.select({
      label: '首选联系方式',
      options: [
        {
          "label": "邮箱",
          "value": "email"
        },
        {
          "label": "电话",
          "value": "phone"
        },
        {
          "label": "手机",
          "value": "Mobile"
        },
        {
          "label": "微信",
          "value": "WeChat"
        }
      ]
    }),
    last_contact_date: Field.date({
      label: '最后联系日期',
      readonly: true
    }),
    notes: Field.textarea({
      label: '备注',
    })
  },

  enable: {
    searchEnabled: true,
    trackHistory: true,
    allowActivities: true,
    allowFeeds: true
  },
});