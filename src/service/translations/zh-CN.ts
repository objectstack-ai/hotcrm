// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

import { activityActions } from '../../sales/translations/zh-CN/_shared';

/**
 * 简体中文 (zh-CN) — the support module's own translations: every row whose
 * target this package registers. Why they live here and not in the app
 * package's pack: `./index.ts`.
 */
export const zhCN: TranslationData = {
  objects: {
    crm_knowledge_article: {
      _validations: {
        published_requires_body: {
          message: '没有正文的文章无法发布。',
        },
        published_requires_summary: {
          message: '已发布的文章应填写摘要，供搜索结果与 AI 引用使用。',
        },
      },
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
        related_to_case: { label: '来源工单', help: '本文所依据的工单（可选）。' },
        published_at: { label: '发布时间' },
        last_reviewed_at: { label: '最近复核' },
        helpful_count: { label: '有用', help: '由 crm_article_feedback 重新统计得出，不可手工填写。' },
        not_helpful_count: { label: '没用', help: '由 crm_article_feedback 重新统计得出，不可手工填写。' },
        display_title: { label: '显示名称' },
      },
      _views: {
        all_articles: { label: '全部文章' },
        published_articles: { label: '已发布' },
        my_drafts: { label: '我的草稿' },
      },
      _sections: {
        basic: { label: '文章信息' },
        content: { label: '内容' },
        taxonomy: { label: '分类' },
        metrics: { label: '互动数据' },
        engagement: { label: '互动数据' },
        // knowledge_article.view.ts 表单区块名称 (#1100)
        article: { label: '文章' },
      },
      _actions: {
        mark_article_helpful: {
          label: '有用',
          successMessage: '已记录为「有用」，谢谢反馈。',
        },
        mark_article_not_helpful: {
          label: '没用',
          successMessage: '已记录为「没用」，谢谢反馈。',
        },
      },
    },
    crm_case: {
      _validations: {
        resolution_required_for_closed: {
          message: '关闭工单时必须填写解决方案',
        },
        escalation_reason_required: {
          message: '升级工单时必须填写升级原因',
        },
        case_status_progression: {
          message: '无效的状态流转',
        },
      },
      label: '工单',
      pluralLabel: '工单',
      description: '客户支持工单与服务请求',
      fields: {
        case_number: { label: '工单编号' },
        subject: { label: '主题' },
        description: { label: '描述' },
        crm_account: { label: '所属客户' },
        crm_contact: { label: '联系人' },
        supplied_name: { label: '提交人姓名', help: '提出工单的人所填写的姓名，按原样保存。未经核实，也未关联任何联系人。' },
        supplied_email: { label: '提交人邮箱', help: '提出工单的人所填写的回复邮箱，按原样保存。未经核实，也未关联任何联系人。' },
        status: {
          label: '状态',
          options: {
            new: '新建', in_progress: '处理中',
            waiting_customer: '等待客户回复', waiting_support: '等待支持回复',
            escalated: '已升级', resolved: '已解决', closed: '已关闭',
          },
        },
        priority: {
          // `critical` MUST NOT render 紧急 — that word belongs to
          // `crm_task.priority.urgent`, and the two vocabularies are different
          // sets (case: low/medium/high/critical · task: low/normal/high/urgent).
          // When both rendered 紧急 the screen showed one word for two values the
          // model treats as distinct, which is how a case value ends up in a task
          // predicate (`src/sales/views/task.view.ts` carries the tombstone of that
          // crossing). Maintainer ruling 2026-08-31, #1342: case `critical` is
          // 严重, task `urgent` keeps 紧急. en/es-ES/ja-JP already separate them
          // (Critical/Urgent · Crítica/Urgente · 重大/緊急); zh-CN was the outlier.
          label: '优先级',
          options: { low: '低', medium: '中', high: '高', critical: '严重' },
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
        closed_date: { label: '关闭日期' },
        first_response_date: { label: '首次响应日期' },
        resolution_time_hours: { label: '解决耗时（小时）' },
        sla_due_date: { label: 'SLA 到期', help: '按工单优先级与所属客户的客户分层设定，以日历小时计：夜间、周末与节假日都计入。' },
        is_sla_violated: { label: 'SLA 违反' },
        is_escalated: { label: '已升级' },
        escalation_reason: { label: '升级原因' },
        resolution: { label: '解决方案' },
        resolved_by_article: { label: '解决该工单的知识文章', help: '解决此工单的知识库文章 —— 转移率的统计口径。' },
        internal_notes: { label: '内部备注', help: '内部备注，客户不可见' },
        is_closed: { label: '是否关闭' },
        display_title: { label: '显示名称' },
        priority_rank: { label: '优先级排序' },
        escalated_date: { label: '升级日期' },
        escalated_from: { label: '升级前负责人' },
      },
      _views: {
        // The public Web-to-Case form's heading (#2284), as `web_to_lead`.
        web_to_case: { title: '联系支持团队' },
        all_cases: { label: '全部工单' },
        case_workflow: { label: '服务流转' },
        sla_calendar: { label: 'SLA 日历' },
        case_timeline: { label: '工单时间线' },
        unassigned_triage: {
          label: '未分派 — 待分诊',
          emptyState: {
            title: '没有待分诊的工单',
            message: '所有工单都有负责人。当工单到达时没有负责人，就会出现在这里 —— 通常是在无人担任「客服专员」职位期间提交的网页转工单。',
          },
        },
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
        claim_case: {
          label: '认领工单',
          successMessage: '工单已认领，现在归你负责。',
        },
      },
      _sections: {
        // case.view.ts 表单区块名称 (#1100)。
        case: { label: '工单' },
        how_can_we_help: {
          label: '我们能帮您什么？',
          fields: {
            subject: { placeholder: '问题的简要概述' },
            description: { placeholder: '复现步骤、错误信息、截图……' },
            type: { helpText: '请选择最符合您问题的选项。' },
            priority: { helpText: '严重问题请同时致电报告。' },
          },
        },
        // Object-level section keys (case.object.ts), used by record forms and
        // by the detail page, whose sections reference these groups (#970)
        basic: { label: '工单信息' },
        origin: { label: '来源与路由' },
        sla: { label: 'SLA 与优先级' },
        resolution: { label: '解决方案' },
        escalation: { label: '升级' },
        system: { label: '系统' },
      },
    },
    crm_article_feedback: {
      label: '文章反馈',
      pluralLabel: '文章反馈',
      description: '读者对某篇知识文章的「有用 / 没用」评价',
      fields: {
        feedback_number: { label: '反馈编号' },
        owner_id: { label: '读者' },
        crm_knowledge_article: { label: '文章', help: '本条反馈针对的知识文章。' },
        verdict: {
          label: '评价',
          options: { helpful: '有用', not_helpful: '没用' },
        },
        comment: { label: '备注', help: '可选说明，作者可见。' },
      },
      _sections: {
        basic: { label: '反馈' },
      },
    },
  },
  apps: {
    crm_enterprise: {
      navigation: {
        nav_service_dashboard: { label: '服务概览' },
        nav_case: { label: '工单' },
        nav_knowledge: { label: '知识库' },
        nav_my_cases: { label: '我的工单' },
        nav_report_cases_by_status: { label: '工单状态与优先级' },
        nav_report_sla: { label: 'SLA 达成' },
        nav_report_cases_opened_by_day: { label: '每日新建工单' },
      },
    },
  },
  dashboards: {
    service_dashboard: {
      label: '客户服务',
      description: '工单负载、SLA 健康度与处理绩效',
      widgets: {
        open_cases: { title: '未关闭工单', description: '尚未关闭的工单' },
        critical_cases: { title: '严重工单', description: '标记为严重优先级的未关闭工单' },
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
        my_open_cases_by_priority: { title: '我的未关闭工单（按优先级）', description: '你的未关闭工单及其 SLA 违约率，按优先级细分' },
      },
    },
  },
  datasets: {
    case_metrics: {
      label: '工单指标',
      description: '统计工单数量、解决时长与 SLA 的语义层',
      dimensions: {
        created_at: {
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
  },
  pages: {
    case_detail_page: {
      label: '工单详情',
      description: '客服工单记录页：关键信息、SLA 进度、明细与活动时间线。',
      title: '{case_number} · {subject}',
      subtitle: '{crm_account}',
      components: {
        case_highlights: { label: '关键信息' },
        case_status_path: { label: '工单状态进度' },
        case_details: { label: '工单明细' },
        // `page:tabs` item labels, keyed by each item's `value` (spec 18.1.0,
        // `pages.PAGE.components.TABS.items.VALUE.label`).
        case_main_tabs: { items: { details: { label: '明细' }, related: { label: '相关' }, activity: { label: '互动' } } },
      },
    },
  },
  flows: {
    escalate_case: {
      label: '升级工单',
      screens: { screen_1: { title: '升级工单', fields: { reason: { label: '升级原因' } } } },
    },
    close_case: {
      label: '关闭工单',
      screens: {
        screen_1: {
          title: '关闭工单',
          fields: {
            resolution: { label: '解决方案' },
            resolved_by_article: { label: '通过知识文章解决（可选）' },
          },
        },
      },
    },
    claim_case: {
      label: '认领工单',
      screens: {
        screen_1: {
          title: '认领工单',
          fields: {
            claimStatus: {
              label: '处理状态',
              options: { in_progress: '处理中', waiting_customer: '等待客户回复', waiting_support: '等待支持回复' },
            },
          },
        },
      },
    },
  },
  reports: {
    cases_by_status_priority: {
      label: '工单状态与优先级',
      description: '按状态和优先级汇总工单',
    },
    sla_performance: {
      label: 'SLA 达成报表',
      description: 'SLA 达成情况分析',
    },
    cases_opened_by_day_priority: {
      label: '按优先级 × 日期统计新建工单',
      description: '每日新建工单数，按优先级细分',
    },
  },
};
