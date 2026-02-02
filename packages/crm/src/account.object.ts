import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Account = ObjectSchema.create({
  name: 'account',
  label: '客户',
  pluralLabel: '客户',
  icon: 'building',
  description: '企业客户和组织管理',

  fields: {
    name: Field.text({
      label: '客户名称',
      required: true,
      unique: true,
      maxLength: 255
    }),
    account_number: Field.text({
      label: '客户编号',
      unique: true,
      maxLength: 40
    }),
    type: Field.select({
      label: '客户类型',
      options: [
        {
          "label": "潜在客户",
          "value": "Prospect"
        },
        {
          "label": "现有客户",
          "value": "Customer"
        },
        {
          "label": "合作伙伴",
          "value": "Partner"
        },
        {
          "label": "竞争对手",
          "value": "Competitor"
        },
        {
          "label": "其他",
          "value": "Other"
        }
      ]
    }),
    industry: Field.select({
      label: '行业',
      options: [
        {
          "label": "科技/互联网",
          "value": "Technology"
        },
        {
          "label": "金融服务",
          "value": "Finance"
        },
        {
          "label": "制造业",
          "value": "Manufacturing"
        },
        {
          "label": "零售",
          "value": "Retail"
        },
        {
          "label": "医疗健康",
          "value": "Healthcare"
        },
        {
          "label": "教育",
          "value": "Education"
        },
        {
          "label": "房地产",
          "value": "RealEstate"
        },
        {
          "label": "能源",
          "value": "Energy"
        },
        {
          "label": "咨询服务",
          "value": "Consulting"
        },
        {
          "label": "其他",
          "value": "Other"
        }
      ]
    }),
    annual_revenue: Field.currency({
      label: '年营收',
      precision: 2
    }),
    number_of_employees: Field.number({ label: '员工人数' }),
    rating: Field.select({
      label: '客户评级',
      options: [
        {
          "label": "热门 🔥",
          "value": "Hot"
        },
        {
          "label": "温暖 ⭐",
          "value": "Warm"
        },
        {
          "label": "冷淡 ❄️",
          "value": "Cold"
        }
      ]
    }),
    phone: Field.phone({ label: '电话' }),
    fax: Field.phone({ label: '传真' }),
    website: Field.url({ label: '网站' }),
    email: Field.email({ label: '邮箱' }),
    billing_street: Field.textarea({
      label: '账单地址（街道）',
      rows: 2
    }),
    billing_city: Field.text({
      label: '账单地址（城市）',
      maxLength: 40
    }),
    billing_state: Field.text({
      label: '账单地址（省份）',
      maxLength: 40
    }),
    billing_postal_code: Field.text({
      label: '账单地址（邮编）',
      maxLength: 20
    }),
    billing_country: Field.text({
      label: '账单地址（国家）',
      maxLength: 40
    }),
    shipping_street: Field.textarea({
      label: '送货地址（街道）',
      rows: 2
    }),
    shipping_city: Field.text({
      label: '送货地址（城市）',
      maxLength: 40
    }),
    shipping_state: Field.text({
      label: '送货地址（省份）',
      maxLength: 40
    }),
    shipping_postal_code: Field.text({
      label: '送货地址（邮编）',
      maxLength: 20
    }),
    shipping_country: Field.text({
      label: '送货地址（国家）',
      maxLength: 40
    }),
    customer_status: Field.select({
      label: '客户状态',
      defaultValue: 'Prospect',
      options: [
        {
          "label": "潜在客户",
          "value": "Prospect"
        },
        {
          "label": "活跃客户",
          "value": "Active Customer"
        },
        {
          "label": "流失客户",
          "value": "Churned"
        },
        {
          "label": "暂停合作",
          "value": "On Hold"
        }
      ]
    }),
    description: Field.textarea({
      label: '描述',
      rows: 5
    }),
    sla_tier: Field.select({
      label: 'SLA等级',
      description: '服务等级协议层级',
      options: [
        {
          "label": "白金",
          "value": "Platinum"
        },
        {
          "label": "黄金",
          "value": "Gold"
        },
        {
          "label": "白银",
          "value": "Silver"
        },
        {
          "label": "标准",
          "value": "Standard"
        }
      ]
    }),
    health_score: Field.number({
      label: '健康度评分',
      description: '客户健康度评分 (0-100)',
      min: 0,
      max: 100,
      precision: 0
    }),
    next_renewal_date: Field.date({ label: '下次续约日期' }),
    contract_value: Field.currency({
      label: '合同总价值',
      description: '所有有效合同的总价值',
      readonly: true,
      precision: 2
    }),
    owner_id: Field.lookup('users', {
      label: '负责人',
      required: true,
      defaultValue: '$currentUser'
    }),
    parent_id: Field.lookup('account', { label: '上级客户' })
  },

  enable: {
    searchEnabled: true,
    trackHistory: true,
    allowActivities: true,
    allowFeeds: true,
    allowAttachments: true
  },
});