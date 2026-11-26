// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';
import { CONTRACT_DRAFT_NODE_IDS } from '../../flows/_contract-draft';

/**
 * 简体中文 (zh-CN) — every translation namespace EXCEPT `objects`:
 * `apps`, `messages`, `dashboards`, `datasets`, `pages`, `flows`, `picklists`,
 * `reports`, `positions`, `permissions`.
 *
 * SPLIT AXIS (#1311): translation NAMESPACE first, then CRM DOMAIN FAMILY.
 * Everything that is not `objects` lives in `./app.ts`; `objects` — 69-78% of
 * every bundle — is one file per CRM domain family, and a detail object
 * follows its master. A new row goes in the file for ITS family, never in
 * whichever file is already open: that is how one file re-grows past the 70%
 * advisory band `pnpm hygiene` prints. Full rule and rationale:
 * `src/sales/translations/zh-CN.ts`.
 *
 * A namespace `TranslationData` gains later lands here too, and the room is
 * measured: this file is the smaller half of the bundle, and the schema bounds
 * how many namespaces can ever arrive.
 */
export const appSurface: Omit<TranslationData, 'objects'> = {
  apps: {
    crm_enterprise: {
      label: '销售',
      description: '面向销售团队的线索、客户、商机与报价',
      // Keyed by navigation-node `id` (a flat keyspace regardless of depth).
      navigation: {
        // The group and its Events item are two words, as in every other pack
        // (Activity / Events, Actividad / Eventos, 活動 / イベント). The item
        // keeps 活动: it is `crm_event`'s own label, the heading of the page it
        // opens. The group takes 互动, the word this pack already uses for the
        // interactions it gathers (`crm_event`'s description, the 互动历史
        // view, the Sales Activity tiles). #2060 item 13.
        group_activity: { label: '互动' },
        nav_event: { label: '活动' },
        nav_activity_dashboard: { label: '销售活动' },
        nav_my_calendar: { label: '我的日历' },
        nav_home: { label: '首页' },
        nav_sales_home: { label: '销售主页' },

        group_sales: { label: '销售' },
        group_collection_plan: { label: '回款计划' },
        nav_lead: { label: '线索' },
        nav_account: { label: '客户' },
        nav_contact: { label: '联系人' },
        nav_opportunity: { label: '商机' },
        nav_contract: { label: '合同' },
        nav_sales_order: { label: '订单' },
        nav_sales_dashboard: { label: '销售业绩' },

        group_work: { label: '我的工作' },
        nav_my_tasks: { label: '我的任务' },
        nav_my_deals: { label: '我的商机' },
        nav_my_leads: { label: '我的线索' },
        nav_approval_requests: { label: '待我审批' },

        group_insights: { label: '数据洞察' },
        nav_crm_dashboard: { label: 'CRM 总览' },
        nav_forecast: { label: '销售预测' },

        group_reports: { label: '报表' },
        nav_report_opportunities_by_stage: { label: '各阶段商机' },
        nav_report_won_by_owner: { label: '各负责人成交商机' },
        nav_report_pipeline_coverage: { label: '季度管道覆盖率' },
        nav_report_funnel_by_owner: { label: '各负责人商机漏斗' },
        nav_report_lead_inflow: { label: '每月线索跟进' },
        nav_report_accounts_by_industry: { label: '客户行业与类型' },
        nav_report_churn_signals: { label: '客户流失信号' },

        group_help: { label: '帮助' },
        nav_help_manual: { label: '使用手册' },
        nav_help_admin: { label: '管理员手册' },
      },
    },
    crm_service: {
      // The ids this package contributes into the Service app (#2417).
      navigation: {
        nav_account: { label: '客户' },
        nav_contact: { label: '联系人' },
        nav_my_tasks: { label: '我的任务' },
        nav_my_calendar: { label: '我的日历' },
        nav_report_churn_signals: { label: '客户流失信号' },
      },
    },
    crm_marketing: {
      // The ids this package contributes into the Marketing app (#2417).
      navigation: {
        nav_lead: { label: '线索' },
        nav_contact: { label: '联系人' },
        nav_account: { label: '客户' },
        nav_my_tasks: { label: '我的任务' },
        nav_report_lead_inflow: { label: '每月线索跟进' },
      },
    },
    crm_o2c: {
      // The ids this package contributes into the Order to Cash app (#2465).
      navigation: {
        nav_contract: { label: '合同' },
        nav_sales_order: { label: '订单' },
        nav_account: { label: '客户' },
        nav_my_tasks: { label: '我的任务' },
      },
    },
    crm_psa: {
      // The ids this package contributes into the Project Delivery app (#2316).
      navigation: {
        nav_account: { label: '客户' },
        nav_opportunity: { label: '商机' },
        nav_contract: { label: '合同' },
        nav_my_tasks: { label: '我的任务' },
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
        total_revenue: { title: '总收入（所选期间）', description: '所选期间内的已成交收入' },
        active_deals: { title: '进行中商机（所选期间）', description: '预计在所选期间内成交的进行中商机' },
        won_deals: { title: '赢单数（所选期间）', description: '所选期间内赢单的商机数' },
        avg_deal_size: { title: '平均订单金额（所选期间）', description: '所选期间内已成交商机的平均金额' },
        lead_source: { title: '线索来源', description: '按获客渠道统计的管道金额' },
        pipeline_by_stage: { title: '阶段管道分布', description: '按阶段统计的进行中商机金额' },
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
        total_pipeline_value: { title: '进行中管道（所选期间）', description: '预计在所选期间内成交的进行中商机金额合计' },
        closed_won_qtd: { title: '本季度已成交', description: '本季度已赢得的收入' },
        open_opportunities: { title: '进行中商机（所选期间）', description: '预计在所选期间内成交的进行中商机' },
        avg_deal_size: { title: '平均订单金额（本季度）', description: '本季度已成交商机的平均金额' },
        pipeline_by_stage: { title: '阶段管道分布', description: '按阶段统计的进行中商机金额' },
        pipeline_by_forecast_category: { title: '预测类别管道分布', description: '按预测类别统计的进行中管道金额' },
        lead_source_breakdown: { title: '线索来源分布', description: '按线索来源统计的管道金额' },
        open_pipeline_by_owner: { title: '按负责人统计进行中管道', description: '各销售负责人的进行中管道金额、商机数与平均赢单概率' },
        quota_attainment_by_rep: { title: '按销售代表统计配额达成', description: '各销售代表本季度配额、已成交收入与达成率。每晚的预测快照建好本季度记录、经理填好配额后才有数据' },
        pipeline_stage_by_source: { title: '阶段 × 线索来源', description: '按阶段和来源交叉统计进行中商机金额' },
        win_rate_12m: { title: '赢率（近 12 个月）', description: '近 12 个月已结单商机中赢单所占的比例' },
        won_deals_12m: { title: '赢单数（近 12 个月）', description: '赢率的分子' },
        lost_deals_12m: { title: '丢单数（近 12 个月）', description: '赢率分母的另一半' },
        win_rate_by_owner: { title: '按销售代表统计赢/丢单', description: '近 12 个月各销售代表的赢单数、丢单数与赢率' },
        win_rate_by_lead_source: { title: '按线索来源统计赢/丢单', description: '近 12 个月哪些来源带来的商机真正成交' },
        loss_reason_breakdown: { title: '丢单原因分析', description: '近 12 个月丢单按原因分布' },
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
          description: '客户记录上填写的行业；未填写行业的客户单独成组。',
        },
        type: {
          label: '类型',
          description: '客户的类型：潜在客户、正式客户、合作伙伴或前客户。',
        },
        created_at: {
          label: '创建时间',
          description: '客户记录在系统中创建的月份，不是该公司成为正式客户的日期。',
        },
      },
      measures: {
        account_count: {
          label: '客户数',
          description: '客户记录的数量，涵盖所有类型：潜在客户、正式客户、合作伙伴和前客户都算；只数正式客户需按类型分组。',
        },
        annual_revenue_sum: {
          label: '年营收',
          description: '客户记录上填写的年营收之和：反映客户公司自身的规模，而不是他们向我们购买的金额。',
        },
      },
    },
    contact_metrics: {
      label: '联系人指标',
      description: '统计联系人数量的语义层',
      measures: {
        contact_count: {
          label: '联系人数',
          description: '联系人记录的数量，即客户和合作伙伴公司里的人员；线索单独统计，不计入。',
        },
      },
    },
    event_metrics: {
      label: '活动指标',
      description: '统计会议、通话与互动新近度的语义层',
      dimensions: {
        owner: {
          label: '负责人',
          description: '活动的负责人。',
        },
        related_to_type: {
          label: '关联对象',
          description: '活动关联的记录类型：客户、联系人、商机、线索或工单。',
        },
        start_datetime: {
          label: '活动周',
          description: '活动开始时间所在的周；尚未发生的已计划活动落在未来的周里。',
        },
        status: {
          label: '状态',
          description: '活动是已计划、已举行、已取消还是客户未到；只有已举行表示真正发生了接触。',
        },
        type: {
          label: '活动类型',
          description: '活动的类型：会议、电话、演示、线上研讨会、上门拜访或其他。',
        },
      },
      measures: {
        avg_minutes: {
          label: '平均时长',
          description: '单个活动的平均时长（分钟），未筛选时涵盖所有状态。',
        },
        event_count: {
          label: '活动数',
          description: '活动的数量，涵盖所有状态：已计划、已举行、已取消和客户未到都算；只数真正发生的接触需筛选已举行。',
        },
        total_minutes: {
          label: '总分钟数',
          description: '当前范围内活动时长（分钟）之和，未筛选时涵盖所有状态；它是安排的时长，不是实际记录的工时。',
        },
      },
    },
    forecast_metrics: {
      label: '销售预测指标',
      description: '按负责人统计配额、达成率与管道覆盖倍数的语义层',
      dimensions: {
        owner: {
          label: '负责人',
          description: '预测记录所属的销售代表；每位负责人每个周期一条记录。',
        },
        period: {
          label: '周期类型',
          description: '预测记录覆盖的是一个月还是一个季度；需要选定一种，因为把月度和季度相加会把同一批商机算两遍。',
        },
        period_label: {
          label: '周期',
          description: '预测记录的周期名称，例如 Q3 2026 或 Aug 2026。',
        },
        period_start: {
          label: '周期开始',
          description: '预测周期的第一天，即某月或某季度的第一天。',
        },
      },
      measures: {
        attainment: {
          label: '达成率',
          description: '已成交除以配额，两者先求和再相除，所以大配额比小配额权重更大；没有配额时结果为空，而不是零。',
        },
        closed_sum: {
          label: '已成交',
          description: '预测记录上的已成交金额之和：负责人在该周期内已经赢下的金额；不含未结管道和失败商机。',
        },
        commit_sum: {
          label: '承诺',
          description: '预测记录上的承诺金额之和：预测类别为承诺的未结商机；不含最佳情况和管道类别的商机。',
        },
        pipeline_sum: {
          label: '销售管道',
          description: '预测记录上的管道金额之和：预计在该周期内成交、处于任一未结阶段的商机金额；不含成交和失败的商机。',
        },
        quota_sum: {
          label: '配额',
          description: '当前范围内预测记录上设定的配额之和，即销售目标；未设定配额的记录不计入；需固定一种周期类型，否则月度和季度会相加。',
        },
      },
    },
    lead_metrics: {
      label: '线索指标',
      description: '统计线索数量的语义层',
      dimensions: {
        created_at: {
          label: '创建时间',
          description: '线索记录在系统中创建的日期。',
        },
        last_contacted_date: {
          label: '最近联系',
          description: '最近一次联系该线索的月份；从未联系过的线索单独成组。',
        },
        lead_source: {
          label: '来源',
          description: '线索记录上填写的来源；未填写来源的线索单独成组。',
        },
        status: {
          label: '状态',
          description: '线索所处的状态：新建、已联系、已确认、未通过或已转化。',
        },
      },
      measures: {
        lead_count: {
          label: '线索数',
          description: '线索记录的数量，涵盖所有状态，包括已转化和未通过的线索；只数未结线索需按状态分组。',
        },
      },
    },
    opportunity_metrics: {
      label: '商机指标',
      description: '统计销售管道数量与金额的语义层',
      dimensions: {
        account_industry: {
          label: '客户行业',
          description: '商机所属客户的行业，取自客户记录；客户未填写行业的商机单独成组。',
        },
        close_date: {
          label: '预计成交日',
          description: '按自然月分组的预计成交日期：未结商机是预计成交的日期，已成交或失败的商机是关闭的日期；不是商机的创建日期。',
        },
        close_quarter: {
          label: '成交季度',
          description: '同一个预计成交日期按自然季度分组，用于逐季查看；不是财年日历。',
        },
        forecast_category: {
          label: '预测类别',
          description: '商机计入的预测类别：管道、最佳情况、承诺、已排除或已关闭。',
        },
        lead_source: {
          label: '线索来源',
          description: '商机记录上填写的来源；未填写来源的商机单独成组。',
        },
        loss_reason: {
          label: '丢单原因',
          description: '失败商机的丢单原因，在以失败关闭时填写；未结和成交的商机没有丢单原因。',
        },
        owner: {
          label: '负责人',
          description: '商机的负责人（销售代表）；结果显示人员名称，每个商机只计在当前负责人名下一次。',
        },
        stage: {
          label: '阶段',
          description: '商机在销售流程中所处的阶段，从寻找客户到成交或失败；除最后两个以外的阶段都是未结管道。',
        },
        type: {
          label: '商机类型',
          description: '商机是新业务，还是老客户的升级、续约或拓展。',
        },
        win_reason: {
          label: '赢单原因',
          description: '成交商机的赢单原因，在以成交关闭时填写；未结和失败的商机没有赢单原因。',
        },
      },
      measures: {
        avg_amount: {
          label: '平均单笔金额',
          description: '单个商机的平均金额，涵盖所有阶段，未结、成交和失败都算；未填写金额的商机不计入平均。',
        },
        avg_probability: {
          label: '平均赢单概率',
          description: '当前范围内商机成交概率 (%) 的平均值；成交概率随阶段变化，所以它反映商机推进到哪一步，而不是加权管道金额。',
        },
        decided_count: {
          label: '已结单商机',
          description: '已有结果的商机数量，即成交或失败；未结商机不计入。它是赢率的分母。',
        },
        lost_amount: {
          label: '丢单金额',
          description: '处于失败阶段的商机的金额之和；不含未结和成交的商机。',
        },
        lost_count: {
          label: '丢单数',
          description: '处于失败阶段的商机数量；未结和成交的商机不计入。',
        },
        opp_count: {
          label: '商机数',
          description: '商机数量，涵盖所有阶段：未结、成交和失败都算；只数成交的用赢单数（Won Deals）。',
        },
        total_amount: {
          label: '总金额',
          description: '所有阶段商机的金额之和，未结、成交和失败都算；按阶段筛选之前，它既不是未结管道，也不是赢单金额。',
        },
        win_rate: {
          label: '赢率',
          description: '赢单数除以已结单数，按商机个数而不是金额计算；未结商机不计入，所以管道再满也不会拉低它。',
        },
        won_amount: {
          label: '赢单金额',
          description: '处于成交阶段的商机的金额之和，即已签下的商机金额；不含未结和失败的商机，也不是客户的年营收或项目的计划收入。',
        },
        won_count: {
          label: '赢单数',
          description: '处于成交阶段的商机数量；未结和失败的商机不计入。',
        },
      },
    },
    task_metrics: {
      label: '任务指标',
      description: '统计任务工作量与完成情况的语义层',
      dimensions: {
        due_date: {
          label: '截止日期',
          description: '任务的截止日期；没有截止日期的任务单独成组。',
        },
        is_completed: {
          label: '已完成',
          description: '任务是否处于已完成状态；其他任何状态都算未完成。',
        },
        is_overdue: {
          label: '已逾期',
          description: '任务在最近一次保存时是否已过截止日期且未完成。',
        },
        priority: {
          label: '优先级',
          description: '任务上设定的优先级：低、普通、高或紧急。',
        },
        priority_rank: {
          label: '紧急度',
          description: '用于排序的优先级数值，低为 1，紧急为 4，没有优先级的任务为 0。',
        },
        status: {
          label: '状态',
          description: '任务所处的状态：未开始、进行中、等待中、已完成或已推迟。',
        },
        type: {
          label: '类型',
          description: '任务的类型：电话、邮件、会议、跟进、演示或其他。',
        },
      },
      measures: {
        avg_progress: {
          label: '平均进度',
          description: '当前范围内任务进度（%）的平均值，包括已完成的任务；从未设定进度的任务按 0% 计。',
        },
        task_count: {
          label: '任务数',
          description: '任务的数量，涵盖所有状态，包括已完成和已推迟的任务；只数未完成的工作需按是否完成分组。',
        },
      },
    },
  },
  pages: {
    // The contract's two record pages (#2317): its working page and its print page.
    contract_detail_page: {
      label: '合同详情',
      description: '合同的记录页：使用系统生成的布局，不覆盖任何插槽。',
    },
    contract_print_page: {
      label: '合同文档',
      description: '可打印的合同文档：签约方、期限、金额、计费、条款与签署栏。',
    },
    account_workbench: {
      label: '客户工作台',
      description: '面向销售团队的精选客户列表：仅提供快捷筛选，不含视图管理。',
    },
    sales_home_page: {
      label: '销售主页',
      description: '销售团队主页，汇总关键指标、我的待办工作与即将到来的活动',
      components: {
        kpi_revenue_won: {
          label: '总收入（全部期间）',
        },
        kpi_deals_won: {
          label: '赢单数（全部期间）',
        },
        kpi_pipeline_value: {
          label: '进行中管道（全部期间）',
        },
        kpi_open_leads: {
          label: '开放线索',
        },
        home_upcoming_events: {
          label: '📅 即将开始 · 最近优先',
        },
        key_metrics: { title: '关键绩效指标', label: '关键指标' },
        // `page:tabs` item labels, keyed by each item's `value` (#2284, spec 18.1.0,
        // `pages.PAGE.components.TABS.items.VALUE.label`).
        home_tabs: {
          label: '主页标签页',
          items: {
            my_leads: { label: '我的线索' },
            my_open_deals: { label: '我的进行中商机' },
            my_open_tasks: { label: '我的待办任务' },
          },
        },
        home_my_leads: { label: '我的线索' },
        home_my_deals: { label: '我的进行中商机' },
        home_my_tasks: { label: '我的待办任务' },
        upcoming_events: { title: '即将开始的活动', label: '即将开始的活动' },
      },
    },
  },
  // Screen-flow copy (#1210, #1975). Keyed `flows.<flow>.label`,
  // `screens.<node>.title` and `screens.<node>.fields.<field>.{label,placeholder}`
  // — the keys `os lint`'s `i18n/missing-flow` names, read by the console's
  // flow runner since @objectstack 17.7.0 (the spec's `flows` liveness row is
  // `live` there). A screen with no authored `title` is headed by its node
  // `label` (the executor's `config.title ?? node.label`, measured on
  // 18.0.0-next.0), so each `screens.<node>.title` translates that node label,
  // never the flow label: the dialog shows the flow label as its eyebrow above
  // the title, and the two differ on `lead_conversion`, `quote_generation` and
  // `campaign_enrollment` (#2096). Since
  // 18.0.0-next.0 three more surfaces are keys the engine reads in the run's
  // locale, and `i18n/missing-flow` names each missing one: a select field's
  // `options.<value>` (worded as the object field's own option in this pack),
  // an authored screen `description`, and a refusing `end` node's
  // `refusals.<node>.message`. A translated description or message is a text
  // slot like the one it translates, so a hole in it is `{{ }}`.
  flows: {
    // Draft Contract on an order (#2558). The drafted contract's provenance
    // sentence is TEXT in the organization's language (#2535), one per
    // variant of the draft (`../../flows/_contract-draft.ts`).
    sales_order_draft_contract: {
      label: '根据订单起草合同',
      refusals: {
        refuse_missing: { message: '这张订单已不存在，或你无权打开它。没有起草合同。' },
        refuse_cancelled: { message: '这张订单已取消。没有起草合同。' },
        refuse_has_contract: { message: '这张订单已关联合同。没有起草合同。' },
        refuse_no_contact: { message: '合同需要主要联系人：请先为订单填写联系人。没有起草合同。' },
      },
      screens: {
        result: {
          title: '合同已起草',
          description: '已根据订单 {{ orderRecord.order_number }} 起草一份合同草稿，并关联到这张订单。打开它，补全期限、日期和类型。',
          fields: { contractLink: { label: '合同' } },
        },
      },
    },
    sales_order_draft_contract_write: {
      label: '根据订单起草合同（写入）',
      records: Object.fromEntries(CONTRACT_DRAFT_NODE_IDS.map((node) => [node, {
        fields: { description: '根据订单{{ order }}起草' },
      }])),
    },
    // What the sweeps store in a record (#2522, #2535), at
    // `flows.<flow>.records.<node>.fields.<field>`, holes as the source spells them.
    contract_renewal: {
      records: {
        create_renewal_task: { fields: { subject: '续约到期：合同{{ currentContract.contract_number }}' } },
        create_renewal_opp: { fields: { name: '续约 — {{ currentContract.contract_number }}', next_step: '与客户确认续约条款' } },
      },
    },
    opportunity_stagnation: {
      records: {
        create_followup_task: { fields: { subject: '推进停滞商机：{{ currentOpp.name | truncate:200 }}' } },
        create_private_followup_task: { fields: { subject: '推进停滞商机（私密商机）' } },
      },
    },
    // Approval flows (#2060 item 13, C-15): the flow's own `label`, and each
    // `approval` node's step label under `approvals.<node>.label` (spec 18.1.0),
    // the step name the approval request shows the submitter and the approvers.
    account_approval: {
      label: '客户审批',
      approvals: {
        account_review: { label: '客户审核' },
      },
    },
    lead_conversion_approval: {
      label: '线索转化审批',
      approvals: {
        conversion_review: { label: '线索转化审核' },
      },
    },
    opportunity_approval: {
      label: '大额商机审批',
      approvals: {
        manager_review: { label: '销售经理审核' },
        director_signoff: { label: '销售总监签批' },
      },
    },
    opportunity_approval_on_create: {
      label: '大额商机审批（创建时）',
      approvals: {
        manager_review: { label: '销售经理审核' },
        director_signoff: { label: '销售总监签批' },
      },
    },
    opportunity_qualification_approval: {
      label: '商机立项审批',
      approvals: {
        qualification_review: { label: '立项审核' },
      },
    },
    opportunity_status_change_approval: {
      label: '商机状态变更审批',
      approvals: {
        status_review: { label: '状态变更审核' },
      },
    },
    lead_conversion: {
      label: '线索转化流程',
      screens: {
        screen_1: {
          title: '转化详情',
          // Three notices, every word translated here: the duplicate note
          // (#2571; its hole holds a space on a clean lead, so `default:`
          // prints the note only on a suspected one), then the account and
          // the contact (#2073 item 8, #2572). In each two-hole pair exactly
          // one hole holds a name and each `default:` is the OTHER branch's
          // words. Keep every hole, in this order, with a `default:` each
          // (see `screen_1` in `lead-conversion.flow.ts`).
          description: '{{ duplicateWarning | default:"疑似重复：录入时系统发现这条线索与一条已有记录的邮箱相同。继续之前，请到线索页面比对关联的那条记录。" }} {{ existingAccountName | default:"没有你能查看的客户与该线索的公司匹配，因此转化会新建一个客户，名称为 " }}{{ newAccountName | default:" 是该线索将加入的现有客户" }}。{{ existingContactName | default:"没有你能查看的联系人使用这条线索的邮箱，因此转化会新建一个联系人，名称为 " }}{{ newContactName | default:" 是使用这条线索邮箱的现有联系人：转化会把这条线索并入该联系人，只补填它空着的「电话」「手机」和「职位」" }}。',
          fields: {
            createOpportunity: { label: '是否创建商机？' },
            opportunityName: { label: '商机名称' },
            opportunityAmount: { label: '商机金额' },
            closeDate: { label: '预计成交日期' },
          },
        },
        // The result screen (#2297). Same two-hole shape as `screen_1`: exactly
        // one hole holds the account's name, and each `default:` is the OTHER
        // state's words. Keep both holes, in this order, with a `default:` each
        // (see `result` in `lead-conversion.flow.ts`).
        confirm_contact: {
          title: '确认联系人',
          description: '这条线索是 {{ leadPersonName }}，但使用同一邮箱的联系人是 {{ existingContactName }}。联系人的邮箱不能重复，所以转化会把这条线索并入该联系人；只补填它空着的「电话」「手机」和「职位」，其他内容不变。如果这是两个不同的人，请取消，先修改线索的邮箱。',
          fields: {
            matchedContactLink: { label: '现有联系人' },
            reuseContactConfirmed: { label: '把这条线索转化到这个联系人' },
          },
        },
        result: {
          title: '线索已转化',
          description: '{{ pendingApprovalAccountName | default:"线索已转入客户：" }}{{ noApprovalAccountName | default:" 正在等待销售经理的客户审批" }}。',
          fields: {
            accountLink: { label: '客户' },
            contactLink: { label: '联系人' },
            opportunityLink: { label: '商机' },
          },
        },
      },
      refusals: {
        refuse_confirmed_duplicate: {
          message:
            '转化被拒绝。该线索的「重复状态」为「已确认重复」：审核人已将其与现有记录比对，并记录为重复。转化会为同一买家再创建一个客户、联系人和商机。本线索的「重复线索管理」部分列出了保留的记录；请改为以重复为由将此线索设为「未通过」。只有审核人修改该结论后才能重新转化。',
        },
        refuse_unapproved: {
          message:
            '转化被拒绝。该线索尚未获准转化。必须由审批人批准后，才能转化为客户、联系人和商机；线索上的「转化审批」字段显示该决定仍在待审批还是已被驳回。在此期间请继续跟进该线索——它的任何内容都没有被冻结。',
        },
        refuse_no_match_key: {
          message:
            '转化被拒绝。该线索的公司没有匹配键，因此转化无法判断它属于哪个客户，也不会去猜测：猜测可能会把联系人和商机归到另一个客户名下。保存线索的「公司」会重新生成匹配键，请重新保存后再转化。尚未创建任何记录。',
        },
        refuse_contact_not_confirmed: {
          message:
            '未转化：你没有确认把这条线索并入使用同一邮箱的现有联系人。没有创建任何记录。如果这是两个不同的人，请修改线索的邮箱后重新转化。',
        },
        refuse_nonpositive_amount: {
          message:
            '转化被拒绝：商机金额必须大于零。尚未创建任何内容。请填写这笔交易的金额后重新转化该线索，或不勾选「是否创建商机？」，以不创建商机的方式转化。',
        },
      },
    },
    schedule_followup: {
      label: '安排跟进',
      screens: {
        screen_1: {
          title: '安排跟进',
          fields: {
            subject: { label: '下一步做什么？' },
            dueDate: { label: '截止日期' },
            activityType: {
              label: '活动类型',
              options: { call: '电话', email: '邮件', meeting: '会议', follow_up: '跟进', demo: '演示', other: '其他' },
            },
            priority: { label: '优先级', options: { low: '低', normal: '普通', high: '高', urgent: '紧急' } },
            notes: { label: '备注' },
          },
        },
      },
    },
  },
  // Shared option lists (`src/<pkg>/picklists/*.picklist.ts`), translated ONCE:
  // every field that references a list (`Field.select({ picklist })`) inherits
  // these option labels, so a field-level `options` entry exists only for a
  // field with inline options of its own.
  picklists: {
    salutation: {
      label: '称谓',
      options: { mr: '先生', ms: '女士', mrs: '夫人', dr: '博士', prof: '教授' },
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
    lead_source: {
      label: '线索来源',
      options: {
        web: '网站', referral: '推荐', event: '活动 / 展会',
        webinar: '线上研讨会', partner: '合作伙伴', advertisement: '广告',
        paid_search: '付费搜索', social: '社交媒体', content: '内容 / 博客',
        cold_call: '陌生拜访', email_campaign: '邮件营销', other: '其他',
      },
    },
    payment_terms: {
      label: '付款条款',
      options: {
        net_15: '15 天账期', net_30: '30 天账期', net_60: '60 天账期',
        net_90: '90 天账期', due_on_receipt: '货到付款',
      },
    },
    related_to_type: {
      label: '关联对象类型',
      options: {
        crm_account: '客户', crm_contact: '联系人', crm_opportunity: '商机',
        crm_lead: '线索', crm_case: '工单',
      },
    },
  },
  // Report index and report page headings (`reports[].label` / `description`).
  reports: {
    accounts_by_industry_type: {
      label: '客户行业与类型',
      description: '按行业和类型交叉统计客户的矩阵报表',
    },
    customer_churn_signals: {
      label: '客户流失信号',
      description: '四个堆叠的预警面板，用于主动挽留客户：客户成功经理标记为有风险或正在流失的客户、近期没有活动的活跃客户、沉寂的高价值客户，以及最近丢单的商机。',
      // Joined-report block headings (translatable since @objectstack/spec 18.3.0).
      blocks: {
        csm_flagged_accounts: {
          label: '客户成功经理标记的客户',
          description: '客户成功经理手动标记为有风险或正在流失的客户，按类型分组——基于人的判断，与活动时钟无关。',
        },
        at_risk_accounts: {
          label: '有风险的客户',
          description: '60 天以上没有活动的活跃客户，按行业分组。',
        },
        silent_high_value: {
          label: '沉寂的高价值客户',
          description: '90 天以上没有动静的战略客户和企业客户，按类型分组。',
        },
        recently_closed_lost: {
          label: '最近丢单的商机',
          description: '最近 30 天内丢单的商机——在客户彻底流失之前查明原因。',
        },
      },
    },
    lead_inflow_by_month_source: {
      label: '每月线索跟进',
      description: '每月已联系线索的数量，按获客渠道细分',
    },
    opportunities_by_stage: {
      label: '各阶段商机',
      description: '按阶段分组汇总商机',
    },
    opportunity_funnel_owner_stage: {
      label: '各负责人商机漏斗',
      description: '每位销售代表逐阶段的管道漏斗',
    },
    pipeline_coverage_by_quarter: {
      label: '季度管道覆盖率',
      description: '按预测类别统计进行中的管道金额，并按预计成交季度分段',
    },
    won_opportunities_by_owner: {
      label: '各负责人成交商机',
      description: '按负责人分组的已成交商机',
    },
  },
  // Setup → Position Holders (`src/sales/sharing/positions.ts`).
  positions: {
    crm_executive: {
      label: '高管',
      description: '公司管理层：可查看销售经理能查看的一切，记录仍归原团队负责，只能创建和编辑自己的商机。',
    },
    crm_sales_director: {
      label: '销售总监',
      description: '领导销售组织，对最大的商机做最终签批，可查看销售经理能查看的一切，只能编辑自己的商机。',
    },
    crm_sales_manager: {
      label: '销售经理',
      description: '管理销售团队：审批新客户、线索转化和大额商机，并可编辑每一个活跃客户。',
    },
    crm_sales_rep: {
      label: '销售代表',
      description: '日常跟进线索和商机，并从「线索受理」队列接收新线索。',
    },
    crm_service_director: {
      label: '服务总监',
      description: '统管客户服务，在服务经理处理期间可查看每一个未关闭的严重工单。',
    },
    crm_service_manager: {
      label: '服务经理',
      description: '负责升级处理池：升级的工单会交给此岗位，可编辑每一个未关闭的严重工单。',
    },
    crm_service_agent: {
      label: '客服专员',
      description: '处理客户工单，从「支持受理」队列接收新工单，并认领仍在队列中等候的工单。',
    },
    crm_marketing_director: {
      label: '市场总监',
      description: '领导市场营销，可编辑每一个进行中的营销活动，无论负责人是谁。',
    },
    crm_marketing_manager: {
      label: '市场经理',
      description: '管理营销活动，可编辑每一个进行中的营销活动，无论负责人是谁。',
    },
    crm_marketing_user: {
      label: '市场专员',
      description: '日常策划和执行营销活动及其成员。',
    },
    crm_ar_accountant: {
      label: '应收会计',
      description: '财务：录入和导入销售在每份合同上看到的发票与回款。',
    },
    crm_project_director: {
      label: '项目总监',
      description: '领导项目交付：负责项目，并可查看每个项目、工时单和费用及其成本与毛利。',
    },
    crm_pmo: {
      label: '项目管理办公室',
      description: '项目管理办公室：查看每个项目的成本与毛利，维护费率卡，并负责项目。',
    },
    crm_project_manager: {
      label: '项目经理',
      description: '立项并负责项目，按费率卡安排人员，审批团队的工时单和费用。',
    },
    crm_project_member: {
      label: '项目成员',
      description: '投入项目的顾问：在自己参与的项目上填报工时和费用。',
    },
    crm_finance_controller: {
      label: '财务控制',
      description: '财务：关注项目成本与毛利，设定项目预算，维护费率卡。',
    },
    crm_na_sales_team: {
      label: '北美销售团队',
      description: '北美区域团队：可编辑北美区域内的每一个客户。',
    },
    crm_eu_sales_team: {
      label: '欧洲销售团队',
      description: '欧洲区域团队：可编辑欧洲（EMEA）区域内的每一个客户。',
    },
  },
  // Studio → All Metadata Types → Permission Set (`src/sales/profiles/*.profile.ts`).
  permissions: {
    finance_controller: {
      label: '财务控制',
      description: '财务：查看每个项目及其人员、工时和费用，编辑项目预算，维护费率卡。',
    },
    project_manager: {
      label: '项目经理',
      description: '交付：立项并负责项目，按费率卡安排人员，填报工时和费用，可查看每个客户、商机和合同。',
    },
    project_member: {
      label: '项目成员',
      description: '交付：查看自己参与的项目，填报自己的工时单和费用，看不到成本单价。',
    },
    ar_accountant: {
      label: '应收会计',
      description: '财务：录入和导入每份合同的发票与回款，可查看其背后的合同、客户和回款计划。',
    },
    crm_user: {
      label: 'CRM 用户',
      description: '每位成员的默认权限：自己的线索、客户、商机和活动，以及只读的目录数据；没有删除、导出、查看全部或任何系统权限。',
    },
    guest_portal: {
      label: '访客（公开表单）',
      description: '公开的网页转线索和网页转工单表单的匿名访客：只能提交新线索或新工单，不能查看、编辑或删除任何记录。',
    },
    marketing_user: {
      label: '市场专员',
      description: '市场人员：管理营销活动及其成员，可查看所有线索、联系人、客户和商机用于圈定目标，但看不到工单，也不能删除任何 CRM 记录。',
    },
    sales_manager: {
      label: '销售经理',
      description: '销售经理：可查看、编辑、重新分配和删除每位销售代表的线索、客户、商机、报价单和活动，但没有系统管理权限。',
    },
    sales_rep: {
      label: '销售代表',
      description: '销售代表：经营自己名下的线索、客户、商机、报价单和活动，可查看目录数据，但不能删除任何客户记录。',
    },
    service_agent: {
      label: '客服专员',
      description: '客服专员和服务经理：处理自己的工单，可查看工单背后的客户、联系人和线索并撰写知识文章，但看不到商机。',
    },
    sales_leadership: {
      label: '销售管理层',
      description: '高管和销售总监：可查看销售经理能查看的所有记录，不能修改不属于自己的记录，可创建和编辑自己的商机（含金额）。',
    },
    service_director: {
      label: '服务总监',
      description: '服务管理层，只读：查看共享给服务总监的升级工单，以及工单背后的客户和联系人。',
    },
    system_admin: {
      label: '系统管理员',
      description: '单组织部署的运营者：完全控制每一条业务记录，并负责用户、安全模型和系统设置的管理。',
    },
  },
  // Doc book titles and group headings (translatable since @objectstack/spec 18.3.0).
  books: {
    crm_manual: {
      label: 'HotCRM 使用手册',
      description: 'HotCRM 在销售中如何运作：界面背后的规则。',
      groups: {
        start: { label: '入门' },
        sales: { label: '销售' },
        analytics: { label: '分析' },
      },
    },
    crm_admin_manual: {
      label: 'HotCRM 管理员手册',
      description: '上线、权限、每一个自动化阈值和数据导入——面向管理员。',
      groups: {
        admin: { label: '管理' },
      },
    },
  },
  // An import mapping's label, as the import wizard offers it (a key
  // since 18.6.0; before it the wizard showed the English text in every locale).
  mappings: {
    crm_account_import: { label: '客户导入（CSV）' },
    crm_contact_import: { label: '联系人导入（CSV）' },
    crm_lead_import: { label: '线索导入（CSV）' },
  },
};
