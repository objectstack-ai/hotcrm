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
      sales_order_confirmed_plan_step: {
        label: '订单确认后生成回款计划',
        nodes: {
          start: { label: '开始（订单已确认）' },
          find_step: { label: '订单已有回款计划？' },
          get_order: { label: '获取已确认的订单' },
          create_step: { label: '创建回款计划步骤' },
          end: { label: '结束' },
        },
      },
      sales_order_amount_plan_step: {
        label: '回款计划跟随订单金额',
        nodes: {
          start: { label: '开始（订单总价已变更）' },
          find_steps: { label: '查找订单的回款计划' },
          get_step: { label: '获取唯一的计划步骤' },
          get_order: { label: '获取订单' },
          update_step: { label: '将计划步骤设为订单总价' },
          end: { label: '结束' },
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
      sales_order_confirmed_plan_step: {
        label: '確定した注文に入金計画を作成',
        nodes: {
          start: { label: '開始（注文が確定済みになった時）' },
          find_step: { label: '注文に入金計画がある？' },
          get_order: { label: '確定した注文を取得' },
          create_step: { label: '入金計画ステップを作成' },
          end: { label: '終了' },
        },
      },
      sales_order_amount_plan_step: {
        label: '入金計画を注文金額に合わせる',
        nodes: {
          start: { label: '開始（注文の合計金額の変更時）' },
          find_steps: { label: '注文の入金計画を検索' },
          get_step: { label: '唯一の計画ステップを取得' },
          get_order: { label: '注文を取得' },
          update_step: { label: '計画ステップを注文の合計金額にする' },
          end: { label: '終了' },
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
      sales_order_confirmed_plan_step: {
        label: 'El pedido confirmado recibe un plan de cobro',
        nodes: {
          start: { label: 'Inicio (el pedido pasó a Confirmado)' },
          find_step: { label: '¿El pedido tiene un plan de cobro?' },
          get_order: { label: 'Obtener el pedido confirmado' },
          create_step: { label: 'Crear el paso del plan de cobro' },
          end: { label: 'Fin' },
        },
      },
      sales_order_amount_plan_step: {
        label: 'El plan de cobro sigue el importe del pedido',
        nodes: {
          start: { label: 'Inicio (cambió el total del pedido)' },
          find_steps: { label: 'Buscar el plan de cobro del pedido' },
          get_step: { label: 'Obtener el único paso' },
          get_order: { label: 'Obtener el pedido' },
          update_step: { label: 'Poner el paso al total del pedido' },
          end: { label: 'Fin' },
        },
      },
    },
  },
};
