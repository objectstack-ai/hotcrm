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
export const RevenueFlowStepTranslations: TranslationBundle = {
  'zh-CN': {
    flows: {
      price_book_add_products: {
        nodes: {
          start: { label: '开始' },
          check_book: { label: '找到价格表？' },
          refuse_no_book: { label: '找不到价格表' },
          loop_products: { label: '为每个产品定价' },
          check_refused: { label: '有被拒绝的？' },
          end_refused: { label: '产品被拒绝' },
          end: { label: '结束' },
        },
      },
      quote_expiration: {
        label: '报价单自动过期',
        nodes: {
          start: { label: '开始（每天 01:00）' },
          loop_quotes: { label: '遍历每张报价单' },
          end: { label: '结束' },
        },
      },
      quote_generation: {
        nodes: {
          start: { label: '开始' },
          refuse_held: { label: '报价单被拒绝' },
          copy_lines: { label: '复制每一行' },
          check_stage: { label: '可推进到方案阶段？' },
          notify_owner: { label: '发送通知' },
          end: { label: '结束' },
          update_opportunity: { label: '更新商机' },
        },
      },
      quote_print_presented: {
        label: '报价单已打印 → 已呈递',
        nodes: {
          start: { label: '开始（报价单 PDF 已归档）' },
          unsent: { label: '草稿或审核中？' },
          end: { label: '结束' },
          mark_presented: { label: '标记为已呈递' },
        },
      },
      quote_accepted_order: {
        nodes: {
          start: { label: '开始（报价单已接受）' },
          copy_lines: { label: '复制每一行' },
          end: { label: '结束' },
        },
      },
      quote_accepted_contract_draft: {
        nodes: {
          start: { label: '开始（报价单已接受）' },
          end: { label: '结束' },
        },
      },
    },
  },
  'ja-JP': {
    flows: {
      price_book_add_products: {
        nodes: {
          start: { label: '開始' },
          check_book: { label: '価格表が見つかった？' },
          refuse_no_book: { label: '価格表が見つからない' },
          loop_products: { label: '製品ごとに価格を設定' },
          check_refused: { label: '拒否されたものがある？' },
          end_refused: { label: '製品を拒否' },
          end: { label: '終了' },
        },
      },
      quote_expiration: {
        label: '見積の自動失効',
        nodes: {
          start: { label: '開始（毎日 01:00）' },
          loop_quotes: { label: '見積ごとに' },
          end: { label: '終了' },
        },
      },
      quote_generation: {
        nodes: {
          start: { label: '開始' },
          refuse_held: { label: '見積を拒否' },
          copy_lines: { label: '各明細をコピー' },
          check_stage: { label: '提案に進められる？' },
          notify_owner: { label: '通知を送信' },
          end: { label: '終了' },
          update_opportunity: { label: '商談を更新' },
        },
      },
      quote_print_presented: {
        label: '見積の印刷 → 提示済み',
        nodes: {
          start: { label: '開始（見積 PDF の保存時）' },
          unsent: { label: '下書きまたはレビュー中？' },
          end: { label: '終了' },
          mark_presented: { label: '提示済みにする' },
        },
      },
      quote_accepted_order: {
        nodes: {
          start: { label: '開始（見積の承諾時）' },
          copy_lines: { label: '各明細をコピー' },
          end: { label: '終了' },
        },
      },
      quote_accepted_contract_draft: {
        nodes: {
          start: { label: '開始（見積の承諾時）' },
          end: { label: '終了' },
        },
      },
    },
  },
  'es-ES': {
    flows: {
      price_book_add_products: {
        nodes: {
          start: { label: 'Inicio' },
          check_book: { label: '¿Se encontró la lista de precios?' },
          refuse_no_book: { label: 'Lista de precios no encontrada' },
          loop_products: { label: 'Poner precio a cada producto' },
          check_refused: { label: '¿Alguno rechazado?' },
          end_refused: { label: 'Productos rechazados' },
          end: { label: 'Fin' },
        },
      },
      quote_expiration: {
        label: 'Vencimiento automático de cotización',
        nodes: {
          start: { label: 'Inicio (diario 01:00)' },
          loop_quotes: { label: 'Para cada cotización' },
          end: { label: 'Fin' },
        },
      },
      quote_generation: {
        nodes: {
          start: { label: 'Inicio' },
          refuse_held: { label: 'Cotización rechazada' },
          copy_lines: { label: 'Copiar cada línea' },
          check_stage: { label: '¿Puede avanzar a propuesta?' },
          notify_owner: { label: 'Enviar notificación' },
          end: { label: 'Fin' },
          update_opportunity: { label: 'Actualizar la oportunidad' },
        },
      },
      quote_print_presented: {
        label: 'Cotización impresa → presentada',
        nodes: {
          start: { label: 'Inicio (PDF de cotización archivado)' },
          unsent: { label: '¿Borrador o en revisión?' },
          end: { label: 'Fin' },
          mark_presented: { label: 'Marcar como presentada' },
        },
      },
      quote_accepted_order: {
        nodes: {
          start: { label: 'Inicio (cotización aceptada)' },
          copy_lines: { label: 'Copiar cada línea' },
          end: { label: 'Fin' },
        },
      },
      quote_accepted_contract_draft: {
        nodes: {
          start: { label: 'Inicio (cotización aceptada)' },
          end: { label: 'Fin' },
        },
      },
    },
  },
};
