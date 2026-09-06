// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { ObjectTranslationData } from '@objectstack/spec/system';

import { activityActions } from './_shared';

/**
 * 简体中文 (zh-CN) — `objects` translations for the PIPELINE family:
 * demand and the deals it becomes, plus the roll-up that forecasts them.
 *
 * Roster: `crm_lead`, `crm_opportunity`, `crm_opportunity_line_item`, `crm_forecast`.
 *
 * SPLIT AXIS (#1311): translation NAMESPACE first, then CRM DOMAIN FAMILY.
 * Everything that is not `objects` lives in `./app.ts`; `objects` — 69-78% of
 * every bundle — is one file per CRM domain family, and a detail object
 * follows its master. A new row goes in the file for ITS family, never in
 * whichever file is already open: that is how one file re-grows past the 70%
 * advisory band `pnpm hygiene` prints. Full rule and rationale:
 * `src/translations/zh-CN.ts`.
 */
export const pipeline: Record<string, ObjectTranslationData> = {
  crm_lead: {
    _validations: {
      disqualification_reason_required: {
        message: '线索标记为不合格时必须填写取消资格原因',
      },
      duplicate_disqualification_requires_survivor: {
        message: '以重复为由取消线索资格时，必须指明保留的记录并将重复状态设为已确认',
      },
      email_required: {
        message: '电子邮件为必填项',
      },
      lead_status_progression: {
        message: '无效的线索状态流转',
      },
    },
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
        // `erased` 是墓碑值，不是可选项：表单不提供它（见
        // `src/views/lead.view.ts`），但幸存记录被删除后线索会带着它，
        // 所以凡是读取记录的地方都需要标签，否则会显示原始值 `erased`。
        options: { crm_lead: '线索', crm_contact: '联系人', erased: '记录已删除' },
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
      // lead.view.ts 表单区块名称 (#1100) —— 默认表单及六个具名 formView。
      contact_information: { label: '联系信息' },
      lead_classification: { label: '线索分类' },
      company_information: { label: '公司信息' },
      additional_information: { label: '附加信息' },
      privacy: { label: '隐私' },
      general: { label: '常规信息' },
      details: { label: '详情' },
      step_1_contact_details: { label: '第一步：联系方式' },
      step_2_company_information: { label: '第二步：公司信息' },
      step_3_qualification: { label: '第三步：资质审核' },
      step_4_review_and_convert: { label: '第四步：审核并转化' },
      primary_information: { label: '主要信息' },
      extended_details: { label: '扩展信息' },
      quick_edit: { label: '快速编辑' },
      update_lead_status: { label: '更新线索状态' },
      tell_us_about_yourself: { label: '请介绍一下您自己' },
      about_your_company: { label: '您的公司信息' },
      how_can_we_help: { label: '我们能帮您什么？' },
      lead_information: { label: '线索信息' },
      address_information: { label: '地址信息' },
      privacy_preferences: { label: '隐私偏好' },
    },
    _actions: {
      ...activityActions,
      convert_lead: {
        label: '转化线索',
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
  crm_opportunity: {
    _validations: {
      amount_positive: {
        message: '金额必须大于零',
      },
      close_date_future: {
        message: '除非商机已结束，否则预计成交日不应早于今天',
      },
      opportunity_stage_progression: {
        message: '无效的商机阶段流转',
      },
    },
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
      // opportunity.view.ts 表单区块名称 (#1100)
      overview: { label: '概览' },
      forecast: { label: '预测' },
      sales_strategy: { label: '销售策略' },
      win_loss: { label: '赢单/输单' },
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
  crm_opportunity_line_item: {
    _validations: {
      unit_price_positive: {
        message: '销售价格不能为负数',
      },
    },
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
    _sections: {
      basic: { label: '明细行' },
      pricing: { label: '价格' },
    },
  },
  crm_forecast: {
    _validations: {
      period_end_after_start: {
        message: '周期结束必须晚于周期开始。',
      },
      period_end_matches_calendar_period: {
        message: '周期结束必须是该周期的最后一天——例如以 2026-07-01 开始的季度对应 2026-09-30，2026 年 8 月对应 2026-08-31。',
      },
      period_start_first_of_period: {
        message: '周期开始必须是该周期的第一天——例如 2026 年 8 月对应 2026-08-01。',
      },
      quarter_starts_on_quarter_boundary: {
        message: '季度预测必须从季度边界开始——1 月 1 日、4 月 1 日、7 月 1 日或 10 月 1 日。',
      },
      snapshot_amounts_non_negative: {
        message: '快照金额不能为负数。',
      },
    },
    label: '销售预测',
    pluralLabel: '销售预测',
    description: '按销售负责人定期记录的管道快照，用于收入预测',
    fields: {
      owner_id: { label: '负责人' },
      period: { label: '周期', options: { month: '月度', quarter: '季度' } },
      period_start: {
        label: '周期起始',
        help: '必须是所在周期的第一天——例如 2026 年 8 月对应 2026-08-01。季度预测还必须落在季度边界上：1 月 1 日、4 月 1 日、7 月 1 日或 10 月 1 日。',
      },
      period_end: {
        label: '周期截止',
        help: '通常根据"周期"和"周期起始"自动推算。如手动填写，必须是该周期的最后一天——例如起始为 2026-07-01 的季度对应 2026-09-30，2026 年 8 月对应 2026-08-31。',
      },
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
      // forecast.view.ts 表单区块名称 (#1100)
      snapshot: { label: '快照' },
      notes: { label: '备注' },
    },
  },
};
