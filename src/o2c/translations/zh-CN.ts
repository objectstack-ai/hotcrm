// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

/**
 * 简体中文 (zh-CN) — the Order to Cash module's own translations: every row whose
 * target this package registers. Why they live here and not in the app
 * package's pack: `./index.ts`.
 */
export const zhCN: TranslationData = {
  objects: {
    crm_billing_milestone: {
      label: '回款节点',
      pluralLabel: '回款节点',
      description: '合同回款计划中的一步：应收多少、何时收，以及其中已开票和已回款的金额',
      fields: {
        name: {
          label: '节点名称',
          help: '合同里这一步的说法，例如「预付款 30%」「上线」「第二年」。',
        },
        crm_contract: {
          label: '合同',
        },
        crm_account: {
          label: '客户',
        },
        planned_amount: {
          label: '计划金额',
        },
        planned_date: {
          label: '计划日期',
        },
        accepted_date: {
          label: '验收日期',
          help: '按验收付款的节点：客户签字验收的日期。',
        },
        invoiced_amount: {
          label: '已开票',
        },
        received_amount: {
          label: '已回款',
        },
        open_amount: {
          label: '未回款',
        },
        description: {
          label: '备注',
        },
      },
      _views: {
        all_billing_milestones: {
          label: '全部回款节点',
        },
        planned_this_month: {
          label: '本月计划回款',
        },
      },
      _sections: {
        basic: {
          label: '回款节点',
        },
        plan: {
          label: '计划',
        },
        figures: {
          label: '回款情况',
        },
      },
    },
    crm_invoice: {
      label: '发票',
      pluralLabel: '发票',
      description: '财务针对合同开具的发票，以及其中已付的金额',
      fields: {
        invoice_number: {
          label: '发票号码',
          help: '财务开具的发票上的号码。',
        },
        crm_contract: {
          label: '合同',
        },
        crm_billing_milestone: {
          label: '回款节点',
        },
        crm_account: {
          label: '客户',
        },
        issue_date: {
          label: '开票日期',
        },
        due_date: {
          label: '到期日',
          help: '留空时，为开票日期加上合同的付款条件。',
        },
        status: {
          label: '状态',
          options: {
            issued: '已开具',
            cancelled: '已作废',
          },
        },
        amount: {
          label: '金额',
          help: '开票金额，含税。',
        },
        paid_amount: {
          label: '已付',
        },
        open_amount: {
          label: '未付',
        },
        invoice_file: {
          label: '发票文件',
        },
        source: {
          label: '来源',
          help: '导入包括电子表格、财务软件的导出文件，以及 ERP 按同一编号写入。',
          options: {
            manual: '手工录入',
            import: '导入',
          },
        },
        erp_ref: {
          label: 'ERP 编号',
          help: '这张发票在财务系统中的编号。导入同一编号的行会更新这张发票。',
        },
        synced_at: {
          label: '同步时间',
        },
      },
      _views: {
        all_invoices: {
          label: '全部发票',
        },
        overdue_invoices: {
          label: '逾期发票',
        },
      },
      _sections: {
        basic: {
          label: '发票',
        },
        amounts: {
          label: '金额',
        },
        source: {
          label: '来源',
        },
      },
    },
    crm_payment: {
      label: '回款',
      pluralLabel: '回款',
      description: '针对合同、发票或回款节点收到的款项',
      fields: {
        payment_number: {
          label: '回款编号',
        },
        crm_contract: {
          label: '合同',
        },
        crm_invoice: {
          label: '发票',
        },
        crm_billing_milestone: {
          label: '回款节点',
        },
        crm_account: {
          label: '客户',
        },
        payment_date: {
          label: '回款日期',
        },
        amount: {
          label: '金额',
        },
        method: {
          label: '方式',
          options: {
            bank_transfer: '银行转账',
            other: '其他',
          },
        },
        source: {
          label: '来源',
          options: {
            manual: '手工录入',
            import: '导入',
          },
        },
        erp_ref: {
          label: 'ERP 编号',
          help: '这笔回款在财务系统中的编号。导入同一编号的行会更新这笔回款。',
        },
        synced_at: {
          label: '同步时间',
        },
      },
      _views: {
        all_payments: {
          label: '全部回款',
        },
      },
      _sections: {
        basic: {
          label: '回款',
        },
        source: {
          label: '来源',
        },
      },
    },
  },
  apps: {
    crm_enterprise: {
      navigation: {
        nav_billing_milestones: {
          label: '回款计划',
        },
        nav_invoices: {
          label: '发票',
        },
        nav_payments: {
          label: '回款',
        },
        nav_help_o2c: {
          label: '订单与回款手册',
        },
      },
    },
  },
  books: {
    crm_o2c_manual: {
      label: 'HotCRM 订单与回款手册',
      description: '回款计划、发票与回款：每个数字统计的是什么，由谁录入。',
      groups: {
        o2c: {
          label: '订单与回款',
        },
      },
    },
  },
};
