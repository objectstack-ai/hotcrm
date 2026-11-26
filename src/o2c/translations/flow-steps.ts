// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationBundle } from '@objectstack/spec/system';

/**
 * The step names the flow designer, the run history and the approval
 * timeline show for this package's flows (`flows.<flow>.label` and
 * `flows.<flow>.nodes.<node>.label`), which ObjectStack 19 checks per locale
 * (`i18n/missing-flow`). English is the label written on the flow itself.
 *
 * A bundle of its own beside the package's main one: the platform deep-merges
 * every bundle a package registers, per locale, so these rows join the
 * `flows` entries the main bundle already carries (screens, refusals, records)
 * without restating them. A hand-written row there wins nothing over one here:
 * keep each key in one place.
 */
export const O2cFlowStepTranslations: TranslationBundle = {
  'zh-CN': {
    flows: {
      sales_order_contract_fill: {
        label: '订单合同同步到其下属记录',
        nodes: {
          start: { label: '开始（订单的合同已变更）' },
          had_contract: { label: '订单原先有合同？' },
          move_loop_steps: { label: '遍历每个计划步骤' },
          move_loop_invoices: { label: '遍历每张发票' },
          move_loop_payments: { label: '遍历每笔回款' },
          has_contract: { label: '订单现在有合同？' },
          fill_loop_steps: { label: '遍历每个计划步骤' },
          fill_loop_invoices: { label: '遍历每张发票' },
          fill_loop_payments: { label: '遍历每笔回款' },
          end: { label: '结束' },
          move_find_steps: { label: '查找订单在原合同上的计划步骤' },
          fill_find_steps: { label: '查找订单未关联合同的计划步骤' },
        },
      },
    },
  },
  'ja-JP': {
    flows: {
      sales_order_contract_fill: {
        label: '注文の契約を関連レコードに反映',
        nodes: {
          start: { label: '開始（注文の契約の変更時）' },
          had_contract: { label: '注文に以前契約があった？' },
          move_loop_steps: { label: '計画ステップごとに' },
          move_loop_invoices: { label: '請求書ごとに' },
          move_loop_payments: { label: '入金ごとに' },
          has_contract: { label: '注文に現在契約がある？' },
          fill_loop_steps: { label: '計画ステップごとに' },
          fill_loop_invoices: { label: '請求書ごとに' },
          fill_loop_payments: { label: '入金ごとに' },
          end: { label: '終了' },
          move_find_steps: { label: '以前の契約にある注文の計画ステップを検索' },
          fill_find_steps: { label: '契約のない注文の計画ステップを検索' },
        },
      },
    },
  },
  'es-ES': {
    flows: {
      sales_order_contract_fill: {
        label: 'El contrato del pedido pasa a sus registros',
        nodes: {
          start: { label: 'Inicio (cambió el contrato del pedido)' },
          had_contract: { label: '¿El pedido tenía contrato?' },
          move_loop_steps: { label: 'Para cada paso del plan' },
          move_loop_invoices: { label: 'Para cada factura' },
          move_loop_payments: { label: 'Para cada cobro' },
          has_contract: { label: '¿El pedido tiene contrato ahora?' },
          fill_loop_steps: { label: 'Para cada paso del plan' },
          fill_loop_invoices: { label: 'Para cada factura' },
          fill_loop_payments: { label: 'Para cada cobro' },
          end: { label: 'Fin' },
          move_find_steps: { label: 'Buscar los pasos del plan del pedido en el contrato anterior' },
          fill_find_steps: { label: 'Buscar los pasos del plan del pedido sin contrato' },
        },
      },
    },
  },
};
