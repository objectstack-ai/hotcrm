import { ObjectSchema, Field } from '@objectstack/spec/data';

export const MarketingList = ObjectSchema.create({
  name: 'marketing_list',
  label: 'Marketing List',
  pluralLabel: 'Marketing Lists',
  icon: 'users',
  description: '营销列表/细分管理，支持动态查询和静态成员',

  fields: {
    name: Field.text({
      label: 'List Name',
      required: true,
      maxLength: 255
    }),
    list_code: Field.text({
      label: 'List Code',
      description: '用于API调用的唯一标识符',
      unique: true,
      maxLength: 80
    }),
    description: Field.textarea({
      label: 'Description',
      description: '列表的用途和目标受众说明',
      maxLength: 2000
    }),
    list_type: Field.select({
      label: 'List Type',
      description: '静态=手动添加，动态=自动更新，混合=两者结合',
      required: true,
      defaultValue: 'Static',
      options: [
        {
          "label": "📌 Static List",
          "value": "Static"
        },
        {
          "label": "🔄 Dynamic List",
          "value": "Dynamic"
        },
        {
          "label": "🔗 Hybrid List",
          "value": "Hybrid"
        }
      ]
    }),
    member_type: Field.select({
      label: 'Member Type',
      required: true,
      defaultValue: 'Lead',
      options: [
        {
          "label": "📝 Lead",
          "value": "Lead"
        },
        {
          "label": "👤 Contact",
          "value": "Contact"
        },
        {
          "label": "🏢 Account",
          "value": "Account"
        },
        {
          "label": "🔀 Mixed",
          "value": "Mixed"
        }
      ]
    }),
    filter_criteria_json: Field.textarea({
      label: 'Filter Criteria JSON',
      description: '动态列表的查询条件（ObjectQL格式）',
      maxLength: 65535
    }),
    refresh_frequency: Field.select({
      label: 'Refresh Frequency',
      description: '动态列表成员更新频率',
      options: [
        {
          "label": "Real-time",
          "value": "Real-time"
        },
        {
          "label": "Hourly",
          "value": "Hourly"
        },
        {
          "label": "Daily",
          "value": "Daily"
        },
        {
          "label": "Weekly",
          "value": "Weekly"
        },
        {
          "label": "Manual",
          "value": "Manual"
        }
      ]
    }),
    last_refreshed_date: Field.datetime({
      label: 'Last Refreshed Date',
      readonly: true
    }),
    campaign_id: Field.lookup('campaign', {
      label: 'Associated Campaign',
      description: '此列表关联的主要营销活动'
    }),
    segment_category: Field.select({
      label: 'Segment Category',
      options: [
        {
          "label": "🎯 Industry",
          "value": "Industry"
        },
        {
          "label": "📍 Geographic",
          "value": "Geographic"
        },
        {
          "label": "💼 Company Size",
          "value": "Company Size"
        },
        {
          "label": "🔥 Engagement Level",
          "value": "Engagement Level"
        },
        {
          "label": "📊 Lead Score",
          "value": "Lead Score"
        },
        {
          "label": "🎓 Buyer Journey",
          "value": "Buyer Journey"
        },
        {
          "label": "🏷️ Product Interest",
          "value": "Product Interest"
        },
        {
          "label": "🎨 Custom",
          "value": "Custom"
        }
      ]
    }),
    target_audience: Field.textarea({
      label: 'Target Audience Description',
      description: '此列表的目标受众特征',
      maxLength: 2000
    }),
    status: Field.select({
      label: 'Status',
      required: true,
      defaultValue: 'Active',
      options: [
        {
          "label": "✅ Active",
          "value": "Active"
        },
        {
          "label": "⏸️ Paused",
          "value": "Paused"
        },
        {
          "label": "📦 Archived",
          "value": "Archived"
        }
      ]
    }),
    is_active: Field.boolean({
      label: 'Is Active',
      defaultValue: true
    }),
    owner_id: Field.lookup('users', {
      label: 'Owner',
      required: true
    }),
    total_members: Field.number({
      label: 'Total Members',
      description: '列表中的总成员数',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    active_members: Field.number({
      label: 'Active Members',
      description: '未退订且邮件可送达的成员数',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    unsubscribed_members: Field.number({
      label: 'Unsubscribed Members',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    bounced_members: Field.number({
      label: 'Bounced Members',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    average_engagement_score: Field.number({
      label: 'Average Engagement Score',
      description: '列表成员的平均参与度评分',
      readonly: true,
      precision: 2
    }),
    average_lead_score: Field.number({
      label: 'Average Lead Score',
      description: '列表中线索的平均评分',
      readonly: true,
      precision: 2
    }),
    total_campaigns_sent: Field.number({
      label: 'Campaigns Sent',
      description: '使用此列表发送的营销活动数量',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    deliverability_rate: Field.percent({
      label: 'Deliverability Rate',
      description: '成功送达的邮件占比',
      readonly: true
    }),
    average_open_rate: Field.percent({
      label: 'Average Open Rate',
      description: '此列表历史营销活动的平均打开率',
      readonly: true
    }),
    average_click_rate: Field.percent({
      label: 'Average Click Rate',
      description: '此列表历史营销活动的平均点击率',
      readonly: true
    }),
    suppress_duplicates: Field.boolean({
      label: 'Suppress Duplicates',
      description: '自动去除重复成员',
      defaultValue: true
    }),
    suppress_unsubscribed: Field.boolean({
      label: 'Suppress Unsubscribed',
      description: '自动排除已退订的联系人',
      defaultValue: true
    }),
    suppress_bounced: Field.boolean({
      label: 'Suppress Bounced',
      description: '自动排除硬退信的邮箱地址',
      defaultValue: true
    }),
    include_opted_out_contacts: Field.boolean({
      label: 'Include Opted Out Contacts',
      description: '是否包含选择退出营销的联系人',
      defaultValue: false
    }),
    consent_required: Field.boolean({
      label: 'Marketing Consent Required',
      description: 'GDPR合规：只包含明确同意营销的联系人',
      defaultValue: true
    }),
    data_retention_days: Field.number({
      label: 'Data Retention Days',
      description: '成员数据保留期限（天）',
      precision: 0
    }),
    last_compliance_check: Field.datetime({
      label: 'Last Compliance Check',
      description: '最后一次GDPR/隐私合规检查时间',
      readonly: true
    }),
    last_import_date: Field.datetime({
      label: 'Last Import Date',
      readonly: true
    }),
    last_import_count: Field.number({
      label: 'Last Import Count',
      readonly: true,
      precision: 0
    }),
    source_system: Field.text({
      label: 'Source System',
      description: '成员的来源系统或渠道',
      maxLength: 100
    }),
    ai_suggested_segments: Field.textarea({
      label: 'AI Suggested Segments',
      description: 'AI 分析建议的额外细分维度',
      readonly: true,
      maxLength: 2000
    }),
    ai_engagement_prediction: Field.textarea({
      label: 'AI Engagement Prediction',
      description: 'AI 预测的列表参与度趋势',
      readonly: true,
      maxLength: 2000
    }),
    ai_suggested_content: Field.textarea({
      label: 'AI Content Suggestions',
      description: 'AI 针对此列表推荐的内容主题',
      readonly: true,
      maxLength: 2000
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    files: false
  },
});