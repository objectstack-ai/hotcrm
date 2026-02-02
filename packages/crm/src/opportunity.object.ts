import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Opportunity = ObjectSchema.create({
  name: 'opportunity',
  label: '商机',
  pluralLabel: '商机',
  icon: 'briefcase',
  description: '销售商机和管道管理',

  fields: {
    name: Field.text({
      label: '商机名称',
      required: true,
      maxLength: 120
    }),
    account_id: Field.lookup('account', {
      label: '客户',
      required: true
    }),
    contact_id: Field.lookup('contact', { label: '主要联系人' }),
    amount: Field.currency({
      label: '金额',
      precision: 2
    }),
    close_date: Field.date({
      label: '预计成交日期',
      required: true
    }),
    stage: Field.select({
      label: '阶段',
      required: true,
      options: [
        {
          "label": "🔍 潜在客户",
          "value": "Prospecting",
          "probability": 10
        },
        {
          "label": "📞 需求确认",
          "value": "Qualification",
          "probability": 20
        },
        {
          "label": "💡 方案设计",
          "value": "Needs Analysis",
          "probability": 40
        },
        {
          "label": "📊 方案展示",
          "value": "Proposal",
          "probability": 60
        },
        {
          "label": "💰 商务谈判",
          "value": "Negotiation",
          "probability": 80
        },
        {
          "label": "✅ 成交",
          "value": "Closed Won",
          "probability": 100,
          "isWon": true
        },
        {
          "label": "❌ 失败",
          "value": "Closed Lost",
          "probability": 0,
          "isLost": true
        }
      ]
    }),
    probability: Field.percent({
      label: '赢单概率',
      description: '赢单概率百分比'
    }),
    next_step: Field.text({
      label: '下一步行动',
      description: '明确的下一步行动计划',
      maxLength: 255
    }),
    lead_source: Field.select({
      label: '线索来源',
      options: [
        {
          "label": "Web 官网",
          "value": "Web"
        },
        {
          "label": "电话咨询",
          "value": "Phone Inquiry"
        },
        {
          "label": "合作伙伴推荐",
          "value": "Partner Referral"
        },
        {
          "label": "展会",
          "value": "Trade Show"
        },
        {
          "label": "社交媒体",
          "value": "Social Media"
        },
        {
          "label": "广告",
          "value": "Advertisement"
        },
        {
          "label": "老客户推荐",
          "value": "Customer Referral"
        },
        {
          "label": "其他",
          "value": "Other"
        }
      ]
    }),
    forecast_category: Field.select({
      label: '预测类别',
      defaultValue: 'Pipeline',
      options: [
        {
          "label": "渠道",
          "value": "Pipeline"
        },
        {
          "label": "最佳情况",
          "value": "Best Case"
        },
        {
          "label": "承诺",
          "value": "Commit"
        },
        {
          "label": "已忽略",
          "value": "Omitted"
        },
        {
          "label": "已成交",
          "value": "Closed"
        }
      ]
    }),
    type: Field.select({
      label: '商机类型',
      options: [
        {
          "label": "新业务",
          "value": "New Business"
        },
        {
          "label": "现有业务-升级",
          "value": "Existing Business - Upgrade"
        },
        {
          "label": "现有业务-续约",
          "value": "Existing Business - Renewal"
        },
        {
          "label": "现有业务-更换",
          "value": "Existing Business - Replacement"
        }
      ]
    }),
    expected_revenue: Field.currency({
      label: '预期营收',
      description: '基于金额和赢单概率计算',
      readonly: true,
      precision: 2
    }),
    days_open: Field.number({
      label: '开放天数',
      readonly: true,
      precision: 0
    }),
    owner_id: Field.lookup('users', {
      label: '负责人',
      required: true,
      defaultValue: '$currentUser'
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    activities: true,
    feeds: true,
    files: true
  },
});