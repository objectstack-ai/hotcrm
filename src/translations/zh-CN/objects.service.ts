// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { ObjectTranslationData } from '@objectstack/spec/system';

import { activityActions } from './_shared';

/**
 * 简体中文 (zh-CN) — `objects` translations for the SERVICE family:
 * post-sale support — cases and the knowledge that deflects them.
 *
 * Roster: `crm_case`, `crm_knowledge_article`, `crm_article_feedback`.
 *
 * SPLIT AXIS (#1311): translation NAMESPACE first, then CRM DOMAIN FAMILY.
 * Everything that is not `objects` lives in `./app.ts`; `objects` — 69-78% of
 * every bundle — is one file per CRM domain family, and a detail object
 * follows its master. A new row goes in the file for ITS family, never in
 * whichever file is already open: that is how one file re-grows past the 70%
 * advisory band `pnpm hygiene` prints. Full rule and rationale:
 * `src/translations/zh-CN.ts`.
 */
export const service: Record<string, ObjectTranslationData> = {
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
      resolution: { label: '解决方案' },
      resolved_by_article: { label: '解决该工单的知识文章', help: '解决此工单的知识库文章 —— 转移率的统计口径。' },
      customer_rating: { label: '客户满意度', help: '客户满意度评分（1-5 星）' },
      customer_feedback: { label: '客户反馈' },
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
      // Detail-page `record:details` section names (case_detail.page.ts)
      info: { label: '工单信息' },
      status: { label: '状态与 SLA' },
      description: { label: '描述' },
      // case.view.ts 表单区块名称 (#1100)。
      case: { label: '工单' },
      how_can_we_help: { label: '我们能帮您什么？' },
      // Object-level section keys (case.object.ts) used by record forms
      basic: { label: '工单信息' },
      origin: { label: '来源与路由' },
      sla: { label: 'SLA 与优先级' },
      resolution: { label: '解决方案' },
      escalation: { label: '升级' },
      system: { label: '系统' },
    },
  },
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
};
