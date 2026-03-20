import type { TranslationData } from '@objectstack/spec/system';

/**
 * 简体中文 (zh-CN) — Marketing Cloud Translations
 *
 * Per-locale file: one file per language, following the `per_locale` convention.
 */
export const zhCN: TranslationData = {
  objects: {
    campaign: {
      label: '营销活动',
      pluralLabel: '营销活动',
      fields: {
        name: { label: '活动名称' },
        description: { label: '描述' },
        type: {
          label: '活动类型',
          options: {
            Email: '邮件营销', 'Social Media': '社交媒体', Webinar: '网络研讨会',
            Event: '线下活动', 'Content Marketing': '内容营销', 'Paid Search': '付费搜索',
            'Display Advertising': '展示广告', 'Direct Mail': '直邮',
            'Referral Program': '推荐计划', Other: '其他',
          },
        },
        status: {
          label: '状态',
          options: { Draft: '草稿', Planned: '已计划', Active: '进行中 🟢', Completed: '已完成 ✅', Cancelled: '已取消 🚫' },
        },
        start_date: { label: '开始日期' },
        end_date: { label: '结束日期' },
        budgeted_cost: { label: '预算成本', help: '该活动的计划预算' },
        actual_cost: { label: '实际成本', help: '截至目前的实际支出' },
        expected_revenue: { label: '预期收入' },
        actual_revenue: { label: '实际收入' },
        expected_response_rate: { label: '预期响应率', help: '预计响应率 (%)' },
        target_audience: { label: '目标受众' },
        number_sent: { label: '发送数量' },
        number_of_leads: { label: '线索数量' },
        number_of_opportunities: { label: '商机数量' },
        number_of_won_deals: { label: '成交数量' },
        roi: { label: '投资回报率', help: '投资回报率 (%)' },
        parent_campaign: { label: '父级活动' },
        owner_id: { label: '负责人' },
      },
    },

    campaign_member: {
      label: '活动成员',
      pluralLabel: '活动成员',
      fields: {
        campaign_id: { label: '营销活动' },
        lead_id: { label: '线索' },
        contact_id: { label: '联系人' },
        status: {
          label: '状态',
          options: {
            Planned: '已计划', Sent: '已发送', Responded: '已响应',
            Attended: '已参加', 'No Show': '未出席', Unsubscribed: '已退订',
          },
        },
        responded_date: { label: '响应日期' },
        first_responded_date: { label: '首次响应日期' },
        source: { label: '来源' },
        engagement_score: { label: '互动评分', help: '基于互动行为计算的评分' },
      },
    },

    email_template: {
      label: '邮件模板',
      pluralLabel: '邮件模板',
      fields: {
        name: { label: '模板名称' },
        subject: { label: '邮件主题' },
        body: { label: '邮件正文' },
        type: {
          label: '模板类型',
          options: { Marketing: '营销', Sales: '销售', Service: '服务', Transactional: '事务性' },
        },
        status: {
          label: '状态',
          options: { Draft: '草稿', Active: '启用', Archived: '已归档' },
        },
        category: { label: '分类' },
        folder: { label: '文件夹' },
        is_responsive: { label: '响应式设计' },
        open_rate: { label: '打开率', help: '平均打开率 (%)' },
        click_rate: { label: '点击率', help: '平均点击率 (%)' },
        created_by: { label: '创建人' },
      },
    },

    landing_page: {
      label: '着陆页',
      pluralLabel: '着陆页',
      fields: {
        name: { label: '页面名称' },
        url_slug: { label: 'URL 别名' },
        status: {
          label: '状态',
          options: { Draft: '草稿', Published: '已发布 🟢', Archived: '已归档' },
        },
        template: { label: '模板' },
        campaign_id: { label: '营销活动' },
        page_views: { label: '页面浏览量' },
        unique_visitors: { label: '独立访客数' },
        conversion_rate: { label: '转化率', help: '访客转化为线索的比率 (%)' },
        form_id: { label: '表单' },
        meta_title: { label: 'Meta 标题' },
        meta_description: { label: 'Meta 描述' },
        published_date: { label: '发布日期' },
        owner_id: { label: '负责人' },
      },
    },

    form: {
      label: '表单',
      pluralLabel: '表单',
      fields: {
        name: { label: '表单名称' },
        description: { label: '描述' },
        type: {
          label: '表单类型',
          options: {
            'Contact Us': '联系我们', 'Newsletter Signup': '订阅注册',
            'Demo Request': '演示请求', 'Event Registration': '活动报名',
            Survey: '调查问卷', Download: '资料下载', Custom: '自定义',
          },
        },
        status: {
          label: '状态',
          options: { Draft: '草稿', Active: '启用', Archived: '已归档' },
        },
        submit_button_text: { label: '提交按钮文本' },
        success_message: { label: '成功提示信息' },
        redirect_url: { label: '跳转链接' },
        submissions_count: { label: '提交次数' },
        conversion_rate: { label: '转化率', help: '表单提交转化率 (%)' },
        campaign_id: { label: '营销活动' },
        landing_page_id: { label: '着陆页' },
        owner_id: { label: '负责人' },
      },
    },

    marketing_list: {
      label: '营销列表',
      pluralLabel: '营销列表',
      fields: {
        name: { label: '列表名称' },
        description: { label: '描述' },
        type: {
          label: '列表类型',
          options: { Static: '静态', Dynamic: '动态' },
        },
        status: {
          label: '状态',
          options: { Draft: '草稿', Active: '启用', Archived: '已归档' },
        },
        member_count: { label: '成员数量' },
        source: { label: '来源' },
        last_refreshed: { label: '最后刷新时间' },
        owner_id: { label: '负责人' },
      },
    },

    unsubscribe: {
      label: '退订',
      pluralLabel: '退订记录',
      fields: {
        email: { label: '邮箱' },
        contact_id: { label: '联系人' },
        lead_id: { label: '线索' },
        reason: {
          label: '原因',
          options: {
            'Not Relevant': '内容不相关', 'Too Frequent': '发送过于频繁',
            'Never Subscribed': '从未订阅', Spam: '垃圾邮件', Other: '其他',
          },
        },
        channel: {
          label: '渠道',
          options: { Email: '邮件', SMS: '短信', 'Push Notification': '推送通知', All: '所有渠道' },
        },
        unsubscribe_date: { label: '退订日期' },
        campaign_id: { label: '营销活动' },
      },
    },

    automation_workflow: {
      label: '自动化工作流',
      pluralLabel: '自动化工作流',
      fields: {
        name: { label: '工作流名称' },
        description: { label: '描述' },
        status: {
          label: '状态',
          options: { Draft: '草稿', Active: '运行中 🟢', Paused: '已暂停 ⏸️', Completed: '已完成 ✅', Error: '异常 🔴' },
        },
        trigger_type: {
          label: '触发类型',
          options: { 'Event-Based': '事件触发', 'Schedule-Based': '定时触发', Manual: '手动触发' },
        },
        trigger_object: { label: '触发对象' },
        trigger_event: { label: '触发事件' },
        enrollment_count: { label: '注册人数' },
        completion_count: { label: '完成人数' },
        conversion_rate: { label: '转化率', help: '注册到完成的比率 (%)' },
        start_date: { label: '开始日期' },
        end_date: { label: '结束日期' },
        owner_id: { label: '负责人' },
      },
    },

    email_send: {
      label: '邮件发送',
      pluralLabel: '邮件发送',
      fields: {
        name: { label: '发送名称' },
        email_template_id: { label: '邮件模板' },
        campaign_id: { label: '营销活动' },
        marketing_list_id: { label: '营销列表' },
        status: {
          label: '状态',
          options: {
            Draft: '草稿', Scheduled: '已安排 📅', Sending: '发送中 🚀',
            Completed: '已完成 ✅', Failed: '发送失败 🔴', Cancelled: '已取消',
          },
        },
        scheduled_date: { label: '计划发送日期' },
        sent_date: { label: '实际发送日期' },
        total_recipients: { label: '总收件人数' },
        delivered: { label: '已送达' },
        bounced: { label: '已退回' },
        opened: { label: '已打开' },
        clicked: { label: '已点击' },
        unsubscribed: { label: '已退订' },
        open_rate: { label: '打开率', help: '已送达邮件的打开率' },
        click_rate: { label: '点击率', help: '已打开邮件的点击率' },
        bounce_rate: { label: '退回率', help: '邮件退回的百分比' },
        owner_id: { label: '负责人' },
      },
    },

    lead_nurture_program: {
      label: '线索培育计划',
      pluralLabel: '线索培育计划',
      fields: {
        name: { label: '计划名称' },
        description: { label: '描述' },
        status: {
          label: '状态',
          options: { Draft: '草稿', Active: '运行中 🟢', Paused: '已暂停 ⏸️', Completed: '已完成 ✅' },
        },
        target_audience: { label: '目标受众' },
        enrollment_criteria: { label: '注册条件', help: '自动注册的条件' },
        graduation_criteria: { label: '毕业条件', help: '线索从计划中毕业的条件' },
        enrolled_count: { label: '已注册人数' },
        graduated_count: { label: '已毕业人数' },
        conversion_rate: { label: '转化率', help: '注册到毕业的比率 (%)' },
        start_date: { label: '开始日期' },
        end_date: { label: '结束日期' },
        owner_id: { label: '负责人' },
      },
    },

    touchpoint: {
      label: '触点',
      pluralLabel: '触点',
      fields: {
        contact_id: { label: '联系人' },
        lead_id: { label: '线索' },
        campaign_id: { label: '营销活动' },
        channel: {
          label: '渠道',
          options: {
            Email: '邮件', Web: '网站', Social: '社交媒体', Event: '活动',
            Phone: '电话', Chat: '在线聊天', 'Direct Mail': '直邮',
          },
        },
        type: {
          label: '触点类型',
          options: { 'First Touch': '首次触达', 'Last Touch': '末次触达', Influencer: '影响触点', Converter: '转化触点' },
        },
        timestamp: { label: '时间戳' },
        source: { label: '来源' },
        medium: { label: '媒介' },
        content: { label: '内容' },
        revenue_attribution: { label: '收入归因', help: '归因到此触点的收入' },
        attribution_weight: { label: '归因权重', help: '归因模型中分配的权重 (0–1)' },
      },
    },

    journey: {
      label: '客户旅程',
      pluralLabel: '客户旅程',
      fields: {
        name: { label: '旅程名称' },
        description: { label: '描述' },
        status: {
          label: '状态',
          options: { Draft: '草稿', Active: '运行中 🟢', Paused: '已暂停 ⏸️', Completed: '已完成 ✅', Archived: '已归档' },
        },
        type: {
          label: '旅程类型',
          options: {
            Onboarding: '新手引导', Nurture: '线索培育', 'Re-engagement': '再激活',
            Upsell: '追加销售', 'Cross-sell': '交叉销售', Retention: '客户留存', Custom: '自定义',
          },
        },
        entry_criteria: { label: '进入条件', help: '联系人进入旅程的条件' },
        exit_criteria: { label: '退出条件', help: '联系人退出旅程的条件' },
        active_contacts: { label: '活跃联系人' },
        completed_contacts: { label: '已完成联系人' },
        conversion_rate: { label: '转化率', help: '进入到完成的转化率 (%)' },
        start_date: { label: '开始日期' },
        end_date: { label: '结束日期' },
        owner_id: { label: '负责人' },
      },
    },

    journey_step: {
      label: '旅程步骤',
      pluralLabel: '旅程步骤',
      fields: {
        journey_id: { label: '客户旅程' },
        name: { label: '步骤名称' },
        type: {
          label: '步骤类型',
          options: { Email: '邮件', Wait: '等待 ⏳', Decision: '判断 🔀', Action: '动作 ⚡', Split: '分流', Goal: '目标 🎯' },
        },
        order_index: { label: '排序' },
        wait_duration: { label: '等待时长' },
        wait_unit: {
          label: '等待单位',
          options: { Minutes: '分钟', Hours: '小时', Days: '天', Weeks: '周' },
        },
        email_template_id: { label: '邮件模板' },
        condition: { label: '条件' },
        action_type: { label: '动作类型' },
        reached_count: { label: '到达人数' },
        completed_count: { label: '完成人数' },
      },
    },

    ab_test: {
      label: 'A/B 测试',
      pluralLabel: 'A/B 测试',
      fields: {
        name: { label: '测试名称' },
        description: { label: '描述' },
        status: {
          label: '状态',
          options: { Draft: '草稿', Running: '运行中 🔬', Completed: '已完成 ✅', Cancelled: '已取消' },
        },
        test_type: {
          label: '测试类型',
          options: {
            'Subject Line': '邮件主题', 'Email Content': '邮件内容',
            'Send Time': '发送时间', 'Landing Page': '着陆页', CTA: '行动号召',
          },
        },
        campaign_id: { label: '营销活动' },
        winning_criteria: {
          label: '获胜标准',
          options: { 'Open Rate': '打开率', 'Click Rate': '点击率', 'Conversion Rate': '转化率', Revenue: '收入' },
        },
        sample_size_percentage: { label: '样本量', help: '用于测试的受众百分比' },
        confidence_level: { label: '置信水平', help: '统计显著性阈值 (%)' },
        start_date: { label: '开始日期' },
        end_date: { label: '结束日期' },
        winner_variant_id: { label: '获胜变体' },
        statistical_significance: { label: '统计显著性', help: '结果是否具有统计显著性' },
        owner_id: { label: '负责人' },
      },
    },

    ab_test_variant: {
      label: 'A/B 测试变体',
      pluralLabel: 'A/B 测试变体',
      fields: {
        ab_test_id: { label: 'A/B 测试' },
        name: { label: '变体名称' },
        description: { label: '描述' },
        variant_label: {
          label: '变体标签',
          options: { A: 'A', B: 'B', C: 'C', D: 'D' },
        },
        traffic_percentage: { label: '流量百分比', help: '分配给此变体的流量百分比' },
        email_template_id: { label: '邮件模板' },
        subject_line: { label: '邮件主题' },
        send_time: { label: '发送时间' },
        recipients: { label: '收件人数' },
        opens: { label: '打开数' },
        clicks: { label: '点击数' },
        conversions: { label: '转化数' },
        open_rate: { label: '打开率' },
        click_rate: { label: '点击率' },
        conversion_rate: { label: '转化率' },
        is_winner: { label: '是否获胜' },
      },
    },
  },

  apps: {
    marketing: {
      label: '营销云',
      description: '营销自动化、活动管理与客户互动',
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
    'common.import': '导入',
    'common.back': '返回',
    'common.confirm': '确认',
    'common.refresh': '刷新',
    'nav.campaigns': '营销活动',
    'nav.marketing_automation': '营销自动化',
    'nav.journey_and_testing': '旅程与测试',
    'nav.views_dashboards': '视图与仪表盘',
    'nav.campaign_timeline': '活动时间线',
    'nav.marketing_dashboard': '营销仪表盘',
    'success.saved': '记录保存成功',
    'success.deleted': '记录删除成功',
    'success.campaign_launched': '营销活动启动成功',
    'success.email_sent': '邮件发送成功',
    'success.email_scheduled': '邮件已安排发送',
    'success.workflow_activated': '工作流激活成功',
    'success.journey_published': '客户旅程发布成功',
    'success.test_started': 'A/B 测试启动成功',
    'confirm.delete': '确定要删除此记录吗？',
    'confirm.launch_campaign': '确定要启动此营销活动吗？',
    'confirm.send_email': '确定要立即发送此邮件吗？',
    'confirm.stop_workflow': '确定要停止此工作流吗？',
    'error.required': '此字段为必填项',
    'error.load_failed': '数据加载失败',
    'error.save_failed': '记录保存失败',
    'error.send_failed': '邮件发送失败',
    'error.no_recipients': '此次发送未找到收件人',
  },

  validationMessages: {
    campaign_dates_invalid: '结束日期必须晚于开始日期',
    budget_exceeded: '实际成本已超过预算',
    template_required_for_email: '邮件营销活动必须选择邮件模板',
    marketing_list_required: '发送前必须选择营销列表',
    sample_size_range: '样本量必须在 1% 到 50% 之间',
    confidence_level_range: '置信水平必须在 80% 到 99% 之间',
    journey_requires_steps: '旅程发布前至少需要一个步骤',
    workflow_requires_trigger: '工作流激活前必须配置触发器',
    variant_traffic_total: '所有变体的流量分配总和必须等于 100%',
    unsubscribe_cannot_resubscribe: '该联系人已退订，无法重新添加到营销列表',
  },
};
