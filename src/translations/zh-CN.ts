// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

/**
 * 简体中文 (zh-CN) — CRM App Translations
 *
 * Per-locale file: one file per language, following the `per_locale` convention.
 */
/**
 * 活动动作族（#592）：`log_call` / `log_meeting` / `schedule_meeting` 在
 * 线索、联系人、客户、商机、工单上各注册一次（无 `objectName` 的脚本动作会落到
 * 调度器从不探测的键上——见 #509）。五个对象的文案完全相同，因此在此声明一次并
 * 展开到各对象的 `_actions`：每个语言手抄十五份正是译文走样的开端。
 */
const activityActions = {
  log_call: {
    label: '记录通话',
    successMessage: '通话记录成功！',
    params: {
      subject: { label: '通话主题' },
      duration: { label: '时长（分钟）' },
      attendee_contacts: { label: '联系人参与者' },
      attendee_users: { label: '内部参与者' },
      notes: { label: '通话记录' },
    },
  },
  log_meeting: {
    label: '记录会议',
    successMessage: '会议记录成功！',
    params: {
      subject: { label: '会议主题' },
      duration: { label: '时长（分钟）' },
      attendee_contacts: { label: '联系人参会人' },
      attendee_users: { label: '内部参会人' },
      notes: { label: '会议纪要' },
    },
  },
  schedule_meeting: {
    label: '安排会议',
    successMessage: '会议已安排！',
    params: {
      subject: { label: '会议主题' },
      start_date: { label: '开始日期（UTC）' },
      start_time: { label: '开始时间（UTC）' },
      location: { label: '地点' },
      duration: { label: '时长（分钟）' },
      attendee_contacts: { label: '联系人参会人' },
      attendee_users: { label: '内部参会人' },
      notes: { label: '会议议程' },
    },
  },
};

