// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';
import { CONTRACT_DRAFT_NODE_IDS } from '../../sales/flows/_contract-draft';

// The discount ceiling is interpolated, never retyped: the number lives in
// `_thresholds.ts` alone (#1711).
import { QUOTE_DISCOUNT_CEILING } from '../../sales/objects/_thresholds';

/**
 * 简体中文 (zh-CN) — the revenue module's own translations: every row whose
 * target this package registers. Why they live here and not in the app
 * package's pack: `./index.ts`.
 */
export const zhCN: TranslationData = {
  // This package's name and description on Setup's package list (`packages.MANIFEST_ID`).
  packages: {
    'app.objectstack.hotcrm.revenue': {
      name: 'HotCRM 产品与报价',
      description: 'HotCRM 产品与报价模块——产品、价格表、商机产品明细和报价单。',
    },
  },
  hooks: {
    quote_total_rollup: {
      refusals: {
        RECORD_LOCKED: {
          message: '报价单{{quote}}已接受，因此不能再新增、修改或删除它的明细。',
          reasons: {
            rejected: {
              message: '报价单{{quote}}已拒绝，因此不能再新增、修改或删除它的明细。请先把它修订回草稿再修改。',
            },
            expired: {
              message: '报价单{{quote}}已过期，因此不能再新增、修改或删除它的明细。',
            },
          },
        },
      },
    },
    quote_workflow: {
      refusals: {
        RECORD_LOCKED: {
          message: '报价单{{quote}}不能接受：它的商机正被审批锁定，接受它会把该商机设为成交。请在审批通过后再接受。',
          reasons: {
            held_unsent: {
              message: '报价单{{quote}}不能接受：它的商机需要先通过大额商机审批，接受它会把该商机设为成交。请先保存商机以提交审批，获批后再接受报价单。',
            },
            line_accepted: {
              message: '报价单{{quote}}已接受，因此不能再新增、修改或删除它的明细。',
            },
            line_rejected: {
              message: '报价单{{quote}}已拒绝，因此不能再新增、修改或删除它的明细。请先把它修订回草稿再修改。',
            },
            line_expired: {
              message: '报价单{{quote}}已过期，因此不能再新增、修改或删除它的明细。',
            },
            frozen_accepted: {
              message: '报价单{{quote}}已接受；只能修改它的内部备注。',
            },
            frozen_rejected: {
              message: '报价单{{quote}}已拒绝；请先把它修订回草稿再修改。在此之前只能修改它的内部备注。',
            },
            frozen_expired: {
              message: '报价单{{quote}}已过期；只能修改它的内部备注。',
            },
          },
        },
        VALIDATION_FAILED: {
          message: '报价单{{quote}}不能直接创建为“已接受”。报价单从“草稿”、“审核中”或“已提交”开始，之后才能被接受、拒绝或过期。',
          reasons: {
            created_rejected: {
              message: '报价单{{quote}}不能直接创建为“已拒绝”。报价单从“草稿”、“审核中”或“已提交”开始，之后才能被接受、拒绝或过期。',
            },
            created_expired: {
              message: '报价单{{quote}}不能直接创建为“已过期”。报价单从“草稿”、“审核中”或“已提交”开始，之后才能被接受、拒绝或过期。',
            },
          },
        },
      },
    },
    quote_price_book: {
      refusals: {
        VALIDATION_FAILED: {
          message: '价格表{{book}}未启用，报价单只能使用已启用的价格表。请为报价单{{quote}}选择其他价格表。',
          reasons: {
            line: {
              message: '报价单{{quote}}已有 1 条明细按价格表定价，因此不能更换价格表。请先删除明细，再选择价格表并重新添加。',
            },
            line_from: {
              message: '报价单{{quote}}已有 1 条明细按价格表{{from}}定价，因此不能更换价格表。请先删除明细，再选择价格表并重新添加。',
            },
            lines: {
              message: '报价单{{quote}}已有 {{count}} 条明细按价格表定价，因此不能更换价格表。请先删除明细，再选择价格表并重新添加。',
            },
            lines_from: {
              message: '报价单{{quote}}已有 {{count}} 条明细按价格表{{from}}定价，因此不能更换价格表。请先删除明细，再选择价格表并重新添加。',
            },
          },
        },
      },
    },
    price_book_standard: {
      refusals: {
        RECORD_LOCKED: {
          message: '无法删除{{book}}：它是标准价格表。如果不想再用它报价，请关闭“是否启用”。',
          reasons: {
            standard_off: {
              message: '{{book}}是标准价格表，而标准价格表始终要有一个：不能取消“标准价格表”。请改为修改它的价格。',
            },
          },
        },
        DELETE_RESTRICTED: {
          message: '无法删除{{book}}：有 1 份报价单使用它定价。如果不想再用它报价，请关闭“是否启用”。',
          reasons: {
            quotes: {
              message: '无法删除{{book}}：有 {{count}} 份报价单使用它定价。如果不想再用它报价，请关闭“是否启用”。',
            },
          },
        },
        DUPLICATE_VALUE: {
          message: '{{book}}已是标准价格表，标准价格表只能有一个。请保存这个价格表时不要勾选“标准价格表”。',
        },
      },
    },
    price_book_entry_unique: {
      refusals: {
        DUPLICATE_VALUE: {
          message: '{{book}}已有{{product}}的价格。一个价格表中每个产品只能有一个条目：请修改已有的条目。',
        },
      },
    },
    product_catalog: {
      refusals: {
        VALIDATION_FAILED: {
          message: '标价（{{list_price}}）必须大于或等于成本（{{cost}}）。',
        },
        DELETE_RESTRICTED: {
          message: '无法删除产品：{{opportunity_lines}} 条商机产品明细在使用它。如果想停用它，请关闭“是否启用”。',
          reasons: {
            quote: {
              message: '无法删除产品：{{quote_lines}} 条报价单明细在使用它。如果想停用它，请关闭“是否启用”。',
            },
            both: {
              message: '无法删除产品：{{opportunity_lines}} 条商机产品明细和 {{quote_lines}} 条报价单明细在使用它。如果想停用它，请关闭“是否启用”。',
            },
          },
        },
      },
    },
    opportunity_line_item_freeze: {
      refusals: {
        RECORD_LOCKED: {
          message: '商机{{name}}正在审批中，已被锁定：审批完成前不能新增、修改或删除它的产品明细。',
          reasons: {
            closed_won: {
              message: '商机{{name}}已关闭（成交），因此不能再新增、修改或删除它的产品明细。',
            },
            closed_lost: {
              message: '商机{{name}}已关闭（失败），因此不能再新增、修改或删除它的产品明细。',
            },
          },
        },
      },
    },
    quote_line_item_price_fill: {
      refusals: {
        VALIDATION_FAILED: {
          message: '价格表{{book}}中没有{{product}}的有效价格。请把这个产品加入{{book}}，或在报价单上选择其他价格表。',
        },
      },
    },
    opportunity_line_item_price_fill: {
      refusals: {
        VALIDATION_FAILED: {
          message: '价格表{{book}}中没有{{product}}的有效价格。请把这个产品加入{{book}}，或在报价单上选择其他价格表。',
        },
      },
    },
  },
  objects: {
    // The order's Source Quote, added by this package through
    // `objectExtensions` (hotcrm#2558).
    crm_sales_order: {
      fields: {
        crm_quote: { label: '来源报价单' },
      },
    },
    crm_quote: {
      _validations: {
        discount_within_ceiling: {
          message: '折扣不能超过 60%',
        },
        expiration_after_quote: {
          message: '失效日期必须晚于报价日期',
        },
        quote_status_progression: {
          message: '这次状态变更不在报价单的常规路径上：草稿 → 审核中 → 已提交 → 已接受。审核中也可以退回草稿或变为已拒绝，已提交可以变为已拒绝，已拒绝的报价单回到草稿。草稿、审核中或已提交可以变为已过期。已接受和已过期是最终状态。',
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
          help: '把报价改为「已提交」或「已接受」的那次保存必须填写 —— 订单从这里取联系人，从订单起草的合同也从这里取主要联系人。',
        },
        owner_id: { label: '报价负责人' },
        // The countersigned copy (#2317).
        signed_copy: {
          label: '签署副本',
          help: '客户签回的报价。接受报价前必须上传。',
        },
        quote_date: { label: '报价日期' },
        crm_price_book: { label: '价格表', help: '本报价单各行的标价取自这本价格表。新建报价单时留空，即为标准价格表。' },
        subtotal: { label: '小计' },
        discount_amount: { label: '折扣金额' },
        tax: { label: '税额' },
        shipping_handling: { label: '运费及手续费' },
        payment_terms: { label: '付款条款' },
        shipping_terms: { label: '运输条款' },
        billing_address: { label: '账单地址' },
        shipping_address: { label: '收货地址' },
        internal_notes: { label: '内部备注' },
      },
      _views: {
        all_quotes: { label: '全部报价单' },
        quote_pipeline: { label: '报价流水线' },
        quote_calendar: { label: '报价日历' },
      },
      _sections: {
        basic: { label: '报价信息' },
        line_items: { label: '报价单明细' },
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
      _actions: {
        submit_quote_for_review: { label: '提交审核', successMessage: '报价单 {{ record.name }} 已提交审核。' },
        mark_quote_presented: { label: '标记为已提交', successMessage: '报价单 {{ record.name }} 已标记为已提交。' },
        accept_quote: {
          label: '接受',
          confirmText: '接受此报价？报价将被冻结，商机关闭为赢单，并生成一张销售订单；需要合同时可在订单上起草。若管理员开启了自动起草合同，还会同时起草一份合同。',
          successMessage: '报价单 {{ record.name }} 已接受，已生成销售订单，可在本报价单的「订单」中查看。',
        },
        reject_quote: { label: '拒绝', successMessage: '报价单 {{ record.name }} 已拒绝。修订后可重新报价。' },
        revise_quote: { label: '修订', successMessage: '报价单 {{ record.name }} 已退回草稿。' },
        // Print Quote (#2312).
        print_quote: { label: '打印报价', successMessage: '报价 PDF 已归档到附件。' },
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
      },
      _views: {
        all_products: { label: '全部产品' },
        product_catalog: { label: '产品目录' },
      },
      _sections: {
        basic: { label: '产品信息' },
        pricing: { label: '价格' },
        metadata: { label: '资源' },
      },
    },
    crm_price_book: {
      _validations: {
        valid_to_after_valid_from: {
          message: '有效期至不能早于有效期自',
        },
      },
      label: '价格表',
      pluralLabel: '价格表',
      description: '一组命名的产品价格：标准价、伙伴或区域价，或促销价',
      fields: {
        owner_id: { label: '价格表负责人' },
        name: { label: '价格表名称' },
        description: { label: '描述' },
        is_active: { label: '是否启用' },
        is_standard: { label: '标准价格表' },
        valid_from: { label: '有效期自' },
        valid_to: { label: '有效期至' },
      },
      _sections: {
        basic: { label: '价格表信息' },
        validity: { label: '有效期' },
      },
      _views: {
        all_price_books: { label: '全部价格表' },
      },
      _actions: {
        add_price_book_products: { label: '添加产品' },
      },
    },
    crm_price_book_entry: {
      _validations: {
        price_not_negative: {
          message: '标价不能为负数',
        },
      },
      label: '价格表条目',
      pluralLabel: '价格表条目',
      description: '某个产品在某个价格表中的价格',
      fields: {
        entry_number: { label: '条目编号' },
        crm_price_book: { label: '价格表' },
        crm_product: { label: '产品' },
        list_price: { label: '标价' },
        is_active: { label: '是否启用' },
      },
      _sections: {
        basic: { label: '条目信息' },
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
        product_title: { label: '产品标题', help: '产品的标题，随产品同步更新，用作此明细行的名称。' },
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
        product_title: { label: '产品标题', help: '产品的标题，随产品同步更新，用作此明细行的名称。' },
        quantity: { label: '数量' },
        list_price: { label: '标价', help: '该产品在报价单所选价格表中的价格。' },
        unit_price: { label: '销售单价' },
        discount: { label: '折扣（%）' },
        subtotal: { label: '小计' },
        total_price: { label: '总计' },
        line_number: { label: '行号' },
      },
      _sections: {
        basic: { label: '明细行' },
        pricing: { label: '价格' },
      },
    },
  },
  apps: {
    crm_enterprise: {
      navigation: {
        nav_quote: { label: '报价' },
        nav_product: { label: '产品' },
        nav_price_book: { label: '价格表' },
        nav_product_catalog_dashboard: { label: '产品目录' },
        nav_help_revenue: { label: '收入手册' },
      },
    },
  },
  datasets: {
    product_metrics: {
      label: '产品指标',
      description: '统计产品目录数量与标价的语义层',
      dimensions: {
        category: {
          label: '类别',
          description: '产品类别：软件、硬件、服务、订阅或支持服务。',
        },
      },
      measures: {
        list_price_sum: {
          label: '标价合计',
          description: '当前范围内产品标价之和，是目录上的数字；不是销售额，也不含任何折扣或数量。',
        },
        product_count: {
          label: '产品数',
          description: '产品目录中的产品数量，启用和停用的都算；不是销售的件数。',
        },
      },
    },
  },
  flows: {
    // An accepted quote's two automations (hotcrm#2558). The drafted
    // contract's provenance sentence is TEXT in the organization's language
    // (#2535), one per variant of the draft, at
    // `flows.quote_accepted_contract_draft.records.<node>.fields.description`.
    quote_accepted_contract_draft: {
      label: '已接受的报价单起草合同',
      records: Object.fromEntries(CONTRACT_DRAFT_NODE_IDS.map((node) => [node, {
        fields: { description: '根据已接受的报价单{{ quote }}自动起草' },
      }])),
    },
    quote_accepted_order: {
      label: '已接受的报价单创建订单',
    },
    price_book_add_products: {
      label: '向价格表添加产品',
      successMessage: '产品已添加到价格表。',
      refusals: {
        refuse_no_book: { message: '这本价格表已不存在，或你无权打开它。没有添加任何产品。' },
        end_refused: { message: '有 {{refusedCount}} 个产品未能添加到价格表：已添加 {{addedCount}} 个，已有价格 {{alreadyCount}} 个，被拒绝 {{refusedCount}} 个。只有价格表的负责人或管理员可以添加其价格；流程运行日志记录了每个产品被拒的原因。' },
      },
      screens: {
        screen_1: {
          title: '为产品定价',
          description: '{{ bookRecord.name }} 中尚未定价的每个启用产品，都会按其标价的这个百分比新增一个条目。已有价格的产品保持原价。',
          fields: {
            percentOfList: { label: '价格占标价的 %', placeholder: '1-1000' },
          },
        },
        result: {
          title: '产品已添加',
          description: '已向 {{ bookRecord.name }} 添加 {{addedCount}} 个产品，{{alreadyCount}} 个已有价格。',
          fields: {
            bookLink: { label: '价格表' },
          },
        },
      },
    },
    quote_generation: {
      label: '从商机生成报价单',
      refusals: { refuse_held: { message: '需先完成立项审批：请勾选「申请立项审批」。尚未创建任何内容。' } },
      screens: {
        screen_1: {
          title: '报价单详情',
          fields: {
            quoteName: { label: '报价名称' },
            expirationDays: { label: '有效期（天）' },
            discount: { label: `折扣 % (≤ ${QUOTE_DISCOUNT_CEILING})`, placeholder: `0-${QUOTE_DISCOUNT_CEILING}` },
          },
        },
        result: {
          title: '报价单已创建',
          description: '报价单「{{ quoteName }}」已作为草稿创建。打开它核对价格，再继续推进。',
          fields: {
            quoteLink: { label: '报价单' },
          },
        },
        result_partial: {
          title: '报价单已创建，部分明细未复制',
          description: `报价单「{{ quoteName }}」已作为草稿创建，但商机上有 {{ skippedCount }} 行产品明细未能复制到报价单（已复制 {{ copiedCount }} 行）。报价单的价格表中没有该产品的有效价格，或该行折扣超过 ${QUOTE_DISCOUNT_CEILING}% 时，这一行会被拒绝；流程运行日志记录了原因。请打开报价单，在那里补上这些明细。`,
          fields: {
            quoteLink: { label: '报价单' },
          },
        },
      },
    },
  },
  books: {
    crm_revenue_manual: {
      label: 'HotCRM 收入手册',
      description: '报价单、产品和价格表，以及赢单后向计费系统的交接。',
      groups: {
        revenue: { label: '收入' },
      },
    },
  },
  // The quote's two record pages (#2312): its working page and its print page.
  dashboards: {
    product_catalog_dashboard: {
      label: '产品目录',
      description: '按产品类别统计的目录价',
      widgets: {
        top_products: { title: '各类别目录价合计', description: '按产品类别汇总的目录价，不是销售额' },
      },
    },
  },
  pages: {
    quote_detail_page: {
      label: '报价详情',
      description: '报价的记录页：使用系统生成的布局，不覆盖任何插槽。',
    },
    quote_print_page: {
      label: '报价文档',
      description: '可打印的报价文档：抬头、客户、行项目、价格与条款。',
      components: {
        quote_print_lines: { title: '行项目' },
      },
    },
  },
};
