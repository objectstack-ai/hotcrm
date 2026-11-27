// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

/**
 * 简体中文 (zh-CN) — the Order to Cash module's own translations: every row whose
 * target this package registers. Why they live here and not in the app
 * package's pack: `./index.ts`.
 */
export const zhCN: TranslationData = {
  hooks: {
    payment_plan_step_stamp: {
      refusals: {
        VALIDATION_FAILED: {
          message: '这张发票属于另一个客户。请选择这笔回款所属客户的发票。',
          reasons: {
            named: { message: '{{invoice}}属于另一个客户。请选择这笔回款所属客户的发票。' },
            milestone_named: { message: '{{milestone}}属于另一个客户。请选择这笔回款所属客户的回款计划。' },
            invoice_milestone: { message: '{{invoice}}计入的回款计划{{milestone}}属于另一个客户。请更正这张发票的回款计划，或选择另一张发票。' },
          },
        },
      },
    },
    billing_milestone_row_stamp: {
      refusals: {
        VALIDATION_FAILED: {
          message: '这份合同属于另一个客户。请选择这个客户的合同，或不填客户、由合同带出。',
          reasons: {
            named: { message: '{{contract}}属于另一个客户。请选择这个客户的合同，或不填客户、由合同带出。' },
          order_named: { message: '{{order}}属于另一个客户。请选择这个客户的订单，或不填客户、由订单带出。' },
          order_contract: { message: '{{order}}归在另一份合同下。请不填合同、由订单带出，或选择订单自己的合同。' },
          apart: { message: '{{order}}和{{contract}}属于不同的客户。请选择同一客户的订单和合同。' },
          },
        },
      },
    },
    invoice_row_stamp: {
      refusals: {
        VALIDATION_FAILED: {
          message: '这份合同属于另一个客户。请选择这个客户的合同，或不填客户、由合同带出。',
          reasons: {
            named: { message: '{{contract}}属于另一个客户。请选择这个客户的合同，或不填客户、由合同带出。' },
          order_named: { message: '{{order}}属于另一个客户。请选择这个客户的订单，或不填客户、由订单带出。' },
          order_contract: { message: '{{order}}归在另一份合同下。请不填合同、由订单带出，或选择订单自己的合同。' },
          apart: { message: '{{order}}和{{contract}}属于不同的客户。请选择同一客户的订单和合同。' },
          },
        },
      },
    },
    invoice_plan_step_guard: {
      refusals: {
        VALIDATION_FAILED: {
          message: '这个回款计划属于另一个客户。请选择这张发票所属客户的回款计划。',
          reasons: {
            milestone_named: { message: '{{milestone}}属于另一个客户。请选择这张发票所属客户的回款计划。' },
          },
        },
      },
    },
    payment_row_stamp: {
      refusals: {
        VALIDATION_FAILED: {
          message: '这份合同属于另一个客户。请选择这个客户的合同，或不填客户、由合同带出。',
          reasons: {
            named: { message: '{{contract}}属于另一个客户。请选择这个客户的合同，或不填客户、由合同带出。' },
          order_named: { message: '{{order}}属于另一个客户。请选择这个客户的订单，或不填客户、由订单带出。' },
          order_contract: { message: '{{order}}归在另一份合同下。请不填合同、由订单带出，或选择订单自己的合同。' },
          apart: { message: '{{order}}和{{contract}}属于不同的客户。请选择同一客户的订单和合同。' },
          },
        },
      },
    },
  },
  objects: {
    crm_billing_milestone: {
      label: '回款计划',
      pluralLabel: '回款计划',
      description: '客户回款计划中的一步，按订单或合同制定：应收多少、何时收，以及其中已回款的金额',
      _validations: {
        billing_milestone_source: { message: '请选择这个节点所属的订单或合同。' },
      },
      fields: {
        name: {
          label: '节点名称',
          help: '合同里这一步的说法，例如「预付款 30%」「上线」「第二年」。',
        },
        crm_sales_order: {
          label: '订单',
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
          label: '全部回款计划',
        },
        planned_this_month: {
          label: '本月计划回款',
        },
        overdue_billing_milestones: {
          label: '逾期回款计划',
        },
      },
      _sections: {
        basic: {
          label: '回款计划',
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
      description: '财务开给客户的发票，挂在订单或合同上',
      fields: {
        invoice_number: {
          label: '发票号码',
          help: '财务开具的发票上的号码。',
        },
        crm_sales_order: {
          label: '订单',
        },
        crm_contract: {
          label: '合同',
        },
        crm_billing_milestone: {
          label: '回款计划',
        },
        crm_account: {
          label: '客户',
        },
        issue_date: {
          label: '开票日期',
        },
        due_date: {
          label: '到期日',
          help: '留空时，为开票日期加上合同的付款条款；没有合同或合同未填付款条款时，取订单的付款条款。两者都没有时请填写。',
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
        overpaid_amount: {
          label: '多付',
          help: '实际付款超出发票金额的部分。发票按已付清处理；多付的金额不会冲抵其他发票。',
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
      },
      _sections: {
        basic: {
          label: '发票',
        },
        source: {
          label: '来源',
        },
      },
    },
    crm_payment: {
      label: '回款',
      pluralLabel: '回款',
      description: '客户付来的款项：对应回款计划、订单、合同，或暂时都不对应',
      fields: {
        payment_number: {
          label: '回款编号',
        },
        crm_sales_order: {
          label: '订单',
        },
        crm_contract: {
          label: '合同',
        },
        crm_invoice: {
          label: '发票',
        },
        crm_billing_milestone: {
          label: '回款计划',
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
    // The order's figures, added by this package through `objectExtensions`
    // (hotcrm#2560).
    crm_sales_order: {
      fields: {
        planned_amount: {
          label: '计划回款',
          help: '回款计划各节点的计划金额合计。',
        },
        invoiced_amount: {
          label: '已开票',
          help: '已开具发票的金额合计，已作废的发票不计入。',
        },
        received_amount: {
          label: '已回款',
          help: '已收到回款的金额合计。',
        },
        unpaid_amount: {
          label: '未回款',
          help: '金额减去已回款，不低于 0。',
        },
        uninvoiced_amount: {
          label: '未开票',
          help: '金额减去已开票（已开具的发票），不低于 0。',
        },
        plan_differs: {
          label: '回款计划与订单金额不符',
          help: '回款计划的合计不等于订单总价。请修改、拆分或新增回款计划，使合计等于订单金额。',
        },
      },
    },
    // The contract's and the account's receivables figures, added by this
    // package through `objectExtensions` (#2416).
    crm_contract: {
      fields: {
        planned_amount: {
          label: '计划回款',
          help: '回款计划各节点的计划金额合计。',
        },
        invoiced_amount: {
          label: '已开票',
          help: '已开具发票的金额合计，已作废的发票不计入。',
        },
        received_amount: {
          label: '已回款',
          help: '已收到回款的金额合计。',
        },
        unpaid_amount: {
          label: '未回款',
          help: '合同有订单时为订单金额，没有订单时为合同金额，减去已回款，不低于 0。',
        },
        uninvoiced_amount: {
          label: '未开票',
          help: '合同有订单时为订单金额，没有订单时为合同金额，减去已开票（已开具的发票），不低于 0。',
        },
        order_count: {
          label: '订单数',
        },
      },
    },
    crm_account: {
      fields: {
        invoiced_amount: {
          label: '已开票',
          help: '已开具发票的金额合计，已作废的发票不计入。',
        },
        received_amount: {
          label: '已回款',
          help: '已收到回款的金额合计。',
        },
        unpaid_amount: {
          label: '未回款',
          help: '客户已确认和已完成的订单，以及没有订单的已签合同，各自还未收回的金额（各自金额减已回款，不低于 0）之和。',
        },
        uninvoiced_amount: {
          label: '未开票',
          help: '客户已确认和已完成的订单，以及没有订单的已签合同，各自还未开票的金额（各自金额减已开具发票，不低于 0）之和。',
        },
        unpaid_on_orders: {
          label: '订单未回款',
        },
        unpaid_on_contracts: {
          label: '合同未回款',
        },
        uninvoiced_on_orders: {
          label: '订单未开票',
        },
        uninvoiced_on_contracts: {
          label: '合同未开票',
        },
      },
    },
  },
  apps: {
    // The ids this package contributes into the Sales app: the collection
    // plan the reps write, and the manual (#2465).
    crm_enterprise: {
      navigation: {
        nav_billing_milestones: {
          label: '回款计划',
        },
        nav_help_o2c: {
          label: '订单与回款手册',
        },
      },
    },
    // This package's own app, finance's (#2465).
    crm_o2c: {
      label: '订单与回款',
      description: '发票、回款和回款计划，以及它们所属的合同和客户',
      navigation: {
        group_receivables: { label: '应收' },
        group_follow_up: { label: '跟进' },
        group_customers: { label: '订单、合同与客户' },
        group_work: { label: '我的工作' },
        group_help: { label: '帮助' },
        nav_invoices: { label: '发票' },
        nav_payments: { label: '回款' },
        nav_billing_milestones: { label: '回款计划' },
        nav_overdue_billing_milestones: { label: '逾期回款计划' },
        nav_planned_this_month: { label: '本月计划回款' },
        nav_approval_requests: { label: '待我审批' },
        nav_help_o2c: { label: '订单与回款手册' },
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
  // An import mapping's label, as the import wizard offers it (a key
  // since 18.6.0; before it the wizard showed the English text in every locale).
  mappings: {
    crm_invoice_import: { label: '发票导入（CSV）' },
    crm_payment_import: { label: '回款导入（CSV）' },
  },
};
