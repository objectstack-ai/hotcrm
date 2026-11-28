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
export const ServiceFlowStepTranslations: TranslationBundle = {
  'zh-CN': {
    flows: {
      case_escalation: {
        label: '工单升级流程',
        nodes: {
          start: { label: '开始' },
          check_owner: { label: '工单有负责人？' },
          notify_team: { label: '通知工单负责人' },
          end: { label: '结束' },
        },
      },
      case_escalation_on_create: {
        label: '工单升级流程（创建时）',
        nodes: {
          start: { label: '开始' },
          check_owner: { label: '工单有负责人？' },
          notify_team: { label: '通知工单负责人' },
          end: { label: '结束' },
        },
      },
      escalate_case: {
        nodes: {
          start: { label: '开始' },
          stamp_escalation: { label: '标记升级标志' },
          end: { label: '结束' },
        },
      },
      close_case: {
        nodes: {
          start: { label: '开始' },
          end: { label: '结束' },
        },
      },
      case_escalation_stamp: {
        label: '标记工单升级',
        nodes: {
          start: { label: '开始' },
          end: { label: '结束' },
        },
      },
      case_sla_monitor: {
        label: '工单 SLA 监控',
        nodes: {
          start: { label: '开始（每小时）' },
          loop_cases: { label: '遍历每个超时工单' },
          end: { label: '结束' },
        },
      },
    },
  },
  'ja-JP': {
    flows: {
      case_escalation: {
        label: 'ケースのエスカレーションプロセス',
        nodes: {
          start: { label: '開始' },
          check_owner: { label: 'ケースに所有者がいる？' },
          notify_team: { label: 'ケース所有者に通知' },
          end: { label: '終了' },
        },
      },
      case_escalation_on_create: {
        label: 'ケースのエスカレーションプロセス（作成時）',
        nodes: {
          start: { label: '開始' },
          check_owner: { label: 'ケースに所有者がいる？' },
          notify_team: { label: 'ケース所有者に通知' },
          end: { label: '終了' },
        },
      },
      escalate_case: {
        nodes: {
          start: { label: '開始' },
          stamp_escalation: { label: 'エスカレーションフラグを記録' },
          end: { label: '終了' },
        },
      },
      close_case: {
        nodes: {
          start: { label: '開始' },
          end: { label: '終了' },
        },
      },
      case_escalation_stamp: {
        label: 'ケースのエスカレーションを記録',
        nodes: {
          start: { label: '開始' },
          end: { label: '終了' },
        },
      },
      case_sla_monitor: {
        label: 'ケース SLA モニター',
        nodes: {
          start: { label: '開始（毎時）' },
          loop_cases: { label: 'SLA 違反のケースごとに' },
          end: { label: '終了' },
        },
      },
    },
  },
  'es-ES': {
    flows: {
      case_escalation: {
        label: 'Proceso de escalado de casos',
        nodes: {
          start: { label: 'Inicio' },
          check_owner: { label: '¿El caso tiene propietario?' },
          notify_team: { label: 'Notificar al propietario del caso' },
          end: { label: 'Fin' },
        },
      },
      case_escalation_on_create: {
        label: 'Proceso de escalado de casos (al crear)',
        nodes: {
          start: { label: 'Inicio' },
          check_owner: { label: '¿El caso tiene propietario?' },
          notify_team: { label: 'Notificar al propietario del caso' },
          end: { label: 'Fin' },
        },
      },
      escalate_case: {
        nodes: {
          start: { label: 'Inicio' },
          stamp_escalation: { label: 'Marcar los indicadores de escalado' },
          end: { label: 'Fin' },
        },
      },
      close_case: {
        nodes: {
          start: { label: 'Inicio' },
          end: { label: 'Fin' },
        },
      },
      case_escalation_stamp: {
        label: 'Marcar el escalado del caso',
        nodes: {
          start: { label: 'Inicio' },
          end: { label: 'Fin' },
        },
      },
      case_sla_monitor: {
        label: 'Supervisión del SLA de casos',
        nodes: {
          start: { label: 'Inicio (cada hora)' },
          loop_cases: { label: 'Para cada caso incumplido' },
          end: { label: 'Fin' },
        },
      },
    },
  },
};
