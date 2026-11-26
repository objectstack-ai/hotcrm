// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

/**
 * 简体中文 (zh-CN) — the expense module's own translations (hotcrm#2556, hotcrm#2559): every
 * row whose target this package registers. The object's rows moved here from
 * Project Delivery with the object; the Project field's label stays in that
 * module's pack, which contributes the field. Why per package: `./index.ts`.
 */
export const zhCN: TranslationData = {
  hooks: {
    expense_line_lock: {
      refusals: {
        RECORD_LOCKED: {
          message: '这笔费用所在的报销单已经提交，不能再修改。',
          reasons: {
            in_review: { message: '费用{{name}}在报销单{{report}}上，该报销单正在等待审批。请先撤回报销单再修改。' },
            rejected: { message: '费用{{name}}在报销单{{report}}上，该报销单已被驳回。请先把报销单退回草稿再修改。' },
            decided: { message: '费用{{name}}在报销单{{report}}上，该报销单已批准，不能再修改。' },
            project: { message: '费用{{name}}在报销单{{report}}上，报销单按项目交给审批人。要改项目，请先删除这张草稿报销单（其中的费用会被释放），再重新提交。' },
          },
        },
      },
    },
    expense_report_rules: {
      refusals: {
        FORBIDDEN: {
          message: '报销单提交后，由审批人在收件箱中批准或驳回。',
          reasons: {
            decide: { message: '报销单提交后，由审批人在收件箱中批准或驳回。' },
            pay: { message: '报销单获批准后，由财务用「标记已付款」标记为已付款。' },
          },
        },
        VALIDATION_FAILED: {
          message: '请先在这张报销单上添加费用再提交。',
          reasons: {
            no_expenses: { message: '请先在报销单{{name}}上添加费用再提交。' },
          },
        },
        RECORD_LOCKED: {
          message: '这张报销单不能再修改。',
          reasons: {
            approved: { message: '报销单{{name}}已批准，不能再修改。由财务标记为已付款。' },
            paid: { message: '报销单{{name}}已付款，不能再修改。' },
            delete: { message: '只有草稿状态的报销单可以删除。报销单{{name}}已经提交过。' },
            delete_approved: { message: '报销单{{name}}已批准，不能删除：已批准或已付款的报销单会保留在记录中。' },
            delete_paid: { message: '报销单{{name}}已付款，不能删除：已批准或已付款的报销单会保留在记录中。' },
          },
        },
      },
    },
    expense_request_decision_guard: {
      refusals: {
        FORBIDDEN: { message: '出差申请提交后，由审批人在收件箱中批准或驳回。' },
      },
    },
    expense_request_delete_guard: {
      refusals: {
        RECORD_LOCKED: {
          message: '只有草稿状态的出差申请可以删除。要取消已批准的出差，请用「取消出差」。',
          reasons: {
            submitted: { message: '只有草稿状态的出差申请可以删除。出差申请{{name}}正在等待审批；批准后可用「取消出差」取消。' },
            approved: { message: '只有草稿状态的出差申请可以删除。出差申请{{name}}已批准；要取消这次出差，请用「取消出差」。' },
            rejected: { message: '只有草稿状态的出差申请可以删除。出差申请{{name}}已被驳回；请先退回草稿，再修改或删除。' },
            cancelled: { message: '只有草稿状态的出差申请可以删除。出差申请{{name}}已取消，会保留在记录中。' },
            closed: { message: '只有草稿状态的出差申请可以删除。出差申请{{name}}已关闭，会和它的报销单一起保留在记录中。' },
          },
        },
      },
    },
    expense_request_line_lock: {
      refusals: {
        RECORD_LOCKED: {
          message: '出差申请{{request}}已提交，因此行程明细已锁定：只能填写预订号。请先撤回到草稿再修改。',
          reasons: {
            approved: { message: '出差申请{{request}}已批准，因此行程明细已固定：只能填写预订号。如要改变计划，请取消出差并重新提交申请。' },
            cancelled: { message: '出差申请{{request}}已取消，因此行程明细已固定：只能填写预订号。' },
            closed: { message: '出差申请{{request}}已关闭，因此行程明细已固定：只能填写预订号。' },
          },
        },
      },
    },
  },
  objects: {
    crm_expense: {
      label: '费用',
      pluralLabel: '费用',
      description: '员工为公司支出的一笔费用，附有票据',
      fields: {
        owner_id: { label: '报销人' },
        name: { label: '描述' },
        expense_date: { label: '日期' },
        category: {
          label: '类别',
          options: {
            travel: '差旅',
            lodging: '住宿',
            meals: '餐饮',
            equipment: '设备',
            other: '其他',
          },
        },
        amount: { label: '金额' },
        paid_by: {
          label: '付款方',
          help: '员工本人垫付（需报销给员工），或公司直接支付。',
          options: {
            employee: '员工',
            company: '公司',
          },
        },
        merchant: { label: '商户' },
        receipt_number: { label: '票据号' },
        source: {
          label: '来源',
          help: '手工录入、智能体写入或导入。',
          options: {
            manual: '手工录入',
            agent: '智能体',
            import: '导入',
          },
        },
        is_billable: {
          label: '可计费',
          help: '这笔费用是否转嫁给客户。',
        },
        crm_expense_report: { label: '报销单' },
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
        notes: { label: '备注' },
        review_notes: { label: '检查提示', help: '检查发现的问题，供审批人阅读。' },
      },
      _views: {
        all_expenses: { label: '全部费用' },
        my_expenses: {
          label: '我的费用',
          bulkActions: {
            delete: { label: '删除', confirmLabel: '删除', confirmText: '确定要删除 {{count}} 笔费用吗？删除的记录会进入回收站，管理员可以在那里恢复。' },
          },
        },
      },
      _sections: {
        basic: { label: '费用' },
      },
      _validations: {
        expense_status_progression: { message: '不允许这样更改状态。费用跟随它的报销单：草稿 → 已提交 → 已批准或已驳回；报销单撤回或退回修改时，费用回到草稿。' },
      },
      _actions: {
        submit_for_reimbursement: { label: '提交报销', successMessage: '已提交报销，可以在「我的报销单」中查看进度。' },
        submit_trip_for_reimbursement: {
          label: '按出差申请报销',
          description: '把这些费用报销到你的一张已批准的出差申请下。',
          submitText: '提交',
          successMessage: '已按出差申请提交报销，可以在「我的报销单」中查看进度。',
          params: {
            crm_expense_request: { label: '出差申请', helpText: '这些费用是在哪一次已批准的出差中花的。' },
          },
        },
      },
    },
    crm_expense_report: {
      label: '报销单',
      pluralLabel: '报销单',
      description: '一起提交审批、报销给员工的一组费用',
      fields: {
        owner_id: { label: '提交人' },
        report_number: { label: '报销单号' },
        name: { label: '标题' },
        crm_account: { label: '客户', help: '这些支出是为哪个客户产生的（如有）。' },
        total_amount: { label: '合计' },
        reimbursable_amount: { label: '应报销', help: '员工本人垫付的费用。' },
        status: {
          label: '状态',
          options: {
            draft: '草稿',
            submitted: '已提交',
            approved: '已批准',
            paid: '已付款',
            rejected: '已驳回',
          },
        },
        approver: { label: '审批人' },
        submitted_date: { label: '提交时间' },
        approved_date: { label: '批准时间' },
        description: { label: '备注' },
        review_notes: { label: '检查提示', help: '检查发现的问题，供审批人阅读。' },
        crm_expense_request: { label: '出差申请', help: '这些费用所属的已批准出差申请。' },
        request_estimated_amount: { label: '出差预计金额', help: '出差申请上的预计金额。' },
        request_reported_amount: { label: '出差已申报', help: '这张出差申请下已提交、已批准、已付款的报销单合计。' },
        request_over_estimate: { label: '超出出差预计' },
        payment_date: { label: '付款日期' },
        payment_reference: { label: '付款参考号' },
      },
      _views: {
        all_expense_reports: { label: '全部报销单' },
        my_expense_reports: { label: '我的报销单' },
        expense_reports_to_approve: { label: '待我审批的报销单' },
        expense_reports_to_pay: { label: '待付款的报销单' },
      },
      _sections: {
        basic: { label: '报销单' },
        trip: { label: '出差申请' },
        payment: { label: '付款' },
      },
      _validations: {
        expense_report_status_progression: { message: '不允许这样更改状态。报销单按 草稿 → 已提交 → 已批准 → 已付款 推进；已提交的报销单可以撤回到草稿，被驳回的报销单退回草稿修改。' },
      },
      _actions: {
        submit_expense_report: { label: '提交', successMessage: '报销单 {{ record.name }} 已提交审批。' },
        reopen_expense_report: { label: '退回草稿', successMessage: '报销单 {{ record.name }} 已退回草稿。' },
        mark_expense_report_paid: {
          label: '标记已付款',
          successMessage: '报销单 {{ record.name }} 已标记为已付款。',
          params: {
            payment_date: { label: '付款日期' },
            payment_reference: { label: '付款参考号' },
          },
          refusals: {
            FORBIDDEN: { message: '报销单获批准后，只有财务可以把它标记为已付款。' },
            VALIDATION_FAILED: { message: '请打开报销单，再标记为已付款。' },
            RECORD_NOT_FOUND: { message: '这张报销单已不存在。' },
            CONFLICT: { message: '只有已批准的报销单可以标记为已付款。报销单{{name}}不是已批准状态。' },
          },
        },
      },
    },
    // The travel request (hotcrm#2578).
    crm_expense_request: {
      label: '出差申请',
      pluralLabel: '出差申请',
      description: '出差前的申请：去哪里、什么时候、为什么、大约花多少钱',
      fields: {
        owner_id: { label: '出差人' },
        request_number: { label: '申请编号' },
        name: { label: '出差事由' },
        destination: { label: '目的地' },
        start_date: { label: '开始日期' },
        end_date: { label: '结束日期' },
        days: { label: '天数' },
        crm_account: { label: '客户' },
        estimated_amount: { label: '预计金额', help: '整次出差的一个总数，不论由谁支付。' },
        reported_amount: { label: '已申报金额', help: '本申请下已提交、已批准、已付款的报销单合计。' },
        estimate_difference: { label: '与预计的差额', help: '已申报减去预计。大于零就是超出预计。' },
        over_estimate: { label: '超出预计' },
        itinerary: { label: '行程' },
        notes: { label: '备注' },
        source: {
          label: '来源',
          help: '手工录入、智能体写入或导入。',
          options: {
            manual: '手工录入',
            agent: '智能体',
            import: '导入',
          },
        },
        status: {
          label: '状态',
          options: {
            draft: '草稿',
            submitted: '已提交',
            approved: '已批准',
            rejected: '已驳回',
            cancelled: '已取消',
            closed: '已关闭',
          },
        },
        approver: { label: '审批人' },
        review_notes: { label: '检查提示', help: '智能体或规则发现的情况，写给审批人看。' },
      },
      _views: {
        all_travel_requests: { label: '全部出差申请' },
        my_travel_requests: { label: '我的出差申请' },
        travel_requests_to_approve: { label: '待我审批的出差申请' },
      },
      _sections: {
        trip: { label: '出差' },
        spend: { label: '花费' },
        review: { label: '审批' },
      },
      _validations: {
        expense_request_dates: { message: '结束日期不能早于开始日期。' },
        expense_request_status_progression: { message: '不允许这样更改状态。出差申请按 草稿 → 已提交 → 已批准或已驳回 推进；被驳回的申请退回草稿修改；已批准的申请在出差前取消，或在出差后关闭。' },
      },
      _actions: {
        submit_expense_request: { label: '提交', successMessage: '出差申请 {{ record.name }} 已提交审批。' },
        cancel_expense_request: { label: '取消出差', confirmText: '取消这次出差？取消后的申请不能重新打开，新的计划请重新申请。', successMessage: '出差申请 {{ record.name }} 已取消。' },
        close_expense_request: { label: '关闭', successMessage: '出差申请 {{ record.name }} 已关闭。' },
      },
    },
    crm_expense_request_line: {
      label: '行程明细',
      pluralLabel: '行程明细',
      description: '出差的一程：订什么、从哪里到哪里、什么时候',
      fields: {
        crm_expense_request: { label: '出差申请' },
        line_number: { label: '行号' },
        kind: {
          label: '类型',
          options: {
            flight: '航班',
            train: '火车',
            car: '用车',
            hotel: '酒店',
            other: '其他',
          },
        },
        origin: { label: '出发地' },
        destination: { label: '到达地', help: '这一程去哪里，或酒店在哪里。' },
        start_date: { label: '开始日期' },
        end_date: { label: '结束日期', help: '酒店填退房日期；当天的一程可以不填。' },
        details: { label: '要求', help: '座位、酒店或其他要求。' },
        booking_reference: { label: '预订号', help: '预订后由出差人、智能助手或代订人填写的确认号。' },
      },
      _views: {
        all_itinerary_lines: { label: '全部行程明细' },
      },
      _sections: {
        leg: { label: '行程' },
        booking: { label: '预订' },
      },
      _validations: {
        expense_request_line_dates: { message: '结束日期不能早于开始日期。' },
      },
    },
    crm_expense_standard: {
      label: '费用标准',
      pluralLabel: '费用标准',
      description: '公司规定的花费标准，供员工和助手查阅；系统本身不据此校验或拦截',
      fields: {
        owner_id: { label: '负责人' },
        name: { label: '名称', help: '例如「住宿，一线城市」。' },
        category: {
          label: '类别',
          help: '这条标准针对的费用类别。留空表示适用于所有类别。',
          options: {
            travel: '差旅',
            lodging: '住宿',
            meals: '餐饮',
            equipment: '设备',
            other: '其他',
          },
        },
        limit_amount: { label: '限额', help: '最多可花的金额，以组织本位币计。只有文字说明的标准留空。' },
        limit_per: {
          label: '计算单位',
          help: '限额按什么计算。',
          options: {
            night: '每晚',
            day: '每天',
            item: '每笔',
            trip: '每次出差',
          },
        },
        applies_to: { label: '适用范围', help: '用文字写明适用于谁、哪里，例如「经理及以上」或「一线城市」。' },
        details: { label: '说明', help: '数字说不清的部分：例外情况、包含什么、找谁确认。' },
        is_active: { label: '启用', help: '取消勾选即可停用一条标准，而不必删除。' },
      },
      _views: {
        all_expense_standards: { label: '费用标准' },
      },
      _sections: {
        basic: { label: '费用标准' },
      },
    },
  },
  // Step names the approval request shows the submitter and the approvers.
  flows: {
    expense_report_approval: {
      label: '报销单审批',
      approvals: {
        approver_review: { label: '上级审核' },
        finance_review: { label: '财务控制审核' },
      },
    },
    expense_request_approval: {
      label: '出差申请审批',
      approvals: {
        approver_review: { label: '上级审核' },
      },
    },
    expense_request_approval_on_create: {
      label: '出差申请审批（创建时）',
      approvals: {
        approver_review: { label: '上级审核' },
      },
    },
  },
  apps: {
    crm_expenses: {
      label: '费用报销',
      description: '你为公司支出的费用及其票据、事先申请的出差、报销这些费用的报销单，以及等待你审批的事项',
      navigation: {
        group_expenses: { label: '费用' },
        nav_my_expenses: { label: '我的费用' },
        nav_my_expense_reports: { label: '我的报销单' },
        nav_expense_reports_to_approve: { label: '待我审批的报销单' },
        nav_expense_reports_to_pay: { label: '待付款的报销单' },
        nav_all_expenses: { label: '全部费用' },
        nav_expense_standards: { label: '费用标准' },
        group_travel_requests: { label: '出差申请' },
        nav_my_travel_requests: { label: '我的出差申请' },
        nav_travel_requests_to_approve: { label: '待我审批的出差申请' },
        nav_all_travel_requests: { label: '全部出差申请' },
        group_work: { label: '我的工作' },
        nav_approval_requests: { label: '待我审批' },
        group_help: { label: '帮助' },
        nav_help_expense: { label: '费用报销手册' },
      },
    },
    // My Expenses, Reports to Approve and My Travel Requests, contributed into the Project Delivery app.
    crm_psa: {
      navigation: {
        nav_my_expenses: { label: '我的费用' },
        nav_expense_reports_to_approve: { label: '待我审批的报销单' },
        nav_my_travel_requests: { label: '我的出差申请' },
      },
    },
  },
  books: {
    crm_expense_manual: {
      label: 'HotCRM 费用报销手册',
      description: '带票据录入费用、出差前申请、用报销单提交、由谁审批、如何报销给员工、什么计入项目，以及助手能替你做什么。',
      groups: { expense: { label: '费用报销' } },
    },
  },
};
