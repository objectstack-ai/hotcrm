// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

/**
 * 简体中文 (zh-CN) — the PSA module's own translations: every row whose target
 * this package registers. Why they live here and not in the app package's
 * pack: `./index.ts`.
 */
export const zhCN: TranslationData = {
  hooks: {
    timesheet_stamps: {
      refusals: {
        RECORD_LOCKED: {
          message: '这个项目上的工时单现在不能这样修改。',
          reasons: {
            project_locked: { message: '{{project}}已锁定工时与费用，因此不能提交这张工时单。先保存为草稿，或请项目经理在项目上取消勾选“锁定工时与费用”。' },
            closed_takes_no_new: { message: '{{project}}已关闭，不再接受新的工时单。请把工时记在进行中的项目上。' },
            cancelled_takes_no_new: { message: '{{project}}已取消，不再接受新的工时单。请把工时记在进行中的项目上。' },
            closed_no_submit: { message: '{{project}}已关闭，因此不能提交这张工时单。先保存为草稿，或把它改挂到进行中的项目上。' },
            cancelled_no_submit: { message: '{{project}}已取消，因此不能提交这张工时单。先保存为草稿，或把它改挂到进行中的项目上。' },
          },
        },
        FORBIDDEN: { message: '工时单提交后，由审批人在收件箱中批准或驳回。' },
        DUPLICATE_VALUE: {
          message: '这个项目在这个周期已有一张工时单。请把工时加到那张上。',
          reasons: {
            named: { message: '这个项目在这个周期已有一张工时单：{{timesheet}}。请把工时加到那张上。' },
          },
        },
      },
    },
    project_status_guard: {
      refusals: {
        VALIDATION_FAILED: {
          message: '不允许这样修改项目。',
          reasons: {
            starts_as_draft: { message: '新项目从草稿开始。先保存，再把状态设为“审批中”以提交审批。' },
            budget_required: { message: '提交审批前，请先添加项目预算（第 1 版及其明细）：审批针对的就是这份预算。' },
            budget_no_lines: { message: '预算还不能提交审批：它还没有预算明细。 请补全后再提交项目审批。' },
            budget_labor_no_rate_card: { message: '预算还不能提交审批：人工明细“{{line}}”没有选择费率卡。 请补全后再提交项目审批。' },
            budget_labor_no_hours: { message: '预算还不能提交审批：人工明细“{{line}}”没有填写工时。 请补全后再提交项目审批。' },
            budget_line_no_quantity: { message: '预算还不能提交审批：明细“{{line}}”没有填写数量。 请补全后再提交项目审批。' },
            budget_total_zero: { message: '预算还不能提交审批：它的总额为零。 请补全后再提交项目审批。' },
          },
        },
        FORBIDDEN: {
          message: '你不能这样修改项目。',
          reasons: {
            decided_by_approver: { message: '项目由审批人在收件箱中批准或驳回。请把状态设为“审批中”以提交审批。' },
          },
        },
      },
    },
    project_member_unique: {
      refusals: {
        DUPLICATE_VALUE: { message: '这个人已经在这个项目上了。请修改他现有的人员配置行，不要再新增一行。' },
      },
    },
    project_task_rules: {
      refusals: {
        VALIDATION_FAILED: {
          message: '上级任务必须是同一项目中的另一项任务。',
          reasons: {
            loop: { message: '这个上级任务是本任务自己的子任务。请选择不在本任务下面的任务。' },
            predecessor: { message: '前置任务必须是同一项目中的另一项任务。' },
          },
        },
      },
    },
    project_budget_rules: {
      refusals: {
        VALIDATION_FAILED: {
          message: '不允许这样修改预算。',
          reasons: {
            open_version: { message: '{{project}}已有一个未结的预算版本（第 {{version}} 版）。请先提交或删除它，再新建版本。' },
            starts_as_draft: { message: '新的预算版本从草稿开始。先保存、添加明细，再提交审批。' },
            with_project: { message: '第 1 版随项目一起审批：提交项目审批时，预算会一并提交。' },
            reason_required: { message: '提交审批前，请在“原因”中说明为什么需要追加预算。' },
            budget_no_lines: { message: '预算还不能提交审批：它还没有预算明细。 请补全后再提交。' },
            budget_labor_no_rate_card: { message: '预算还不能提交审批：人工明细“{{line}}”没有选择费率卡。 请补全后再提交。' },
            budget_labor_no_hours: { message: '预算还不能提交审批：人工明细“{{line}}”没有填写工时。 请补全后再提交。' },
            budget_line_no_quantity: { message: '预算还不能提交审批：明细“{{line}}”没有填写数量。 请补全后再提交。' },
            budget_total_zero: { message: '预算还不能提交审批：它的总额为零。 请补全后再提交。' },
          },
        },
        FORBIDDEN: { message: '预算版本提交后，由审批人在收件箱中批准或驳回。' },
        RECORD_LOCKED: { message: '只能删除未结的预算版本（草稿或已驳回）。已批准的版本是项目的历史记录。' },
      },
    },
    project_budget_line_amount: {
      refusals: {
        RECORD_LOCKED: { message: '这个预算版本已提交审批，明细不能再修改。如需调整，请新建一个版本。' },
      },
    },
    time_entry_timesheet: {
      refusals: {
        VALIDATION_FAILED: { message: '请选择这些工时所属的项目。' },
        FORBIDDEN: {
          message: '只有配置在项目上的人员才能记工时。请让项目经理把你加入项目。',
          reasons: {
            named: { message: '只有配置在项目“{{project}}”上的人员才能记工时。请让项目经理把你加入项目。' },
          },
        },
      },
    },
    time_entry_costing: {
      refusals: {
        RECORD_LOCKED: { message: '这张工时单已提交，工时不能再修改。请把它退回草稿后再更正。' },
        VALIDATION_FAILED: {
          message: '日期 {{day}} 不在这张工时单的周期内（{{from}} – {{to}}）。',
          reasons: {
            task: { message: '任务必须是这张工时单所属项目的任务。' },
            project: { message: '项目必须是这张工时单的项目。' },
          },
        },
        FORBIDDEN: {
          message: '只有配置在项目上的人员才能记工时。请让项目经理把你加入项目。',
          reasons: {
            named: { message: '只有配置在项目“{{project}}”上的人员才能记工时。请让项目经理把你加入项目。' },
          },
        },
      },
    },
  },
  objects: {
    crm_project: {
      label: '项目',
      pluralLabel: '项目',
      description: '交付团队为客户执行的项目，包括人员、工时、费用、成本和毛利',
      fields: {
        owner_id: { label: '项目负责人' },
        project_number: { label: '项目编号' },
        name: { label: '项目名称' },
        kind: {
          label: '类型',
          options: {
            presales: '售前',
            delivery: '交付',
            internal: '内部',
          },
        },
        billing_type: {
          label: '计费方式',
          help: '客户为这项工作付款的方式。开票在「订单与回款」中完成。',
          options: {
            fixed_fee: '固定总价',
            time_and_materials: '按人天计费',
            retainer: '包年服务',
            non_billable: '不计费',
          },
        },
        status: {
          label: '状态',
          options: {
            draft: '草稿',
            in_approval: '审批中',
            approved: '已批准',
            rejected: '已驳回',
            active: '进行中',
            on_hold: '暂停',
            completed: '已完成',
            closed: '已关闭',
            cancelled: '已取消',
          },
        },
        description: { label: '描述' },
        crm_account: { label: '客户' },
        crm_opportunity: { label: '商机' },
        crm_contract: { label: '合同' },
        crm_sales_order: {
          label: '订单',
          help: '这个项目交付的销售订单。',
        },
        source_project: {
          label: '来源售前项目',
          help: '交付项目由哪个售前项目转化而来。',
        },
        planned_start: { label: '计划开始' },
        planned_end: { label: '计划结束' },
        actual_start: { label: '实际开始' },
        actual_end: { label: '实际结束' },
        percent_complete: {
          label: '完成百分比',
          help: '由项目任务按计划工时加权计算。有子任务的任务通过子任务计入。',
        },
        planned_revenue: {
          label: '计划收入',
          help: '客户为这个项目支付的金额，毛利以它为基准计算。',
        },
        approved_budget: {
          label: '批准预算',
          help: '基线预算版本的合计：这个项目可以花费的成本。新版本获批时随之变化，不能直接填写。',
        },
        actual_labor_cost: { label: '人工成本' },
        actual_expense_cost: { label: '费用成本' },
        billable_labor_amount: { label: '可计费工时金额' },
        billable_expense_amount: { label: '可计费费用' },
        billable_amount: {
          label: '已批准待开票',
          help: '已批准的可计费工时按计费单价计算，加上已批准的可计费费用。由「订单与回款」开票。',
        },
        actual_cost: { label: '实际成本' },
        cost_variance: { label: '剩余预算' },
        budget_consumed_percent: { label: '预算使用率' },
        budget_status: {
          label: '预算状态',
          help: '低于批准预算的 80% 为正常，达到 80% 为预警，达到 100% 为超支。',
          options: {
            on_track: '正常',
            warning: '预警',
            exceeded: '超支',
          },
        },
        time_entry_locked: {
          label: '锁定工时与费用',
          help: '勾选后，这个项目上的工时单和费用都不能提交。草稿仍可填写。',
        },
        gross_margin: { label: '毛利' },
        gross_margin_percent: { label: '毛利率' },
        project_manager: {
          label: '项目经理',
          help: '在这个项目中担任项目经理的人。',
        },
        team_members: { label: '项目团队' },
      },
      _views: {
        all_projects: { label: '全部项目' },
        my_projects: { label: '我的项目' },
        active_projects: { label: '进行中的项目' },
      },
      _sections: {
        identity: { label: '项目' },
        provenance: { label: '客户' },
        plan: { label: '计划' },
        financials: { label: '财务' },
        team: { label: '团队' },
      },
      _validations: {
        project_planned_dates: { message: '计划结束日期不能早于计划开始日期。' },
        project_status_progression: { message: '不允许这样更改状态。项目按 草稿 → 审批中 → 已批准 → 进行中 → 已完成 → 已关闭 推进；进行中和暂停可以来回切换，被驳回的项目退回草稿，未结束的项目可以取消。' },
      },
    },
    crm_project_task: {
      label: '项目任务',
      pluralLabel: '项目任务',
      description: '项目计划中的一项工作，包含日期、计划工时、负责人和进度',
      fields: {
        crm_project: { label: '项目' },
        name: { label: '任务名称' },
        parent_task: {
          label: '上级任务',
          help: '这项任务所属的任务。有子任务的任务是汇总任务，进度由子任务计算。',
        },
        task_owner: {
          label: '任务负责人',
          help: '完成这项任务或对它负责的人。',
        },
        status: {
          label: '状态',
          options: {
            not_started: '未开始',
            in_progress: '进行中',
            on_hold: '暂停',
            completed: '已完成',
            cancelled: '已取消',
          },
        },
        is_milestone: {
          label: '里程碑',
          help: '一个检查点而不是一项工作：在甘特图上显示为菱形，通常没有计划工时。',
        },
        description: { label: '描述' },
        planned_start: { label: '计划开始' },
        planned_end: { label: '计划结束' },
        predecessors: {
          label: '前置任务',
          help: '这项任务开始前必须完成的任务。',
        },
        schedule_type: { label: '排期类型' },
        planned_hours: {
          label: '计划工时',
          help: '这项任务计划投入的工时。项目的完成百分比按它给每项任务加权。',
        },
        percent_complete: {
          label: '完成百分比',
          help: '这项任务完成了多少。任务标为已完成时设为 100。',
        },
        actual_hours: { label: '实际工时' },
      },
      _views: {
        all_project_tasks: { label: '全部项目任务' },
        project_plan: { label: '项目计划' },
        project_task_tree: { label: '任务树' },
        my_project_tasks: { label: '我的项目任务' },
      },
      _sections: {
        basic: { label: '任务' },
        schedule: { label: '排期' },
        effort: { label: '工作量' },
      },
      _validations: {
        project_task_planned_dates: { message: '计划结束日期不能早于计划开始日期。' },
      },
    },
    // Budget versions and their lines (hotcrm#2547).
    crm_project_budget: {
      label: '项目预算',
      pluralLabel: '项目预算',
      description: '项目预算的一个版本：明细行、合计和审批。已批准的那个版本就是基线。',
      fields: {
        crm_project: { label: '项目' },
        name: { label: '预算' },
        version: { label: '版本', help: '按创建顺序编号为 1、2、3……' },
        status: {
          label: '状态',
          options: {
            draft: '草稿',
            in_approval: '审批中',
            approved: '已批准',
            rejected: '已驳回',
            superseded: '已被取代',
          },
        },
        is_baseline: { label: '基线', help: '项目的批准预算就取自这个已批准版本。每个项目只有一个；之后批准的版本会接替它。' },
        with_initiation: { label: '随项目一起审批', help: '作为项目的第一版预算，随立项一起提交审批，而不是作为追加预算。' },
        reason: { label: '原因', help: '为什么需要这个版本。追加预算（第 2 版及以后）提交审批前必须填写。' },
        total_cost: { label: '总成本' },
        labor_cost: { label: '人工成本' },
        labor_hours: { label: '人工工时' },
        notes: { label: '备注' },
      },
      _views: {
        all_project_budgets: { label: '全部预算版本' },
        baseline_budgets: { label: '基线预算' },
        open_budgets: { label: '未结预算版本' },
      },
      _sections: {
        basic: { label: '预算版本' },
        lines: { label: '预算明细' },
        totals: { label: '合计' },
      },
      _validations: {
        project_budget_status_progression: { message: '不允许这样修改状态。预算版本按 草稿 → 审批中 → 已批准或已驳回 流转；已驳回的退回草稿，已批准的在之后的版本获批时变为已被取代。' },
      },
    },
    crm_project_budget_line: {
      label: '预算明细',
      pluralLabel: '预算明细',
      description: '预算版本中的一项计划成本：类别、月份、数量和单位成本',
      fields: {
        crm_project_budget: { label: '预算' },
        category: {
          label: '类别',
          options: {
            labor: '人工',
            subcontract_service: '外包服务',
            third_party_goods: '第三方采购',
            expense: '费用',
            other: '其他',
          },
        },
        description: { label: '说明' },
        period: { label: '月份', help: '成本发生的月份。保存为该月的第一天。' },
        rate_card: { label: '费率卡', help: '人工明细：工时按哪个级别计划。不填单位成本时，取它的成本费率。' },
        hours: { label: '工时', help: '人工明细：计划的工时。' },
        quantity: { label: '数量', help: '其他明细：多少个单位。' },
        unit_cost: { label: '单位成本', help: '人工按每小时，其他按每单位。' },
        amount: { label: '金额', help: '人工为工时 × 单位成本，其他为数量 × 单位成本。' },
      },
      _views: {
        all_project_budget_lines: { label: '全部预算明细' },
      },
      _sections: {
        basic: { label: '预算明细' },
      },
    },
    crm_project_member: {
      label: '项目成员',
      pluralLabel: '项目成员',
      description: '投入项目的人员，包括其职责和费率卡',
      fields: {
        crm_project: { label: '项目' },
        person: { label: '人员' },
        person_name: { label: '人员姓名', help: '人员的姓名，与用户记录保持一致。它是这条人员配置的名称。' },
        responsibility: {
          label: '职责',
          options: {
            project_manager: '项目经理',
            project_director: '项目总监',
            account_manager: '客户经理',
            architect: '架构师',
            consultant: '顾问',
            quality_assurance: '质量保证',
            finance_partner: '财务伙伴',
            subcontractor: '分包商',
          },
        },
        rate_card: {
          label: '费率卡',
          help: '这个人在这个项目上的工时按哪个成本单价和计费单价计算。',
        },
        allocation_percent: { label: '投入比例' },
        start_date: { label: '开始日期' },
        end_date: { label: '结束日期' },
        is_billable: {
          label: '可计费',
          help: '这个人在这个项目上的工时是否向客户计费。',
        },
      },
      _views: {
        all_project_members: { label: '全部项目成员' },
      },
      _sections: {
        basic: { label: '人员安排' },
      },
      _validations: {
        project_member_dates: { message: '结束日期不能早于开始日期。' },
      },
    },
    crm_rate_card: {
      label: '费率卡',
      pluralLabel: '费率卡',
      description: '一个职级的成本单价和计费单价',
      fields: {
        owner_id: { label: '负责人' },
        name: {
          label: '名称',
          help: '例如「高级顾问」。',
        },
        seniority: {
          label: '职级',
          options: {
            junior: '初级',
            intermediate: '中级',
            senior: '高级',
            lead: '资深',
            principal: '专家',
          },
        },
        unit: {
          label: '单位',
          help: '按天计价时，一天按八小时计算。',
          options: {
            hour: '按小时',
            day: '按天',
          },
        },
        cost_rate: {
          label: '成本单价',
          help: '这个职级每个单位给公司带来的成本。',
        },
        bill_rate: {
          label: '计费单价',
          help: '这个职级每个单位向客户收取的价格。',
        },
        is_internal: {
          label: '内部',
          help: '内部费率卡可以低于成本计费，或不计费。',
        },
        effective_from: { label: '生效日期' },
        effective_to: { label: '失效日期' },
      },
      _views: {
        all_rate_cards: { label: '全部费率卡' },
      },
      _sections: {
        basic: { label: '费率卡' },
        rates: { label: '单价' },
      },
      _validations: {
        rate_card_bill_not_below_cost: { message: '除非是内部费率卡，计费单价不能低于成本单价。' },
        rate_card_dates: { message: '失效日期不能早于生效日期。' },
      },
    },
    crm_timesheet: {
      label: '工时单',
      pluralLabel: '工时单',
      description: '一个人在一个项目上某一期间的工时，作为整体审批',
      fields: {
        owner_id: { label: '人员' },
        name: { label: '工时单' },
        crm_project: { label: '项目' },
        period_start: { label: '期间开始' },
        period_end: { label: '期间结束' },
        status: {
          label: '状态',
          options: {
            draft: '草稿',
            submitted: '已提交',
            approved: '已批准',
            rejected: '已驳回',
          },
        },
        approver: { label: '审批人' },
        total_hours: { label: '总工时' },
        billable_hours: { label: '可计费工时' },
        total_cost: { label: '总成本' },
        total_bill_amount: { label: '可计费金额' },
        notes: { label: '备注' },
      },
      _views: {
        all_timesheets: { label: '全部工时单' },
        my_timesheets: { label: '我的工时单' },
        my_week_timesheets: {
          label: '本周工时单',
          bulkActions: {
            submit_week: { label: '提交', confirmText: '提交 {{count}} 张工时单审批？每张都会交给它所属项目的项目经理。' },
          },
        },
        timesheets_to_approve: { label: '待我审批的工时单' },
      },
      _sections: {
        basic: { label: '工时单' },
        totals: { label: '合计' },
      },
      _validations: {
        timesheet_period: { message: '期间结束不能早于期间开始，一张工时单最多覆盖 31 天。' },
        timesheet_status_progression: { message: '不允许这样更改状态。工时单按 草稿 → 已提交 → 已批准或已驳回 推进；被驳回的工时单退回草稿修改。' },
      },
      _actions: {
        submit_timesheet: { label: '提交', successMessage: '工时单 {{ record.name }} 已提交审批。' },
      },
    },
    crm_time_entry: {
      label: '工时明细',
      pluralLabel: '工时明细',
      description: '工时单中某一天的工时，以及对应的成本',
      fields: {
        crm_project: {
          label: '项目',
          help: '这些工时属于哪个项目。新录一行时，会自动找到或新建这个项目这一周的工时单。',
        },
        crm_timesheet: {
          label: '工时单',
          help: '按项目和日期自动填写。只有要记到另一个期间的工时单时才需要手选。',
        },
        entry_date: {
          label: '日期',
          help: '干活的那一天。',
        },
        hours: { label: '工时' },
        is_billable: { label: '可计费' },
        crm_project_task: {
          label: '任务',
          help: '这些工时花在本项目的哪项任务上。',
        },
        notes: { label: '备注' },
        cost_rate: { label: '成本单价（每小时）' },
        cost_amount: { label: '成本' },
        bill_rate: { label: '计费单价（每小时）' },
        bill_amount: { label: '可计费金额' },
      },
      _views: {
        all_time_entries: { label: '全部工时明细' },
        my_week_time: { label: '我的本周' },
        my_time_entries: { label: '我的工时' },
      },
      _sections: {
        basic: { label: '工时明细' },
        rates: { label: '成本与计费' },
      },
    },
    // The Project field it contributes to the expense module's objects (hotcrm#2556, hotcrm#2581).
    crm_expense: {
      fields: {
        crm_project: { label: '项目' },
      },
    },
    crm_expense_report: {
      fields: {
        crm_project: { label: '项目' },
      },
      // The refusals of a submission on a Closed, Cancelled or locked project
      // (hotcrm#2764). Each rule is a `conditional`; the `_check` rule inside
      // it is the one whose message is shown, and both carry the same text.
      _validations: {
        expense_report_project_closed: { message: '这张报销单所属的项目已关闭，不再接受费用，因此不能提交。请删除这张报销单，把其中的费用改挂到进行中的项目，再重新提交。' },
        expense_report_project_closed_check: { message: '这张报销单所属的项目已关闭，不再接受费用，因此不能提交。请删除这张报销单，把其中的费用改挂到进行中的项目，再重新提交。' },
        expense_report_project_cancelled: { message: '这张报销单所属的项目已取消，不再接受费用，因此不能提交。请删除这张报销单，把其中的费用改挂到进行中的项目，再重新提交。' },
        expense_report_project_cancelled_check: { message: '这张报销单所属的项目已取消，不再接受费用，因此不能提交。请删除这张报销单，把其中的费用改挂到进行中的项目，再重新提交。' },
        expense_report_project_locked: { message: '这张报销单所属的项目已锁定工时与费用，因此不能提交。先保留为草稿，待项目经理在项目上取消勾选“锁定工时与费用”后再提交。' },
        expense_report_project_locked_check: { message: '这张报销单所属的项目已锁定工时与费用，因此不能提交。先保留为草稿，待项目经理在项目上取消勾选“锁定工时与费用”后再提交。' },
      },
    },
    crm_expense_request: {
      fields: {
        crm_project: { label: '项目' },
      },
    },
  },
  // Step names the approval request shows the submitter and the approvers (#2316 phase 1b).
  flows: {
    project_initiation_approval: {
      label: '立项审批',
      approvals: {
        leadership_review: { label: '项目总监审核' },
        finance_review: { label: '财务控制审核' },
      },
    },
    project_budget_approval: {
      label: '追加预算审批',
      approvals: {
        leadership_review: { label: '项目总监审核' },
        finance_review: { label: '财务控制审核' },
      },
    },
    timesheet_approval: {
      label: '工时单审批',
      approvals: { approver_review: { label: '项目经理审核' } },
    },
    timesheet_approval_on_create: {
      label: '工时单审批（创建时）',
      approvals: { approver_review: { label: '项目经理审核' } },
    },
    project_budget_alert: { label: '项目预算预警' },
    expense_report_project_approval: {
      label: '项目报销单审批',
      approvals: {
        approver_review: { label: '项目经理审核' },
        finance_review: { label: '财务控制审核' },
      },
    },
    expense_request_project_approval: {
      label: '项目出差申请审批',
      approvals: {
        approver_review: { label: '项目经理审核' },
      },
    },
    expense_request_project_approval_on_create: {
      label: '项目出差申请审批（创建时）',
      approvals: {
        approver_review: { label: '项目经理审核' },
      },
    },
  },
  apps: {
    // This package's own app (#2316); the name is the maintainer's (2026-11-15).
    crm_psa: {
      label: '项目交付',
      description: '项目、项目成员、工时与费用，以及由此得出的毛利',
      navigation: {
        group_projects: { label: '项目' },
        nav_projects: { label: '全部项目' },
        nav_my_projects: { label: '我的项目' },
        nav_project_members: { label: '人员安排' },
        nav_project_budgets: { label: '预算' },
        nav_project_plan: { label: '项目计划' },
        nav_my_project_tasks: { label: '我的项目任务' },
        group_time_expenses: { label: '工时与费用' },
        nav_my_week: { label: '我的本周' },
        nav_my_week_timesheets: { label: '提交本周' },
        nav_my_timesheets: { label: '我的工时单' },
        nav_timesheets_to_approve: { label: '待我审批的工时单' },
        group_rates: { label: '费率' },
        nav_rate_cards: { label: '费率卡' },
        group_customers: { label: '客户与合同' },
        group_work: { label: '我的工作' },
        nav_approval_requests: { label: '待我审批' },
        nav_projects_overview: { label: '项目概览' },
        group_help: { label: '帮助' },
        nav_help_psa: { label: '项目交付手册' },
      },
    },
  },
  // Phase 1c: the module's datasets, its manual and its dashboard.
  datasets: {
    project_financials: {
      label: '项目财务',
      description: '每个项目的批准预算、计划收入、成本与毛利',
      dimensions: {
        project: { label: '项目', description: '项目，按项目名称。' },
        status: { label: '状态', description: '项目所处的状态，从草稿、审批中，到进行中、暂停，再到已完成、已关闭、已驳回或已取消。' },
        kind: { label: '类型', description: '项目是售前、客户交付还是内部工作。' },
        billing_type: { label: '计费方式', description: '客户为这项工作付费的方式：固定总价、按人天计费、包年服务或不计费。' },
        budget_status: { label: '预算状态', description: '项目已花掉多少批准预算：低于 80% 为正常，达到 80% 为预警，达到 100% 为超支。' },
        project_manager: { label: '项目经理', description: '在项目中担任项目经理的人员。' },
        planned_start: { label: '计划开始', description: '项目计划开始的月份；没有计划开始日期的项目单独成组。' },
      },
      measures: {
        project_count: { label: '项目数', description: '项目的数量，涵盖所有状态，包括草稿、已驳回和已取消的项目。' },
        approved_budget_sum: { label: '批准预算', description: '各项目批准预算之和，即其基线预算版本的合计；尚未批准的项目不计入。' },
        planned_revenue_sum: { label: '计划收入', description: '计划收入之和，即客户为这些项目支付的金额；它是计划数，不是已开票收入或赢单金额。' },
        labor_cost_sum: { label: '人工成本', description: '已批准工时单上的工时成本；草稿、已提交和已驳回的工时不计入。' },
        expense_cost_sum: { label: '费用成本', description: '计入项目的已批准费用金额；未批准的费用不计入。' },
        actual_cost_sum: { label: '实际成本', description: '人工成本加费用成本：只算已批准的成本，与项目记录上显示的一致。' },
        gross_margin_sum: { label: '毛利', description: '计划收入减实际成本，是计划对实际的毛利；不是已开票的利润，未批准的成本也不扣除。' },
        budget_used: { label: '预算使用率', description: '实际成本除以批准预算，先求和再相除，所以是项目组合的整体比例，而不是各项目百分比的平均。' },
        billable_labor_sum: { label: '可计费工时金额', description: '已批准工时单上工时的可计费金额；草稿、已提交和已驳回的工时不计入。' },
        billable_expense_sum: { label: '可计费费用', description: '标记为可向客户计费的已批准费用金额；不可计费和未批准的费用不计入。' },
        approved_to_bill_sum: { label: '已批准待开票', description: '可计费人工加可计费费用：已批准的可计费工作与费用；发票本身在订单到收款（Order to Cash）中开具。' },
      },
    },
    time_utilization: {
      label: '工时利用率',
      description: '按人员、项目和周统计的工时，以及可计费占比',
      dimensions: {
        period_week: { label: '周', description: '工时实际发生的周，按每条工时明细上的日期，而不是工时单开始的那一周。' },
        period_month: { label: '月', description: '工时实际发生的月份，按每条工时明细上的日期。' },
        person: { label: '人员', description: '登记这些工时的人员，即工时单的所有者。' },
        project: { label: '项目', description: '工时单所属的项目。' },
        status: { label: '工时单状态', description: '工时所在工时单的审批状态：草稿、已提交、已批准或已驳回；只有已批准的工时计入成本。' },
      },
      measures: {
        total_hours: { label: '工时', description: '工时明细上登记的小时数，涵盖所有状态的工时单，包括草稿和已驳回的；只看计入成本的工时需筛选已批准。' },
        billable_hours: { label: '可计费工时', description: '标记为可计费的工时明细上的小时数，涵盖所有状态的工时单；不可计费的工时不计入。' },
        utilization: { label: '可计费占比', description: '可计费工时除以工时：已登记时间中可计费的占比；不是占可用工作时间的比例。' },
      },
    },
  },
  books: {
    crm_psa_manual: {
      label: 'HotCRM 项目交付手册',
      description: '项目、人员安排、成本、审批与预算锁定：每个数字统计的是什么，由谁决定。',
      groups: {
        psa: { label: '项目交付' },
      },
    },
  },
  dashboards: {
    projects_overview: {
      label: '项目概览',
      description: '交付项目组合的预算、成本、毛利与已批准工时',
      widgets: {
        delivering_projects: { title: '交付中的项目', description: '进行中、暂停和已完成的项目' },
        delivering_budget: { title: '批准预算', description: '交付中项目的批准预算' },
        delivering_cost: { title: '实际成本', description: '交付中项目已批准的人工与费用' },
        delivering_budget_used: { title: '预算使用率', description: '交付中项目的实际成本占批准预算的比例' },
        budget_vs_cost: { title: '各项目预算与成本', description: '每个交付中项目的批准预算与实际成本' },
        budget_status_mix: { title: '按预算状态统计项目', description: '正常、预警（80% 起）和超支（100% 起），只含有预算的项目' },
        project_margin: { title: '各项目毛利', description: '每个交付中项目的计划收入、实际成本、毛利和预算使用率' },
        projects_by_status: { title: '按状态统计项目', description: '全部项目，从草稿到已关闭' },
        hours_by_week: { title: '每周已批准工时', description: '已批准工时单上的工时，以及其中可计费的部分' },
        billable_share_by_person: { title: '各人员可计费占比', description: '每人的已批准工时及其中向客户计费的比例' },
      },
    },
  },
};
