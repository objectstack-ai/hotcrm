import type { TranslationData } from '@objectstack/spec/system';

/**
 * 简体中文 (zh) — Finance Cloud Translations
 *
 * Per-locale file: one file per language, following the `per_locale` convention.
 */
export const zh: TranslationData = {
  objects: {
    contract: {
      label: '合同',
      pluralLabel: '合同',
      fields: {
        contract_number: { label: '合同编号' },
        account: { label: '客户' },
        opportunity: { label: '商机' },
        status: {
          label: '状态',
          options: {
            Draft: '草稿', 'In Approval': '审批中', Activated: '已激活',
            'On Hold': '已暂停', Completed: '已完成', Terminated: '已终止',
          },
        },
        start_date: { label: '开始日期' },
        end_date: { label: '结束日期' },
        contract_term: { label: '合同期限（月）', help: '合同持续时间（月）' },
        contract_value: { label: '合同金额' },
      },
    },

    invoice: {
      label: '发票',
      pluralLabel: '发票',
      fields: {
        invoice_number: { label: '发票编号' },
        account: { label: '客户' },
        contract: { label: '合同' },
        status: {
          label: '状态',
          options: { Draft: '草稿', Posted: '已过账', Paid: '已付款', Void: '已作废' },
        },
        total_amount: { label: '总金额' },
        due_date: { label: '到期日期' },
        payment_terms: {
          label: '付款条件',
          options: {
            'Due on Receipt': '收到即付', 'Net 15': '15天内付款',
            'Net 30': '30天内付款', 'Net 60': '60天内付款',
          },
        },
        line_item_count: { label: '行项目数', help: '此发票的行项目数量' },
        calculated_subtotal: { label: '小计' },
      },
    },

    invoice_line: {
      label: '发票行项目',
      pluralLabel: '发票行项目',
      fields: {
        invoice: { label: '发票' },
        product: { label: '产品' },
        description: { label: '描述' },
        quantity: { label: '数量' },
        unit_price: { label: '单价' },
        amount: { label: '金额' },
      },
    },

    payment: {
      label: '付款',
      pluralLabel: '付款',
      fields: {
        payment_number: { label: '付款编号' },
        name: { label: '付款名称' },
        type: {
          label: '类型',
          options: {
            'Down Payment': '首付款', 'Milestone Payment': '里程碑付款',
            'Delivery Payment': '交付付款', 'Acceptance Payment': '验收付款',
            'Final Payment': '尾款', 'Recurring Payment': '周期性付款',
            'Maintenance Fee': '维护费', Other: '其他',
          },
        },
        status: {
          label: '状态',
          options: {
            Planned: '计划中', Invoiced: '已开票', Received: '已收款',
            Overdue: '已逾期', 'Written Off': '已核销', Cancelled: '已取消',
          },
        },
        account: { label: '客户' },
        opportunity: { label: '关联商机' },
        contract: { label: '关联合同' },
        quote: { label: '关联报价' },
        planned_amount: { label: '计划金额' },
        received_amount: { label: '已收金额' },
        planned_date: { label: '计划日期' },
        actual_date: { label: '实际日期' },
        payment_method: {
          label: '付款方式',
          options: {
            'Bank Transfer': '银行转账', Check: '支票', Cash: '现金',
            'Credit Card': '信用卡', Alipay: '支付宝',
            'WeChat Pay': '微信支付', Other: '其他',
          },
        },
        invoice_number: { label: '发票编号' },
      },
    },

    credit_note: {
      label: '贷项通知单',
      pluralLabel: '贷项通知单',
      fields: {
        credit_note_number: { label: '贷项通知单编号' },
        invoice_id: { label: '原始发票' },
        account_id: { label: '客户' },
        status: {
          label: '状态',
          options: { Draft: '草稿', Issued: '已签发', Applied: '已冲销', Void: '已作废' },
        },
        credit_date: { label: '贷项日期' },
        amount: { label: '贷项金额' },
        tax_amount: { label: '税额' },
        total_amount: { label: '总金额' },
        reason: {
          label: '原因',
          options: {
            'Billing Error': '账单错误', 'Product Return': '产品退货',
            'Service Issue': '服务问题', 'Price Adjustment': '价格调整',
            'Duplicate Payment': '重复付款', 'Contract Cancellation': '合同取消',
            Other: '其他',
          },
        },
        notes: { label: '备注' },
        applied_to_invoice_id: { label: '冲销至发票' },
        remaining_balance: { label: '剩余余额' },
        approved_by_id: { label: '审批人' },
        approved_date: { label: '审批日期' },
      },
    },

    billing_schedule: {
      label: '账单计划',
      pluralLabel: '账单计划',
      fields: {
        name: { label: '计划名称' },
        contract_id: { label: '合同' },
        account_id: { label: '客户' },
        status: {
          label: '状态',
          options: {
            Draft: '草稿', Active: '活跃', Paused: '已暂停',
            Completed: '已完成', Cancelled: '已取消',
          },
        },
        frequency: {
          label: '账单频率',
          options: {
            Weekly: '每周', Monthly: '每月', Quarterly: '每季度',
            'Semi-Annually': '每半年', Annually: '每年', Custom: '自定义',
          },
        },
        billing_day: { label: '账单日', help: '每月生成发票的日期' },
        start_date: { label: '开始日期' },
        end_date: { label: '结束日期' },
        next_billing_date: { label: '下次账单日期' },
        amount: { label: '账单金额' },
        tax_rate: { label: '税率' },
        total_billed: { label: '已开票总额' },
        total_remaining: { label: '剩余总额' },
        invoices_generated: { label: '已生成发票数', help: '此计划已创建的发票总数' },
        auto_generate_invoice: { label: '自动生成发票' },
        payment_terms: {
          label: '付款条件',
          options: {
            'Due on Receipt': '收到即付', 'Net 15': '15天内付款',
            'Net 30': '30天内付款', 'Net 45': '45天内付款',
            'Net 60': '60天内付款', 'Net 90': '90天内付款',
          },
        },
        last_invoice_date: { label: '上次开票日期' },
        owner_id: { label: '负责人' },
      },
    },

    revenue_schedule: {
      label: '收入确认计划',
      pluralLabel: '收入确认计划',
      fields: {
        name: { label: '计划名称' },
        contract_id: { label: '合同' },
        invoice_id: { label: '发票' },
        recognition_rule_id: { label: '确认规则' },
        status: {
          label: '状态',
          options: {
            Draft: '草稿', Active: '活跃', Completed: '已完成',
            Suspended: '已暂停', Cancelled: '已取消',
          },
        },
        total_amount: { label: '总金额' },
        recognized_amount: { label: '已确认金额' },
        deferred_amount: { label: '递延金额' },
        recognition_start_date: { label: '确认开始日期' },
        recognition_end_date: { label: '确认结束日期' },
        recognition_method: {
          label: '确认方法',
          options: {
            'Straight Line': '直线法', Milestone: '里程碑法',
            'Percentage of Completion': '完工百分比法',
            'Point in Time': '时点确认法', 'As Invoiced': '按开票确认',
          },
        },
        frequency: {
          label: '确认频率',
          options: { Monthly: '每月', Quarterly: '每季度', Annually: '每年' },
        },
        periods_total: { label: '总期数' },
        periods_recognized: { label: '已确认期数' },
        amount_per_period: { label: '每期金额' },
        next_recognition_date: { label: '下次确认日期' },
        last_recognition_date: { label: '上次确认日期' },
        currency_code: { label: '币种' },
        notes: { label: '备注' },
        owner_id: { label: '负责人' },
      },
    },

    revenue_recognition_rule: {
      label: '收入确认规则',
      pluralLabel: '收入确认规则',
      fields: {
        name: { label: '规则名称' },
        description: { label: '描述' },
        rule_type: {
          label: '规则类型',
          options: {
            'Product-Based': '基于产品', 'Service-Based': '基于服务',
            Subscription: '订阅', License: '许可',
            Milestone: '里程碑', Custom: '自定义',
          },
        },
        recognition_method: {
          label: '默认方法',
          options: {
            'Straight Line': '直线法', Milestone: '里程碑法',
            'Percentage of Completion': '完工百分比法',
            'Point in Time': '时点确认法', 'As Invoiced': '按开票确认',
          },
        },
        applicable_products: { label: '适用产品' },
        performance_obligation: { label: '履约义务' },
        recognition_trigger: {
          label: '确认触发条件',
          options: {
            'Contract Start': '合同开始', 'Service Delivery': '服务交付',
            'Customer Acceptance': '客户验收', 'Milestone Completion': '里程碑完成',
            'Invoice Date': '开票日期',
          },
        },
        is_active: { label: '启用' },
        effective_date: { label: '生效日期' },
        expiration_date: { label: '失效日期' },
        compliance_standard: {
          label: '合规标准',
          options: { 'ASC 606': 'ASC 606', 'IFRS 15': 'IFRS 15', Both: '两者兼有' },
        },
        auto_create_schedule: { label: '自动创建计划' },
        priority: { label: '优先级', help: '数字越小优先级越高' },
        owner_id: { label: '负责人' },
      },
    },

    payment_method: {
      label: '付款方式',
      pluralLabel: '付款方式',
      fields: {
        account_id: { label: '客户' },
        type: {
          label: '付款类型',
          options: {
            'Credit Card': '信用卡', 'Bank Transfer (ACH)': '银行转账 (ACH)',
            'Wire Transfer': '电汇', Check: '支票',
            PayPal: 'PayPal', 'Direct Debit': '直接借记',
          },
        },
        status: {
          label: '状态',
          options: {
            Active: '有效', Expired: '已过期',
            Inactive: '已停用', 'Verification Pending': '待验证',
          },
        },
        is_default: { label: '默认付款方式' },
        card_last_four: { label: '卡号后四位' },
        card_brand: {
          label: '卡品牌',
          options: { Visa: 'Visa', Mastercard: 'Mastercard', Amex: 'Amex', Discover: 'Discover' },
        },
        expiration_month: { label: '到期月份' },
        expiration_year: { label: '到期年份' },
        bank_name: { label: '银行名称' },
        bank_account_last_four: { label: '账号后四位' },
        billing_address: { label: '账单地址' },
        nickname: { label: '昵称' },
        payment_gateway: { label: '支付网关' },
        gateway_token: { label: '网关令牌' },
        last_used_date: { label: '最近使用日期' },
        verified: { label: '已验证' },
        owner_id: { label: '负责人' },
      },
    },
  },

  apps: {
    finance: {
      label: '财务',
      description: '涵盖合同、发票、付款和收入确认的收入云管理系统',
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
    'common.import': '导入',
    'common.back': '返回',
    'common.confirm': '确认',
    'common.refresh': '刷新',
    'nav.finance': '财务',
    'nav.revenue_recognition': '收入确认',
    'nav.views_dashboards': '视图与仪表盘',
    'nav.finance_dashboard': '财务仪表盘',
    'success.saved': '记录保存成功',
    'success.deleted': '记录删除成功',
    'success.invoice_posted': '发票过账成功',
    'success.payment_received': '付款记录成功',
    'success.contract_activated': '合同激活成功',
    'success.credit_note_issued': '贷项通知单签发成功',
    'success.revenue_recognized': '收入确认成功',
    'confirm.delete': '确定要删除此记录吗？',
    'confirm.post_invoice': '确认过账此发票？此操作不可撤销。',
    'confirm.void_invoice': '确认作废此发票？这将冲销所有相关条目。',
    'confirm.activate_contract': '确认激活此合同？',
    'error.required': '此字段为必填项',
    'error.load_failed': '数据加载失败',
    'error.save_failed': '保存记录失败',
    'error.payment_failed': '付款处理失败',
    'error.invoice_generation_failed': '发票生成失败',
  },

  validationMessages: {
    contract_dates_invalid: '合同结束日期必须晚于开始日期',
    invoice_amount_required: '发票金额必须大于零',
    payment_exceeds_invoice: '付款金额超出发票总额',
    credit_note_exceeds_invoice: '贷项通知单金额不能超过原始发票总额',
    billing_schedule_dates_invalid: '账单计划结束日期必须晚于开始日期',
    revenue_amount_mismatch: '已确认金额不能超过总金额',
    payment_method_expired: '此付款方式已过期',
    duplicate_invoice_number: '此发票编号已存在',
  },
};
