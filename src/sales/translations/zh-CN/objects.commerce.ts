// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { ObjectTranslationData } from '@objectstack/spec/system';

/**
 * 简体中文 (zh-CN) — `objects` translations for the COMMERCE family:
 * what gets sold and on what paper — quotes, contracts, products.
 *
 * Roster: `crm_quote`, `crm_quote_line_item`, `crm_contract`, `crm_sales_order`,
 * `crm_sales_order_line`, `crm_product`,
 * `crm_price_book`, `crm_price_book_entry`.
 *
 * SPLIT AXIS (#1311): translation NAMESPACE first, then CRM DOMAIN FAMILY.
 * Everything that is not `objects` lives in `./app.ts`; `objects` — 69-78% of
 * every bundle — is one file per CRM domain family, and a detail object
 * follows its master. A new row goes in the file for ITS family, never in
 * whichever file is already open: that is how one file re-grows past the 70%
 * advisory band `pnpm hygiene` prints. Full rule and rationale:
 * `src/sales/translations/zh-CN.ts`.
 */
export const commerce: Record<string, ObjectTranslationData> = {
  crm_contract: {
    _validations: {
      end_after_start: {
        message: '结束日期必须晚于开始日期',
      },
      contract_status_progression: {
        message: '不允许这样更改状态。合同按 草稿 → 审批中 → 已激活 → 已过期 推进；审批中可以退回草稿，草稿、审批中或已激活的合同可以改为已终止。已过期和已终止是最终状态：续约是一份新合同。',
      },
    },
    label: '合同',
    pluralLabel: '合同',
    description: '与客户签署的法律合同',
    fields: {
      contract_number: { label: '合同编号' },
      name: { label: '合同名称' },
      crm_account: { label: '所属客户' },
      status: {
        label: '状态',
        options: {
          draft: '草稿', in_approval: '审批中', activated: '已激活',
          expired: '已过期', terminated: '已终止',
        },
      },
      start_date: { label: '开始日期' },
      end_date: { label: '结束日期' },
      contract_value: { label: '合同金额' },
      description: { label: '描述' },
      automation_key: { label: '自动化标识', help: '起草此合同的自动化。由该自动化写入，请勿编辑。' },
      crm_contact: { label: '主要联系人' },
      crm_opportunity: { label: '关联商机' },
      owner_id: { label: '合同负责人' },
      contract_term_months: { label: '合同期限（月）' },
      billing_frequency: {
        label: '计费周期',
        options: { monthly: '按月', quarterly: '按季度', annually: '按年', one_time: '一次性' },
      },
      payment_terms: { label: '付款条款' },
      auto_renewal: { label: '自动续约' },
      renewal_notice_days: { label: '续约通知（天）' },
      contract_type: {
        label: '合同类型',
        options: {
          subscription: '订阅合同', service: '服务协议', license: '授权许可',
          partnership: '合作协议', nda: '保密协议', msa: '主服务协议',
        },
      },
      signed_date: { label: '签署日期' },
      signed_by: { label: '签署人' },
      // The countersigned copy (#2317).
      signed_copy: {
        label: '签署副本',
        help: '客户签回的合同。激活合同前必须上传；上传时如签署日期为空，会自动填为当天。',
      },
      document_url: { label: '合同文档' },
      special_terms: { label: '特殊条款' },
      billing_address: { label: '账单地址' },
      // The contract's form, an order contract's amount and Change (#2804).
      contract_form: {
        label: '合同形式',
        help: '订单合同：由订单起草，金额就是订单金额。框架合同：金额手工填写，可挂多张订单。其他：没有金额，例如保密协议。',
        options: { order: '订单合同', framework: '框架合同', other: '其他' },
      },
      crm_sales_order: { label: '来源订单', help: '起草这份合同的订单。' },
      order_amount: { label: '订单金额', help: '挂在这份合同下、已确认和已完成订单的含税总额。草稿和已取消的订单不计入。' },
      linked_order_amount: { label: '关联订单金额', help: '挂在这份合同下、未取消订单的含税总额。订单合同在草稿状态时跟随它。' },
      order_amount_shown: { label: '订单金额', help: '订单合同上是它的订单金额；框架合同上是已确认和已完成订单的合计，草稿和已取消的订单不计入。含税。' },
      order_amount_differs: { label: '与订单金额不一致', help: '合同金额已不等于订单金额。用“变更”并选择“按订单更新”，可取订单的当前金额。' },
      remaining_quota: { label: '剩余额度', help: '合同金额减去订单金额（已确认和已完成的订单）。订单总额超过合同金额时为负数。' },
      change_reason: { label: '变更原因', help: '合同最近一次变更的原因。由“变更”写入。' },
      change_amendment: { label: '签署的变更协议', help: '客户为最近一次变更签署的补充协议。由“变更”写入。' },
      change_new_value: { label: '新合同金额', help: '留空则保持合同金额不变。' },
      change_new_end_date: { label: '新结束日期', help: '留空则保持结束日期不变。' },
      change_new_payment_terms: { label: '新付款条款', help: '留空则保持付款条款不变。' },
      change_from_order: { label: '按订单更新', help: '把订单的当前金额作为合同金额。' },
    },
    // Print Contract (#2317).
    _actions: {
      print_contract: { label: '打印合同', successMessage: '合同 PDF 已归档到附件。' },
      // Change (#2804): one action per kind of contract.
      change_contract: { label: '变更', description: '变更这份已激活合同的金额、结束日期或付款条款。留空的项保持不变。', successMessage: '合同 {{ record.name }} 已变更。' },
      change_order_contract: { label: '变更', description: '变更这份已激活订单合同的结束日期或付款条款，或取订单的当前金额。留空的项保持不变。', successMessage: '合同 {{ record.name }} 已变更。' },
    },
    _views: {
      all_contracts: { label: '全部合同' },
      renewal_calendar: { label: '续约日历' },
      contract_gantt: { label: '合同条款' },
      contract_timeline: { label: '合同时间线' },
    },
    _sections: {
      basic: { label: '合同信息' },
      parties: { label: '签约方' },
      terms: { label: '条款与日期' },
      value: { label: '合同金额' },
      orders: { label: '订单汇总' },
      status: { label: '状态与审批' },
      renewal: { label: '续约' },
      change: { label: '最近一次变更' },
      // contract.view.ts 表单区块名称 (#1100)
      contract_terms: { label: '条款' },
      signing_and_documents: { label: '签署与文件' },
      notes: { label: '备注' },
    },
  },
  // The order and its lines (REQ-0010, hotcrm#2555).
  crm_sales_order: {
    // Draft Contract (#2558).
    _actions: {
      draft_contract: { label: '起草合同' },
      // Confirm / Complete / Cancel Order (#2716).
      confirm_sales_order: {
        label: '确认订单',
        confirmText: '确认此订单？确认后订单行和金额将被锁定：如需修改，须先把订单退回草稿。',
        successMessage: '订单 {{ record.name }} 已确认。',
      },
      complete_sales_order: {
        label: '完成订单',
        confirmText: '完成此订单？已完成的订单是最终状态：其状态和订单行都不能再更改。',
        successMessage: '订单 {{ record.name }} 已完成。',
      },
      cancel_sales_order: {
        label: '取消订单',
        confirmText: '取消此订单？已取消的订单是最终状态：无法重新打开，其订单行也不能再更改。',
        successMessage: '订单 {{ record.name }} 已取消。',
      },
    },
    _validations: {
      shipped_after_order: { message: '发货日期不能早于下单日期' },
      sales_order_status_progression: { message: '不允许这样更改状态。订单按 草稿 → 已确认 → 已完成 推进；已确认可以退回草稿，草稿或已确认的订单可以取消。已完成和已取消是最终状态。' },
      contract_same_account: { message: '关联合同必须属于本订单的所属客户。' },
      contract_same_account_check: { message: '这份合同属于另一个客户。订单只能关联其所属客户的合同：请选择该客户的合同，或清空关联合同。' },
      framework_quota_exceeded: { message: '这张订单使框架合同超出合同金额。' },
      framework_quota_exceeded_check: { message: '加上这张订单，框架合同下的订单总额已超过合同金额。订单已保存；合同的剩余额度显示超出多少。' },
    },
    label: '订单',
    pluralLabel: '订单',
    description: '客户本次订购的内容、订单行与合计，以及发货进度',
    fields: {
      owner_id: { label: '订单负责人' },
      order_number: { label: '订单编号' },
      name: { label: '订单名称' },
      crm_account: { label: '所属客户' },
      crm_contact: { label: '联系人' },
      crm_opportunity: { label: '关联商机' },
      order_date: { label: '下单日期' },
      crm_contract: { label: '关联合同' },
      customer_po_number: { label: '客户采购单号', help: '客户自己采购单上的编号，按客户引用它的写法填写。' },
      description: { label: '描述' },
      subtotal: { label: '小计', help: '订单各订单行之和。只有没有订单行的订单才能手工填写。订单确认后锁定，折扣、税额和运费也一样。' },
      discount: { label: '折扣 (%)' },
      discount_amount: { label: '折扣金额' },
      tax: { label: '税额' },
      shipping_handling: { label: '运费及手续费' },
      total_price: { label: '总金额' },
      payment_terms: { label: '付款条款' },
      shipped_date: { label: '发货日期' },
      billing_address: { label: '账单地址' },
      shipping_address: { label: '收货地址' },
      external_ref: { label: '外部编号', help: '这张订单在其他系统中的编号。导入编号相同的行会更新这张订单。' },
      status: { label: '状态', options: { draft: '草稿', confirmed: '已确认', completed: '已完成', cancelled: '已取消' } },
      fulfillment_status: { label: '发货状态', options: { not_shipped: '未发货', partially_shipped: '部分发货', shipped: '已发货' } },
    },
    _views: {
      all_sales_orders: { label: '全部订单' },
      order_board: { label: '订单看板' },
      orders_to_ship: { label: '待发货' },
    },
    _sections: {
      basic: { label: '订单信息' },
      pricing: { label: '价格' },
      delivery: { label: '发货' },
      address: { label: '地址' },
      system: { label: '系统' },
    },
  },
  // The order and its lines (REQ-0010, hotcrm#2555).
  crm_sales_order_line: {
    _validations: {
      unit_price_positive: { message: '销售单价不能为负数' },
      product_or_title: { message: '请选择产品，或填写产品标题' },
    },
    label: '订单行',
    pluralLabel: '订单行',
    description: '订单上的一行',
    fields: {
      crm_sales_order: { label: '所属订单' },
      crm_product: { label: '产品' },
      product_title: { label: '产品标题', help: '这一行卖的是什么。选了产品时自动填为产品名称；没有产品时手动填写。' },
      description: { label: '描述' },
      quantity: { label: '数量' },
      list_price: { label: '标价', help: '产品放到这一行时的标价。' },
      unit_price: { label: '销售单价' },
      discount: { label: '折扣（%）' },
      subtotal: { label: '小计' },
      total_price: { label: '总计' },
      line_number: { label: '行号' },
    },
    _sections: {
      basic: { label: '订单行' },
      pricing: { label: '价格' },
    },
  },
};
