// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

/**
 * 日本語 (ja-JP) — the Sales hooks' refusal sentences (#2496).
 *
 * Keyed `hooks.<hook>.refusals.<CODE>[.reasons.<REASON>].message`, one entry
 * per sentence the hook's `refusals` catalogue declares; the English sentence
 * is the declared message itself. `test/hook-refusal-catalogue.test.ts` holds
 * every declared sentence to a translation here, with only declared holes.
 */
export const hooks: NonNullable<TranslationData['hooks']> = {
  account_protection: {
    refusals: {
      VALIDATION_FAILED: {
        message: 'Webサイトは http:// または https:// で始めてください。',
        reasons: {
          annual_revenue: {
            message: '年間売上は0以上にしてください。',
          },
          converted_from_lead: {
            message: '変換元リードは「リード変換」が取引先を作成するときにだけ設定されます。空のままにしてください。この取引先は新規取引先として承認に回ります。',
          },
        },
      },
      DELETE_RESTRICTED: {
        message: '取引先を削除できません：商談1件（未完了・クローズ済みを問わず）がまだ参照しています。先にその商談を削除するか、削除する代わりに取引先を無効にしてください。',
        reasons: {
          opportunities: {
            message: '取引先を削除できません：商談{{count}}件（未完了・クローズ済みを問わず）がまだ参照しています。先にそれらの商談を削除するか、削除する代わりに取引先を無効にしてください。',
          },
          contract: {
            message: '取引先を削除できません：有効な契約1件がまだ参照しています。先にその契約を解約するか、別の取引先に移してください。',
          },
          contracts: {
            message: '取引先を削除できません：有効な契約{{count}}件がまだ参照しています。先にそれらの契約を解約するか、別の取引先に移してください。',
          },
        },
      },
    },
  },
  contact_integrity: {
    refusals: {
      DUPLICATE_VALUE: {
        message: 'メール {{email}} の取引先責任者がすでに存在します。',
        reasons: {
          named: {
            message: 'メール {{email}} の取引先責任者（{{contact}}）がすでに存在します。',
          },
        },
      },
      DELETE_RESTRICTED: {
        message: '取引先責任者{{contact}}は未完了の商談{{opportunities}}件、未完了の見積{{quotes}}件と有効な契約{{contracts}}件から参照されているため削除できません。取引先を削除するとその取引先責任者も削除されるため、取引先も削除できません。この取引先責任者を解放するには、未完了の商談をそれぞれクローズするか別の主担当者を設定し、未完了の見積にそれぞれ別の担当者を設定するか却下し、各契約に別の主担当者を設定してください（契約は終了後も主担当者を保持します）。',
        reasons: {
          opportunities: {
            message: '取引先責任者{{contact}}は未完了の商談{{opportunities}}件から参照されているため削除できません。取引先を削除するとその取引先責任者も削除されるため、取引先も削除できません。この取引先責任者を解放するには、未完了の商談をそれぞれクローズするか別の主担当者を設定してください。',
          },
          quotes: {
            message: '取引先責任者{{contact}}は未完了の見積{{quotes}}件から参照されているため削除できません。取引先を削除するとその取引先責任者も削除されるため、取引先も削除できません。この取引先責任者を解放するには、未完了の見積にそれぞれ別の担当者を設定するか却下してください。',
          },
          contracts: {
            message: '取引先責任者{{contact}}は有効な契約{{contracts}}件から参照されているため削除できません。取引先を削除するとその取引先責任者も削除されるため、取引先も削除できません。この取引先責任者を解放するには、各契約に別の主担当者を設定してください（契約は終了後も主担当者を保持します）。',
          },
          opportunities_quotes: {
            message: '取引先責任者{{contact}}は未完了の商談{{opportunities}}件と未完了の見積{{quotes}}件から参照されているため削除できません。取引先を削除するとその取引先責任者も削除されるため、取引先も削除できません。この取引先責任者を解放するには、未完了の商談をそれぞれクローズするか別の主担当者を設定し、未完了の見積にそれぞれ別の担当者を設定するか却下してください。',
          },
          opportunities_contracts: {
            message: '取引先責任者{{contact}}は未完了の商談{{opportunities}}件と有効な契約{{contracts}}件から参照されているため削除できません。取引先を削除するとその取引先責任者も削除されるため、取引先も削除できません。この取引先責任者を解放するには、未完了の商談をそれぞれクローズするか別の主担当者を設定し、各契約に別の主担当者を設定してください（契約は終了後も主担当者を保持します）。',
          },
          quotes_contracts: {
            message: '取引先責任者{{contact}}は未完了の見積{{quotes}}件と有効な契約{{contracts}}件から参照されているため削除できません。取引先を削除するとその取引先責任者も削除されるため、取引先も削除できません。この取引先責任者を解放するには、未完了の見積にそれぞれ別の担当者を設定するか却下し、各契約に別の主担当者を設定してください（契約は終了後も主担当者を保持します）。',
          },
          all: {
            message: '取引先責任者{{contact}}は未完了の商談{{opportunities}}件、未完了の見積{{quotes}}件と有効な契約{{contracts}}件から参照されているため削除できません。取引先を削除するとその取引先責任者も削除されるため、取引先も削除できません。この取引先責任者を解放するには、未完了の商談をそれぞれクローズするか別の主担当者を設定し、未完了の見積にそれぞれ別の担当者を設定するか却下し、各契約に別の主担当者を設定してください（契約は終了後も主担当者を保持します）。',
          },
        },
      },
    },
  },
  // The contract's form, an order contract's value and Change (#2804).
  contract_form_and_change: {
    refusals: {
      FORBIDDEN: {
        message: '受注契約は受注の「契約を作成」からのみ作成されます。基本契約またはその他を選択してください。',
      },
      RECORD_LOCKED: {
        message: '受注契約の金額は受注金額です。受注を変更してください。下書きの契約はそれに従います。',
        reasons: {
          form: { message: '契約形態は下書きの間に選択します。受注契約は受注契約のままです。' },
          contract_value: { message: '有効化済みの契約の契約金額は、理由と署名済みの変更契約書を添えて「変更」でのみ変更できます。' },
          end_date: { message: '有効化済みの契約の終了日は、理由と署名済みの変更契約書を添えて「変更」でのみ変更できます。' },
          payment_terms: { message: '有効化済みの契約の支払条件は、理由と署名済みの変更契約書を添えて「変更」でのみ変更できます。' },
        },
      },
      VALIDATION_FAILED: {
        message: '変更には理由と、新たに署名された変更契約書が必要です。',
        reasons: {
          not_activated: { message: '「変更」は有効化済みの契約に使います。下書きの契約は直接編集してください。' },
          order_value: { message: '受注契約の変更では金額を入力しません。「受注から更新」を選んで受注金額を取り込んでください。' },
        },
      },
    },
  },
  contract_validation: {
    refusals: {
      VALIDATION_FAILED: {
        message: '契約期間（{{term}}か月）が日付範囲（{{start}}から{{end}}まで{{calc}}か月）と一致しません。',
      },
    },
  },
  event_do_not_call_guard: {
    refusals: {
      FORBIDDEN: {
        message: 'このリードは「電話拒否」に設定されているため、電話を予定できません。すでに通話済みなら実施済みとして記録するか、代わりに会議を予約するか、先にレコードの「電話拒否」を外してください。',
        reasons: {
          contact: {
            message: 'この取引先責任者は「電話拒否」に設定されているため、電話を予定できません。すでに通話済みなら実施済みとして記録するか、代わりに会議を予約するか、先にレコードの「電話拒否」を外してください。',
          },
        },
      },
    },
  },
  task_completion: {
    refusals: {
      VALIDATION_FAILED: {
        message: 'リマインダー（{{reminder}}）が期限（{{due}}）より後です。リマインダーは期限より前に設定してください。',
      },
    },
  },
  task_do_not_call_guard: {
    refusals: {
      FORBIDDEN: {
        message: 'このリードは「電話拒否」に設定されているため、電話タスクを予定できません。すでに通話済みなら完了した通話を記録するか、電話以外のタスク種別を選ぶか、先にレコードの「電話拒否」を外してください。',
        reasons: {
          contact: {
            message: 'この取引先責任者は「電話拒否」に設定されているため、電話タスクを予定できません。すでに通話済みなら完了した通話を記録するか、電話以外のタスク種別を選ぶか、先にレコードの「電話拒否」を外してください。',
          },
        },
      },
    },
  },
  opportunity_lifecycle: {
    refusals: {
      RECORD_LOCKED: {
        message: 'この商談のステータス変更には承認が必要です。代わりに「申請ステータス」（と受注・失注理由）を設定してください。申請が承認されるとステージが反映されます。',
        reasons: {
          qualification_stage: {
            message: 'この商談はまず案件化承認が必要です。「案件化承認を申請」にチェックを入れてください。承認後にステージを変更できます。',
          },
          qualification_requested_status: {
            message: 'この商談はまず案件化承認が必要です。「案件化承認を申請」にチェックを入れてください。承認後に申請ステータスを変更できます。',
          },
          qualification_both: {
            message: 'この商談はまず案件化承認が必要です。「案件化承認を申請」にチェックを入れてください。承認後にステージと申請ステータスを変更できます。',
          },
          large_create: {
            message: '{{amount}}以上の商談は、成立にする前に大口商談承認が必要です。未完了のステージで作成して承認に回してください。承認後に成立にできます。成立済みで作成できるのは管理者だけです。',
          },
          large_pending: {
            message: '{{amount}}以上の商談は、成立にする前に大口商談承認が必要です。承認ステータスは「承認待ち」です。リクエストが承認されると成立にできます。',
          },
          large_rejected: {
            message: '{{amount}}以上の商談は、成立にする前に大口商談承認が必要です。承認ステータスは「却下」です。商談を修正して保存し、再度承認に回してください。承認後に成立にできます。',
          },
          large_unsent: {
            message: '{{amount}}以上の商談は、成立にする前に大口商談承認が必要です。承認ステータスは「承認不要」です。クローズせずに商談を保存して承認に回してください。承認後に成立にできます。',
          },
          closed_won: {
            message: '商談{{name}}はクローズ済み（成立）です。説明と次のステップのみ編集できます。',
          },
          closed_lost: {
            message: '商談{{name}}はクローズ済み（不成立）です。説明と次のステップのみ編集できます。',
          },
        },
      },
    },
  },
  opportunity_account_capability: {
    refusals: {
      VALIDATION_FAILED: {
        message: 'この取引先では商談を作成できません。商談可否区分が「決済のみ」のため、請求と入金には使えますが、新しい商談は登録できません。別の取引先を選ぶか、先に取引先を「制限なし」に変更してください。',
      },
    },
  },
  // The closed-won activation task's title (#2522); the private title names no deal.
  opportunity_promote_account: {
    texts: {
      activation_named: { message: '新規顧客の有効化：商談{{ opportunity }}' },
      activation_private: { message: '新規顧客の有効化（非公開の商談）' },
      activation_untitled: { message: '新規顧客の有効化' },
    },
  },
  lead_automation: {
    texts: {
      follow_up_named: { message: '適格リードのフォローアップ：{{ lead }}' },
      follow_up_untitled: { message: '適格リードのフォローアップ' },
    },
    refusals: {
      RECORD_LOCKED: {
        message: '変換済みのリード{{lead}}は、説明とメモのみ編集できます。変換後のレコードで変更してください。',
        reasons: {
          convert_pending: {
            message: 'リード{{lead}}を変換できません。変換はまだ承認待ちです。承認者が承認すると変換できます。進捗はリードの「コンバージョン承認」項目で確認できます。',
          },
          convert_rejected: {
            message: 'リード{{lead}}を変換できません。変換は却下されました。承認者が承認すると変換できます。進捗はリードの「コンバージョン承認」項目で確認できます。',
          },
        },
      },
    },
  },
  // The order's line lock, header amount lock (#2826) and line fill (REQ-0010, hotcrm#2555).
  sales_order_workflow: {
    refusals: {
      RECORD_LOCKED: {
        message: '注文 {{order}} は確定済みのため、明細の追加・変更・削除はできません。変更するには下書きに戻してください。',
        reasons: {
          completed: {
            message: '注文 {{order}} は完了しているため、明細の追加・変更・削除はできません。',
          },
          cancelled: {
            message: '注文 {{order}} はキャンセルされているため、明細の追加・変更・削除はできません。',
          },
          amount_confirmed: {
            message: '注文 {{order}} は確定済みのため、金額は変更できません。先に下書きに戻してください。',
          },
          amount_completed: {
            message: '注文 {{order}} は完了しているため、金額は変更できません。',
          },
          amount_cancelled: {
            message: '注文 {{order}} はキャンセルされているため、金額は変更できません。',
          },
        },
      },
      VALIDATION_FAILED: {
        message: '注文 {{order}} には明細があるため、小計は明細の合計であり、手入力できません。代わりに明細を変更してください。',
      },
    },
  },
  sales_order_line_fill: {
    refusals: {
      VALIDATION_FAILED: {
        message: 'この明細の販売価格を入力するか、製品を選んでその定価を使ってください。',
      },
    },
  },
  sales_order_total_rollup: {
    refusals: {
      RECORD_LOCKED: {
        message: '注文 {{order}} は確定済みのため、明細の追加・変更・削除はできません。変更するには下書きに戻してください。',
        reasons: {
          completed: {
            message: '注文 {{order}} は完了しているため、明細の追加・変更・削除はできません。',
          },
          cancelled: {
            message: '注文 {{order}} はキャンセルされているため、明細の追加・変更・削除はできません。',
          },
        },
      },
    },
  },
};
