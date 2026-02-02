import { ObjectSchema, Field } from '@objectstack/spec/data';

export const MarketingList = ObjectSchema.create({
  name: 'marketing_list',
  label: '营销列表',
  pluralLabel: '营销列表',
  icon: 'users',
  description: '营销列表/细分管理，支持动态查询和静态成员',

  fields: {
    name: Field.text({
      label: '列表名称',
      required: true,
      maxLength: 255
    }),
    list_code: Field.text({
      label: '列表代码',
      description: '用于API调用的唯一标识符',
      unique: true,
      maxLength: 80
    }),
    description: Field.textarea({
      label: '描述',
      description: '列表的用途和目标受众说明',
      maxLength: 2000
    }),
    list_type: Field.select({
      label: '列表类型',
      description: '静态=手动添加，动态=自动更新，混合=两者结合',
      required: true,
      defaultValue: 'Static',
      options: [
        {
          "label": "📌 静态列表",
          "value": "Static"
        },
        {
          "label": "🔄 动态列表",
          "value": "Dynamic"
        },
        {
          "label": "🔗 混合列表",
          "value": "Hybrid"
        }
      ]
    }),
    member_type: Field.select({
      label: '成员类型',
      required: true,
      defaultValue: 'Lead',
      options: [
        {
          "label": "📝 线索",
          "value": "Lead"
        },
        {
          "label": "👤 联系人",
          "value": "Contact"
        },
        {
          "label": "🏢 客户",
          "value": "Account"
        },
        {
          "label": "🔀 混合",
          "value": "Mixed"
        }
      ]
    }),
    filter_criteria_json: Field.textarea({
      label: '筛选条件 JSON',
      description: '动态列表的查询条件（ObjectQL格式）',
      maxLength: 65535
    }),
    refresh_frequency: Field.select({
      label: '刷新频率',
      description: '动态列表成员更新频率',
      options: [
        {
          "label": "实时",
          "value": "Real-time"
        },
        {
          "label": "每小时",
          "value": "Hourly"
        },
        {
          "label": "每日",
          "value": "Daily"
        },
        {
          "label": "每周",
          "value": "Weekly"
        },
        {
          "label": "手动",
          "value": "Manual"
        }
      ]
    }),
    last_refreshed_date: Field.datetime({
      label: '最后刷新时间',
      readonly: true
    }),
    campaign_id: Field.lookup('campaign', {
      label: '关联营销活动',
      description: '此列表关联的主要营销活动'
    }),
    segment_category: Field.select({
      label: '细分类别',
      options: [
        {
          "label": "🎯 行业",
          "value": "Industry"
        },
        {
          "label": "📍 地理位置",
          "value": "Geographic"
        },
        {
          "label": "💼 公司规模",
          "value": "Company Size"
        },
        {
          "label": "🔥 参与度",
          "value": "Engagement Level"
        },
        {
          "label": "📊 线索评分",
          "value": "Lead Score"
        },
        {
          "label": "🎓 购买阶段",
          "value": "Buyer Journey"
        },
        {
          "label": "🏷️ 产品兴趣",
          "value": "Product Interest"
        },
        {
          "label": "🎨 自定义",
          "value": "Custom"
        }
      ]
    }),
    target_audience: Field.textarea({
      label: '目标受众描述',
      description: '此列表的目标受众特征',
      maxLength: 2000
    }),
    status: Field.select({
      label: '状态',
      required: true,
      defaultValue: 'Active',
      options: [
        {
          "label": "✅ 活跃",
          "value": "Active"
        },
        {
          "label": "⏸️ 暂停",
          "value": "Paused"
        },
        {
          "label": "📦 已归档",
          "value": "Archived"
        }
      ]
    }),
    is_active: Field.checkbox({
      label: '是否启用',
      defaultValue: true
    }),
    owner_id: Field.lookup('users', {
      label: '负责人',
      required: true
    }),
    total_members: Field.number({
      label: '总成员数',
      description: '列表中的总成员数',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    active_members: Field.number({
      label: '活跃成员数',
      description: '未退订且邮件可送达的成员数',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    unsubscribed_members: Field.number({
      label: '已退订成员数',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    bounced_members: Field.number({
      label: '退信成员数',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    average_engagement_score: Field.number({
      label: '平均参与度评分',
      description: '列表成员的平均参与度评分',
      readonly: true,
      precision: 2
    }),
    average_lead_score: Field.number({
      label: '平均线索评分',
      description: '列表中线索的平均评分',
      readonly: true,
      precision: 2
    }),
    total_campaigns_sent: Field.number({
      label: '发送活动数',
      description: '使用此列表发送的营销活动数量',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    deliverability_rate: Field.percent({
      label: '可送达率',
      description: '成功送达的邮件占比',
      readonly: true
    }),
    average_open_rate: Field.percent({
      label: '平均打开率',
      description: '此列表历史营销活动的平均打开率',
      readonly: true
    }),
    average_click_rate: Field.percent({
      label: '平均点击率',
      description: '此列表历史营销活动的平均点击率',
      readonly: true
    }),
    suppress_duplicates: Field.checkbox({
      label: '去重',
      description: '自动去除重复成员',
      defaultValue: true
    }),
    suppress_unsubscribed: Field.checkbox({
      label: '排除已退订',
      description: '自动排除已退订的联系人',
      defaultValue: true
    }),
    suppress_bounced: Field.checkbox({
      label: '排除硬退信',
      description: '自动排除硬退信的邮箱地址',
      defaultValue: true
    }),
    include_opted_out_contacts: Field.checkbox({
      label: '包含营销退出联系人',
      description: '是否包含选择退出营销的联系人',
      defaultValue: false
    }),
    consent_required: Field.checkbox({
      label: '需要营销同意',
      description: 'GDPR合规：只包含明确同意营销的联系人',
      defaultValue: true
    }),
    data_retention_days: Field.number({
      label: '数据保留天数',
      description: '成员数据保留期限（天）',
      precision: 0
    }),
    last_compliance_check: Field.datetime({
      label: '最后合规检查',
      description: '最后一次GDPR/隐私合规检查时间',
      readonly: true
    }),
    last_import_date: Field.datetime({
      label: '最后导入时间',
      readonly: true
    }),
    last_import_count: Field.number({
      label: '最后导入数量',
      readonly: true,
      precision: 0
    }),
    source_system: Field.text({
      label: '来源系统',
      description: '成员的来源系统或渠道',
      maxLength: 100
    }),
    ai_suggested_segments: Field.textarea({
      label: 'AI 建议细分',
      description: 'AI 分析建议的额外细分维度',
      readonly: true,
      maxLength: 2000
    }),
    ai_engagement_prediction: Field.textarea({
      label: 'AI 参与度预测',
      description: 'AI 预测的列表参与度趋势',
      readonly: true,
      maxLength: 2000
    }),
    ai_suggested_content: Field.textarea({
      label: 'AI 内容建议',
      description: 'AI 针对此列表推荐的内容主题',
      readonly: true,
      maxLength: 2000
    })
  },

  enable: {
    searchEnabled: true,
    trackHistory: true,
    allowAttachments: false
  },
});