// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { ObjectTranslationData } from '@objectstack/spec/system';

import { activityActions } from './_shared';

/**
 * 简体中文 (zh-CN) — `objects` translations for the CUSTOMER family:
 * the customer record itself — accounts and the people at them.
 *
 * Roster: `crm_account`, `crm_contact`.
 *
 * SPLIT AXIS (#1311): translation NAMESPACE first, then CRM DOMAIN FAMILY.
 * Everything that is not `objects` lives in `./app.ts`; `objects` — 69-78% of
 * every bundle — is one file per CRM domain family, and a detail object
 * follows its master. A new row goes in the file for ITS family, never in
 * whichever file is already open: that is how one file re-grows past the 70%
 * advisory band `pnpm hygiene` prints. Full rule and rationale:
 * `src/translations/zh-CN.ts`.
 */
export const customer: Record<string, ObjectTranslationData> = {
  crm_account: {
    label: '客户',
    pluralLabel: '客户',
    description: '与我们有业务往来的公司和组织',
    fields: {
      account_number: { label: '客户编号' },
      registration_number: {
        label: '登记证件号',
        help: '对方在其所属政府登记机关取得的登记标识。不同于由我方发放的客户编号。',
      },
      commercial_capability: {
        label: '商务能力',
        help: '该客户是否可以承接新业务。仅结算类客户依然可用于开票与收付款，但不能关联新的商机。',
        options: { full: '完整', settlement_only: '仅结算' },
      },
      incumbent_vendor: { label: '现有供应商', help: '当前承接该客户这部分支出的供应商。' },
      annual_purchasing_budget: { label: '年度采购预算', help: '该客户本年度预计向供应商支出的金额，而非其自身营收。' },
      payment_cycle: {
        label: '付款周期',
        options: { prepaid: '预付', net_30: '30 天', net_60: '60 天', net_90: '90 天' },
      },
      approval_status: {
        label: '审批状态',
        help: '该客户的审批进展。新建客户初始为待审批，并在审批收件箱中裁定。',
        options: { pending: '待审批', approved: '已通过', rejected: '已驳回' },
      },
      name: { label: '客户名称', help: '公司或组织的法定名称' },
      type: {
        label: '类型',
        options: { prospect: '潜在客户', customer: '正式客户', partner: '合作伙伴', former: '前客户' },
      },
      industry: {
        label: '行业',
        options: {
          technology: '科技', software: '软件 / SaaS', finance: '金融',
          healthcare: '医疗', retail: '零售', manufacturing: '制造',
          education: '教育', real_estate: '房地产', media: '传媒娱乐',
          logistics: '物流', hospitality: '酒店旅游', energy: '能源公用事业',
          government: '政府', nonprofit: '非营利', other: '其他',
        },
      },
      annual_revenue: { label: '年营收' },
      child_account_revenue: { label: '子公司年营收合计', help: '本客户直属子公司的年营收合计。' },
      number_of_employees: { label: '员工人数' },
      phone: { label: '电话' },
      website: { label: '网站' },
      billing_address: { label: '账单地址' },
      billing_country: {
        label: '账单国家',
        help: '由账单地址推导——按录入原样去除首尾空格并转为大写。',
      },
      territory: {
        label: '销售区域',
        help: '由账单地址推导——区域共享规则据此匹配。不属于已配置区域的客户为“其他”。',
        options: { na: '北美', emea: '欧洲、中东与非洲', other: '其他' },
      },
      office_location: { label: '办公地点' },
      owner_id: { label: '客户负责人' },
      parent_account: { label: '母公司', help: '层级结构中的母公司' },
      description: { label: '描述' },
      is_active: { label: '是否活跃' },
      last_activity_date: { label: '最近活动日期' },
      brand_color: { label: '品牌色' },
      logo: { label: '公司标识' },
      tier: {
        label: '客户分层',
        options: { strategic: '战略客户', enterprise: '企业客户', mid_market: '中型客户', smb: '中小客户' },
      },
      segment: {
        label: '客户细分',
        options: { net_new: '全新客户', growth: '增长客户', at_risk: '风险客户', stable: '稳定客户' },
      },
      health_score: {
        label: '健康度',
        help: '客户成功经理维护的健康度指标',
        options: { healthy: '健康', watching: '关注', at_risk: '风险', churning: '流失中' },
      },
      name_normalized: { label: '客户名称（规范化）', help: '线索转化的匹配键：客户名称转小写、去除首尾空格、内部连续空白合并为一个空格。由 account_protection 钩子维护——请勿直接编辑。' },
      display_title: { label: '显示名称' },
    },
    _views: {
      all_accounts: {
        label: '全部客户', description: '客户主列表，包含营收与行业摘要',
        bulkActions: {
          delete: {
            label: '删除',
            confirmLabel: '删除',
            confirmText: '确定要永久删除 {{count}} 个客户吗？此操作无法撤销。',
          },
          transfer_owner: {
            label: '转移负责人',
            confirmText: '确定要转移 {{count}} 个客户的负责人吗？',
            params: {
              owner_id: {
                label: '新负责人',
              },
            },
          },
          update_tier: {
            label: '更新客户等级',
            confirmText: '确定要将 {{count}} 个客户的等级更新为 {{tier}} 吗？',
            params: {
              tier: {
                label: '客户等级',
              },
            },
          },
        },
      },
      account_gallery: { label: '客户卡片', description: '使用品牌色高亮的客户卡片视图' },
      account_map: { label: '客户地图', description: '客户的地理分布' },
      enterprise_accounts: { label: '企业客户', description: '年营收最高的大客户' },
      my_accounts: { label: '我的客户', description: '由当前用户负责的客户' },
      at_risk_accounts: { label: '⚠️ 风险客户' },
    },
    _sections: {
      basic: { label: '基本信息' },
      financials: { label: '财务信息' },
      business_profile: { label: '业务信息' },
      contact_info: { label: '联系信息' },
      ownership: { label: '归属与状态' },
      branding: { label: '品牌' },
      system: { label: '系统' },
      // account.view.ts 表单区块名称 (#1100)
      profile: { label: '资料' },
      customer_success: { label: '客户成功' },
      locations: { label: '地址信息' },
      description: { label: '描述' },
    },
    _actions: { ...activityActions },
  },
  crm_contact: {
    label: '联系人',
    pluralLabel: '联系人',
    description: '客户与商机的关键人物联系人',
    fields: {
      salutation: {
        label: '称谓',
        options: { mr: '先生', ms: '女士', mrs: '夫人', dr: '博士', prof: '教授' },
      },
      first_name: { label: '名' },
      last_name: { label: '姓' },
      full_name: { label: '全名' },
      crm_account: { label: '所属客户' },
      email: { label: '邮箱' },
      phone: { label: '电话' },
      mobile: { label: '手机' },
      title: { label: '职位' },
      department: {
        label: '部门',
        options: {
          executive: '管理层', sales: '销售部', marketing: '市场部',
          engineering: '工程部', support: '支持部', finance: '财务部',
          hr: '人力资源', operations: '运营部',
        },
      },
      // 采购决策圈 (REQ-0004)。英文标签是 'Buying Function' 而非 'Buying Role'：
      // 平台的 security-role-word 规则在对象声明上保留了英文 role 一词（ADR-0090 D3）。
      // 该规则只匹配英文，不读语言包，所以中文这里用本地读者真正在说的词。
      buying_function: {
        label: '采购角色',
        options: {
          decision_maker: '决策者', economic_buyer: '预算决策人',
          technical_evaluator: '技术评估人', user: '使用者',
          influencer: '影响者', gatekeeper: '守门人',
        },
      },
      attitude: {
        label: '对我司态度',
        options: {
          champion: '拥护者', supportive: '支持', neutral: '中立',
          skeptical: '存疑', blocker: '反对者',
        },
      },
      relationship_strength: {
        label: '与销售关系强度',
        options: {
          distant: '疏远', acquaintance: '一般认识', working: '工作往来',
          strong: '关系紧密', trusted_advisor: '可信顾问',
        },
      },
      owner_id: { label: '联系人负责人' },
      description: { label: '描述' },
      is_primary: { label: '主要联系人', help: '是否为该客户的主要联系人？' },
      mailing_street: { label: '邮寄地址' },
      mailing_city: { label: '邮寄城市' },
      mailing_state: { label: '邮寄省份' },
      mailing_postal_code: { label: '邮政编码' },
      mailing_country: { label: '邮寄国家' },
      lead_source: {
        label: '线索来源',
        options: {
          web: '网站', referral: '推荐', event: '活动 / 展会',
          webinar: '线上研讨会', partner: '合作伙伴', advertisement: '广告',
          paid_search: '付费搜索', social: '社交媒体', content: '内容 / 博客',
          cold_call: '陌生拜访', email_campaign: '邮件营销', other: '其他',
        },
      },
      do_not_call: { label: '禁止致电' },
      email_opt_out: { label: '拒绝邮件' },
      last_contacted_date: { label: '最近联系时间' },
      avatar: { label: '头像' },
    },
    _views: {
      all_contacts: { label: '全部联系人' },
      contact_directory: { label: '联系人目录' },
      primary_contacts: { label: '主要联系人' },
    },
    _actions: {
      ...activityActions,
      mark_primary: {
        label: '设为主要联系人',
        confirmText: '是否将此联系人设为该客户的主要联系人？',
        successMessage: '已设为主要联系人！',
      },
      send_email: {
        label: '发送邮件',
        params: {
          subject: { label: '主题' },
          body: { label: '正文' },
        },
      },
      add_contact_to_campaign: {
        label: '加入营销活动',
        successMessage: '联系人已加入营销活动！',
        params: {
          crm_campaign: { label: '营销活动' },
        },
      },
    },
    _sections: {
      identity: { label: '身份信息' },
      account_info: { label: '客户与职务' },
      buying_centre: { label: '采购决策圈' },
      contact_info: { label: '联系方式' },
      mailing_address: { label: '邮寄地址' },
      additional: { label: '附加信息' },
      preferences: { label: '沟通偏好' },
      // contact.view.ts 表单区块名称 (#1100)
      contact_details: { label: '联系信息' },
      comm_preferences: { label: '偏好设置' },
    },
  },
};
