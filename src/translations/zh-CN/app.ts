// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

/**
 * 简体中文 (zh-CN) — every translation namespace EXCEPT `objects`:
 * `apps`, `messages`, `dashboards`, `datasets`, `pages`.
 *
 * SPLIT AXIS (#1311): translation NAMESPACE first, then CRM DOMAIN FAMILY.
 * Everything that is not `objects` lives in `./app.ts`; `objects` — 69-78% of
 * every bundle — is one file per CRM domain family, and a detail object
 * follows its master. A new row goes in the file for ITS family, never in
 * whichever file is already open: that is how one file re-grows past the 70%
 * advisory band `pnpm hygiene` prints. Full rule and rationale:
 * `src/translations/zh-CN.ts`.
 *
 * A namespace `TranslationData` gains later lands here too, and the room is
 * measured: this file is the smaller half of the bundle, and the schema bounds
 * how many namespaces can ever arrive.
 */
export const appSurface: Omit<TranslationData, 'objects'> = {
  apps: {
    crm_enterprise: {
      label: 'HotCRM',
      description: '涵盖销售、服务和市场营销的客户关系管理系统',
      // Keyed by navigation-node `id` (a flat keyspace regardless of depth).
      navigation: {
        group_activity: { label: '活动' },
        nav_event: { label: '活动' },
        nav_activity_dashboard: { label: '销售活动' },
        nav_my_calendar: { label: '我的日历' },
        nav_home: { label: '首页' },

        group_sales: { label: '销售' },
        nav_lead: { label: '线索' },
        nav_account: { label: '客户' },
        nav_account_workbench: { label: '客户工作台' },
        nav_contact: { label: '联系人' },
        nav_opportunity: { label: '商机' },
        nav_quote: { label: '报价' },
        nav_contract: { label: '合同' },
        nav_product: { label: '产品' },
        nav_sales_dashboard: { label: '销售业绩' },

        group_work: { label: '我的工作' },
        nav_my_tasks: { label: '我的任务' },
        nav_my_deals: { label: '我的商机' },
        nav_my_leads: { label: '我的线索' },
        nav_my_cases: { label: '我的工单' },
        nav_approval_requests: { label: '待我审批' },

        group_marketing: { label: '市场营销' },
        nav_campaign: { label: '营销活动' },

        group_service: { label: '服务' },
        nav_case: { label: '工单' },
        nav_knowledge: { label: '知识库' },
        nav_service_dashboard: { label: '服务概览' },

        group_insights: { label: '数据洞察' },
        nav_crm_dashboard: { label: 'CRM 总览' },
        nav_forecast: { label: '销售预测' },
        nav_report_pipeline_coverage: { label: '管道覆盖率' },
        nav_report_lead_inflow: { label: '线索流入' },
        nav_report_sla: { label: 'SLA 达成' },
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
        pipeline_by_stage: { title: '阶段管道分布', description: '按阶段统计的进行中商机金额' },
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
        kb_deflection_rate: { title: '知识库转移率', description: '已关闭工单中由知识文章解决的占比' },
        kb_resolved_cases: { title: '知识库解决数', description: '已关联解决文章的已关闭工单' },
        closed_cases_total: { title: '已关闭工单', description: '转移率的分母' },
        top_resolving_articles: { title: '解决工单最多的文章', description: '按解决的已关闭工单数排名的知识文章' },
        open_cases_by_priority: { title: '按优先级统计未关闭工单', description: '未关闭工单及其 SLA 违约率，按优先级细分' },
      },
    },
  },
  // `title` / `subtitle` translate the page's `page:header`; `title` falls back
  // to `label` when omitted, so it is authored only where the two differ.
  // Header strings carrying `{field}` tokens keep the token spelling verbatim —
  // the console substitutes on the raw key, so a translated token resolves to
  // nothing and the header renders blank.
  datasets: {
    account_metrics: {
      label: '客户指标',
      description: '按行业与类型统计客户数量的语义层',
      dimensions: {
        industry: {
          label: '行业',
        },
        type: {
          label: '类型',
        },
        created_at: {
          label: '创建时间',
        },
      },
      measures: {
        account_count: {
          label: '客户数',
        },
        annual_revenue_sum: {
          label: '年营收',
        },
      },
    },
    case_metrics: {
      label: '工单指标',
      description: '统计工单数量、解决时长与 SLA 的语义层',
      dimensions: {
        created_date: {
          label: '创建时间',
        },
        origin: {
          label: '来源',
        },
        priority: {
          label: '优先级',
        },
        resolved_article: {
          label: '解决用知识文章',
        },
        status: {
          label: '状态',
        },
        type: {
          label: '类型',
        },
      },
      measures: {
        avg_resolution: {
          label: '平均解决时长（小时）',
        },
        avg_sla_violated: {
          label: 'SLA 违约率',
        },
        case_count: {
          label: '工单数',
        },
        closed_count: {
          label: '已关闭工单',
        },
        kb_deflection_rate: {
          label: '知识库自助解决率',
        },
        kb_resolved_count: {
          label: '知识库解决数',
        },
        sla_compliance_rate: {
          label: 'SLA 达标率',
        },
        sla_met_count: {
          label: 'SLA 达标工单',
        },
      },
    },
    contact_metrics: {
      label: '联系人指标',
      description: '统计联系人数量的语义层',
      measures: {
        contact_count: {
          label: '联系人数',
        },
      },
    },
    event_metrics: {
      label: '活动指标',
      description: '统计会议、通话与互动新近度的语义层',
      dimensions: {
        owner: {
          label: '负责人',
        },
        related_to_type: {
          label: '关联对象',
        },
        start_datetime: {
          label: '活动周',
        },
        status: {
          label: '状态',
        },
        type: {
          label: '活动类型',
        },
      },
      measures: {
        avg_minutes: {
          label: '平均时长',
        },
        event_count: {
          label: '活动数',
        },
        total_minutes: {
          label: '总分钟数',
        },
      },
    },
    forecast_metrics: {
      label: '销售预测指标',
      description: '按负责人统计配额、达成率与管道覆盖倍数的语义层',
      dimensions: {
        owner: {
          label: '负责人',
        },
        period: {
          label: '周期类型',
        },
        period_label: {
          label: '周期',
        },
        period_start: {
          label: '周期开始',
        },
      },
      measures: {
        attainment: {
          label: '达成率',
        },
        closed_sum: {
          label: '已成交',
        },
        commit_sum: {
          label: '承诺',
        },
        pipeline_sum: {
          label: '销售管道',
        },
        quota_sum: {
          label: '配额',
        },
      },
    },
    lead_metrics: {
      label: '线索指标',
      description: '统计线索数量的语义层',
      dimensions: {
        created_at: {
          label: '创建时间',
        },
        last_contacted_date: {
          label: '最近联系',
        },
        lead_source: {
          label: '来源',
        },
        status: {
          label: '状态',
        },
      },
      measures: {
        lead_count: {
          label: '线索数',
        },
      },
    },
    opportunity_metrics: {
      label: '商机指标',
      description: '统计销售管道数量与金额的语义层',
      dimensions: {
        account_industry: {
          label: '客户行业',
        },
        close_date: {
          label: '预计成交日',
        },
        close_quarter: {
          label: '成交季度',
        },
        forecast_category: {
          label: '预测类别',
        },
        lead_source: {
          label: '线索来源',
        },
        loss_reason: {
          label: '失单原因',
        },
        owner: {
          label: '负责人',
        },
        stage: {
          label: '阶段',
        },
        type: {
          label: '商机类型',
        },
        win_reason: {
          label: '赢单原因',
        },
      },
      measures: {
        avg_amount: {
          label: '平均单笔金额',
        },
        avg_probability: {
          label: '平均赢单概率',
        },
        decided_count: {
          label: '已定局商机',
        },
        lost_amount: {
          label: '失单金额',
        },
        lost_count: {
          label: '失单数',
        },
        opp_count: {
          label: '商机数',
        },
        total_amount: {
          label: '总金额',
        },
        win_rate: {
          label: '赢单率',
        },
        won_amount: {
          label: '赢单金额',
        },
        won_count: {
          label: '赢单数',
        },
      },
    },
    product_metrics: {
      label: '产品指标',
      description: '统计产品目录数量与标价的语义层',
      dimensions: {
        category: {
          label: '类别',
        },
      },
      measures: {
        list_price_sum: {
          label: '标价合计',
        },
        product_count: {
          label: '产品数',
        },
      },
    },
    task_metrics: {
      label: '任务指标',
      description: '统计任务工作量与完成情况的语义层',
      dimensions: {
        due_date: {
          label: '截止日期',
        },
        is_completed: {
          label: '已完成',
        },
        is_overdue: {
          label: '已逾期',
        },
        priority: {
          label: '优先级',
        },
        priority_rank: {
          label: '紧急度',
        },
        status: {
          label: '状态',
        },
        type: {
          label: '类型',
        },
      },
      measures: {
        avg_progress: {
          label: '平均进度',
        },
        task_count: {
          label: '任务数',
        },
      },
    },
  },
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
        lead_duplicate_alert: { label: '重复标记提醒' },
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
      subtitle: '欢迎回来',
      components: {
        kpi_revenue_won: {
          label: '赢单营收',
        },
        kpi_deals_won: {
          label: '赢单数',
        },
        kpi_pipeline_value: {
          label: '销售管道金额',
        },
        kpi_open_leads: {
          label: '开放线索',
        },
        home_upcoming_events: {
          label: '📅 即将开始 · 最近优先',
        },
        quick_create: { title: '快速创建', label: '快速创建' },
        key_metrics: { title: '关键绩效指标', label: '关键指标' },
        home_tabs: { label: '主页标签页' },
        ai_briefing: {
          title: '询问 AI 助手',
          description:
            '从页面右侧打开助手面板，询问"我今天应该关注什么？"——它可以实时查看您的销售管道、架构与客户信息。',
          label: 'AI 助手今日速览',
        },
        upcoming_events: { title: '即将开始的活动', label: '即将开始的活动' },
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
