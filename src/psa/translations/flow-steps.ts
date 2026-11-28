// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationBundle } from '@objectstack/spec/system';
import { PROJECT_FINANCE_REVIEW_BUDGET } from '../objects/_thresholds';

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
export const PsaFlowStepTranslations: TranslationBundle = {
  'zh-CN': {
    flows: {
      project_initiation_approval: {
        nodes: {
          start: { label: '开始（项目已提交审批）' },
          check_budget: { label: `预算 ${PROJECT_FINANCE_REVIEW_BUDGET} 或以上？` },
          end: { label: '结束' },
          mark_approved: { label: '标记为已批准' },
        },
      },
      project_budget_approval: {
        nodes: {
          start: { label: '开始（追加预算已提交审批）' },
          check_raise: { label: '基线提高 10% 或以上？' },
          end: { label: '结束' },
          mark_approved: { label: '标记为已批准' },
        },
      },
      timesheet_approval: {
        nodes: {
          start: { label: '开始（工时单已提交）' },
          end: { label: '结束' },
        },
      },
      timesheet_approval_on_create: {
        nodes: {
          start: { label: '开始（工时单已提交）' },
          end: { label: '结束' },
        },
      },
      project_budget_alert: {
        nodes: {
          start: { label: '开始（预算状态越过阈值）' },
          check_level: { label: '预警还是已超支？' },
          notify_warning: { label: '通知：预算预警' },
          notify_exceeded: { label: '通知：预算已超支' },
          end: { label: '结束' },
        },
      },
      project_member_person_rename: {
        label: '项目成员人员改名',
        nodes: {
          start: { label: '开始（用户改名）' },
          loop_memberships: { label: '遍历每个组织' },
          end: { label: '结束' },
        },
      },
      expense_report_project_approval: {
        nodes: {
          start: { label: '开始（提交了关联项目的报销单）' },
          check_project: { label: '项目进行中？' },
          notify_over: { label: '通知：项目已结束' },
          notify_locked: { label: '通知：项目已锁定' },
          check_amount: { label: '合计 2000 或以上？' },
          end: { label: '结束' },
          turn_back_over: { label: '退回草稿（项目已结束）' },
          turn_back_locked: { label: '退回草稿（项目已锁定）' },
          stamp_approver: { label: '记录项目经理为审批人' },
          mark_approved: { label: '标记为已批准' },
        },
      },
      expense_request_project_approval: {
        nodes: {
          start: { label: '开始（提交了关联项目的出差申请）' },
          end: { label: '结束' },
        },
      },
      expense_request_project_approval_on_create: {
        nodes: {
          start: { label: '开始（提交了关联项目的出差申请）' },
          end: { label: '结束' },
        },
      },
    },
  },
  'ja-JP': {
    flows: {
      project_initiation_approval: {
        nodes: {
          start: { label: '開始（プロジェクトの承認申請時）' },
          check_budget: { label: `予算 ${PROJECT_FINANCE_REVIEW_BUDGET} 以上？` },
          end: { label: '終了' },
          mark_approved: { label: '承認済みにする' },
        },
      },
      project_budget_approval: {
        nodes: {
          start: { label: '開始（予算追加の承認申請時）' },
          check_raise: { label: 'ベースラインを 10% 以上引き上げる？' },
          end: { label: '終了' },
          mark_approved: { label: '承認済みにする' },
        },
      },
      timesheet_approval: {
        nodes: {
          start: { label: '開始（タイムシートの申請時）' },
          end: { label: '終了' },
        },
      },
      timesheet_approval_on_create: {
        nodes: {
          start: { label: '開始（タイムシートの申請時）' },
          end: { label: '終了' },
        },
      },
      project_budget_alert: {
        nodes: {
          start: { label: '開始（予算ステータスのしきい値超過時）' },
          check_level: { label: '警告または超過？' },
          notify_warning: { label: '通知：予算の警告' },
          notify_exceeded: { label: '通知：予算超過' },
          end: { label: '終了' },
        },
      },
      project_member_person_rename: {
        label: 'プロジェクトメンバーの氏名変更',
        nodes: {
          start: { label: '開始（ユーザー名の変更）' },
          loop_memberships: { label: '組織ごとに' },
          end: { label: '終了' },
        },
      },
      expense_report_project_approval: {
        nodes: {
          start: { label: '開始（プロジェクトの精算書の申請時）' },
          check_project: { label: 'プロジェクトは進行中？' },
          notify_over: { label: '通知：プロジェクト終了' },
          notify_locked: { label: '通知：プロジェクトはロック中' },
          check_amount: { label: '合計 2000 以上？' },
          end: { label: '終了' },
          turn_back_over: { label: '下書きに戻す（プロジェクト終了）' },
          turn_back_locked: { label: '下書きに戻す（プロジェクトはロック中）' },
          stamp_approver: { label: 'プロジェクトマネージャーを承認者として記録' },
          mark_approved: { label: '承認済みにする' },
        },
      },
      expense_request_project_approval: {
        nodes: {
          start: { label: '開始（プロジェクトの出張申請の申請時）' },
          end: { label: '終了' },
        },
      },
      expense_request_project_approval_on_create: {
        nodes: {
          start: { label: '開始（プロジェクトの出張申請の申請時）' },
          end: { label: '終了' },
        },
      },
    },
  },
  'es-ES': {
    flows: {
      project_initiation_approval: {
        nodes: {
          start: { label: 'Inicio (proyecto enviado a aprobación)' },
          check_budget: { label: `¿Presupuesto de ${PROJECT_FINANCE_REVIEW_BUDGET} o más?` },
          end: { label: 'Fin' },
          mark_approved: { label: 'Marcar como aprobado' },
        },
      },
      project_budget_approval: {
        nodes: {
          start: { label: 'Inicio (ampliación enviada a aprobación)' },
          check_raise: { label: '¿Sube la línea base un 10 % o más?' },
          end: { label: 'Fin' },
          mark_approved: { label: 'Marcar como aprobado' },
        },
      },
      timesheet_approval: {
        nodes: {
          start: { label: 'Inicio (parte de horas enviado)' },
          end: { label: 'Fin' },
        },
      },
      timesheet_approval_on_create: {
        nodes: {
          start: { label: 'Inicio (parte de horas enviado)' },
          end: { label: 'Fin' },
        },
      },
      project_budget_alert: {
        nodes: {
          start: { label: 'Inicio (el estado del presupuesto cruzó un umbral)' },
          check_level: { label: '¿Aviso o superado?' },
          notify_warning: { label: 'Notificar: aviso de presupuesto' },
          notify_exceeded: { label: 'Notificar: presupuesto superado' },
          end: { label: 'Fin' },
        },
      },
      project_member_person_rename: {
        label: 'Persona del miembro del proyecto renombrada',
        nodes: {
          start: { label: 'Inicio (usuario renombrado)' },
          loop_memberships: { label: 'Para cada organización' },
          end: { label: 'Fin' },
        },
      },
      expense_report_project_approval: {
        nodes: {
          start: { label: 'Inicio (informe de un proyecto enviado)' },
          check_project: { label: '¿Proyecto abierto?' },
          notify_over: { label: 'Notificar: proyecto terminado' },
          notify_locked: { label: 'Notificar: proyecto bloqueado' },
          check_amount: { label: '¿Total de 2000 o más?' },
          end: { label: 'Fin' },
          turn_back_over: { label: 'Volver a borrador (proyecto terminado)' },
          turn_back_locked: { label: 'Volver a borrador (proyecto bloqueado)' },
          stamp_approver: { label: 'Registrar al jefe de proyecto como aprobador' },
          mark_approved: { label: 'Marcar como aprobado' },
        },
      },
      expense_request_project_approval: {
        nodes: {
          start: { label: 'Inicio (solicitud de viaje de un proyecto enviada)' },
          end: { label: 'Fin' },
        },
      },
      expense_request_project_approval_on_create: {
        nodes: {
          start: { label: 'Inicio (solicitud de viaje de un proyecto enviada)' },
          end: { label: 'Fin' },
        },
      },
    },
  },
};
