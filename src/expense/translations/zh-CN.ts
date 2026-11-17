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
      },
      _views: {
        all_expenses: { label: '全部费用' },
        my_expenses: {
          label: '我的费用',
          bulkActions: {
            delete: { label: '删除', confirmLabel: '删除', confirmText: '确定要永久删除 {{count}} 笔费用吗？此操作无法撤销。' },
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
        },
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
    expense_report_project_approval: {
      label: '项目报销单审批',
      approvals: {
        approver_review: { label: '项目经理审核' },
        finance_review: { label: '财务控制审核' },
      },
    },
  },
  apps: {
    crm_expenses: {
      label: '费用报销',
      description: '你为公司支出的费用、报销这些费用的报销单，以及等待你审批的报销单',
      navigation: {
        group_expenses: { label: '费用' },
        nav_my_expenses: { label: '我的费用' },
        nav_my_expense_reports: { label: '我的报销单' },
        nav_expense_reports_to_approve: { label: '待我审批的报销单' },
        nav_expense_reports_to_pay: { label: '待付款的报销单' },
        nav_all_expenses: { label: '全部费用' },
        group_work: { label: '我的工作' },
        nav_approval_requests: { label: '待我审批' },
        group_help: { label: '帮助' },
        nav_help_expense: { label: '费用报销手册' },
      },
    },
    // My Expenses and Reports to Approve, contributed into the Project Delivery app.
    crm_psa: {
      navigation: {
        nav_my_expenses: { label: '我的费用' },
        nav_expense_reports_to_approve: { label: '待我审批的报销单' },
      },
    },
  },
  books: {
    crm_expense_manual: {
      label: 'HotCRM 费用报销手册',
      description: '带票据录入费用、用报销单提交、由谁审批、如何报销给员工，以及什么计入项目。',
      groups: { expense: { label: '费用报销' } },
    },
  },
};
