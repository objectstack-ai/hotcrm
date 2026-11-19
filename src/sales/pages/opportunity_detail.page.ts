// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';
import type { Page } from '@objectstack/spec/ui';
import { HIGH_VALUE_DEAL_AMOUNT } from '../objects/_thresholds';

/**
 * Opportunity Detail — the synthesized record page with ONE slot filled:
 * `alerts` (#2382, maintainer ruling 2026-10-29: 「四张页全部退成默认页，只把告警留作
 * 单槽覆盖；商机参考栏和客户 chatter 删掉。」).
 *
 * Everything else a deal's record page draws is the platform's default page,
 * derived from `crm_opportunity`'s own metadata: the header and its
 * record-header actions (Generate Quote, the activity trio; Clone sits under
 * More), the highlight strip (`highlightFields`), the stage path (the `stage`
 * field's options), the Details body (`fieldGroups`) with the deal's product
 * lines as a body table (`relatedList: 'primary'` on
 * `crm_opportunity_line_item.crm_opportunity`), the related column (Quotes, and
 * Tasks scoped to open ones by `relatedListFilter` on
 * `crm_task.related_to_opportunity`) and the one timeline stream. The retired
 * page's reference rail is gone with it: the related column draws the same
 * three children.
 *
 * The page this replaced was a hand-built `kind: 'full'` layout of ten blocks;
 * the PR for #2382 records what became of each one.
 */
export const OpportunityDetailPage: Page = {
  name: 'opportunity_detail_page',
  label: 'Opportunity Detail',
  description: 'The opportunity record page: the synthesized layout, with the approval banners in the alerts slot.',

  type: 'record',
  object: 'crm_opportunity',
  isDefault: true,

  kind: 'slotted',
  regions: [],
  slots: {
    // Drawn between the header and the highlight strip
    // (`buildDefaultPageSchema`, step 2.5). On the retired page they sat
    // under the stage path; the slot is the platform's place for banners.
    alerts: [
      // ── A deal waiting on approval says so (#2371 row 2) ──
      // The save that sends a deal for approval (`opportunity_approval`,
      // started by the amount reaching the large-deal line) shows only the
      // ordinary save toast, and the page gains Recall / Reply buttons with
      // no word on why. No hook or flow on 18.2.0 can add a message to that
      // save's toast, so the page carries the message for as long as the
      // request waits: who decides, that the deal is locked, and what
      // Recall does. Two banners, because the approver differs with the
      // amount (the tiers in `opportunity-approval.flow.ts`); the copy is
      // inline locale maps for the reason `lead_detail.page.ts` gives.
      // The `has()` guard and the equality are the shape that note pins:
      // this renderer fails soft to SHOWN on an unevaluable predicate.
      {
        type: 'record:alert',
        id: 'opp_approval_pending_manager',
        label: 'Waiting on Sales Manager Approval',
        properties: {
          severity: 'info',
          visible: P`has(record.approval_status) && record.approval_status == "pending"
            && (!has(record.amount) || record.amount == null || record.amount <= ${HIGH_VALUE_DEAL_AMOUNT})`,
          title: {
            en: 'Sent for approval to a Sales Manager',
            'zh-CN': '已提交销售经理审批',
            'ja-JP': '営業マネージャーの承認待ちです',
            'es-ES': 'Enviada a aprobación de un Gerente de Ventas',
          },
          body: {
            en:
              'This deal reached the large-deal amount, so saving it sent it for approval. '
              + 'It is locked until a Sales Manager decides. Recall, above the title, '
              + 'withdraws the request and unlocks the deal; your next save sends it again.',
            'zh-CN':
              '该商机金额达到大额门槛，保存时已自动提交审批。在销售经理做出决定前，商机处于锁定状态。'
              + '点击标题上方的「撤回」可撤回审批请求并解锁商机；下一次保存会重新提交审批。',
            'ja-JP':
              'この商談は大型案件の金額に達したため、保存時に承認へ回されました。営業マネージャーが'
              + '判断するまでロックされます。タイトル上の「取り下げ」で申請を取り下げてロックを解除できます。'
              + '次に保存すると再び承認へ回されます。',
            'es-ES':
              'Esta oportunidad alcanzó el importe de gran operación, así que al guardarla se envió '
              + 'a aprobación. Queda bloqueada hasta que un Gerente de Ventas decida. Retirar, encima '
              + 'del título, retira la solicitud y la desbloquea; el siguiente guardado la vuelve a enviar.',
          },
        },
      },
      {
        type: 'record:alert',
        id: 'opp_approval_pending_director',
        label: 'Waiting on Sales Manager and Sales Director Approval',
        properties: {
          severity: 'info',
          visible: P`has(record.approval_status) && record.approval_status == "pending"
            && has(record.amount) && record.amount != null && record.amount > ${HIGH_VALUE_DEAL_AMOUNT}`,
          title: {
            en: 'Sent for approval to a Sales Manager, then a Sales Director',
            'zh-CN': '已提交审批：先由销售经理审批，再由销售总监审批',
            'ja-JP': '営業マネージャー、続いて営業ディレクターの承認待ちです',
            'es-ES': 'Enviada a aprobación de un Gerente de Ventas y después de un Director de Ventas',
          },
          body: {
            en:
              'This deal is over $500,000, so saving it sent it for two approvals: a Sales '
              + 'Manager first, then a Sales Director. It is locked until both decide. Recall, '
              + 'above the title, withdraws the request and unlocks the deal; your next save '
              + 'sends it again.',
            'zh-CN':
              '该商机金额超过 $500,000，保存时已自动提交两级审批：先由销售经理审批，再由销售总监审批。'
              + '两级都做出决定前，商机处于锁定状态。点击标题上方的「撤回」可撤回审批请求并解锁商机；'
              + '下一次保存会重新提交审批。',
            'ja-JP':
              'この商談は $500,000 を超えるため、保存時に 2 段階の承認へ回されました。まず営業'
              + 'マネージャー、次に営業ディレクターです。両方が判断するまでロックされます。タイトル上の'
              + '「取り下げ」で申請を取り下げてロックを解除できます。次に保存すると再び承認へ回されます。',
            'es-ES':
              'Esta oportunidad supera los $500,000, así que al guardarla se envió a dos aprobaciones: '
              + 'primero un Gerente de Ventas y después un Director de Ventas. Queda bloqueada hasta '
              + 'que ambos decidan. Retirar, encima del título, retira la solicitud y la desbloquea; '
              + 'el siguiente guardado la vuelve a enviar.',
          },
        },
      },
    ],
  },
};
