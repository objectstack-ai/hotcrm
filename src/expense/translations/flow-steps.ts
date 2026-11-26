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
export const ExpenseFlowStepTranslations: TranslationBundle = {
  'zh-CN': {
    flows: {
      expense_report_approval: {
        nodes: {
          start: { label: '开始（提交了无项目的报销单）' },
          check_manager: { label: '有上级？' },
          check_amount: { label: '合计 2000 或以上？' },
          end: { label: '结束' },
          stamp_approver: { label: '记录上级为审批人' },
          mark_approved: { label: '标记为已批准' },
        },
      },
      expense_request_approval: {
        nodes: {
          start: { label: '开始（提交了无项目的出差申请）' },
          check_manager: { label: '有上级？' },
          end: { label: '结束' },
          stamp_approver: { label: '记录上级为审批人' },
        },
      },
      expense_request_approval_on_create: {
        nodes: {
          start: { label: '开始（提交了无项目的出差申请）' },
          check_manager: { label: '有上级？' },
          end: { label: '结束' },
          stamp_approver: { label: '记录上级为审批人' },
        },
      },
    },
  },
  'ja-JP': {
    flows: {
      expense_report_approval: {
        nodes: {
          start: { label: '開始（プロジェクトなしの精算書の申請時）' },
          check_manager: { label: '上長がいる？' },
          check_amount: { label: '合計 2000 以上？' },
          end: { label: '終了' },
          stamp_approver: { label: '上長を承認者として記録' },
          mark_approved: { label: '承認済みにする' },
        },
      },
      expense_request_approval: {
        nodes: {
          start: { label: '開始（プロジェクトなしの出張申請の申請時）' },
          check_manager: { label: '上長がいる？' },
          end: { label: '終了' },
          stamp_approver: { label: '上長を承認者として記録' },
        },
      },
      expense_request_approval_on_create: {
        nodes: {
          start: { label: '開始（プロジェクトなしの出張申請の申請時）' },
          check_manager: { label: '上長がいる？' },
          end: { label: '終了' },
          stamp_approver: { label: '上長を承認者として記録' },
        },
      },
    },
  },
  'es-ES': {
    flows: {
      expense_report_approval: {
        nodes: {
          start: { label: 'Inicio (informe sin proyecto enviado)' },
          check_manager: { label: '¿Tiene responsable?' },
          check_amount: { label: '¿Total de 2000 o más?' },
          end: { label: 'Fin' },
          stamp_approver: { label: 'Registrar al responsable como aprobador' },
          mark_approved: { label: 'Marcar como aprobado' },
        },
      },
      expense_request_approval: {
        nodes: {
          start: { label: 'Inicio (solicitud de viaje sin proyecto enviada)' },
          check_manager: { label: '¿Tiene responsable?' },
          end: { label: 'Fin' },
          stamp_approver: { label: 'Registrar al responsable como aprobador' },
        },
      },
      expense_request_approval_on_create: {
        nodes: {
          start: { label: 'Inicio (solicitud de viaje sin proyecto enviada)' },
          check_manager: { label: '¿Tiene responsable?' },
          end: { label: 'Fin' },
          stamp_approver: { label: 'Registrar al responsable como aprobador' },
        },
      },
    },
  },
};
