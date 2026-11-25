// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';
import { CONTRACT_DRAFT_NODE_IDS } from '../../sales/flows/_contract-draft';

// The discount ceiling is interpolated, never retyped: the number lives in
// `_thresholds.ts` alone (#1711).
import { QUOTE_DISCOUNT_CEILING } from '../../sales/objects/_thresholds';

/**
 * 日本語 (ja-JP) — the revenue module's own translations: every row whose
 * target this package registers. Why they live here and not in the app
 * package's pack: `./index.ts`.
 */
export const jaJP: TranslationData = {
  hooks: {
    quote_total_rollup: {
      refusals: {
        RECORD_LOCKED: {
          message: '見積{{quote}}は承認済みのため、明細を追加・変更・削除できません。',
          reasons: {
            rejected: {
              message: '見積{{quote}}は却下されているため、明細を追加・変更・削除できません。変更するには下書きに戻してください。',
            },
            expired: {
              message: '見積{{quote}}は期限切れのため、明細を追加・変更・削除できません。',
            },
          },
        },
      },
    },
    quote_workflow: {
      refusals: {
        RECORD_LOCKED: {
          message: '見積{{quote}}を承認済みにできません。商談が承認プロセスで保留中のため、承認済みにすると商談が成立してしまいます。承認が下りてから承認済みにしてください。',
          reasons: {
            held_unsent: {
              message: '見積{{quote}}を承認済みにできません。商談はまず大口商談承認が必要で、承認済みにすると商談が成立してしまいます。商談を保存して承認に回し、承認後に見積を承認済みにしてください。',
            },
            line_accepted: {
              message: '見積{{quote}}は承認済みのため、明細を追加・変更・削除できません。',
            },
            line_rejected: {
              message: '見積{{quote}}は却下されているため、明細を追加・変更・削除できません。変更するには下書きに戻してください。',
            },
            line_expired: {
              message: '見積{{quote}}は期限切れのため、明細を追加・変更・削除できません。',
            },
            frozen_accepted: {
              message: '見積{{quote}}は承認済みです。編集できるのは内部メモのみです。',
            },
            frozen_rejected: {
              message: '見積{{quote}}は却下されています。変更するには下書きに戻してください。それまでは内部メモのみ編集できます。',
            },
            frozen_expired: {
              message: '見積{{quote}}は期限切れです。編集できるのは内部メモのみです。',
            },
          },
        },
        VALIDATION_FAILED: {
          message: '見積{{quote}}を「承認済み」で作成することはできません。見積は「下書き」「レビュー中」「提示済み」から始まり、そこから承認済み・却下・期限切れになります。',
          reasons: {
            created_rejected: {
              message: '見積{{quote}}を「却下」で作成することはできません。見積は「下書き」「レビュー中」「提示済み」から始まり、そこから承認済み・却下・期限切れになります。',
            },
            created_expired: {
              message: '見積{{quote}}を「期限切れ」で作成することはできません。見積は「下書き」「レビュー中」「提示済み」から始まり、そこから承認済み・却下・期限切れになります。',
            },
          },
        },
      },
    },
    quote_price_book: {
      refusals: {
        VALIDATION_FAILED: {
          message: '価格表{{book}}は有効ではありません。見積は有効な価格表からのみ価格を設定します。見積{{quote}}には別の価格表を選んでください。',
          reasons: {
            line: {
              message: '見積{{quote}}にはすでに価格表で価格設定された明細が1件あるため、価格表を変更できません。先に明細を削除してから、価格表を選んで明細を追加し直してください。',
            },
            line_from: {
              message: '見積{{quote}}にはすでに価格表{{from}}で価格設定された明細が1件あるため、価格表を変更できません。先に明細を削除してから、価格表を選んで明細を追加し直してください。',
            },
            lines: {
              message: '見積{{quote}}にはすでに価格表で価格設定された明細が{{count}}件あるため、価格表を変更できません。先に明細を削除してから、価格表を選んで明細を追加し直してください。',
            },
            lines_from: {
              message: '見積{{quote}}にはすでに価格表{{from}}で価格設定された明細が{{count}}件あるため、価格表を変更できません。先に明細を削除してから、価格表を選んで明細を追加し直してください。',
            },
          },
        },
      },
    },
    price_book_standard: {
      refusals: {
        RECORD_LOCKED: {
          message: '{{book}}は標準価格表のため削除できません。見積で使わないようにするには「有効」をオフにしてください。',
          reasons: {
            standard_off: {
              message: '{{book}}は標準価格表で、標準価格表は常に1つ必要です。「標準」はオフにできません。代わりに価格を編集してください。',
            },
          },
        },
        DELETE_RESTRICTED: {
          message: '{{book}}を削除できません。見積1件がこの価格表で価格設定しています。見積で使わないようにするには「有効」をオフにしてください。',
          reasons: {
            quotes: {
              message: '{{book}}を削除できません。見積{{count}}件がこの価格表で価格設定しています。見積で使わないようにするには「有効」をオフにしてください。',
            },
          },
        },
        DUPLICATE_VALUE: {
          message: '{{book}}がすでに標準価格表で、標準価格表は1つだけです。「標準」をオフにしてこの価格表を保存してください。',
        },
      },
    },
    price_book_entry_unique: {
      refusals: {
        DUPLICATE_VALUE: {
          message: '{{book}}にはすでに{{product}}の価格があります。価格表には製品ごとに1つのエントリしか持てません。既存のエントリを編集してください。',
        },
      },
    },
    product_catalog: {
      refusals: {
        VALIDATION_FAILED: {
          message: '定価（{{list_price}}）はコスト（{{cost}}）以上にしてください。',
        },
        DELETE_RESTRICTED: {
          message: '製品を削除できません。商談商品明細{{opportunity_lines}}件で使われています。製品を使わないようにするには「有効」をオフにしてください。',
          reasons: {
            quote: {
              message: '製品を削除できません。見積明細{{quote_lines}}件で使われています。製品を使わないようにするには「有効」をオフにしてください。',
            },
            both: {
              message: '製品を削除できません。商談商品明細{{opportunity_lines}}件と見積明細{{quote_lines}}件で使われています。製品を使わないようにするには「有効」をオフにしてください。',
            },
          },
        },
      },
    },
    opportunity_line_item_freeze: {
      refusals: {
        RECORD_LOCKED: {
          message: '商談{{name}}は承認処理中のためロックされています。承認が完了するまで商品明細を追加・変更・削除できません。',
          reasons: {
            closed_won: {
              message: '商談{{name}}はクローズ済み（成立）のため、商品明細を追加・変更・削除できません。',
            },
            closed_lost: {
              message: '商談{{name}}はクローズ済み（不成立）のため、商品明細を追加・変更・削除できません。',
            },
          },
        },
      },
    },
    quote_line_item_price_fill: {
      refusals: {
        VALIDATION_FAILED: {
          message: '価格表{{book}}には{{product}}の有効な価格がありません。{{book}}に製品を追加するか、見積で別の価格表を選んでください。',
        },
      },
    },
    opportunity_line_item_price_fill: {
      refusals: {
        VALIDATION_FAILED: {
          message: '価格表{{book}}には{{product}}の有効な価格がありません。{{book}}に製品を追加するか、見積で別の価格表を選んでください。',
        },
      },
    },
  },
  objects: {
    // The order's Source Quote, added by this package through
    // `objectExtensions` (hotcrm#2558).
    crm_sales_order: {
      fields: {
        crm_quote: { label: '元の見積' },
      },
    },
    crm_product: {
      _validations: {
        cost_less_than_price: {
          message: '原価は定価より低くしてください',
        },
        price_positive: {
          message: '定価は正の値である必要があります',
        },
      },
      label: '製品',
      pluralLabel: '製品',
      description: '自社が提供する製品・サービス',
      fields: {
        product_code: { label: '製品コード' },
        name: { label: '製品名' },
        description: { label: '説明' },
        category: {
          label: 'カテゴリ',
          options: {
            software: 'ソフトウェア', hardware: 'ハードウェア', service: 'サービス',
            subscription: 'サブスクリプション', support: 'サポート',
          },
        },
        family: {
          label: '製品ファミリ',
          options: {
            enterprise: 'エンタープライズ向けソリューション', smb: '中小企業向けソリューション',
            services: 'プロフェッショナルサービス', cloud: 'クラウドサービス',
          },
        },
        list_price: { label: '定価' },
        cost: { label: 'コスト' },
        sku: { label: 'SKU' },
        is_active: { label: '有効' },
        product_manager: { label: 'プロダクトマネージャー' },
        image: { label: '製品画像' },
        datasheet: { label: 'データシート' },
      },
      _views: {
        all_products: { label: '全製品' },
        product_catalog: { label: '製品カタログ' },
      },
      _sections: {
        basic: { label: '製品情報' },
        pricing: { label: '価格' },
        metadata: { label: '関連資料' },
      },
    },
    crm_price_book: {
      _validations: {
        valid_to_after_valid_from: {
          message: '有効期間（終了）は有効期間（開始）以降の日付にしてください',
        },
      },
      label: '価格表',
      pluralLabel: '価格表',
      description: '名前付きの製品価格の一覧：標準価格、パートナー・地域別価格、またはプロモーション価格',
      fields: {
        owner_id: { label: '価格表担当者' },
        name: { label: '価格表名' },
        description: { label: '説明' },
        is_active: { label: '有効' },
        is_standard: { label: '標準' },
        valid_from: { label: '有効期間（開始）' },
        valid_to: { label: '有効期間（終了）' },
      },
      _sections: {
        basic: { label: '価格表情報' },
        validity: { label: '有効期間' },
      },
      _views: {
        all_price_books: { label: 'すべての価格表' },
      },
      _actions: {
        add_price_book_products: { label: '製品を追加' },
      },
    },
    crm_price_book_entry: {
      _validations: {
        price_not_negative: {
          message: '定価にマイナスの値は指定できません',
        },
      },
      label: '価格表エントリ',
      pluralLabel: '価格表エントリ',
      description: '1つの価格表における1つの製品の価格',
      fields: {
        entry_number: { label: 'エントリ番号' },
        crm_price_book: { label: '価格表' },
        crm_product: { label: '製品' },
        list_price: { label: '定価' },
        is_active: { label: '有効' },
      },
      _sections: {
        basic: { label: 'エントリ情報' },
      },
    },
    crm_quote: {
      _validations: {
        discount_within_ceiling: {
          message: '割引率は 60% を超えられません',
        },
        expiration_after_quote: {
          message: '有効期限は見積日より後である必要があります',
        },
        quote_status_progression: {
          message: 'このステータス変更は見積の通常の流れから外れています：下書き → レビュー中 → 提示済み → 承認済み。レビュー中は下書きに戻すことも却下にすることもでき、提示済みは却下にでき、却下された見積は下書きに戻ります。下書き・レビュー中・提示済みは期限切れになることがあります。承認済みと期限切れは最終状態です。',
        },
      },
      label: '見積',
      pluralLabel: '見積',
      description: '顧客に提示する価格見積',
      fields: {
        quote_number: { label: '見積番号' },
        name: { label: '見積名' },
        crm_account: { label: '取引先' },
        crm_contact: {
          label: '取引先責任者',
          help: '見積が「提示済み」または「承認済み」になった時点で必須です。注文の担当者はここから引き継がれ、注文から作成される契約の主担当者もここから引き継がれます。',
        },
        crm_opportunity: { label: '商談' },
        owner_id: { label: '見積担当者' },
        status: {
          label: 'ステータス',
          options: {
            draft: '下書き', in_review: 'レビュー中', presented: '提示済み',
            accepted: '承認済み', rejected: '却下', expired: '期限切れ',
          },
        },
        // The countersigned copy (#2317).
        signed_copy: {
          label: '署名済みコピー',
          help: 'お客様が署名した見積書。見積を承認するには必須です。',
        },
        quote_date: { label: '見積日' },
        expiration_date: { label: '有効期限' },
        crm_price_book: { label: '価格表', help: 'この見積の明細の定価は、この価格表から取られます。新しい見積で空のままにすると、標準価格表になります。' },
        subtotal: { label: '小計' },
        discount: { label: '割引率(%)' },
        discount_amount: { label: '割引額' },
        tax: { label: '税額' },
        shipping_handling: { label: '配送・手数料' },
        total_price: { label: '合計金額' },
        payment_terms: { label: '支払条件' },
        shipping_terms: { label: '配送条件' },
        billing_address: { label: '請求先住所' },
        shipping_address: { label: '配送先住所' },
        description: { label: '説明' },
        internal_notes: { label: '内部メモ' },
      },
      _views: {
        all_quotes: { label: '全見積' },
        quote_pipeline: { label: '見積パイプライン' },
        quote_calendar: { label: '見積カレンダー' },
      },
      _sections: {
        basic: { label: '見積情報' },
        line_items: { label: '見積明細' },
        pricing: { label: '価格' },
        terms: { label: '条件・有効期限' },
        address: { label: '住所' },
        system: { label: 'システム' },
        // quote.view.ts のフォームセクション名 (#1100)
        quote: { label: '見積書' },
        totals: { label: '合計' },
        quote_terms: { label: '契約条件' },
        addresses_and_notes: { label: '住所と備考' },
      },
      _actions: {
        submit_quote_for_review: { label: 'レビューに提出', successMessage: '見積 {{ record.name }} をレビューに提出しました。' },
        mark_quote_presented: { label: '提示済みにする', successMessage: '見積 {{ record.name }} を提示済みにしました。' },
        accept_quote: {
          label: '承認',
          confirmText: 'この見積を承認しますか？見積は凍結され、商談は受注でクローズされ、注文が作成されます。契約が必要な場合は注文から作成してください。管理者が契約の自動作成を有効にしている場合は、契約も作成されます。',
          successMessage: '見積 {{ record.name }} を承認しました。注文が作成されました。この見積の「注文」で確認できます。',
        },
        reject_quote: { label: '却下', successMessage: '見積 {{ record.name }} を却下しました。改訂して新しい提案ができます。' },
        revise_quote: { label: '改訂', successMessage: '見積 {{ record.name }} を下書きに戻しました。' },
        // Print Quote (#2312).
        print_quote: { label: '見積書を印刷', successMessage: '見積書の PDF を添付しました。' },
      },
    },
    crm_opportunity_line_item: {
      _validations: {
        unit_price_positive: {
          message: '販売価格を負の値にすることはできません',
        },
      },
      label: '商談商品明細',
      pluralLabel: '商談商品明細',
      description: '商談配下の製品別価格明細行',
      fields: {
        crm_opportunity: { label: '商談' },
        crm_product: { label: '製品' },
        description: { label: '説明' },
        product_title: { label: '製品タイトル', help: '製品のタイトル。製品と同期して更新され、この明細行の名前になります。' },
        quantity: { label: '数量' },
        list_price: { label: '定価', help: '製品のカタログ価格から自動入力されます' },
        unit_price: { label: '販売価格', help: '交渉後の単価（定価と異なる場合があります）' },
        discount: { label: '割引率（%）' },
        total_price: { label: '合計' },
        line_number: { label: '行番号' },
      },
      _sections: {
        basic: { label: '明細行' },
        pricing: { label: '価格' },
      },
    },
    crm_quote_line_item: {
      _validations: {
        discount_within_ceiling: {
          message: '明細の割引率は 60% を超えられません',
        },
        unit_price_positive: {
          message: '販売価格を負の値にすることはできません',
        },
      },
      label: '見積明細',
      pluralLabel: '見積明細',
      description: '見積配下の製品別価格明細行',
      fields: {
        crm_quote: { label: '見積' },
        crm_product: { label: '製品' },
        description: { label: '説明' },
        product_title: { label: '製品タイトル', help: '製品のタイトル。製品と同期して更新され、この明細行の名前になります。' },
        quantity: { label: '数量' },
        list_price: { label: '定価', help: '見積で選んだ価格表における、この製品の価格です。' },
        unit_price: { label: '販売価格' },
        discount: { label: '割引率（%）' },
        subtotal: { label: '小計' },
        total_price: { label: '合計' },
        line_number: { label: '行番号' },
      },
      _sections: {
        basic: { label: '明細行' },
        pricing: { label: '価格' },
      },
    },
  },
  apps: {
    crm_enterprise: {
      navigation: {
        nav_quote: { label: '見積' },
        nav_product: { label: '製品' },
        nav_price_book: { label: '価格表' },
        nav_product_catalog_dashboard: { label: '製品カタログ' },
        nav_help_revenue: { label: '収益マニュアル' },
      },
    },
  },
  datasets: {
    product_metrics: {
      label: '製品指標',
      description: '製品カタログの件数と定価を集計するセマンティックレイヤー',
      dimensions: {
        category: {
          label: 'カテゴリ',
          description: '製品カテゴリ：ソフトウェア、ハードウェア、サービス、サブスクリプション、サポート。',
        },
      },
      measures: {
        list_price_sum: {
          label: '定価合計',
          description: '対象製品の定価の合計（カタログ上の数字）。売上ではなく、値引きや数量は含みません。',
        },
        product_count: {
          label: '製品数',
          description: '製品カタログにある製品の数。有効・無効の両方を含みます。販売数量ではありません。',
        },
      },
    },
  },
  flows: {
    // An accepted quote's two automations (hotcrm#2558). The drafted
    // contract's provenance sentence is TEXT in the organization's language
    // (#2535), one per variant of the draft, at
    // `flows.quote_accepted_contract_draft.records.<node>.fields.description`.
    quote_accepted_contract_draft: {
      label: '承認済みの見積から契約を作成',
      records: Object.fromEntries(CONTRACT_DRAFT_NODE_IDS.map((node) => [node, {
        fields: { description: '承認済みの見積{{ quote }}から自動作成' },
      }])),
    },
    quote_accepted_order: {
      label: '承認済みの見積から注文を作成',
    },
    price_book_add_products: {
      label: '価格表に製品を追加',
      successMessage: '製品を価格表に追加しました。',
      refusals: {
        refuse_no_book: { message: 'この価格表はもう存在しないか、開く権限がありません。製品は追加されませんでした。' },
        end_refused: { message: '{{refusedCount}} 件の製品を価格表に追加できませんでした：追加 {{addedCount}} 件、価格設定済み {{alreadyCount}} 件、拒否 {{refusedCount}} 件。価格表に価格を追加できるのは、その所有者か管理者だけです。製品ごとの理由はフロー実行ログに記録されています。' },
      },
      screens: {
        screen_1: {
          title: '製品の価格設定',
          description: '{{ bookRecord.name }} でまだ価格のない有効な製品すべてに、定価に対するこの割合でエントリを追加します。価格設定済みの製品は元の価格のままです。',
          fields: {
            percentOfList: { label: '定価に対する %', placeholder: '1-1000' },
          },
        },
        result: {
          title: '製品を追加しました',
          description: '{{ bookRecord.name }} に {{addedCount}} 件の製品を追加しました。{{alreadyCount}} 件は価格設定済みです。',
          fields: {
            bookLink: { label: '価格表' },
          },
        },
      },
    },
    quote_generation: {
      label: '商談から見積を作成',
      refusals: { refuse_held: { message: '先に案件化承認が必要です。「案件化承認を申請」にチェックを入れてください。何も作成されていません。' } },
      screens: {
        screen_1: {
          title: '見積詳細',
          fields: {
            quoteName: { label: '見積名' },
            expirationDays: { label: '有効期間（日）' },
            discount: { label: `割引率 % (≤ ${QUOTE_DISCOUNT_CEILING})`, placeholder: `0-${QUOTE_DISCOUNT_CEILING}` },
          },
        },
        result: {
          title: '見積を作成しました',
          description: '見積「{{ quoteName }}」を下書きとして作成しました。開いて価格を確認し、次の手続きへ進めてください。',
          fields: {
            quoteLink: { label: '見積' },
          },
        },
        result_partial: {
          title: '見積を作成しました（一部の明細は未コピー）',
          description: `見積「{{ quoteName }}」を下書きとして作成しましたが、商談の製品明細のうち {{ skippedCount }} 行を見積にコピーできませんでした（{{ copiedCount }} 行はコピー済み）。見積の価格表にその製品の有効な価格がない場合、またはその行の割引が ${QUOTE_DISCOUNT_CEILING}% を超える場合、その行は拒否されます。理由はフローの実行ログに記録されています。見積を開いて、それらの明細を追加してください。`,
          fields: {
            quoteLink: { label: '見積' },
          },
        },
      },
    },
  },
  books: {
    crm_revenue_manual: {
      label: 'HotCRM 収益マニュアル',
      description: '見積、製品と価格表、そして受注した商談の請求部門への引き継ぎ。',
      groups: {
        revenue: { label: '収益' },
      },
    },
  },
  // The quote's two record pages (#2312): its working page and its print page.
  dashboards: {
    product_catalog_dashboard: {
      label: '製品カタログ',
      description: '製品カテゴリ別のカタログ定価',
      widgets: {
        top_products: { title: 'カテゴリ別定価合計', description: '製品カテゴリごとのカタログ定価の合計（売上ではありません）' },
      },
    },
  },
  pages: {
    quote_detail_page: {
      label: '見積詳細',
      description: '見積のレコードページ：自動生成のレイアウトをそのまま使い、スロットは上書きしません。',
    },
    quote_print_page: {
      label: '見積書ドキュメント',
      description: '印刷用の見積書：ヘッダー、顧客、見積明細、価格、条件。',
      components: {
        quote_print_lines: { title: '見積明細' },
      },
    },
  },
};
