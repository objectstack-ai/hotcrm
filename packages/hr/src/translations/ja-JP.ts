import type { TranslationData } from '@objectstack/spec/system';

/**
 * 日本語 (ja-JP) — Human Capital Management Translations
 *
 * Per-locale file: one file per language, following the `per_locale` convention.
 */
export const jaJP: TranslationData = {
  objects: {
    department: {
      label: '部門',
      pluralLabel: '部門',
      fields: {
        name: { label: '部門名' },
        description: { label: '説明' },
        parent_department_id: { label: '上位部門' },
        manager_id: { label: '部門マネージャー' },
        cost_center: { label: 'コストセンター' },
        headcount: { label: '定員' },
        budget: { label: '予算' },
        status: {
          label: 'ステータス',
          options: { Active: '有効', Inactive: '無効', Restructuring: '再編中' },
        },
      },
    },

    position: {
      label: 'ポジション',
      pluralLabel: 'ポジション',
      fields: {
        title: { label: 'ポジション名' },
        description: { label: '説明' },
        department_id: { label: '部門' },
        reports_to_id: { label: 'レポートライン' },
        level: {
          label: '職位レベル',
          options: {
            Entry: 'エントリー', Junior: 'ジュニア', Mid: 'ミドル', Senior: 'シニア',
            Lead: 'リード', Manager: 'マネージャー', Director: 'ディレクター', VP: 'VP', 'C-Level': '経営幹部',
          },
        },
        type: {
          label: '雇用形態',
          options: {
            'Full-Time': '正社員', 'Part-Time': 'パートタイム',
            Contract: '契約社員', Intern: 'インターン', Temporary: '派遣',
          },
        },
        status: {
          label: 'ステータス',
          options: { Open: '募集中', Filled: '充足', 'On Hold': '保留', Closed: 'クローズ' },
        },
        min_salary: { label: '最低給与' },
        max_salary: { label: '最高給与' },
        location: { label: '勤務地' },
        headcount: { label: '定員' },
      },
    },

    employee: {
      label: '従業員',
      pluralLabel: '従業員',
      fields: {
        employee_number: { label: '社員番号' },
        first_name: { label: '名' },
        last_name: { label: '姓' },
        email: { label: 'メールアドレス' },
        phone: { label: '電話番号' },
        department_id: { label: '部門' },
        position_id: { label: 'ポジション' },
        manager_id: { label: '上長' },
        hire_date: { label: '入社日' },
        termination_date: { label: '退職日' },
        status: {
          label: 'ステータス',
          options: {
            Active: '在籍', 'On Leave': '休職中', Terminated: '退職済',
            Probation: '試用期間', Retired: '定年退職',
          },
        },
        employment_type: {
          label: '雇用形態',
          options: {
            'Full-Time': '正社員', 'Part-Time': 'パートタイム',
            Contract: '契約社員', Intern: 'インターン', Temporary: '派遣',
          },
        },
        location: { label: '勤務地' },
        date_of_birth: { label: '生年月日' },
        gender: {
          label: '性別',
          options: {
            Male: '男性', Female: '女性',
            'Non-Binary': 'ノンバイナリー', 'Prefer Not to Say': '回答しない',
          },
        },
        emergency_contact_name: { label: '緊急連絡先' },
        emergency_contact_phone: { label: '緊急連絡先電話番号' },
        annual_salary: { label: '年収' },
        profile_photo: { label: '写真' },
      },
    },

    recruitment: {
      label: '採用',
      pluralLabel: '採用',
      fields: {
        title: { label: '求人タイトル' },
        description: { label: '説明' },
        department_id: { label: '部門' },
        position_id: { label: 'ポジション' },
        status: {
          label: 'ステータス',
          options: {
            Draft: '下書き', Open: '募集中', 'In Progress': '進行中',
            'On Hold': '保留', Filled: '充足', Cancelled: 'キャンセル',
          },
        },
        priority: {
          label: '優先度',
          options: { Low: '低', Medium: '中', High: '高', Urgent: '緊急' },
        },
        number_of_openings: { label: '募集人数' },
        target_hire_date: { label: '入社目標日' },
        hiring_manager_id: { label: '採用マネージャー' },
        recruiter_id: { label: 'リクルーター' },
        min_salary: { label: '最低給与' },
        max_salary: { label: '最高給与' },
        location: { label: '勤務地' },
        employment_type: {
          label: '雇用形態',
          options: {
            'Full-Time': '正社員', 'Part-Time': 'パートタイム',
            Contract: '契約社員', Intern: 'インターン', Temporary: '派遣',
          },
        },
        source_channels: { label: '採用チャネル' },
      },
    },

    candidate: {
      label: '候補者',
      pluralLabel: '候補者',
      fields: {
        first_name: { label: '名' },
        last_name: { label: '姓' },
        email: { label: 'メールアドレス' },
        phone: { label: '電話番号' },
        status: {
          label: 'ステータス',
          options: {
            New: '新規', Screening: '書類選考', Interview: '面接中',
            Assessment: '評価中', Offer: 'オファー', Hired: '採用決定',
            Rejected: '不採用', Withdrawn: '辞退',
          },
        },
        source: {
          label: '応募経路',
          options: {
            LinkedIn: 'LinkedIn', Indeed: 'Indeed', Referral: 'リファラル',
            'Career Page': '採用ページ', Agency: 'エージェント',
            University: '新卒採用', Other: 'その他',
          },
        },
        recruitment_id: { label: '採用案件' },
        resume: { label: '履歴書' },
        cover_letter: { label: '送付状' },
        current_company: { label: '現在の勤務先' },
        current_title: { label: '現在の役職' },
        experience_years: { label: '経験年数' },
        expected_salary: { label: '希望年収' },
        ai_score: { label: 'AIスコア', help: 'AI が生成した候補者マッチングスコア' },
        skills: { label: 'スキル' },
        notes: { label: '備考' },
      },
    },

    application: {
      label: '応募',
      pluralLabel: '応募',
      fields: {
        candidate_id: { label: '候補者' },
        recruitment_id: { label: '採用案件' },
        status: {
          label: 'ステータス',
          options: {
            Submitted: '提出済', 'Under Review': '審査中',
            Interview: '面接中', Assessment: '評価中',
            Offer: 'オファー', Accepted: '承諾',
            Rejected: '不採用', Withdrawn: '辞退',
          },
        },
        applied_date: { label: '応募日' },
        screening_score: { label: 'スクリーニングスコア' },
        notes: { label: '備考' },
        resume_match_score: { label: '履歴書マッチスコア', help: 'AI が算出した履歴書と求人の適合率' },
      },
    },

    interview: {
      label: '面接',
      pluralLabel: '面接',
      fields: {
        candidate_id: { label: '候補者' },
        recruitment_id: { label: '採用案件' },
        interviewer_id: { label: '面接官' },
        type: {
          label: '面接タイプ',
          options: {
            'Phone Screen': '電話スクリーニング', Video: 'ビデオ面接', 'In-Person': '対面面接',
            Panel: 'パネル面接', Technical: '技術面接', 'Culture Fit': 'カルチャーフィット面接',
          },
        },
        status: {
          label: 'ステータス',
          options: {
            Scheduled: '予定', Completed: '完了', Cancelled: 'キャンセル',
            'No Show': '欠席', Rescheduled: '再スケジュール',
          },
        },
        scheduled_date: { label: '予定日時' },
        duration_minutes: { label: '所要時間（分）' },
        location: { label: '場所' },
        rating: { label: '評価' },
        feedback: { label: 'フィードバック' },
        recommendation: {
          label: '推薦',
          options: {
            'Strong Hire': '強く推薦', Hire: '採用推薦',
            'No Hire': '不採用推薦', 'Strong No Hire': '強く不採用推薦',
          },
        },
      },
    },

    offer: {
      label: 'オファー',
      pluralLabel: 'オファー',
      fields: {
        candidate_id: { label: '候補者' },
        recruitment_id: { label: '採用案件' },
        position_id: { label: 'ポジション' },
        status: {
          label: 'ステータス',
          options: {
            Draft: '下書き', 'Pending Approval': '承認待ち',
            Approved: '承認済', Extended: '提示済',
            Accepted: '承諾', Rejected: '辞退',
            Expired: '期限切れ', Withdrawn: '取消',
          },
        },
        salary: { label: '給与' },
        start_date: { label: '入社日' },
        expiration_date: { label: '有効期限' },
        signing_bonus: { label: 'サイニングボーナス' },
        equity: { label: '株式報酬' },
        benefits_package: { label: '福利厚生パッケージ' },
        notes: { label: '備考' },
        approved_by_id: { label: '承認者' },
      },
    },

    onboarding: {
      label: 'オンボーディング',
      pluralLabel: 'オンボーディング',
      fields: {
        employee_id: { label: '従業員' },
        status: {
          label: 'ステータス',
          options: {
            'Not Started': '未開始', 'In Progress': '進行中',
            Completed: '完了', Overdue: '期限超過',
          },
        },
        start_date: { label: '開始日' },
        target_completion_date: { label: '完了目標日' },
        actual_completion_date: { label: '実完了日' },
        checklist_items: { label: 'チェックリスト項目' },
        completed_items: { label: '完了項目' },
        buddy_id: { label: 'バディ/メンター' },
        notes: { label: '備考' },
      },
    },

    performance_review: {
      label: '人事評価',
      pluralLabel: '人事評価',
      fields: {
        employee_id: { label: '従業員' },
        reviewer_id: { label: '評価者' },
        review_period: { label: '評価期間' },
        status: {
          label: 'ステータス',
          options: {
            Draft: '下書き', 'Self-Review': '自己評価', 'Manager Review': '上長評価',
            Calibration: 'キャリブレーション', Completed: '完了',
          },
        },
        overall_rating: {
          label: '総合評価',
          options: {
            'Exceeds Expectations': '期待を上回る', 'Meets Expectations': '期待通り',
            'Needs Improvement': '改善が必要', 'Below Expectations': '期待を下回る',
          },
        },
        self_assessment: { label: '自己評価' },
        manager_assessment: { label: '上長評価' },
        goals_achievement: { label: '目標達成度' },
        strengths: { label: '強み' },
        areas_for_improvement: { label: '改善点' },
        development_plan: { label: '育成計画' },
        due_date: { label: '期限' },
      },
    },

    goal: {
      label: '目標',
      pluralLabel: '目標',
      fields: {
        title: { label: '目標名' },
        description: { label: '説明' },
        employee_id: { label: '従業員' },
        type: {
          label: '目標タイプ',
          options: { Individual: '個人', Team: 'チーム', Department: '部門', Company: '全社' },
        },
        status: {
          label: 'ステータス',
          options: {
            Draft: '下書き', Active: '進行中', Completed: '完了',
            Cancelled: 'キャンセル', 'On Hold': '保留',
          },
        },
        priority: {
          label: '優先度',
          options: { Low: '低', Medium: '中', High: '高', Critical: '最優先' },
        },
        start_date: { label: '開始日' },
        due_date: { label: '期限' },
        progress: { label: '進捗' },
        metric: { label: '成功指標' },
        parent_goal_id: { label: '上位目標' },
        review_id: { label: '人事評価' },
      },
    },

    training: {
      label: '研修',
      pluralLabel: '研修',
      fields: {
        name: { label: '研修名' },
        description: { label: '説明' },
        type: {
          label: '研修タイプ',
          options: {
            Online: 'オンライン', 'In-Person': '対面', Workshop: 'ワークショップ',
            Conference: 'カンファレンス', 'Self-Paced': '自己学習', Mentoring: 'メンタリング',
          },
        },
        status: {
          label: 'ステータス',
          options: {
            Draft: '下書き', Scheduled: '予定', 'In Progress': '進行中',
            Completed: '完了', Cancelled: 'キャンセル',
          },
        },
        start_date: { label: '開始日' },
        end_date: { label: '終了日' },
        duration_hours: { label: '所要時間（時間）' },
        max_participants: { label: '最大参加人数' },
        enrolled_count: { label: '登録済' },
        completed_count: { label: '修了済' },
        instructor_id: { label: '講師' },
        location: { label: '場所' },
        cost: { label: '費用' },
        is_mandatory: { label: '必須' },
      },
    },

    certification: {
      label: '資格',
      pluralLabel: '資格',
      fields: {
        employee_id: { label: '従業員' },
        name: { label: '資格名' },
        issuing_body: { label: '発行機関' },
        issue_date: { label: '取得日' },
        expiration_date: { label: '有効期限' },
        credential_id: { label: '資格番号' },
        status: {
          label: 'ステータス',
          options: {
            Active: '有効', Expired: '期限切れ',
            Revoked: '取消済', 'Pending Renewal': '更新待ち',
          },
        },
        verification_url: { label: '確認URL' },
      },
    },

    time_off: {
      label: '休暇',
      pluralLabel: '休暇申請',
      fields: {
        employee_id: { label: '従業員' },
        type: {
          label: '休暇タイプ',
          options: {
            Vacation: '年次有給休暇', 'Sick Leave': '病気休暇', Personal: '私用休暇',
            Maternity: '産休', Paternity: '育休', Bereavement: '忌引休暇',
            'Jury Duty': '裁判員休暇', Other: 'その他',
          },
        },
        status: {
          label: 'ステータス',
          options: { Pending: '申請中', Approved: '承認済', Rejected: '却下', Cancelled: 'キャンセル' },
        },
        start_date: { label: '開始日' },
        end_date: { label: '終了日' },
        days_requested: { label: '申請日数' },
        reason: { label: '理由' },
        approver_id: { label: '承認者' },
        approved_date: { label: '承認日' },
      },
    },

    attendance: {
      label: '勤怠',
      pluralLabel: '勤怠記録',
      fields: {
        employee_id: { label: '従業員' },
        date: { label: '日付' },
        clock_in: { label: '出勤' },
        clock_out: { label: '退勤' },
        total_hours: { label: '合計時間' },
        status: {
          label: 'ステータス',
          options: {
            Present: '出勤', Absent: '欠勤', Late: '遅刻',
            'Half Day': '半休', Remote: 'リモート', Holiday: '祝日',
          },
        },
        notes: { label: '備考' },
      },
    },

    payroll: {
      label: '給与',
      pluralLabel: '給与記録',
      fields: {
        employee_id: { label: '従業員' },
        period_start: { label: '期間開始日' },
        period_end: { label: '期間終了日' },
        status: {
          label: 'ステータス',
          options: {
            Draft: '下書き', Calculated: '計算済', Approved: '承認済',
            Paid: '支払済', Void: '無効',
          },
        },
        base_salary: { label: '基本給' },
        overtime_pay: { label: '残業代' },
        deductions: { label: '控除額' },
        tax_amount: { label: '税額' },
        net_pay: { label: '手取り額' },
        payment_date: { label: '支給日' },
        payment_method: {
          label: '支払方法',
          options: {
            'Direct Deposit': '口座振込', Check: '小切手', 'Wire Transfer': '電信送金',
          },
        },
      },
    },

    benefit: {
      label: '福利厚生',
      pluralLabel: '福利厚生',
      fields: {
        name: { label: '福利厚生名' },
        description: { label: '説明' },
        type: {
          label: '福利厚生タイプ',
          options: {
            'Health Insurance': '健康保険', Dental: '歯科保険', Vision: '眼科保険',
            'Life Insurance': '生命保険', '401k': '確定拠出年金', 'Stock Options': 'ストックオプション',
            PTO: '有給休暇', Education: '教育支援', Wellness: '健康増進', Other: 'その他',
          },
        },
        status: {
          label: 'ステータス',
          options: { Active: '有効', Inactive: '無効', Pending: '申請中' },
        },
        provider: { label: 'プロバイダー' },
        employer_contribution: { label: '会社負担額' },
        employee_contribution: { label: '従業員負担額' },
        enrollment_start: { label: '加入開始日' },
        enrollment_end: { label: '加入締切日' },
        is_mandatory: { label: '必須加入' },
      },
    },

    compensation_plan: {
      label: '報酬プラン',
      pluralLabel: '報酬プラン',
      fields: {
        employee_id: { label: '従業員' },
        effective_date: { label: '適用開始日' },
        base_salary: { label: '基本給' },
        bonus_target: { label: '目標賞与' },
        commission_rate: { label: 'コミッション率' },
        equity_grants: { label: '株式付与' },
        total_compensation: { label: '総報酬' },
        currency: { label: '通貨' },
        status: {
          label: 'ステータス',
          options: { Draft: '下書き', Active: '有効', Expired: '期限切れ', Superseded: '更新済' },
        },
        approved_by_id: { label: '承認者' },
        notes: { label: '備考' },
      },
    },
  },

  apps: {
    hr: {
      label: '人的資本管理',
      description: '従業員ライフサイクル管理のための包括的な人事ソリューション',
    },
  },

  messages: {
    'common.save': '保存',
    'common.cancel': 'キャンセル',
    'common.delete': '削除',
    'common.edit': '編集',
    'common.create': '新規作成',
    'common.search': '検索',
    'common.filter': 'フィルター',
    'common.export': 'エクスポート',
    'common.import': 'インポート',
    'common.back': '戻る',
    'common.confirm': '確認',
    'common.refresh': '更新',
    'nav.organization': '組織',
    'nav.talent_acquisition': '人材獲得',
    'nav.performance_development': '人事評価・育成',
    'nav.time_payroll': '勤怠・給与',
    'nav.benefits_compensation': '福利厚生・報酬',
    'nav.views_dashboards': 'ビュー・ダッシュボード',
    'nav.recruitment_pipeline': '採用パイプライン',
    'nav.hr_dashboard': '人事ダッシュボード',
    'success.saved': 'レコードが保存されました',
    'success.deleted': 'レコードが削除されました',
    'success.employee_created': '従業員が作成されました',
    'success.offer_extended': 'オファーが送付されました',
    'success.onboarding_completed': 'オンボーディングが完了しました',
    'success.review_submitted': '人事評価が提出されました',
    'success.time_off_approved': '休暇申請が承認されました',
    'success.payroll_processed': '給与処理が完了しました',
    'confirm.delete': 'このレコードを削除してもよろしいですか？',
    'confirm.terminate_employee': 'この従業員の退職処理を行いますか？関連レコードがすべて更新されます。',
    'confirm.approve_offer': 'このオファーを承認し候補者に送付しますか？',
    'confirm.submit_review': 'この人事評価を提出しますか？この操作は取り消せません。',
    'confirm.process_payroll': '選択した期間の給与処理を実行しますか？',
    'error.required': 'この項目は必須です',
    'error.load_failed': 'データの読み込みに失敗しました',
    'error.save_failed': 'レコードの保存に失敗しました',
    'error.employee_not_found': '従業員が見つかりません',
    'error.duplicate_employee_number': 'この社員番号は既に使用されています',
    'error.interview_conflict': 'この時間帯は他の面接と重複しています',
  },

  validationMessages: {
    hire_date_required: '在籍中の従業員には入社日が必須です',
    salary_range_invalid: '最高給与は最低給与より大きくなければなりません',
    time_off_exceeds_balance: '申請日数が利用可能な休暇残日数を超えています',
    review_incomplete: '提出前にすべての必須セクションを完了してください',
    offer_expired: 'このオファーは有効期限を過ぎています',
    interview_date_past: '面接は過去の日付に設定できません',
    onboarding_already_completed: 'この従業員のオンボーディングは既に完了しています',
    termination_date_before_hire: '退職日は入社日より前に設定できません',
    payroll_period_overlap: '給与期間が既存のレコードと重複しています',
    certification_expired: 'この資格は期限切れのため更新が必要です',
    goal_due_date_required: '進行中の目標には期限の設定が必要です',
    compensation_effective_date_required: '報酬プランには適用開始日が必要です',
  },
};
