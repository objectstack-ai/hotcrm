// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

/**
 * 简体中文 (zh-CN) — the expense module's own translations (hotcrm#2556): every
 * row whose target this package registers. The object's rows moved here from
 * Project Delivery with the object; the Project field's label stays in that
 * module's pack, which contributes the field. Why per package: `./index.ts`.
 */
export const zhCN: TranslationData = {
  hooks: {
    expense_decision_guard: {
      refusals: {
        FORBIDDEN: { message: '费用提交后，由审批人在收件箱中批准或驳回。' },
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
          help: '员工本人（需要报销给他），或公司。',
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
        my_expenses: { label: '我的费用' },
        expenses_to_approve: { label: '待我审批的费用' },
      },
      _sections: {
        basic: { label: '费用' },
      },
      _validations: {
        expense_status_progression: { message: '不允许这样更改状态。费用按 草稿 → 已提交 → 已批准或已驳回 推进；被驳回的费用退回草稿修改。' },
      },
    },
  },
  // Step names the approval request shows the submitter and the approvers.
  flows: {
    expense_approval: {
      label: '费用审批',
      approvals: {
        approver_review: { label: '上级审核' },
        finance_review: { label: '财务控制审核' },
      },
    },
    expense_approval_on_create: {
      label: '费用审批（创建时）',
      approvals: {
        approver_review: { label: '上级审核' },
        finance_review: { label: '财务控制审核' },
      },
    },
  },
  apps: {
    crm_expenses: {
      label: '费用报销',
      description: '你为公司支出的费用及其票据，以及等待你审批的费用',
      navigation: {
        group_expenses: { label: '费用' },
        nav_my_expenses: { label: '我的费用' },
        nav_expenses_to_approve: { label: '待我审批的费用' },
        nav_all_expenses: { label: '全部费用' },
        group_work: { label: '我的工作' },
        nav_approval_requests: { label: '待我审批' },
        group_help: { label: '帮助' },
        nav_help_expense: { label: '费用报销手册' },
      },
    },
    // My Expenses and Expenses to Approve, contributed into the Project Delivery app.
    crm_psa: {
      navigation: {
        nav_my_expenses: { label: '我的费用' },
        nav_expenses_to_approve: { label: '待我审批的费用' },
      },
    },
  },
  books: {
    crm_expense_manual: {
      label: 'HotCRM 费用报销手册',
      description: '带票据录入费用、由谁审批，以及什么计入项目。',
      groups: { expense: { label: '费用报销' } },
    },
  },
};