export const zhCN: TranslationData = {
  objects: {
    crm_account: {
      label: '客户',
      pluralLabel: '客户',
      description: '与我们有业务往来的公司和组织',
      fields: {
        account_number: { label: '客户编号' },
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
        renewal_owner: { label: '续约负责人 (CSM)' },
        next_renewal_date: { label: '下次续约日期' },
        name_normalized: { label: '客户名称（规范化）', help: '线索转化的匹配键：客户名称转小写、去除首尾空格、内部连续空白合并为一个空格。由 account_protection 钩子维护——请勿直接编辑。' },
        display_title: { label: '显示名称' },
      },
      _views: {
        all_accounts: { label: '全部客户', description: '客户主列表，包含营收与行业摘要' },
        account_gallery: { label: '客户卡片', description: '使用品牌色高亮的客户卡片视图' },
        account_map: { label: '客户地图', description: '客户的地理分布' },
        enterprise_accounts: { label: '企业客户', description: '年营收最高的大客户' },
        my_accounts: { label: '我的客户', description: '由当前用户负责的客户' },
        renewals_due: { label: '🔄 即将续约' },
        at_risk_accounts: { label: '⚠️ 风险客户' },
      },
      _sections: {
        basic: { label: '基本信息' },
        financials: { label: '财务信息' },
        contact_info: { label: '联系信息' },
        ownership: { label: '归属与状态' },
        branding: { label: '品牌' },
        system: { label: '系统' },
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
        owner_id: { label: '联系人负责人' },
        description: { label: '描述' },
        is_primary: { label: '主要联系人', help: '是否为该客户的主要联系人？' },
        reports_to: { label: '直属上级', help: '直属上级/主管' },
        mailing_street: { label: '邮寄地址' },
        mailing_city: { label: '邮寄城市' },
        mailing_state: { label: '邮寄省份' },
        mailing_postal_code: { label: '邮政编码' },
        mailing_country: { label: '邮寄国家' },
        birthdate: { label: '生日' },
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
      },
      _sections: {
        identity: { label: '身份信息' },
        account_info: { label: '客户与职务' },
        contact_info: { label: '联系方式' },
        mailing_address: { label: '邮寄地址' },
        additional: { label: '附加信息' },
        preferences: { label: '沟通偏好' },
      },
    },

    crm_knowledge_article: {
      label: '知识文章',
      pluralLabel: '知识库',
      description: '面向客户和坐席的可复用问答与操作指南',
      fields: {
        article_number: { label: '文章编号' },
        title: { label: '标题' },
        summary: { label: '摘要', help: '一段话摘要，显示在搜索结果和 AI 引用中。' },
        body: { label: '正文', help: '文章正文（Markdown）。' },
        category: {
          label: '分类',
          options: {
            getting_started: '入门指南', how_to: '操作指南',
            troubleshooting: '故障排查', billing: '账务与价格', api: 'API 与集成',
            release_notes: '版本说明',
            policy: '政策制度',
          },
        },
        tags: {
          label: '标签',
          options: {
            auth: '身份认证', sso: '单点登录', mobile: '移动端', email: '邮件',
            reports: '报表', performance: '性能', data_import: '数据导入', webhooks: 'Webhook',
          },
        },
        status: {
          label: '状态',
          options: { draft: '草稿', in_review: '审核中', published: '已发布', archived: '已归档' },
        },
        audience: { label: '受众', options: { public: '公开', internal: '仅内部' }, help: '公开文章在客户门户可见；内部文章仅客服可见。' },
        language: {
          label: '语言',
          options: { en: '英语', zh_cn: '简体中文', es_es: '西班牙语', ja_jp: '日语' },
        },
        owner_id: { label: '负责人' },
        related_to_case: { label: '来源案例', help: '本文所依据的工单（可选）。' },
        published_at: { label: '发布时间' },
        last_reviewed_at: { label: '最近复核' },
        view_count: { label: '浏览数' },
        helpful_count: { label: '有用' },
        not_helpful_count: { label: '没用' },
        display_title: { label: '显示名称' },
      },
      _views: {
        all_articles: { label: '全部文章' },
        published_articles: { label: '已发布' },
        my_drafts: { label: '我的草稿' },
        stale_articles: { label: '复核队列 · 最久未复核在前' },
      },
      _sections: {
        basic: { label: '文章信息' },
        content: { label: '内容' },
        taxonomy: { label: '分类' },
        metrics: { label: '互动数据' },
      },
    },

    crm_forecast: {
      label: '销售预测',
      pluralLabel: '销售预测',
      description: '按销售负责人定期记录的管道快照，用于收入预测',
      fields: {
        owner_id: { label: '负责人' },
        period: { label: '周期', options: { month: '月度', quarter: '季度' } },
        period_start: { label: '周期起始' },
        period_end: { label: '周期截止' },
        period_label: { label: '周期标签', help: '易读的周期标签，例如"2026 年第三季度"或"2026 年 8 月"。' },
        snapshot_date: { label: '快照日期', help: '本次快照的采集日期。' },
        source: {
          label: '来源',
          options: { scheduled: '定时快照', ai: 'AI 技能', manual: '手工录入' },
        },
        quota: { label: '配额' },
        pipeline_amount: { label: '管道金额', help: '本周期内所有预计结单的进行中商机金额合计（不限阶段）。' },
        best_case_amount: { label: '最佳情况', help: '预测类别为"最佳情况"或"承诺"的进行中商机。' },
        commit_amount: { label: '承诺金额', help: '预测类别为"承诺"的进行中商机（负责人已承诺）。' },
        closed_amount: { label: '已成交金额', help: '本周期内已赢单的金额。' },
        expected_amount: { label: '预期金额', help: '已成交 + 承诺——负责人合理预期能拿下的金额。' },
        attainment_pct: { label: '达成率（%）', help: '已成交 ÷ 配额 × 100。配额为正数之前显示 0%。' },
        coverage_ratio: { label: '覆盖倍数', help: '管道金额 ÷（配额 − 已成交）——判断剩余缺口是否有足够管道覆盖。配额已达成时显示 0。' },
        notes: { label: '备注' },
        display_title: { label: '显示名称' },
        seed_key: { label: '种子标识', help: '演示数据标识。仅由种子加载器写入；真实快照上始终为空。' },
      },
      _views: {
        all_forecasts: { label: '全部预测' },
        this_quarter_forecasts: {
          label: '本季度',
          emptyState: {
            title: '本季度尚无快照',
            message: '季度快照由每晚的预测扫描任务写入。在它为当前季度首次跑完之前，本视图为空——已结束的季度请见“全部”标签页。',
          },
        },
        my_forecast: { label: '我的预测' },
      },
      _sections: {
        basic: { label: '快照' },
        amounts: { label: '金额' },
        meta: { label: '来源' },
      },
    },

    crm_lead: {
      label: '线索',
      pluralLabel: '线索',
      description: '尚未确认的潜在客户',
      fields: {
        salutation: {
          label: '称谓',
          options: { mr: '先生', ms: '女士', mrs: '夫人', dr: '博士', prof: '教授' },
        },
        first_name: { label: '名' },
        last_name: { label: '姓' },
        full_name: { label: '全名' },
        company: { label: '公司' },
        title: { label: '职位' },
        email: { label: '邮箱' },
        phone: { label: '电话' },
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
        status: {
          label: '状态',
          options: {
            // 已确认 / 未通过 是同一个动作(线索确认)的正反两面;原先的
            // 已确认 / 不合格 出自两套说法,在状态条上并排时读起来不成对。
            new: '新建', contacted: '已联系', qualified: '已确认',
            unqualified: '未通过', converted: '已转化',
          },
        },
        lead_source: {
          label: '线索来源',
          options: {
            web: '网站', referral: '推荐', event: '活动 / 展会',
            webinar: '线上研讨会', partner: '合作伙伴', advertisement: '广告',
            paid_search: '付费搜索', social: '社交媒体', content: '内容 / 博客',
            cold_call: '陌生拜访', email_campaign: '邮件营销', other: '其他',
          },
        },
        owner_id: { label: '线索负责人' },
        is_converted: { label: '已转化' },
        description: { label: '描述' },
        mobile: { label: '手机' },
        website: { label: '网站' },
        rating: { label: '线索评分', help: '线索质量评分（1-5 星）' },
        converted_account: { label: '转化客户' },
        converted_contact: { label: '转化联系人' },
        converted_opportunity: { label: '转化商机' },
        converted_date: { label: '转化日期' },
        address: { label: '地址' },
        annual_revenue: { label: '年营收' },
        number_of_employees: { label: '员工人数' },
        notes: { label: '备注', help: '本线索的工作备注——支持格式排版。' },
        do_not_call: { label: '禁止致电' },
        email_opt_out: { label: '拒收邮件' },
        disqualification_reason: {
          // 状态里的 unqualified 译作「未通过」,所以这里跟着叫「未通过原因」
          // 而不是「取消资格原因」—— 两个字段在同一张表单上下相邻,用词必须成对。
          label: '未通过原因',
          help: '状态为「未通过」时必填',
          options: {
            not_a_fit: '需求不匹配', no_budget: '预算不足', wrong_persona: '联系人角色不符',
            unreachable: '无法联系', duplicate: '重复线索', competitor: '选择了竞争对手',
            other: '其他',
          },
        },
        duplicate_of_type: {
          help: '保留下来的那条记录所属的对象类型。',
          label: '重复于',
          options: { crm_lead: '线索', crm_contact: '联系人' },
        },
        duplicate_of_lead: { label: '重复的线索' },
        duplicate_of_contact: { label: '重复的联系人' },
        duplicate_status: {
          help: '疑似 = 录入时自动标记；已确认 = 人工核实过匹配。',
          // 疑似 = 录入时自动标记;已确认 = 人工核对后的判定。两者是同一
          // 判断的两个阶段,所以共用一个字段而不是各占一套链接字段。
          label: '重复状态',
          options: { suspected: '疑似重复', confirmed: '已确认重复' },
        },
        display_title: { label: '显示名称' },
        company_normalized: { label: '公司名称（规范化）', help: '线索转化的匹配键：公司名称转小写、去除首尾空格、内部连续空白合并为一个空格。由 lead_duplicate_check 钩子维护——请勿直接编辑。' },
        next_followup_date: { label: '下次跟进日期' },
        last_contacted_date: { label: '最近联系时间' },
      },
      _views: {
        all_leads: {
          label: '全部线索',
          emptyState: { title: '还没有线索', message: '创建第一条线索，从这里开始' },
        },
        kanban_by_status: { label: '线索流水线' },
        calendar_by_created: { label: '线索日历' },
        gallery_view: { label: '线索卡片' },
        my_leads: { label: '我的线索' },
        high_priority: { label: '高优先级' },
        hot_leads: { label: '🔥 高热度线索' },
        suspected_duplicates: {
          label: '疑似重复线索',
          emptyState: { title: '没有疑似重复', message: '无需复核——每个重复录入的邮箱都已检查过。' },
        },
      },
      _sections: {
        // Detail-page `record:details` section names (lead_detail.page.ts)
        info: { label: '线索信息' },
        crm_contact: { label: '联系方式' },
        detail: { label: '线索详情' },
        address: { label: '地址' },
        description: { label: '描述' },
        // Object-level section keys (lead.object.ts) used by record forms
        identity: { label: '身份信息' },
        company_info: { label: '公司信息' },
        contact_info: { label: '联系方式' },
        qualification: { label: '资格评估' },
        assignment: { label: '分配' },
        additional: { label: '附加信息' },
        preferences: { label: '沟通偏好' },
        conversion: { label: '转化' },
        duplicates: { label: '重复线索管理' },
      },
      _actions: {
        ...activityActions,
        convert_lead: {
          label: '转化线索',
          confirmText: '确认要转化此线索吗？',
          successMessage: '线索转化成功！',
        },
        create_campaign: {
          label: '加入营销活动',
          successMessage: '已将线索加入营销活动！',
          params: {
            crm_campaign: { label: '营销活动' },
          },
        },
        schedule_followup: {
          label: '安排跟进',
          successMessage: '跟进任务已创建。',
        },
      },
    },

    crm_quote: {
      label: '报价单',
      pluralLabel: '报价单',
      description: '发送给客户的价格报价',
      fields: {
        quote_number: { label: '报价单编号' },
        name: { label: '报价名称' },
        crm_account: { label: '所属客户' },
        crm_opportunity: { label: '关联商机' },
        status: {
          label: '状态',
          options: {
            draft: '草稿', in_review: '审核中', presented: '已提交', accepted: '已接受',
            rejected: '已拒绝', expired: '已过期',
          },
        },
        total_price: { label: '总金额' },
        discount: { label: '折扣 (%)' },
        expiration_date: { label: '到期日期' },
        description: { label: '描述' },
        crm_contact: {
          label: '联系人',
          help: '报价进入「已呈现」或「已接受」后必填 —— 起草的合同从这里取主要联系人。',
        },
        owner_id: { label: '报价负责人' },
        quote_date: { label: '报价日期' },
        subtotal: { label: '小计' },
        discount_amount: { label: '折扣金额' },
        tax: { label: '税额' },
        shipping_handling: { label: '运费及手续费' },
        payment_terms: {
          label: '付款条款',
          options: {
            net_15: '15 天账期', net_30: '30 天账期', net_60: '60 天账期',
            net_90: '90 天账期', due_on_receipt: '货到付款',
          },
        },
        shipping_terms: { label: '运输条款' },
        billing_address: { label: '账单地址' },
        shipping_address: { label: '收货地址' },
        internal_notes: { label: '内部备注' },
        display_title: { label: '显示名称' },
      },
      _views: {
        all_quotes: { label: '全部报价单' },
        quote_pipeline: { label: '报价流水线' },
        quote_calendar: { label: '报价日历' },
      },
      _sections: {
        basic: { label: '报价信息' },
        pricing: { label: '价格' },
        terms: { label: '条款与有效期' },
        address: { label: '地址' },
        system: { label: '系统' },
      },
    },

    crm_contract: {
      label: '合同',
      pluralLabel: '合同',
      description: '与客户签署的法律合同',
      fields: {
        contract_number: { label: '合同编号' },
        crm_account: { label: '所属客户' },
        status: {
          label: '状态',
          options: {
            draft: '草稿', in_approval: '审批中', activated: '已激活',
            expired: '已过期', terminated: '已终止',
          },
        },
        start_date: { label: '开始日期' },
        end_date: { label: '结束日期' },
        contract_value: { label: '合同金额' },
        description: { label: '描述' },
        crm_contact: { label: '主要联系人' },
        crm_opportunity: { label: '关联商机' },
        owner_id: { label: '合同负责人' },
        contract_term_months: { label: '合同期限（月）' },
        billing_frequency: {
          label: '计费周期',
          options: { monthly: '按月', quarterly: '按季度', annually: '按年', one_time: '一次性' },
        },
        payment_terms: {
          label: '付款条款',
          options: {
            net_15: '15 天账期', net_30: '30 天账期', net_60: '60 天账期',
            net_90: '90 天账期', due_on_receipt: '货到付款',
          },
        },
        auto_renewal: { label: '自动续约' },
        renewal_notice_days: { label: '续约通知（天）' },
        contract_type: {
          label: '合同类型',
          options: {
            subscription: '订阅合同', service: '服务协议', license: '授权许可',
            partnership: '合作协议', nda: '保密协议', msa: '主服务协议',
          },
        },
        signed_date: { label: '签署日期' },
        signed_by: { label: '签署人' },
        document_url: { label: '合同文档' },
        special_terms: { label: '特殊条款' },
        billing_address: { label: '账单地址' },
      },
      _views: {
        all_contracts: { label: '全部合同' },
        renewal_calendar: { label: '续约日历' },
        contract_gantt: { label: '合同条款' },
        contract_timeline: { label: '合同时间线' },
      },
      _sections: {
        basic: { label: '合同信息' },
        parties: { label: '签约方' },
        terms: { label: '条款与日期' },
        value: { label: '合同金额' },
        status: { label: '状态与审批' },
        renewal: { label: '续约' },
      },
    },

    crm_case: {
      label: '服务案例',
      pluralLabel: '服务案例',
      description: '客户支持案例与服务请求',
      fields: {
        case_number: { label: '案例编号' },
        subject: { label: '主题' },
        description: { label: '描述' },
        crm_account: { label: '所属客户' },
        crm_contact: { label: '联系人' },
        status: {
          label: '状态',
          options: {
            new: '新建', in_progress: '处理中',
            waiting_customer: '等待客户回复', waiting_support: '等待支持回复',
            escalated: '已升级', resolved: '已解决', closed: '已关闭',
          },
        },
        priority: {
          label: '优先级',
          options: { low: '低', medium: '中', high: '高', critical: '紧急' },
        },
        type: {
          label: '类型',
          options: {
            question: '咨询', problem: '故障', feature_request: '功能需求', bug: '缺陷',
          },
        },
        owner_id: { label: '负责人' },
        origin: {
          label: '工单来源',
          options: { email: '邮件', phone: '电话', web: '网站', chat: '在线客服', social_media: '社交媒体' },
        },
        created_date: { label: '创建日期' },
        closed_date: { label: '关闭日期' },
        first_response_date: { label: '首次响应日期' },
        resolution_time_hours: { label: '解决耗时（小时）' },
        sla_due_date: { label: 'SLA 到期' },
        is_sla_violated: { label: 'SLA 违反' },
        is_escalated: { label: '已升级' },
        escalation_reason: { label: '升级原因' },
        parent_case: { label: '父级工单', help: '关联的父工单' },
        resolution: { label: '解决方案' },
        customer_rating: { label: '客户满意度', help: '客户满意度评分（1-5 星）' },
        customer_feedback: { label: '客户反馈' },
        customer_signature: { label: '客户签字', help: '确认工单已解决的电子签名' },
        internal_notes: { label: '内部备注', help: '内部备注，客户不可见' },
        is_closed: { label: '是否关闭' },
        display_title: { label: '显示名称' },
        priority_rank: { label: '优先级排序' },
        escalated_date: { label: '升级日期' },
      },
      _views: {
        all_cases: { label: '全部工单' },
        case_workflow: { label: '服务流转' },
        sla_calendar: { label: 'SLA 日历' },
        case_timeline: { label: '工单时间线' },
        escalated_cases: { label: '已升级工单' },
        my_open_cases: { label: '我的待处理工单' },
        sla_at_risk: { label: '⏰ SLA 风险预警' },
      },
      _actions: {
        ...activityActions,
        escalate_case: {
          label: '升级工单',
          confirmText: '此操作会将工单升级到升级处理团队，是否继续？',
          successMessage: '工单升级成功！',
        },
        close_case: {
          label: '关闭工单',
          confirmText: '确定要关闭此工单吗？',
          successMessage: '工单已成功关闭！',
        },
      },
      _sections: {
        // Detail-page `record:details` section names (case_detail.page.ts)
        info: { label: '工单信息' },
        status: { label: '状态与 SLA' },
        description: { label: '描述' },
        // Object-level section keys (case.object.ts) used by record forms
        basic: { label: '工单信息' },
        origin: { label: '来源与路由' },
        sla: { label: 'SLA 与优先级' },
        resolution: { label: '解决方案' },
        escalation: { label: '升级' },
        system: { label: '系统' },
      },
    },

    crm_task: {
      label: '任务',
      pluralLabel: '任务',
      description: '活动与待办事项',
      fields: {
        subject: { label: '主题' },
        description: { label: '描述' },
        status: {
          label: '状态',
          options: {
            not_started: '未开始', in_progress: '进行中', waiting: '等待中',
            completed: '已完成', deferred: '已推迟',
          },
        },
        priority: {
          label: '优先级',
          options: { low: '低', normal: '普通', high: '高', urgent: '紧急' },
        },
        due_date: { label: '截止日期' },
        type: {
          label: '任务类型',
          options: {
            call: '电话', email: '邮件', meeting: '会议',
            follow_up: '跟进', demo: '演示', other: '其他',
          },
        },
        reminder_date: { label: '提醒时间' },
        completed_date: { label: '完成日期' },
        owner_id: { label: '负责人' },
        related_to_type: {
          label: '关联对象类型',
          options: {
            crm_account: '客户', crm_contact: '联系人', crm_opportunity: '商机',
            crm_lead: '线索', crm_case: '工单',
          },
        },
        related_to_account: { label: '关联客户' },
        related_to_contact: { label: '关联联系人' },
        related_to_opportunity: { label: '关联商机' },
        related_to_lead: { label: '关联线索' },
        related_to_case: { label: '关联工单' },
        is_recurring: { label: '重复任务' },
        recurrence_type: {
          label: '重复类型',
          options: { daily: '每日', weekly: '每周', monthly: '每月', yearly: '每年' },
        },
        recurrence_interval: { label: '重复间隔' },
        recurrence_end_date: { label: '重复结束日期' },
        is_completed: { label: '是否完成' },
        is_overdue: { label: '是否逾期' },
        progress_percent: { label: '进度（%）' },
        estimated_hours: { label: '预估工时' },
        actual_hours: { label: '实际工时' },
        priority_rank: { label: '优先级排序' },
        reminder_sent: { label: '提醒已发送' },
      },
      _sections: {
        basic: { label: '任务信息' },
        scheduling: { label: '日程安排' },
        related: { label: '关联记录' },
        recurrence: { label: '重复规则' },
        system: { label: '系统' },
        effort: { label: '进度与工时' },
      },
      _views: {
        all_tasks: { label: '全部任务' },
        task_board: { label: '任务看板' },
        task_calendar: { label: '任务日程' },
        task_gantt: { label: '执行计划' },
        task_timeline: { label: '工时时间线' },
        my_open_tasks: { label: '我的待办任务' },
        todays_tasks: { label: '📅 我的优先任务' },
        overdue_tasks: { label: '⏰ 待办任务 · 按逾期时长排序' },
      },
    },

    crm_campaign: {
      label: '营销活动',
      pluralLabel: '营销活动',
      description: '市场营销活动与推广',
      fields: {
        campaign_code: { label: '活动代码' },
        name: { label: '活动名称' },
        type: {
          label: '类型',
          options: {
            email: '邮件营销', webinar: '线上研讨会', trade_show: '展会',
            conference: '行业会议', direct_mail: '直邮', social_media: '社交媒体',
            content: '内容营销', partner: '伙伴联合营销',
          },
        },
        status: {
          label: '状态',
          options: {
            planning: '规划中', in_progress: '进行中',
            completed: '已完成', aborted: '已中止',
          },
        },
        start_date: { label: '开始日期' },
        end_date: { label: '结束日期' },
        expected_revenue: { label: '预期收入' },
        description: { label: '描述' },
        channel: {
          label: '主要渠道',
          options: { digital: '数字渠道', social: '社交媒体', email: '邮件', events: '线下活动', partner: '合作伙伴' },
        },
        budgeted_cost: { label: '预算成本' },
        actual_cost: { label: '实际成本' },
        actual_revenue: { label: '实际收入' },
        target_size: { label: '目标人数', help: '目标线索/联系人数量' },
        num_sent: { label: '发送数量' },
        num_responses: { label: '响应数量' },
        num_leads: { label: '线索数量' },
        num_converted_leads: { label: '已转化线索数' },
        num_opportunities: { label: '已创建商机数' },
        num_won_opportunities: { label: '已赢得商机' },
        response_rate: { label: '响应率（%）' },
        roi: { label: '投资回报率（%）' },
        parent_campaign: { label: '父级活动', help: '层级结构中的上级活动' },
        owner_id: { label: '活动负责人' },
        landing_page_url: { label: '着陆页' },
        is_active: { label: '是否启用' },
        display_title: { label: '显示名称' },
      },
      _sections: {
        basic: { label: '活动信息' },
        schedule: { label: '日程安排' },
        budget: { label: '预算与投资回报' },
        metrics: { label: '效果数据' },
        assignment: { label: '归属' },
        assets: { label: '活动素材' },
      },
      _views: {
        all_campaigns: { label: '全部营销活动' },
        campaign_gantt: { label: '活动排期' },
        campaign_calendar: { label: '活动日历' },
        campaign_timeline: { label: '营销时间线' },
      },
      _actions: {
        enroll_leads: {
          label: '批量加入线索',
          successMessage: '符合条件的线索已加入营销活动。',
        },
      },
    },

    crm_product: {
      label: '产品',
      pluralLabel: '产品',
      description: '公司提供的产品与服务',
      fields: {
        product_code: { label: '产品代码' },
        name: { label: '产品名称' },
        category: {
          label: '产品类别',
          options: {
            software: '软件', hardware: '硬件', service: '服务',
            subscription: '订阅', support: '支持服务',
          },
        },
        cost: { label: '成本' },
        billing_type: {
          label: '计费类型',
          options: {
            one_time: '一次性', monthly: '按月', quarterly: '按季度',
            annual: '按年', usage: '按用量',
          },
        },
        unit_of_measure: {
          label: '计量单位',
          options: {
            each: '个', license: '许可证', seat: '席位',
            hour: '小时', day: '天', month: '月',
          },
        },
        is_active: { label: '是否启用' },
        description: { label: '描述' },
        family: {
          label: '产品系列',
          options: {
            enterprise: '企业级方案', smb: '中小企业方案',
            services: '专业服务', cloud: '云服务',
          },
        },
        list_price: { label: '标价' },
        sku: { label: 'SKU' },
        quantity_on_hand: { label: '库存数量' },
        reorder_point: { label: '补货阈值' },
        is_taxable: { label: '应税' },
        product_manager: { label: '产品经理' },
        image: { label: '产品图片' },
        datasheet: { label: '规格书' },
        display_title: { label: '显示名称' },
        tax_rate: { label: '默认税率 %' },
      },
      _views: {
        all_products: { label: '全部产品' },
        product_catalog: { label: '产品目录' },
        low_stock: { label: '低库存' },
      },
      _sections: {
        basic: { label: '产品信息' },
        pricing: { label: '价格与计费' },
        metadata: { label: '资源' },
      },
    },

    crm_opportunity: {
      label: '商机',
      pluralLabel: '商机',
      description: '销售流程中的商机与交易',
      fields: {
        name: { label: '商机名称' },
        crm_account: { label: '所属客户' },
        primary_contact: { label: '主要联系人' },
        owner_id: { label: '商机负责人' },
        amount: { label: '金额' },
        expected_revenue: { label: '预期收入' },
        stage: {
          label: '阶段',
          options: {
            prospecting: '寻找客户', qualification: '资格审查',
            needs_analysis: '需求分析', proposal: '提案',
            negotiation: '谈判', closed_won: '成交', closed_lost: '失败',
          },
        },
        probability: { label: '成交概率 (%)' },
        close_date: { label: '预计成交日期' },
        type: {
          label: '类型',
          options: {
            new_business: '新业务',
            existing_upgrade: '老客户升级',
            existing_renewal: '老客户续约',
            existing_expansion: '老客户拓展',
          },
        },
        forecast_category: {
          label: '预测类别',
          options: {
            pipeline: '管道', best_case: '最佳情况',
            commit: '承诺', omitted: '已排除', closed: '已关闭',
          },
        },
        description: { label: '描述' },
        next_step: { label: '下一步' },
        lead_source: {
          label: '线索来源',
          options: {
            web: '网站', referral: '推荐', event: '活动 / 展会',
            webinar: '线上研讨会', partner: '合作伙伴', advertisement: '广告',
            paid_search: '付费搜索', social: '社交媒体', content: '内容 / 博客',
            cold_call: '陌生拜访', email_campaign: '邮件营销', other: '其他',
          },
        },
        crm_campaign: { label: '营销活动', help: '带来此商机的营销活动' },
        days_in_stage: { label: '当前阶段天数' },
        stage_entry_date: { label: '进入当前阶段日期', help: '本商机进入当前阶段的日期。' },
        is_private: { label: '私密' },
        approval_status: {
          label: '审批状态',
          options: { not_required: '无需审批', pending: '审批中', approved: '已批准', rejected: '已驳回' },
        },
        approved_date: { label: '批准时间' },
        win_reason: {
          help: '赢单原因。将商机关闭为"成交"时必填。',
          label: '赢单原因',
          options: {
            better_product: '产品更优', better_price: '价格更优', relationship: '客户关系',
            better_support: '支持更好', best_fit: '最佳契合',
            quote_accepted: '报价被接受', other: '其他',
          },
        },
        loss_reason: {
          help: '丢单原因。将商机关闭为"失败"时必填。',
          label: '丢单原因',
          options: {
            price: '价格过高', competitor: '输给竞争对手', no_budget: '无预算',
            no_decision: '未决策', timing: '时机不合适', features: '功能缺失', other: '其他',
          },
        },
        loss_details: { label: '赢/丢单详情', help: '赢单或丢单原因的补充说明。' },
      },
      _views: {
        open_opportunities: { label: '进行中商机' },
        all_opportunities: { label: '全部商机' },
        pipeline_kanban: { label: '销售流水线' },
        close_date_calendar: { label: '预测日历' },
        deal_timeline: { label: '商机时间线' },
        deal_gallery: { label: '商机卡片' },
        my_open_deals: { label: '我的进行中商机' },
        stale_opportunities: { label: '⚠️ 停滞商机 · 按阶段停留时间排序' },
        closing_this_quarter: {
          label: '本季度待成交商机',
          emptyState: {
            title: '本季度暂无待成交商机',
            message: '本标签页列出成交日期落在当前季度内、且处于承诺（Commit）或最佳可能（Best Case）的进行中商机。当前没有符合条件的记录——成交日期更晚的商机请见“进行中商机”标签页。',
          },
        },
      },
      _sections: {
        // Detail-page `record:details` section names (opportunity_detail.page.ts)
        info: { label: '商机信息' },
        crm_forecast: { label: '阶段与预测' },
        description: { label: '描述' },
        // Object-level section keys (opportunity.object.ts) used by record forms
        basic: { label: '基本信息' },
        financials: { label: '财务信息' },
        sales_process: { label: '销售流程' },
        classification: { label: '分类' },
        campaign: { label: '营销活动' },
        notes: { label: '备注与下一步' },
      },
      _actions: {
        ...activityActions,
        clone_opportunity: {
          label: '克隆商机',
          successMessage: '商机克隆成功！',
        },
        generate_quote: {
          label: '生成报价单',
          successMessage: '已根据商机创建报价单！',
        },
        mass_update_stage: {
          label: '更新阶段',
          successMessage: '商机阶段已更新！',
          params: {
            stage: {
              label: '新阶段',
              options: {
                prospecting: '寻找客户', qualification: '资格审查',
                needs_analysis: '需求分析', proposal: '提案',
                negotiation: '谈判', closed_won: '成交', closed_lost: '失败',
              },
            },
          },
        },
      },
    },

    crm_event: {
      label: '活动',
      pluralLabel: '活动',
      description: '与客户的会议、通话及其他已安排的互动',
      fields: {
        subject: { label: '主题' },
        description: { label: '描述' },
        type: {
          label: '活动类型',
          options: {
            meeting: '会议', call: '电话', demo: '演示',
            webinar: '线上研讨会', onsite_visit: '上门拜访', other: '其他',
          },
        },
        status: {
          label: '状态',
          options: {
            planned: '已计划', held: '已举行', cancelled: '已取消', no_show: '客户未到',
          },
        },
        owner_id: { label: '负责人' },
        start_datetime: { label: '开始时间' },
        end_datetime: { label: '结束时间' },
        all_day: { label: '全天活动' },
        duration_minutes: { label: '时长（分钟）' },
        location: { label: '地点', help: '会议室、地址或会议链接' },
        related_to_type: {
          label: '关联对象类型',
          options: {
            crm_account: '客户', crm_contact: '联系人', crm_opportunity: '商机',
            crm_lead: '线索', crm_case: '工单',
          },
        },
        related_to_account: { label: '关联客户' },
        related_to_contact: { label: '关联联系人' },
        related_to_opportunity: { label: '关联商机' },
        related_to_lead: { label: '关联线索' },
        related_to_case: { label: '关联工单' },
        outcome_notes: { label: '会后纪要', help: '达成了什么共识，下一步做什么' },
      },
      _sections: {
        basic: { label: '活动信息' },
        schedule: { label: '日程安排' },
        related: { label: '关联记录' },
        outcome: { label: '结果' },
      },
      _views: {
        all_events: { label: '全部活动' },
        event_calendar: { label: '活动日历' },
        event_timeline: { label: '团队日程' },
        my_events: { label: '我的日历' },
        upcoming_events: { label: '📅 即将开始 · 按时间升序' },
        held_events: { label: '✅ 互动历史' },
      },
    },

    crm_event_attendee: {
      label: '活动参与者',
      pluralLabel: '活动参与者',
      description: '受邀参加或实际出席活动的人员',
      fields: {
        attendee_number: { label: '参与者编号' },
        crm_event: { label: '活动' },
        attendee_type: {
          label: '参与者类型',
          options: { contact: '联系人', lead: '线索', user: '内部用户', external: '外部来宾' },
        },
        crm_contact: { label: '联系人', help: '参与者是已有客户联系人时填写' },
        crm_lead: { label: '线索', help: '参与者仍是未转化线索时填写' },
        sys_user: { label: '内部用户', help: '参与者是同事时填写' },
        external_name: { label: '外部参与者', help: '不在任何 CRM 对象中的参与者姓名——参与者类型为「外部来宾」时填写' },
        response: {
          label: '回复',
          options: {
            no_response: '未回复', accepted: '已接受',
            declined: '已拒绝', tentative: '待定',
          },
        },
        is_organizer: { label: '组织者' },
        invited_date: { label: '邀请时间' },
      },
      _sections: {
        basic: { label: '参与者' },
        response: { label: '邀请' },
      },
      _views: {
        all_event_attendees: { label: '活动参与者' },
      },
    },

    crm_campaign_member: {
      // 「营销活动成员」, not 「活动成员」: this object's master is `crm_campaign`
      // (营销活动), while 「活动」 is already this pack's label for `crm_event` and
      // 「活动参与者」 its child `crm_event_attendee`. Dropping 「营销」 put a
      // marketing object inside the calendar family's name space (#810).
      label: '营销活动成员',
      pluralLabel: '营销活动成员',
      description: '营销活动所触达的线索与联系人及其响应状态',
      fields: {
        member_number: { label: '成员编号' },
        crm_campaign: { label: '营销活动' },
        crm_lead: { label: '线索', help: '成员加入时身份为线索的，记录在此' },
        crm_contact: { label: '联系人', help: '成员为已有联系人的，记录在此' },
        status: {
          label: '状态',
          options: {
            sent: '已发送', opened: '已打开', clicked: '已点击',
            responded: '已响应', converted: '已转化', bounced: '已退回',
            unsubscribed: '已退订',
          },
        },
        added_date: { label: '加入时间' },
        first_opened_date: { label: '首次打开' },
        first_clicked_date: { label: '首次点击' },
        response_date: { label: '响应时间' },
        has_responded: { label: '已响应' },
      },
      _sections: {
        basic: { label: '基本信息' },
        response: { label: '响应跟踪' },
      },
    },

    crm_opportunity_line_item: {
      label: '商机产品明细',
      pluralLabel: '商机产品明细',
      description: '商机下按产品拆分的报价行',
      fields: {
        crm_opportunity: { label: '关联商机' },
        crm_product: { label: '产品' },
        description: { label: '描述' },
        quantity: { label: '数量' },
        list_price: { label: '标价', help: '自动取自产品的目录价' },
        unit_price: { label: '销售单价', help: '协商后的单价（可与目录价不同）' },
        discount: { label: '折扣（%）' },
        total_price: { label: '总计' },
        line_number: { label: '行号' },
      },
    },

    crm_quote_line_item: {
      label: '报价单明细',
      pluralLabel: '报价单明细',
      description: '报价单下按产品拆分的报价行',
      fields: {
        crm_quote: { label: '关联报价单' },
        crm_product: { label: '产品' },
        description: { label: '描述' },
        quantity: { label: '数量' },
        list_price: { label: '标价' },
        unit_price: { label: '销售单价' },
        discount: { label: '折扣（%）' },
        subtotal: { label: '小计' },
        tax_rate: { label: '税率（%）' },
        total_price: { label: '总计' },
        line_number: { label: '行号' },
      },
    },
  },

  apps: {
    crm_enterprise: {
      label: 'HotCRM',
      description: '涵盖销售、服务和市场营销的客户关系管理系统',
      // Keyed by navigation-node `id` (a flat keyspace regardless of depth).
      navigation: {
        group_activity: { label: '活动' },
        nav_event: { label: '活动' },
        nav_event_calendar: { label: '日历' },
        nav_event_history: { label: '互动历史' },
        nav_activity_dashboard: { label: '销售活动' },
        nav_my_calendar: { label: '我的日历' },
        nav_home: { label: '首页' },

        group_sales: { label: '销售' },
        nav_lead: { label: '线索' },
        nav_account: { label: '客户' },
        nav_account_workbench: { label: '客户工作台' },
        nav_contact: { label: '联系人' },
        nav_opportunity: { label: '商机' },
        nav_pipeline: { label: '销售管道' },
        nav_quote: { label: '报价' },
        nav_contract: { label: '合同' },
        nav_sales_dashboard: { label: '销售业绩' },

        group_work: { label: '我的工作' },
        nav_my_tasks: { label: '我的任务' },
        nav_my_deals: { label: '我的商机' },
        nav_my_leads: { label: '我的线索' },
        nav_my_cases: { label: '我的工单' },
        nav_all_tasks: { label: '全部任务' },

        group_marketing: { label: '市场营销' },
        nav_campaign: { label: '营销活动' },
        nav_product: { label: '产品' },

        group_service: { label: '服务' },
        nav_case: { label: '服务案例' },
        nav_knowledge: { label: '知识库' },
        nav_service_dashboard: { label: '服务概览' },

        group_insights: { label: '数据洞察' },
        nav_crm_dashboard: { label: 'CRM 总览' },
        nav_forecast: { label: '销售预测' },
        nav_report_pipeline_coverage: { label: '管道覆盖率' },
        nav_report_lead_inflow: { label: '线索流入' },
        nav_report_sla: { label: 'SLA 达成' },

        group_approvals: { label: '审批' },
        nav_approval_requests: { label: '待我审批' },
      },
    },
  },

  messages: {
    'common.save': '保存',
    'common.cancel': '取消',
    'common.delete': '删除',
    'common.edit': '编辑',
    'common.create': '新建',
    'common.search': '搜索',
    'common.filter': '筛选',
    'common.export': '导出',
    'common.back': '返回',
    'common.confirm': '确认',
    'nav.sales': '销售',
    'nav.service': '服务',
    'nav.marketing': '营销',
    'nav.products': '产品',
    'nav.analytics': '数据分析',
    'success.saved': '记录保存成功',
    'success.converted': '线索转化成功',
    'confirm.delete': '确定要删除此记录吗？',
    'confirm.convert_lead': '将此线索转化为客户、联系人和商机？',
    'error.required': '此字段为必填项',
    'error.load_failed': '数据加载失败',
  },


  dashboards: {
    sales_activity_dashboard: {
      label: '销售活动',
      description: '谁在和客户沟通、频率如何，以及哪些客户已经沉默',
      widgets: {
        interactions_held: { title: '已记录互动', description: '真实发生过的通话与会议' },
        meetings_booked: { title: '已预约会议', description: '已排入日历但尚未举行的会议' },
        customer_minutes: { title: '客户接触分钟数', description: '面向客户的总时长' },
        tasks_completed: { title: '已完成任务', description: '已闭环的跟进事项——活动的另一半' },
        activity_by_rep: { title: '按销售代表统计的活动', description: '每位负责人记录的互动数' },
        activity_by_week: { title: '每周活动量', description: '每周互动数' },
        activity_mix: { title: '活动构成', description: '通话、会议与演示的占比' },
        activity_by_record_type: { title: '活动落在哪里', description: '漏斗的哪个环节获得了关注' },
        deal_activity: { title: '商机上的互动', description: '关联到商机的已记录互动' },
        open_deals_for_activity: { title: '进行中的商机', description: '仍在推进的商机数' },
        quiet_accounts_30: { title: '沉默 30 天以上', description: '一个月内没有任何互动记录的活跃客户' },
        quiet_accounts_60: { title: '沉默 60 天以上', description: '两个月无联系——风险阈值' },
        quiet_accounts_90: { title: '沉默 90 天以上', description: '整整一个季度没有联系' },
      },
    },
    crm_overview_dashboard: {
      label: 'CRM 总览',
      description: '收入指标、管道分析与商机洞察',
      widgets: {
        total_revenue: { title: '总收入', description: '本期已成交收入' },
        active_deals: { title: '活跃商机', description: '管道中进行中的商机' },
        won_deals: { title: '赢单数', description: '本期已结案商机中赢单的总数' },
        avg_deal_size: { title: '平均订单金额', description: '已成交商机的平均金额' },
        revenue_trends: { title: '收入趋势', description: '过去 12 个月的已成交收入' },
        lead_source: { title: '线索来源', description: '按获客渠道统计的管道金额' },
        pipeline_by_stage: { title: '阶段管道分布', description: '按阶段统计的进行中商机金额' },
        top_products: { title: '热门产品', description: '按产品类别统计的目录价收入' },
        pipeline_by_owner: { title: '按负责人统计管道', description: '各销售负责人的进行中管道金额与商机数' },
      },
    },
    executive_dashboard: {
      label: '高管总览',
      description: '面向管理层的收入、客户与管道高阶指标',
      widgets: {
        total_revenue_ytd: { title: '年度累计收入', description: '本年度已成交收入' },
        total_accounts: { title: '活跃客户', description: '至少存在一项活跃关系的客户' },
        total_contacts: { title: '联系人总数', description: '通讯录中的联系人' },
        open_leads: { title: '未转化线索', description: '漏斗中尚未转化的线索' },
        revenue_trend: { title: '收入趋势', description: '过去 12 个月的已成交收入' },
        revenue_by_industry: { title: '行业收入分布', description: '本年度已成交收入按客户行业拆分' },
        pipeline_by_stage: { title: '阶段管道分布', description: '按销售阶段统计的进行中商机金额' },
        new_accounts_by_month: { title: '新增客户', description: '过去 6 个月的客户创建节奏' },
        accounts_by_industry: { title: '按行业统计客户', description: '各行业的年营收总额与客户数' },
      },
    },
    sales_dashboard: {
      label: '销售业绩',
      description: '管道分析、赢率趋势及销售代表绩效',
      widgets: {
        total_pipeline_value: { title: '管道总额', description: '所有进行中商机金额合计' },
        closed_won_qtd: { title: '本季度已成交', description: '本季度已赢得的收入' },
        open_opportunities: { title: '进行中商机', description: '正在推进的活跃商机' },
        avg_deal_size: { title: '平均订单金额', description: '本季度已成交商机的平均金额' },
        pipeline_by_stage: { title: '阶段管道分布', description: '按阶段统计的进行中商机金额' },
        monthly_revenue_trend: { title: '月度收入趋势', description: '过去 12 个月的已成交收入' },
        pipeline_by_forecast_category: { title: '预测类别管道分布', description: '按预测类别统计的进行中管道金额' },
        lead_source_breakdown: { title: '线索来源分布', description: '按来源统计的线索数量' },
        open_pipeline_by_owner: { title: '按负责人统计进行中管道', description: '各销售负责人的进行中管道金额、商机数与平均赢单概率' },
        quota_attainment_by_rep: { title: '按销售代表统计配额达成', description: '来自预测快照的各销售代表本季度配额、已成交收入与达成率' },
        pipeline_stage_by_source: { title: '阶段 × 线索来源', description: '按阶段和来源交叉统计进行中商机金额' },
        win_rate_12m: { title: '赢率（近 12 个月）', description: '近 12 个月已结单商机中赢单所占的比例' },
        won_deals_12m: { title: '赢单数（近 12 个月）', description: '赢率的分子' },
        lost_deals_12m: { title: '丢单数（近 12 个月）', description: '赢率分母的另一半' },
        win_rate_by_owner: { title: '按销售代表统计赢/丢单', description: '近 12 个月各销售代表的赢单数、丢单数与赢率' },
        win_rate_by_lead_source: { title: '按线索来源统计赢/丢单', description: '近 12 个月哪些来源带来的商机真正成交' },
        loss_reason_breakdown: { title: '丢单原因分析', description: '近 12 个月丢单按原因分布' },
      },
    },
    service_dashboard: {
      label: '客户服务',
      description: '工单负载、SLA 健康度与处理绩效',
      widgets: {
        open_cases: { title: '未关闭工单', description: '尚未关闭的工单' },
        critical_cases: { title: '紧急工单', description: '标记为紧急优先级的未关闭工单' },
        avg_resolution_time: { title: '平均解决时长', description: '关闭工单的平均处理时长（小时）' },
        sla_violations: { title: 'SLA 违约', description: '已超出 SLA 的工单' },
        cases_by_status: { title: '按状态分布', description: '工单在各处理阶段的分布' },
        cases_by_priority: { title: '按优先级分布', description: '未关闭工单按紧急程度的分布' },
        cases_by_origin: { title: '按来源分布', description: '工单的来源渠道' },
        daily_case_volume: { title: '每日工单量', description: '过去 30 天的新建工单' },
        sla_compliance_gauge: { title: 'SLA 达成率', description: '本期 SLA 内解决工单的占比' },
        open_cases_by_priority: { title: '按优先级统计未关闭工单', description: '未关闭工单及其 SLA 违约率，按优先级细分' },
      },
    },
  },

  // `title` / `subtitle` translate the page's `page:header`; `title` falls back
  // to `label` when omitted, so it is authored only where the two differ.
  // Header strings carrying `{field}` tokens keep the token spelling verbatim —
  // the console substitutes on the raw key, so a translated token resolves to
  // nothing and the header renders blank.
  pages: {
    account_detail_page: {
      label: '客户详情',
      description: '插槽式客户记录页——自定义页头 + 常驻讨论区。',
    },
    account_workbench: {
      label: '客户工作台',
      description: '面向销售团队的精选客户列表：仅提供快捷筛选，不含视图管理。',
    },
    app_launcher_page: {
      label: '应用中心',
      description: '访问全部应用的统一入口',
      subtitle: '选择一个应用开始使用',
      components: {
        app_search: { label: '搜索应用' },
        app_grid: { label: '应用网格' },
      },
    },
    case_detail_page: {
      label: '工单详情',
      description: '客服工单记录页：关键信息、SLA 进度、明细与活动时间线。',
      title: '{case_number} · {subject}',
      subtitle: '{crm_account}',
      components: {
        case_highlights: { label: '关键信息' },
        case_status_path: { label: '工单状态进度' },
      },
    },
    lead_detail_page: {
      label: '线索详情',
      description: '完整的线索详情页，包含关键信息、明细与相关记录。',
      title: '{first_name} {last_name}',
      subtitle: '{company}',
      components: {
        lead_highlights: { label: '关键信息' },
        lead_path: { label: '线索状态进度' },
        main_tabs: { label: '线索信息标签页' },
      },
    },
    opportunity_detail_page: {
      label: '商机详情',
      description: '完整的商机详情页，包含阶段进度、关键信息、明细与相关列表。',
      title: '{name}',
      subtitle: '{crm_account}',
      components: {
        opp_highlights: { label: '关键信息' },
        opp_stage_path: { label: '商机阶段进度' },
      },
    },
    sales_home_page: {
      label: '销售主页',
      description: '销售团队主页，汇总关键指标与快捷操作',
      title: '销售看板',
      subtitle: '欢迎回来，{current_user.first_name}',
      components: {
        quick_create: { title: '快速创建', label: '快速创建' },
        my_recent_items: { title: '最近使用', label: '最近使用' },
        key_metrics: { title: '关键绩效指标', label: '关键指标' },
        home_tabs: { label: '主页标签页' },
        ai_briefing: {
          title: '询问 AI 助手',
          description:
            '从页面右侧打开助手面板，询问"我今天应该关注什么？"——它可以实时查看您的销售管道、架构与客户信息。',
          label: 'AI 助手今日速览',
        },
        upcoming_events: { title: '今日日程', label: '日历' },
      },
    },
    utility_bar_page: {
      label: '工具栏',
      description: '悬浮工具的快捷访问栏',
      components: {
        notifications_panel: { label: '通知' },
        quick_notes: { title: '快速笔记', label: '快速笔记' },
        quick_search: { label: '快速搜索' },
      },
    },
  },
};
