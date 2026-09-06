// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { ObjectTranslationData } from '@objectstack/spec/system';

/**
 * 简体中文 (zh-CN) — `objects` translations for the COMMERCE family:
 * what gets sold and on what paper — quotes, contracts, products.
 *
 * Roster: `crm_quote`, `crm_quote_line_item`, `crm_contract`, `crm_product`.
 *
 * SPLIT AXIS (#1311): translation NAMESPACE first, then CRM DOMAIN FAMILY.
 * Everything that is not `objects` lives in `./app.ts`; `objects` — 69-78% of
 * every bundle — is one file per CRM domain family, and a detail object
 * follows its master. A new row goes in the file for ITS family, never in
 * whichever file is already open: that is how one file re-grows past the 70%
 * advisory band `pnpm hygiene` prints. Full rule and rationale:
 * `src/translations/zh-CN.ts`.
 */
export const commerce: Record<string, ObjectTranslationData> = {
  crm_quote: {
    _validations: {
      discount_within_ceiling: {
        message: '折扣不能超过 60%',
      },
      expiration_after_quote: {
        message: '失效日期必须晚于报价日期',
      },
      quote_status_progression: {
        message: '无效的报价单状态流转',
      },
    },
    label: '报价单',
    pluralLabel: '报价单',
    description: '发送给客户的价格报价',
    fields: {
      quote_number: { label: '报价单编号' },
      name: { label: '报价名称' },
      crm_account: { label: '所属客户' },
      crm_opportunity: { label: '关联商机' },
      status: {
        label: '状态',
        options: {
          draft: '草稿', in_review: '审核中', presented: '已提交', accepted: '已接受',
          rejected: '已拒绝', expired: '已过期',
        },
      },
      total_price: { label: '总金额' },
      discount: { label: '折扣 (%)' },
      expiration_date: { label: '到期日期' },
      description: { label: '描述' },
      crm_contact: {
        label: '联系人',
        help: '报价进入「已提交」或「已接受」后必填 —— 起草的合同从这里取主要联系人。',
      },
      owner_id: { label: '报价负责人' },
      quote_date: { label: '报价日期' },
      subtotal: { label: '小计' },
      discount_amount: { label: '折扣金额' },
      tax: { label: '税额' },
      shipping_handling: { label: '运费及手续费' },
      payment_terms: {
        label: '付款条款',
        options: {
          net_15: '15 天账期', net_30: '30 天账期', net_60: '60 天账期',
          net_90: '90 天账期', due_on_receipt: '货到付款',
        },
      },
      shipping_terms: { label: '运输条款' },
      billing_address: { label: '账单地址' },
      shipping_address: { label: '收货地址' },
      internal_notes: { label: '内部备注' },
      display_title: { label: '显示名称' },
    },
    _views: {
      all_quotes: { label: '全部报价单' },
      quote_pipeline: { label: '报价流水线' },
      quote_calendar: { label: '报价日历' },
    },
    _sections: {
      basic: { label: '报价信息' },
      pricing: { label: '价格' },
      terms: { label: '条款与有效期' },
      address: { label: '地址' },
      system: { label: '系统' },
      // quote.view.ts 表单区块名称 (#1100)
      quote: { label: '报价单' },
      totals: { label: '合计' },
      quote_terms: { label: '条款' },
      addresses_and_notes: { label: '地址与备注' },
    },
  },
  crm_quote_line_item: {
    _validations: {
      discount_within_ceiling: {
        message: '行折扣不能超过 60%',
      },
      unit_price_positive: {
        message: '销售价格不能为负数',
      },
    },
    label: '报价单明细',
    pluralLabel: '报价单明细',
    description: '报价单下按产品拆分的报价行',
    fields: {
      crm_quote: { label: '关联报价单' },
      crm_product: { label: '产品' },
      description: { label: '描述' },
      quantity: { label: '数量' },
      list_price: { label: '标价' },
      unit_price: { label: '销售单价' },
      discount: { label: '折扣（%）' },
      subtotal: { label: '小计' },
      tax_rate: { label: '税率（%）' },
      total_price: { label: '总计' },
      line_number: { label: '行号' },
    },
    _sections: {
      basic: { label: '明细行' },
      pricing: { label: '价格' },
    },
  },
  crm_contract: {
    _validations: {
      end_after_start: {
        message: '结束日期必须晚于开始日期',
      },
      contract_status_progression: {
        message: '无效的合同状态流转',
      },
    },
    label: '合同',
    pluralLabel: '合同',
    description: '与客户签署的法律合同',
    fields: {
      contract_number: { label: '合同编号' },
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
      crm_contact: { label: '主要联系人' },
      crm_opportunity: { label: '关联商机' },
      owner_id: { label: '合同负责人' },
      contract_term_months: { label: '合同期限（月）' },
      billing_frequency: {
        label: '计费周期',
        options: { monthly: '按月', quarterly: '按季度', annually: '按年', one_time: '一次性' },
      },
      payment_terms: {
        label: '付款条款',
        options: {
          net_15: '15 天账期', net_30: '30 天账期', net_60: '60 天账期',
          net_90: '90 天账期', due_on_receipt: '货到付款',
        },
      },
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
      document_url: { label: '合同文档' },
      special_terms: { label: '特殊条款' },
      billing_address: { label: '账单地址' },
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
      status: { label: '状态与审批' },
      renewal: { label: '续约' },
      // contract.view.ts 表单区块名称 (#1100)
      contract_terms: { label: '条款' },
      signing_and_documents: { label: '签署与文件' },
      notes: { label: '备注' },
    },
  },
  crm_product: {
    _validations: {
      cost_less_than_price: {
        message: '成本应低于标价',
      },
      price_positive: {
        message: '标价必须为正数',
      },
    },
    label: '产品',
    pluralLabel: '产品',
    description: '公司提供的产品与服务',
    fields: {
      product_code: { label: '产品代码' },
      name: { label: '产品名称' },
      category: {
        label: '产品类别',
        options: {
          software: '软件', hardware: '硬件', service: '服务',
          subscription: '订阅', support: '支持服务',
        },
      },
      cost: { label: '成本' },
      is_active: { label: '是否启用' },
      description: { label: '描述' },
      family: {
        label: '产品系列',
        options: {
          enterprise: '企业级方案', smb: '中小企业方案',
          services: '专业服务', cloud: '云服务',
        },
      },
      list_price: { label: '标价' },
      sku: { label: 'SKU' },
      product_manager: { label: '产品经理' },
      image: { label: '产品图片' },
      datasheet: { label: '规格书' },
      display_title: { label: '显示名称' },
    },
    _views: {
      all_products: { label: '全部产品' },
      product_catalog: { label: '产品目录' },
    },
    _sections: {
      basic: { label: '产品信息' },
      pricing: { label: '价格' },
      metadata: { label: '资源' },
      // product.view.ts 表单区块名称 (#1100)
      product_info: { label: '产品信息' },
      pricing_info: { label: '定价' },
      media: { label: '媒体' },
    },
  },
};
