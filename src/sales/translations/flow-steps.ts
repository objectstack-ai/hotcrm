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
export const CrmFlowStepTranslations: TranslationBundle = {
  'zh-CN': {
    flows: {
      account_approval: {
        nodes: {
          start: { label: '开始' },
          notify_approved: { label: '通知负责人：已批准' },
          notify_rejected: { label: '通知负责人：已拒绝' },
          end: { label: '结束' },
        },
      },
      lead_conversion: {
        nodes: {
          start: { label: '开始' },
          decision_duplicate: { label: '查重结论？' },
          refuse_confirmed_duplicate: { label: '转化被拒绝' },
          decision_approval: { label: '已批准转化？' },
          refuse_unapproved: { label: '转化被拒绝' },
          decision_match_key: { label: '公司匹配键？' },
          refuse_no_match_key: { label: '转化被拒绝' },
          decision_amount: { label: '商机金额大于零？' },
          refuse_nonpositive_amount: { label: '转化被拒绝' },
          decision_contact_name: { label: '联系人姓名不同？' },
          decision_contact_confirmed: { label: '已确认复用？' },
          refuse_contact_not_confirmed: { label: '转化已取消' },
          decision_account: { label: '客户已存在？' },
          copy_account_revenue: { label: '将线索营收复制到客户' },
          decision_contact: { label: '联系人已存在？' },
          decision_contact_blanks: { label: '联系人有待填空项？' },
          decision_contact_do_not_call: { label: '线索设为请勿致电？' },
          decision_contact_email_opt_out: { label: '线索已退订邮件？' },
          decision_opportunity: { label: '创建商机？' },
          send_notification: { label: '发送确认' },
          end: { label: '结束' },
          warn_duplicate: { label: '生成重复提醒' },
          no_duplicate_warning: { label: '无重复提醒' },
          find_account: { label: '查找已有客户' },
          use_existing_account: { label: '复用已有客户' },
          create_account: { label: '创建客户' },
          use_existing_contact: { label: '复用已有联系人' },
          find_account_primary: { label: '查找客户的主要联系人' },
          fill_contact_blanks: { label: '用线索补全联系人空项' },
          raise_contact_do_not_call: { label: '将请勿致电带到联系人' },
          raise_contact_email_opt_out: { label: '将邮件退订带到联系人' },
          find_responded_memberships: { label: '查找已响应的营销活动成员资格' },
          no_opportunity: { label: '不创建商机' },
        },
      },
      lead_conversion_account_revenue: {
        label: '将线索营收复制到新客户',
        nodes: {
          start: { label: '开始' },
          end: { label: '结束' },
        },
      },
      lead_conversion_approval: {
        nodes: {
          start: { label: '开始' },
          notify_approved: { label: '通知负责人：已批准' },
          notify_rejected: { label: '通知负责人：已拒绝' },
          end: { label: '结束' },
        },
      },
      schedule_followup: {
        nodes: {
          start: { label: '开始' },
          end: { label: '结束' },
        },
      },
      opportunity_approval: {
        nodes: {
          start: { label: '开始' },
          check_high_value: { label: '高金额（> $500K）？' },
          notify_approved: { label: '邮件通知负责人：已批准' },
          notify_rejected: { label: '邮件通知负责人：已拒绝' },
          check_owner_submitted_approved: { label: '由负责人提交？' },
          notify_approved_inbox: { label: '通知负责人：已批准' },
          check_owner_submitted_rejected: { label: '由负责人提交？' },
          notify_rejected_inbox: { label: '通知负责人：已拒绝' },
          end: { label: '结束' },
          mark_approved: { label: '标记为已批准' },
        },
      },
      opportunity_approval_on_create: {
        nodes: {
          start: { label: '开始' },
          check_high_value: { label: '高金额（> $500K）？' },
          notify_approved: { label: '邮件通知负责人：已批准' },
          notify_rejected: { label: '邮件通知负责人：已拒绝' },
          check_owner_submitted_approved: { label: '由负责人提交？' },
          notify_approved_inbox: { label: '通知负责人：已批准' },
          check_owner_submitted_rejected: { label: '由负责人提交？' },
          notify_rejected_inbox: { label: '通知负责人：已拒绝' },
          end: { label: '结束' },
          mark_approved: { label: '标记为已批准' },
        },
      },
      opportunity_status_change_approval: {
        nodes: {
          start: { label: '开始' },
          end: { label: '结束' },
        },
      },
      opportunity_qualification_approval: {
        nodes: {
          start: { label: '开始' },
          end: { label: '结束' },
        },
      },
      opportunity_stagnation: {
        label: '停滞商机提醒',
        nodes: {
          start: { label: '开始（每天 07:30）' },
          loop_opps: { label: '遍历每个停滞商机' },
          end: { label: '结束' },
        },
      },
      forecast_snapshot: {
        label: '预测快照',
        nodes: {
          start: { label: '开始（每天 03:00）' },
          loop_owners: { label: '遍历每位负责人' },
          end: { label: '结束' },
        },
      },
      forecast_owner_rename: {
        label: '预测负责人改名',
        nodes: {
          start: { label: '开始（用户改名）' },
          loop_memberships: { label: '遍历每个组织' },
          end: { label: '结束' },
        },
      },
      lead_assignment: {
        label: '新线索分配与 SLA',
        nodes: {
          start: { label: '开始（线索已创建）' },
          check_hot: { label: '热门线索（评级 ≥ 4）？' },
          owner_hot: { label: '有负责人？' },
          notify_hot: { label: '提醒：热门线索' },
          owner_std: { label: '由他人分配？' },
          notify_std: { label: '提醒：已分配新线索' },
          end: { label: '结束' },
          sla_hot: { label: '设置 1 天 SLA' },
          sla_std: { label: '设置 3 天 SLA' },
        },
      },
      contact_welcome: {
        label: '联系人欢迎',
        nodes: {
          start: { label: '开始（联系人已创建）' },
          send_welcome: { label: '提醒负责人发送欢迎' },
          end: { label: '结束' },
        },
      },
      opportunity_won_alert: {
        label: '大额商机赢单提醒',
        nodes: {
          start: { label: '开始（商机已更新）' },
          notify_management: { label: '通知负责人' },
          end: { label: '结束' },
        },
      },
      task_urgent_alert: {
        label: '紧急任务提醒',
        nodes: {
          start: { label: '开始（任务已创建）' },
          notify_owner: { label: '通知负责人' },
          end: { label: '结束' },
        },
      },
      task_due_reminder: {
        label: '任务到期提醒',
        nodes: {
          start: { label: '开始（每小时）' },
          loop_tasks: { label: '遍历每个到期任务' },
          end: { label: '结束' },
        },
      },
      billing_handoff_closed_won: {
        label: '开票交接：赢单',
        nodes: {
          start: { label: '开始（商机已更新）' },
          end: { label: '结束' },
        },
      },
      contract_renewal: {
        label: '合同续约提醒',
        nodes: {
          start: { label: '开始（每天 08:00）' },
          loop_contracts: { label: '遍历每份合同' },
          end: { label: '结束' },
        },
      },
      contract_expiration: {
        label: '合同自动到期',
        nodes: {
          start: { label: '开始（每天 00:00）' },
          loop_contracts: { label: '遍历每份合同' },
          end: { label: '结束' },
        },
      },
      billing_handoff_contract_activated: {
        label: '开票交接：合同已生效',
        nodes: {
          start: { label: '开始（合同已更新）' },
          end: { label: '结束' },
        },
      },
      contract_drafted_notice: {
        label: '合同已起草通知',
        nodes: {
          start: { label: '开始（合同已起草）' },
          notify_accepter: { label: '通知接受人' },
          end: { label: '结束' },
        },
      },
      sales_order_draft_contract: {
        nodes: {
          start: { label: '开始' },
          refuse_missing: { label: '找不到订单' },
          refuse_cancelled: { label: '订单已取消' },
          refuse_has_contract: { label: '订单已关联合同' },
          refuse_no_contact: { label: '订单没有联系人' },
          draft: { label: '起草合同' },
          end: { label: '结束' },
        },
      },
      sales_order_draft_contract_write: {
        nodes: {
          start: { label: '开始' },
          end: { label: '结束' },
        },
      },
    },
  },
  'ja-JP': {
    flows: {
      account_approval: {
        nodes: {
          start: { label: '開始' },
          notify_approved: { label: '所有者に通知：承認済み' },
          notify_rejected: { label: '所有者に通知：却下' },
          end: { label: '終了' },
        },
      },
      lead_conversion: {
        nodes: {
          start: { label: '開始' },
          decision_duplicate: { label: '重複判定は？' },
          refuse_confirmed_duplicate: { label: '変換を拒否' },
          decision_approval: { label: '変換は承認済み？' },
          refuse_unapproved: { label: '変換を拒否' },
          decision_match_key: { label: '会社の照合キーは？' },
          refuse_no_match_key: { label: '変換を拒否' },
          decision_amount: { label: '商談金額はゼロより大きい？' },
          refuse_nonpositive_amount: { label: '変換を拒否' },
          decision_contact_name: { label: '取引先責任者の氏名が異なる？' },
          decision_contact_confirmed: { label: '再利用を確認済み？' },
          refuse_contact_not_confirmed: { label: '変換をキャンセル' },
          decision_account: { label: '取引先は既に存在？' },
          copy_account_revenue: { label: 'リードの売上を取引先にコピー' },
          decision_contact: { label: '取引先責任者は既に存在？' },
          decision_contact_blanks: { label: '取引先責任者に空欄がある？' },
          decision_contact_do_not_call: { label: 'リードは電話拒否？' },
          decision_contact_email_opt_out: { label: 'リードはメール配信停止？' },
          decision_opportunity: { label: '商談を作成？' },
          send_notification: { label: '確認を送信' },
          end: { label: '終了' },
          warn_duplicate: { label: '重複の警告を作成' },
          no_duplicate_warning: { label: '重複の警告なし' },
          find_account: { label: '既存の取引先を検索' },
          use_existing_account: { label: '既存の取引先を再利用' },
          create_account: { label: '取引先を作成' },
          use_existing_contact: { label: '既存の取引先責任者を再利用' },
          find_account_primary: { label: '取引先の主担当者を検索' },
          fill_contact_blanks: { label: 'リードから取引先責任者の空欄を補完' },
          raise_contact_do_not_call: { label: '電話拒否を取引先責任者に引き継ぐ' },
          raise_contact_email_opt_out: { label: 'メール配信停止を取引先責任者に引き継ぐ' },
          find_responded_memberships: { label: '反応済みのキャンペーンメンバーを検索' },
          no_opportunity: { label: '商談なし' },
        },
      },
      lead_conversion_account_revenue: {
        label: 'リードの売上を新しい取引先にコピー',
        nodes: {
          start: { label: '開始' },
          end: { label: '終了' },
        },
      },
      lead_conversion_approval: {
        nodes: {
          start: { label: '開始' },
          notify_approved: { label: '所有者に通知：承認済み' },
          notify_rejected: { label: '所有者に通知：却下' },
          end: { label: '終了' },
        },
      },
      schedule_followup: {
        nodes: {
          start: { label: '開始' },
          end: { label: '終了' },
        },
      },
      opportunity_approval: {
        nodes: {
          start: { label: '開始' },
          check_high_value: { label: '高額（> $500K）？' },
          notify_approved: { label: '所有者にメール：承認済み' },
          notify_rejected: { label: '所有者にメール：却下' },
          check_owner_submitted_approved: { label: '所有者が申請？' },
          notify_approved_inbox: { label: '所有者に通知：承認済み' },
          check_owner_submitted_rejected: { label: '所有者が申請？' },
          notify_rejected_inbox: { label: '所有者に通知：却下' },
          end: { label: '終了' },
          mark_approved: { label: '承認済みにする' },
        },
      },
      opportunity_approval_on_create: {
        nodes: {
          start: { label: '開始' },
          check_high_value: { label: '高額（> $500K）？' },
          notify_approved: { label: '所有者にメール：承認済み' },
          notify_rejected: { label: '所有者にメール：却下' },
          check_owner_submitted_approved: { label: '所有者が申請？' },
          notify_approved_inbox: { label: '所有者に通知：承認済み' },
          check_owner_submitted_rejected: { label: '所有者が申請？' },
          notify_rejected_inbox: { label: '所有者に通知：却下' },
          end: { label: '終了' },
          mark_approved: { label: '承認済みにする' },
        },
      },
      opportunity_status_change_approval: {
        nodes: {
          start: { label: '開始' },
          end: { label: '終了' },
        },
      },
      opportunity_qualification_approval: {
        nodes: {
          start: { label: '開始' },
          end: { label: '終了' },
        },
      },
      opportunity_stagnation: {
        label: '停滞商談アラート',
        nodes: {
          start: { label: '開始（毎日 07:30）' },
          loop_opps: { label: '停滞商談ごとに' },
          end: { label: '終了' },
        },
      },
      forecast_snapshot: {
        label: '売上予測スナップショット',
        nodes: {
          start: { label: '開始（毎日 03:00）' },
          loop_owners: { label: '所有者ごとに' },
          end: { label: '終了' },
        },
      },
      forecast_owner_rename: {
        label: '売上予測の所有者名を変更',
        nodes: {
          start: { label: '開始（ユーザー名の変更）' },
          loop_memberships: { label: '組織ごとに' },
          end: { label: '終了' },
        },
      },
      lead_assignment: {
        label: '新規リードの割り当てと SLA',
        nodes: {
          start: { label: '開始（リード作成時）' },
          check_hot: { label: 'ホットリード（評価 ≥ 4）？' },
          owner_hot: { label: '所有者がいる？' },
          notify_hot: { label: 'アラート：ホットリード' },
          owner_std: { label: '他の人が割り当て？' },
          notify_std: { label: 'アラート：新規リードの割り当て' },
          end: { label: '終了' },
          sla_hot: { label: '1 日の SLA を設定' },
          sla_std: { label: '3 日の SLA を設定' },
        },
      },
      contact_welcome: {
        label: '取引先責任者へのウェルカム',
        nodes: {
          start: { label: '開始（取引先責任者の作成時）' },
          send_welcome: { label: '所有者にウェルカムを促す' },
          end: { label: '終了' },
        },
      },
      opportunity_won_alert: {
        label: '大型商談の受注アラート',
        nodes: {
          start: { label: '開始（商談の更新時）' },
          notify_management: { label: '所有者に通知' },
          end: { label: '終了' },
        },
      },
      task_urgent_alert: {
        label: '緊急タスクアラート',
        nodes: {
          start: { label: '開始（タスク作成時）' },
          notify_owner: { label: '所有者に通知' },
          end: { label: '終了' },
        },
      },
      task_due_reminder: {
        label: 'タスク期日リマインダー',
        nodes: {
          start: { label: '開始（毎時）' },
          loop_tasks: { label: '期日のタスクごとに' },
          end: { label: '終了' },
        },
      },
      billing_handoff_closed_won: {
        label: '請求への引き継ぎ：受注',
        nodes: {
          start: { label: '開始（商談の更新時）' },
          end: { label: '終了' },
        },
      },
      contract_renewal: {
        label: '契約更新リマインダー',
        nodes: {
          start: { label: '開始（毎日 08:00）' },
          loop_contracts: { label: '契約ごとに' },
          end: { label: '終了' },
        },
      },
      contract_expiration: {
        label: '契約の自動失効',
        nodes: {
          start: { label: '開始（毎日 00:00）' },
          loop_contracts: { label: '契約ごとに' },
          end: { label: '終了' },
        },
      },
      billing_handoff_contract_activated: {
        label: '請求への引き継ぎ：契約の有効化',
        nodes: {
          start: { label: '開始（契約の更新時）' },
          end: { label: '終了' },
        },
      },
      contract_drafted_notice: {
        label: '契約起案のお知らせ',
        nodes: {
          start: { label: '開始（契約の起案時）' },
          notify_accepter: { label: '承諾した人に通知' },
          end: { label: '終了' },
        },
      },
      sales_order_draft_contract: {
        nodes: {
          start: { label: '開始' },
          refuse_missing: { label: '注文が見つからない' },
          refuse_cancelled: { label: '注文はキャンセル済み' },
          refuse_has_contract: { label: '注文には既に契約がある' },
          refuse_no_contact: { label: '注文に取引先責任者がない' },
          draft: { label: '契約を起案' },
          end: { label: '終了' },
        },
      },
      sales_order_draft_contract_write: {
        nodes: {
          start: { label: '開始' },
          end: { label: '終了' },
        },
      },
    },
  },
  'es-ES': {
    flows: {
      account_approval: {
        nodes: {
          start: { label: 'Inicio' },
          notify_approved: { label: 'Notificar al propietario: aprobado' },
          notify_rejected: { label: 'Notificar al propietario: rechazado' },
          end: { label: 'Fin' },
        },
      },
      lead_conversion: {
        nodes: {
          start: { label: 'Inicio' },
          decision_duplicate: { label: '¿Resultado del duplicado?' },
          refuse_confirmed_duplicate: { label: 'Conversión rechazada' },
          decision_approval: { label: '¿Aprobado para la conversión?' },
          refuse_unapproved: { label: 'Conversión rechazada' },
          decision_match_key: { label: '¿Clave de coincidencia de empresa?' },
          refuse_no_match_key: { label: 'Conversión rechazada' },
          decision_amount: { label: '¿Importe de la oportunidad mayor que cero?' },
          refuse_nonpositive_amount: { label: 'Conversión rechazada' },
          decision_contact_name: { label: '¿El nombre del contacto es distinto?' },
          decision_contact_confirmed: { label: '¿Reutilización confirmada?' },
          refuse_contact_not_confirmed: { label: 'Conversión cancelada' },
          decision_account: { label: '¿La cuenta ya existe?' },
          copy_account_revenue: { label: 'Copiar los ingresos del prospecto a la cuenta' },
          decision_contact: { label: '¿El contacto ya existe?' },
          decision_contact_blanks: { label: '¿El contacto tiene campos vacíos que completar?' },
          decision_contact_do_not_call: { label: '¿El prospecto es No llamar?' },
          decision_contact_email_opt_out: { label: '¿El prospecto se dio de baja del correo?' },
          decision_opportunity: { label: '¿Crear oportunidad?' },
          send_notification: { label: 'Enviar confirmación' },
          end: { label: 'Fin' },
          warn_duplicate: { label: 'Redactar el aviso de duplicado' },
          no_duplicate_warning: { label: 'Sin aviso de duplicado' },
          find_account: { label: 'Buscar la cuenta existente' },
          use_existing_account: { label: 'Reutilizar la cuenta existente' },
          create_account: { label: 'Crear cuenta' },
          use_existing_contact: { label: 'Reutilizar el contacto existente' },
          find_account_primary: { label: 'Buscar el contacto principal de la cuenta' },
          fill_contact_blanks: { label: 'Completar los campos vacíos del contacto desde el prospecto' },
          raise_contact_do_not_call: { label: 'Trasladar No llamar al contacto' },
          raise_contact_email_opt_out: { label: 'Trasladar la baja de correo al contacto' },
          find_responded_memberships: { label: 'Buscar las membresías de campaña con respuesta' },
          no_opportunity: { label: 'Sin oportunidad' },
        },
      },
      lead_conversion_account_revenue: {
        label: 'Copiar los ingresos del prospecto a la cuenta nueva',
        nodes: {
          start: { label: 'Inicio' },
          end: { label: 'Fin' },
        },
      },
      lead_conversion_approval: {
        nodes: {
          start: { label: 'Inicio' },
          notify_approved: { label: 'Notificar al propietario: aprobado' },
          notify_rejected: { label: 'Notificar al propietario: rechazado' },
          end: { label: 'Fin' },
        },
      },
      schedule_followup: {
        nodes: {
          start: { label: 'Inicio' },
          end: { label: 'Fin' },
        },
      },
      opportunity_approval: {
        nodes: {
          start: { label: 'Inicio' },
          check_high_value: { label: '¿Alto valor (> $500K)?' },
          notify_approved: { label: 'Enviar correo al propietario: aprobado' },
          notify_rejected: { label: 'Enviar correo al propietario: rechazado' },
          check_owner_submitted_approved: { label: '¿Lo envió el propietario?' },
          notify_approved_inbox: { label: 'Notificar al propietario: aprobado' },
          check_owner_submitted_rejected: { label: '¿Lo envió el propietario?' },
          notify_rejected_inbox: { label: 'Notificar al propietario: rechazado' },
          end: { label: 'Fin' },
          mark_approved: { label: 'Marcar como aprobado' },
        },
      },
      opportunity_approval_on_create: {
        nodes: {
          start: { label: 'Inicio' },
          check_high_value: { label: '¿Alto valor (> $500K)?' },
          notify_approved: { label: 'Enviar correo al propietario: aprobado' },
          notify_rejected: { label: 'Enviar correo al propietario: rechazado' },
          check_owner_submitted_approved: { label: '¿Lo envió el propietario?' },
          notify_approved_inbox: { label: 'Notificar al propietario: aprobado' },
          check_owner_submitted_rejected: { label: '¿Lo envió el propietario?' },
          notify_rejected_inbox: { label: 'Notificar al propietario: rechazado' },
          end: { label: 'Fin' },
          mark_approved: { label: 'Marcar como aprobado' },
        },
      },
      opportunity_status_change_approval: {
        nodes: {
          start: { label: 'Inicio' },
          end: { label: 'Fin' },
        },
      },
      opportunity_qualification_approval: {
        nodes: {
          start: { label: 'Inicio' },
          end: { label: 'Fin' },
        },
      },
      opportunity_stagnation: {
        label: 'Alerta de oportunidad estancada',
        nodes: {
          start: { label: 'Inicio (diario 07:30)' },
          loop_opps: { label: 'Para cada oportunidad estancada' },
          end: { label: 'Fin' },
        },
      },
      forecast_snapshot: {
        label: 'Instantánea de previsión',
        nodes: {
          start: { label: 'Inicio (diario 03:00)' },
          loop_owners: { label: 'Para cada propietario' },
          end: { label: 'Fin' },
        },
      },
      forecast_owner_rename: {
        label: 'Propietario de la previsión renombrado',
        nodes: {
          start: { label: 'Inicio (usuario renombrado)' },
          loop_memberships: { label: 'Para cada organización' },
          end: { label: 'Fin' },
        },
      },
      lead_assignment: {
        label: 'Asignación y SLA de prospectos nuevos',
        nodes: {
          start: { label: 'Inicio (prospecto creado)' },
          check_hot: { label: '¿Prospecto caliente (calificación ≥ 4)?' },
          owner_hot: { label: '¿Tiene propietario?' },
          notify_hot: { label: 'Alerta: prospecto caliente' },
          owner_std: { label: '¿Lo asignó otra persona?' },
          notify_std: { label: 'Alerta: prospecto nuevo asignado' },
          end: { label: 'Fin' },
          sla_hot: { label: 'Fijar SLA de 1 día' },
          sla_std: { label: 'Fijar SLA de 3 días' },
        },
      },
      contact_welcome: {
        label: 'Bienvenida al contacto',
        nodes: {
          start: { label: 'Inicio (contacto creado)' },
          send_welcome: { label: 'Pedir al propietario que dé la bienvenida' },
          end: { label: 'Fin' },
        },
      },
      opportunity_won_alert: {
        label: 'Alerta de gran oportunidad ganada',
        nodes: {
          start: { label: 'Inicio (oportunidad actualizada)' },
          notify_management: { label: 'Notificar al propietario' },
          end: { label: 'Fin' },
        },
      },
      task_urgent_alert: {
        label: 'Alerta de tarea urgente',
        nodes: {
          start: { label: 'Inicio (tarea creada)' },
          notify_owner: { label: 'Notificar al propietario' },
          end: { label: 'Fin' },
        },
      },
      task_due_reminder: {
        label: 'Recordatorio de vencimiento de tarea',
        nodes: {
          start: { label: 'Inicio (cada hora)' },
          loop_tasks: { label: 'Para cada tarea vencida' },
          end: { label: 'Fin' },
        },
      },
      billing_handoff_closed_won: {
        label: 'Traspaso a facturación: ganada',
        nodes: {
          start: { label: 'Inicio (oportunidad actualizada)' },
          end: { label: 'Fin' },
        },
      },
      contract_renewal: {
        label: 'Recordatorio de renovación de contrato',
        nodes: {
          start: { label: 'Inicio (diario 08:00)' },
          loop_contracts: { label: 'Para cada contrato' },
          end: { label: 'Fin' },
        },
      },
      contract_expiration: {
        label: 'Vencimiento automático de contrato',
        nodes: {
          start: { label: 'Inicio (diario 00:00)' },
          loop_contracts: { label: 'Para cada contrato' },
          end: { label: 'Fin' },
        },
      },
      billing_handoff_contract_activated: {
        label: 'Traspaso a facturación: contrato activado',
        nodes: {
          start: { label: 'Inicio (contrato actualizado)' },
          end: { label: 'Fin' },
        },
      },
      contract_drafted_notice: {
        label: 'Aviso de contrato redactado',
        nodes: {
          start: { label: 'Inicio (contrato redactado)' },
          notify_accepter: { label: 'Notificar a quien aceptó' },
          end: { label: 'Fin' },
        },
      },
      sales_order_draft_contract: {
        nodes: {
          start: { label: 'Inicio' },
          refuse_missing: { label: 'Pedido no encontrado' },
          refuse_cancelled: { label: 'El pedido está cancelado' },
          refuse_has_contract: { label: 'El pedido ya tiene contrato' },
          refuse_no_contact: { label: 'El pedido no tiene contacto' },
          draft: { label: 'Redactar el contrato' },
          end: { label: 'Fin' },
        },
      },
      sales_order_draft_contract_write: {
        nodes: {
          start: { label: 'Inicio' },
          end: { label: 'Fin' },
        },
      },
    },
  },
};
