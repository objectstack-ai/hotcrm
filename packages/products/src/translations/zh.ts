import type { TranslationData } from '@objectstack/spec/system';

/**
 * 简体中文 (zh) — Products & Pricing Translations
 *
 * Per-locale file: one file per language, following the `per_locale` convention.
 */
export const zh: TranslationData = {
  objects: {
    product: {
      label: '产品',
      pluralLabel: '产品',
      fields: {
        name: { label: '产品名称' },
        product_code: { label: '产品编码' },
        description: { label: '描述' },
        family: {
          label: '产品系列',
          options: {
            Hardware: '硬件', Software: '软件', Service: '服务',
            Subscription: '订阅', Consulting: '咨询', Training: '培训',
            Support: '技术支持', License: '许可证', Other: '其他',
          },
        },
        is_active: { label: '是否启用' },
        unit_price: { label: '单价' },
        cost: { label: '成本' },
        quantity_in_stock: { label: '库存数量' },
      },
    },

    pricebook: {
      label: '价格手册',
      pluralLabel: '价格手册',
      fields: {
        name: { label: '价格手册名称' },
        description: { label: '描述' },
        is_active: { label: '是否启用' },
        is_standard: { label: '标准价格手册', help: '将此设为默认价格手册' },
        currency_code: { label: '币种' },
        effective_date: { label: '生效日期' },
        expiration_date: { label: '失效日期' },
      },
    },

    quote: {
      label: '报价',
      pluralLabel: '报价',
      fields: {
        quote_number: { label: '报价编号' },
        name: { label: '报价名称' },
        opportunity_id: { label: '商机' },
        account_id: { label: '客户' },
        contact_id: { label: '联系人' },
        status: {
          label: '状态',
          options: {
            Draft: '草稿 📝', 'Needs Review': '待审核 🔍', 'In Review': '审核中 🔎',
            Approved: '已批准 ✅', Rejected: '已拒绝 ❌', Presented: '已提交 📊',
            Accepted: '已接受 🤝',
          },
        },
        expiration_date: { label: '过期日期' },
        subtotal: { label: '小计' },
        discount: { label: '折扣' },
        total_price: { label: '总价' },
        tax: { label: '税费' },
        grand_total: { label: '总计' },
        pricebook_id: { label: '价格手册' },
        description: { label: '描述' },
        billing_name: { label: '账单名称' },
        billing_street: { label: '账单街道' },
        billing_city: { label: '账单城市' },
        billing_state: { label: '账单省份' },
        billing_postal_code: { label: '账单邮编' },
        billing_country: { label: '账单国家' },
        shipping_name: { label: '收货名称' },
        shipping_street: { label: '收货街道' },
        shipping_city: { label: '收货城市' },
        shipping_state: { label: '收货省份' },
        shipping_postal_code: { label: '收货邮编' },
        shipping_country: { label: '收货国家' },
        line_item_count: { label: '行项目数', help: '此报价的行项目数量' },
        owner_id: { label: '所有者' },
      },
    },

    quote_line_item: {
      label: '报价行项目',
      pluralLabel: '报价行项目',
      fields: {
        quote_id: { label: '报价' },
        product_id: { label: '产品' },
        quantity: { label: '数量' },
        unit_price: { label: '单价' },
        discount: { label: '折扣 (%)' },
        total_price: { label: '总价' },
        sort_order: { label: '排序' },
        description: { label: '描述' },
        service_date: { label: '服务日期' },
      },
    },

    product_bundle: {
      label: '产品套餐',
      pluralLabel: '产品套餐',
      fields: {
        name: { label: '套餐名称' },
        description: { label: '描述' },
        status: {
          label: '状态',
          options: { Draft: '草稿 📝', Active: '有效 ✅', Retired: '已停用 🚫' },
        },
        bundle_price: { label: '套餐价格' },
        component_count: { label: '组件数', help: '此套餐包含的产品数量' },
        discount_type: {
          label: '折扣类型',
          options: { Percentage: '百分比', 'Fixed Amount': '固定金额', None: '无' },
        },
        discount_value: { label: '折扣值' },
        is_configurable: { label: '可配置', help: '允许买家自定义套餐内容' },
        valid_from: { label: '有效起始日期' },
        valid_to: { label: '有效截止日期' },
        min_quantity: { label: '最小数量' },
        max_quantity: { label: '最大数量' },
        owner_id: { label: '所有者' },
      },
    },

    product_bundle_component: {
      label: '套餐组件',
      pluralLabel: '套餐组件',
      fields: {
        bundle_id: { label: '套餐' },
        product_id: { label: '产品' },
        quantity: { label: '数量' },
        is_required: { label: '必选' },
        is_default: { label: '默认选中' },
        sort_order: { label: '排序' },
        min_quantity: { label: '最小数量' },
        max_quantity: { label: '最大数量' },
        discount_override: { label: '折扣覆盖', help: '覆盖此组件的套餐级折扣' },
      },
    },

    price_rule: {
      label: '定价规则',
      pluralLabel: '定价规则',
      fields: {
        name: { label: '规则名称' },
        description: { label: '描述' },
        type: {
          label: '规则类型',
          options: {
            Discount: '折扣', Surcharge: '附加费', Override: '覆盖',
            Tiered: '阶梯', Volume: '批量', Bundle: '套餐',
          },
        },
        status: {
          label: '状态',
          options: {
            Draft: '草稿 📝', Active: '有效 ✅',
            Inactive: '未启用 ⏸️', Expired: '已过期 ⏰',
          },
        },
        priority: { label: '优先级', help: '数值越小优先级越高' },
        target_object: { label: '目标对象' },
        condition: { label: '条件' },
        discount_type: {
          label: '折扣类型',
          options: { Percentage: '百分比', 'Fixed Amount': '固定金额' },
        },
        discount_value: { label: '折扣值' },
        effective_date: { label: '生效日期' },
        expiration_date: { label: '失效日期' },
        owner_id: { label: '所有者' },
      },
    },

    approval_request: {
      label: '审批请求',
      pluralLabel: '审批请求',
      fields: {
        name: { label: '请求名称' },
        related_object_type: { label: '关联对象' },
        related_record_id: { label: '关联记录' },
        status: {
          label: '状态',
          options: {
            Pending: '待审批 ⏳', Approved: '已批准 ✅', Rejected: '已拒绝 ❌',
            Recalled: '已撤回 🔄', Escalated: '已上报 🔺',
          },
        },
        submitted_by_id: { label: '提交人' },
        submitted_date: { label: '提交日期' },
        approver_id: { label: '审批人' },
        approved_date: { label: '审批日期' },
        comments: { label: '备注' },
        approval_chain: { label: '审批链', help: '有序的审批步骤列表' },
        current_step: { label: '当前步骤' },
        total_steps: { label: '总步骤数' },
        priority: {
          label: '优先级',
          options: { Low: '低', Medium: '中', High: '高 ⚡', Critical: '紧急 🔥' },
        },
        due_date: { label: '截止日期' },
      },
    },

    discount_schedule: {
      label: '折扣计划',
      pluralLabel: '折扣计划',
      fields: {
        name: { label: '计划名称' },
        description: { label: '描述' },
        type: {
          label: '计划类型',
          options: { Volume: '批量', Tiered: '阶梯', Slab: '分级' },
        },
        status: {
          label: '状态',
          options: {
            Draft: '草稿 📝', Active: '有效 ✅',
            Inactive: '未启用 ⏸️', Expired: '已过期 ⏰',
          },
        },
        pricebook_id: { label: '价格手册' },
        product_id: { label: '产品' },
        effective_date: { label: '生效日期' },
        expiration_date: { label: '失效日期' },
        discount_unit: {
          label: '折扣单位',
          options: { Percentage: '百分比', 'Fixed Amount': '固定金额' },
        },
        tiers: { label: '折扣梯度', help: '基于数量的折扣梯度定义' },
        owner_id: { label: '所有者' },
      },
    },

    order: {
      label: '订单',
      pluralLabel: '订单',
      fields: {
        order_number: { label: '订单编号' },
        account_id: { label: '客户' },
        contract_id: { label: '合同' },
        quote_id: { label: '报价' },
        opportunity_id: { label: '商机' },
        status: {
          label: '状态',
          options: {
            Draft: '草稿 📝', Activated: '已激活 🚀',
            Fulfilled: '已完成 ✅', Cancelled: '已取消 ❌',
          },
        },
        order_date: { label: '下单日期' },
        effective_date: { label: '生效日期' },
        total_amount: { label: '订单总额' },
        billing_street: { label: '账单街道' },
        billing_city: { label: '账单城市' },
        billing_state: { label: '账单省份' },
        billing_postal_code: { label: '账单邮编' },
        billing_country: { label: '账单国家' },
        shipping_street: { label: '收货街道' },
        shipping_city: { label: '收货城市' },
        shipping_state: { label: '收货省份' },
        shipping_postal_code: { label: '收货邮编' },
        shipping_country: { label: '收货国家' },
        description: { label: '描述' },
        owner_id: { label: '所有者' },
      },
    },

    order_item: {
      label: '订单项',
      pluralLabel: '订单项',
      fields: {
        order_id: { label: '订单' },
        product_id: { label: '产品' },
        quantity: { label: '数量' },
        unit_price: { label: '单价' },
        total_price: { label: '总价' },
        description: { label: '描述' },
        service_date: { label: '服务日期' },
      },
    },

    subscription: {
      label: '订阅',
      pluralLabel: '订阅',
      fields: {
        name: { label: '订阅名称' },
        account_id: { label: '客户' },
        product_id: { label: '产品' },
        quote_id: { label: '报价' },
        status: {
          label: '状态',
          options: {
            Draft: '草稿 📝', Active: '有效 ✅', Suspended: '已暂停 ⏸️',
            Cancelled: '已取消 ❌', Expired: '已过期 ⏰',
          },
        },
        start_date: { label: '开始日期' },
        end_date: { label: '结束日期' },
        billing_frequency: {
          label: '计费周期',
          options: {
            Monthly: '每月', Quarterly: '每季度',
            'Semi-Annually': '每半年', Annually: '每年',
          },
        },
        unit_price: { label: '单价' },
        quantity: { label: '数量' },
        total_contract_value: { label: '合同总价值', help: '订阅期内的总价值' },
        auto_renew: { label: '自动续订' },
        renewal_term: { label: '续订期限（月）' },
        cancellation_date: { label: '取消日期' },
        cancellation_reason: { label: '取消原因' },
        next_billing_date: { label: '下次计费日期' },
        owner_id: { label: '所有者' },
      },
    },

    product_option: {
      label: '产品选项',
      pluralLabel: '产品选项',
      fields: {
        product_id: { label: '产品' },
        name: { label: '选项名称' },
        type: {
          label: '选项类型',
          options: {
            Color: '颜色', Size: '尺寸', Configuration: '配置',
            'Add-On': '附加项', Upgrade: '升级',
          },
        },
        values: { label: '可选值' },
        default_value: { label: '默认值' },
        is_required: { label: '必选' },
        price_adjustment: { label: '价格调整' },
        adjustment_type: {
          label: '调整类型',
          options: { Fixed: '固定', Percentage: '百分比' },
        },
        sort_order: { label: '排序' },
      },
    },
  },

  apps: {
    products: {
      label: '产品与定价',
      description: '产品目录、定价规则和CPQ功能',
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
    'nav.products_pricing': '产品与定价',
    'nav.subscriptions': '订阅管理',
    'nav.views_dashboards': '视图与仪表盘',
    'nav.quote_approval_timeline': '报价审批时间线',
    'nav.cpq_dashboard': 'CPQ 仪表盘',
    'success.saved': '记录保存成功',
    'success.deleted': '记录删除成功',
    'success.quote_approved': '报价审批通过',
    'success.quote_accepted': '报价已被客户接受',
    'success.order_activated': '订单激活成功',
    'success.subscription_activated': '订阅激活成功',
    'success.bundle_configured': '套餐配置成功',
    'success.price_rule_applied': '定价规则应用成功',
    'success.approval_submitted': '审批请求已提交',
    'confirm.delete': '确定要删除此记录吗？',
    'confirm.approve_quote': '批准此报价？',
    'confirm.reject_quote': '拒绝此报价？请提供原因。',
    'confirm.activate_order': '激活此订单？此操作无法撤销。',
    'confirm.cancel_subscription': '取消此订阅？此操作将在当前计费周期结束时生效。',
    'error.required': '此字段为必填项',
    'error.load_failed': '数据加载失败',
    'error.save_failed': '保存记录失败',
    'error.pricing_calculation_failed': '价格计算失败',
    'error.approval_failed': '审批请求处理失败',
  },

  validationMessages: {
    discount_exceeds_limit: '折扣超出最大允许限额',
    quantity_must_be_positive: '数量必须大于零',
    quote_expired: '此报价已超过有效期',
    bundle_incomplete: '必须选择所有必选的套餐组件',
    unit_price_required: '所有行项目必须填写单价',
    effective_date_required: '生效日期为必填项',
    expiration_before_effective: '失效日期必须晚于生效日期',
    subscription_dates_invalid: '订阅结束日期必须晚于开始日期',
    max_quantity_exceeded: '数量超出最大允许值',
    min_quantity_not_met: '数量未达到最低要求',
    duplicate_product_in_bundle: '此产品已包含在套餐中',
    order_total_mismatch: '订单总额与行项目合计不一致',
    approval_chain_required: '至少需要一名审批人',
  },
};
