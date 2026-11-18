// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Page } from '@objectstack/spec/ui';
import { P } from '@objectstack/spec';

/**
 * Lead Detail — the synthesized record page with ONE slot filled: `alerts`
 * (#2382, maintainer ruling 2026-10-29: 「四张页全部退成默认页，只把告警留作单槽覆盖」).
 *
 * Everything else a lead's record page draws is the platform's default page,
 * derived from `crm_lead`'s own metadata: the header and its record-header
 * actions (Qualify, Convert, Schedule Follow-up, the activity trio), the
 * highlight strip (`highlightFields`), the status path (the `status` field's
 * options), the Details body (`fieldGroups`), the related column (Tasks scoped
 * to open ones by `relatedListFilter` on `crm_task.related_to_lead`; Events and
 * Campaign Members with their FK's `relatedListColumns`) and the one timeline
 * stream (activity, discussion and the `trackHistory` field changes).
 *
 * The page this replaced was a hand-built `kind: 'full'` layout of eleven
 * blocks; the PR for #2382 records what became of each one.
 *
 * `isDefault: true` keeps this the lead's record page should a second record
 * page for `crm_lead` ever be added (the route draws the default page first,
 * see `quote_detail.page.ts`).
 */
export const LeadDetailPage: Page = {
  name: 'lead_detail_page',
  label: 'Lead Detail',
  description: 'The lead record page: the synthesized layout, with the duplicate banners in the alerts slot.',

  type: 'record',
  object: 'crm_lead',
  isDefault: true,

  kind: 'slotted',
  regions: [],
  slots: {
    // The `alerts` slot is drawn between the header and the highlight strip
    // (`buildDefaultPageSchema`, step 2.5) — where these banners sat on the
    // retired page.
    alerts: [
      // Duplicate banners — ONE PER VERDICT (#1207 · widened by #1289 ·
      // split by #1628).
      //
      // `lead_duplicate_check` (lead.hook.ts, job 2) already writes
      // `duplicate_status: 'suspected'` and links the record the lead repeats
      // — the flag existed, and this page never read it. A rep opened a
      // flagged lead, saw a page identical to a clean one, and converted it
      // into a second account, contact and opportunity. These banners and the
      // `duplicates` field group in the Details body are the record-page half of
      // that fix — the banner is the alarm, the section is the link to
      // compare against; the conversion screen carries the other half.
      //
      // ## Why there are TWO of them (#1628)
      //
      // #1207 shipped one banner gated on `== "suspected"`, which left the
      // STRONGER state silent. #1289 widened the predicate to every verdict
      // and, being one component, had to pick copy that named NEITHER state:
      // a `record:alert` carries a single `visible` and a single title/body
      // pair, and `pickLocalized` picks by LANGUAGE, not by row — so naming
      // one verdict would have mislabelled every lead in the other.
      //
      // That was correct for one banner, and it is why one banner is not
      // enough. Since #1288 the two verdicts have OPPOSITE next steps:
      //
      //   suspected — the intake hook's guess. Conversion PROCEEDS; the rep
      //               should compare against the linked record first.
      //   confirmed — a reviewer's verdict. Conversion is REFUSED outright
      //               (`lead-conversion.flow.ts`, `refuse_confirmed_duplicate`).
      //
      // One sentence cannot state either without being false for the other,
      // so it stated neither, and the rep had to scroll to the Duplicate
      // Status chip to learn which situation they were in. A banner that
      // announces something is wrong but not what to do is not doing the one
      // job a banner has. Two components, two predicates, two next steps.
      //
      // ⚠️ Two `record:alert` nodes in one slot really do BOTH render: the
      // default-page synthesizer flattens a slot's array in place
      // (`toNodeArray(slots.alerts)` in `buildDefaultPageSchema`, read on the
      // 18.6.0 tag) and each node is mounted separately, evaluating its own
      // `visible` against the same row. Their `id`s are their React keys, which
      // is why the two ids differ rather than sharing one.
      //
      // ⚠️ `visible` is the ONE record component whose PROPS carry a real row
      // predicate: `record-alert.tsx` evaluates `properties.visible` through
      // `toPredicateInput` + `useCondition` against the row
      // (`usePredicateRecordContext`), the same pipeline as an action button.
      // A node-level `visibleWhen` is a different gate one tier up,
      // evaluated by `SchemaRenderer`, and the two compose as AND. Measured
      // on the 17.6.0 pin (#1887), that tier binds the page's row as
      // `record` too (objectui#5454): this same predicate, moved there,
      // gated correctly in both directions. `visible` stays because it is
      // the gate `record:alert` declares in its own props.
      //
      // ⚠️ `has()` is load-bearing, and this surface is the WORST of the four
      // this repo measures (cf. `test/view-predicate-dialect.test.ts`): the
      // renderer's call site is FAIL-SOFT — an unevaluable predicate answers
      // SHOWN. So a bare `record.duplicate_status == "suspected"` would abort
      // with `No such key` on every clean lead whose driver omits the column
      // (`driver-memory` / `driver-mongodb`; `driver-sql` returns it as null)
      // and put a duplicate warning on leads that are not duplicates. The
      // guard is what makes the predicate answer `false` instead of faulting.
      // Pinned on the real engine in `test/lead-duplicate-visibility.test.ts`.
      //
      // ⛔ And the guard is NOT the whole predicate — `has()` ALONE is wrong
      // here, in either shape. It is TRUE for a key that is PRESENT AND NULL,
      // which is precisely what `driver-sql` hands back for a clean lead
      // (measured: `has(record.duplicate_status)` against
      // `{ duplicate_status: null }` answers `{ ok: true, value: true }`), so
      // the guard needs a comparison beside it or the banner cries wolf on
      // every clean lead. #1289, covering both verdicts at once, spelled that
      // comparison `&& … != null`. A per-verdict banner spells it with the
      // EQUALITY, which is strictly narrower and subsumes it: measured on
      // this engine, `null == "suspected"` is a clean `false`, not a fault,
      // and the two spellings agree on every record shape a driver can
      // produce. Both halves of the shape #1289 ruled for are intact — the
      // `has()` guard verbatim, and a comparison that makes "set" mean set —
      // and the comparison got STRICTER, which is the point of the split. The
      // same spelling already ships one file over, on this same field: the
      // conversion flow's `e21` / `e25` edges (#1288) read
      // `has(vars.leadRecord.duplicate_status) && … == "suspected"`.
      //
      // ⛔ Neither half may be simplified away. Both are pinned, shape by
      // shape, including the reverse pin that the unguarded tail really does
      // fault.
      //
      // `P` — an explicit `{ dialect: 'cel' }` envelope — is not decoration
      // either: `ExpressionEvaluator.evaluateCondition` routes ONLY the
      // envelope to `@objectstack/formula`'s CEL engine, where `has()` is a
      // real function; a bare string takes the legacy JS path, whose
      // `FormulaFunctions` has no CEL `has()`, so the guard would itself be
      // the fault that fails soft to visible.
      //
      // `title` / `body` carry inline locale maps rather than plain strings:
      // this renderer resolves both through `pickLocalized(…, language)`
      // (the same capability `opportunity_detail.page.ts` records under
      // #972), and `body` has no other channel — the i18n extractor's
      // per-component copy keys (`PAGE_COMPONENT_COPY_KEYS`, read on 17.6.0)
      // are title/description/label/placeholder/emptyText, so a plain-string
      // `body` would ship English to all four locales. Keeping both halves of one banner's copy in one
      // place beats splitting `title` into the locale packs.
      //
      // ⭐ Each banner's copy NAMES ITS OWN VERDICT, in the vocabulary the
      // `duplicate_status` chip below publishes, and never the other one —
      // pinned against the option labels read out of the locale packs in
      // `test/lead-duplicate-visibility.test.ts`, so renaming an option
      // re-aims the assertion rather than retiring it.
      {
        type: 'record:alert',
        id: 'lead_duplicate_alert_suspected',
        label: 'Suspected Duplicate Alert',
        properties: {
          // `warning`, not `error`: conversion still PROCEEDS on this
          // verdict, and the renderer maps `error` to `role="alert"` /
          // `aria-live="assertive"` — an interruption this state has not
          // earned.
          severity: 'warning',
          visible: P`has(record.duplicate_status) && record.duplicate_status == "suspected"`,
          title: {
            en: 'Suspected duplicate — compare before you convert',
            'zh-CN': '疑似重复——转化前请先比对',
            'ja-JP': '重複の疑い — 変換する前に照合してください',
            'es-ES': 'Duplicado Sospechoso: compare antes de convertir',
          },
          body: {
            en:
              'Intake matched this lead to a record this app already has. Duplicate '
              + 'Management below links that record — open it and compare. You can still '
              + 'convert this lead: this is the match intake guessed at, not a reviewer\'s '
              + 'decision. But if it is the same buyer, disqualify it instead, because '
              + 'converting creates a second account, contact and opportunity for them.',
            'zh-CN':
              '录入时发现该线索与系统中已有记录匹配。下方「重复线索管理」中是它重复的那条记录，'
              + '请先打开比对。该线索仍然可以转化：这是录入时的自动判断，不是审核人的结论。'
              + '但若确属同一客户，请改为取消资格——转化会为同一客户再创建一套客户、联系人和商机。',
            'ja-JP':
              '登録時に、このリードが既存レコードと一致しました。下の「重複管理」に重複先の'
              + 'レコードがあります。まず開いて照合してください。このリードはまだ変換できます。'
              + 'これは登録時の自動判定であり、担当者の結論ではありません。ただし同じ相手で'
              + 'あれば、変換せず不適格にしてください。変換すると同じ相手に取引先・取引先'
              + '責任者・商談がもう一組作成されます。',
            'es-ES':
              'La captura encontró que este prospecto coincide con un registro que ya '
              + 'existe. Gestión de Duplicados, más abajo, enlaza ese registro: ábralo y '
              + 'compárelo. Todavía puede convertir este prospecto, porque se trata de una '
              + 'coincidencia automática de la captura y no del veredicto de una persona. '
              + 'Pero si es el mismo comprador, descalifíquelo en su lugar: convertirlo '
              + 'crea una segunda cuenta, contacto y oportunidad para él.',
          },
        },
      },
      {
        type: 'record:alert',
        id: 'lead_duplicate_alert_confirmed',
        label: 'Confirmed Duplicate Alert',
        properties: {
          // `error`, and the level is the message: this is the state on which
          // the app REFUSES the rep's next click, and the renderer gives
          // `error` `role="alert"` / `aria-live="assertive"` rather than the
          // polite `role="status"` every other level gets. ⛔ The severity is
          // presentation only — what the app refuses was ruled by #1288 and
          // shipped by PR #1555, and nothing here changes it.
          severity: 'error',
          visible: P`has(record.duplicate_status) && record.duplicate_status == "confirmed"`,
          title: {
            en: 'Confirmed duplicate — conversion will be refused',
            'zh-CN': '已确认重复——转化将被拒绝',
            'ja-JP': '重複確定 — 変換は拒否されます',
            'es-ES': 'Duplicado Confirmado: la conversión será rechazada',
          },
          body: {
            // ⭐ The only place a rep learns the Convert button will refuse
            // them BEFORE they press it — until this banner, the refusal
            // dialog was the first they heard of it.
            en:
              'A reviewer checked this lead and recorded that it repeats a record this app '
              + 'already has, so Convert Lead refuses it — this banner is the only warning '
              + 'you get before you press the button. Disqualify this lead instead, naming '
              + 'the surviving record from Duplicate Management below. If the verdict is '
              + 'wrong, a reviewer revises Duplicate Status; there is no override here.',
            'zh-CN':
              '审核人已核实该线索与系统中已有记录重复，因此「转化线索」会拒绝执行——'
              + '本提示是你按下按钮前唯一的预警。请改为取消该线索的资格，并在下方'
              + '「重复线索管理」中注明保留的那条记录。若判定有误，应由审核人修改'
              + '「重复状态」，此处不提供强制转化的入口。',
            'ja-JP':
              '担当者が確認し、このリードは既存レコードの重複であると記録されました。'
              + 'そのため「リード変換」は拒否されます。この通知が、ボタンを押す前に得られる'
              + '唯一の警告です。このリードは不適格にしたうえで、下の「重複管理」で残す'
              + 'レコードを明記してください。判定が誤っている場合は担当者が「重複ステータス」'
              + 'を修正します。ここに強制変換の手段はありません。',
            'es-ES':
              'Una persona verificó que este prospecto repite un registro que ya existe, '
              + 'por lo que Convertir Prospecto lo rechazará: este aviso es la única '
              + 'advertencia antes de pulsar el botón. Descalifique el prospecto e indique '
              + 'el registro que sobrevive desde Gestión de Duplicados, más abajo. Si el '
              + 'veredicto es incorrecto, una persona debe cambiar el Estado del Duplicado; '
              + 'aquí no hay forma de forzar la conversión.',
          },
        },
      },
    ],
  },
};
