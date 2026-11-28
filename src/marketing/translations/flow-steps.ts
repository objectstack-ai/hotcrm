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
export const MarketingFlowStepTranslations: TranslationBundle = {
  'zh-CN': {
    flows: {
      campaign_enrollment: {
        nodes: {
          start: { label: '开始' },
          check_campaign_open: { label: '营销活动进行中？' },
          refuse_not_open: { label: '营销活动未开放' },
          loop_leads: { label: '处理每条线索' },
          loop_contacts: { label: '处理每位联系人' },
          check_refused: { label: '有人被拒绝？' },
          end_refused: { label: '加入被拒绝' },
          end: { label: '结束' },
          query_leads: { label: '查找符合条件的线索' },
          query_contacts: { label: '查找符合条件的联系人' },
        },
      },
      campaign_completion: {
        label: '营销活动自动完成',
        nodes: {
          start: { label: '开始（每天 02:00）' },
          loop_campaigns: { label: '遍历每个营销活动' },
          end: { label: '结束' },
        },
      },
      campaign_lead_member_enroll: {
        label: '将线索加入营销活动',
        nodes: {
          start: { label: '开始' },
          check_campaign_open: { label: '营销活动进行中？' },
          refuse_campaign_not_open: { label: '营销活动未开放' },
          check_lead_opted_in: { label: '已同意接收？' },
          refuse_lead_opted_out: { label: '线索已退订' },
          check_not_enrolled: { label: '新成员？' },
          end: { label: '结束' },
          get_lead: { label: '获取线索' },
          find_existing_member: { label: '已加入？' },
          create_campaign_member: { label: '加入营销活动' },
          mark_already: { label: '已是成员' },
        },
      },
      campaign_contact_member_enroll: {
        label: '将联系人加入营销活动',
        nodes: {
          start: { label: '开始' },
          check_campaign_open: { label: '营销活动进行中？' },
          refuse_campaign_not_open: { label: '营销活动未开放' },
          check_contact_opted_in: { label: '已同意接收？' },
          refuse_contact_opted_out: { label: '联系人已退订' },
          check_contact_not_enrolled: { label: '新成员？' },
          end: { label: '结束' },
          get_contact: { label: '获取联系人' },
          find_existing_contact_member: { label: '已加入？' },
          create_contact_member: { label: '将联系人加入营销活动' },
          mark_contact_already: { label: '已是成员' },
        },
      },
    },
  },
  'ja-JP': {
    flows: {
      campaign_enrollment: {
        nodes: {
          start: { label: '開始' },
          check_campaign_open: { label: 'キャンペーンは実施中？' },
          refuse_not_open: { label: 'キャンペーンは実施中でない' },
          loop_leads: { label: 'リードごとに処理' },
          loop_contacts: { label: '取引先責任者ごとに処理' },
          check_refused: { label: '拒否された人がいる？' },
          end_refused: { label: '登録を拒否' },
          end: { label: '終了' },
          query_leads: { label: '対象のリードを検索' },
          query_contacts: { label: '対象の取引先責任者を検索' },
        },
      },
      campaign_completion: {
        label: 'キャンペーンの自動完了',
        nodes: {
          start: { label: '開始（毎日 02:00）' },
          loop_campaigns: { label: 'キャンペーンごとに' },
          end: { label: '終了' },
        },
      },
      campaign_lead_member_enroll: {
        label: 'リードをキャンペーンに登録',
        nodes: {
          start: { label: '開始' },
          check_campaign_open: { label: 'キャンペーンは実施中？' },
          refuse_campaign_not_open: { label: 'キャンペーンは実施中でない' },
          check_lead_opted_in: { label: 'オプトイン済み？' },
          refuse_lead_opted_out: { label: 'リードはオプトアウト済み' },
          check_not_enrolled: { label: '新規メンバー？' },
          end: { label: '終了' },
          get_lead: { label: 'リードを取得' },
          find_existing_member: { label: '登録済み？' },
          create_campaign_member: { label: 'キャンペーンに追加' },
          mark_already: { label: '既にメンバー' },
        },
      },
      campaign_contact_member_enroll: {
        label: '取引先責任者をキャンペーンに登録',
        nodes: {
          start: { label: '開始' },
          check_campaign_open: { label: 'キャンペーンは実施中？' },
          refuse_campaign_not_open: { label: 'キャンペーンは実施中でない' },
          check_contact_opted_in: { label: 'オプトイン済み？' },
          refuse_contact_opted_out: { label: '取引先責任者はオプトアウト済み' },
          check_contact_not_enrolled: { label: '新規メンバー？' },
          end: { label: '終了' },
          get_contact: { label: '取引先責任者を取得' },
          find_existing_contact_member: { label: '登録済み？' },
          create_contact_member: { label: '取引先責任者をキャンペーンに追加' },
          mark_contact_already: { label: '既にメンバー' },
        },
      },
    },
  },
  'es-ES': {
    flows: {
      campaign_enrollment: {
        nodes: {
          start: { label: 'Inicio' },
          check_campaign_open: { label: '¿Campaña abierta?' },
          refuse_not_open: { label: 'La campaña no está abierta' },
          loop_leads: { label: 'Procesar cada prospecto' },
          loop_contacts: { label: 'Procesar cada contacto' },
          check_refused: { label: '¿Alguien rechazado?' },
          end_refused: { label: 'Inscripción rechazada' },
          end: { label: 'Fin' },
          query_leads: { label: 'Buscar los prospectos aptos' },
          query_contacts: { label: 'Buscar los contactos aptos' },
        },
      },
      campaign_completion: {
        label: 'Finalización automática de campaña',
        nodes: {
          start: { label: 'Inicio (diario 02:00)' },
          loop_campaigns: { label: 'Para cada campaña' },
          end: { label: 'Fin' },
        },
      },
      campaign_lead_member_enroll: {
        label: 'Inscribir el prospecto en la campaña',
        nodes: {
          start: { label: 'Inicio' },
          check_campaign_open: { label: '¿Campaña abierta?' },
          refuse_campaign_not_open: { label: 'La campaña no está abierta' },
          check_lead_opted_in: { label: '¿Dio su consentimiento?' },
          refuse_lead_opted_out: { label: 'El prospecto se dio de baja' },
          check_not_enrolled: { label: '¿Miembro nuevo?' },
          end: { label: 'Fin' },
          get_lead: { label: 'Obtener el prospecto' },
          find_existing_member: { label: '¿Ya inscrito?' },
          create_campaign_member: { label: 'Añadir a la campaña' },
          mark_already: { label: 'Ya es miembro' },
        },
      },
      campaign_contact_member_enroll: {
        label: 'Inscribir el contacto en la campaña',
        nodes: {
          start: { label: 'Inicio' },
          check_campaign_open: { label: '¿Campaña abierta?' },
          refuse_campaign_not_open: { label: 'La campaña no está abierta' },
          check_contact_opted_in: { label: '¿Dio su consentimiento?' },
          refuse_contact_opted_out: { label: 'El contacto se dio de baja' },
          check_contact_not_enrolled: { label: '¿Miembro nuevo?' },
          end: { label: 'Fin' },
          get_contact: { label: 'Obtener el contacto' },
          find_existing_contact_member: { label: '¿Ya inscrito?' },
          create_contact_member: { label: 'Añadir el contacto a la campaña' },
          mark_contact_already: { label: 'Ya es miembro' },
        },
      },
    },
  },
};
