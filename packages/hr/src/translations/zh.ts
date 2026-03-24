import type { TranslationData } from '@objectstack/spec/system';

/**
 * 简体中文 (zh) — Human Capital Management Translations
 *
 * Per-locale file: one file per language, following the `per_locale` convention.
 */
export const zh: TranslationData = {
  objects: {
    department: {
      label: '部门',
      pluralLabel: '部门',
      fields: {
        name: { label: '部门名称' },
        description: { label: '描述' },
        parent_department_id: { label: '上级部门' },
        manager_id: { label: '部门经理' },
        cost_center: { label: '成本中心' },
        headcount: { label: '编制人数' },
        budget: { label: '预算' },
        status: {
          label: '状态',
          options: { Active: '启用', Inactive: '停用', Restructuring: '重组中' },
        },
      },
    },

    position: {
      label: '职位',
      pluralLabel: '职位',
      fields: {
        title: { label: '职位名称' },
        description: { label: '描述' },
        department_id: { label: '部门' },
        reports_to_id: { label: '汇报对象' },
        level: {
          label: '职级',
          options: {
            Entry: '初级', Junior: '初阶', Mid: '中级', Senior: '高级',
            Lead: '负责人', Manager: '经理', Director: '总监', VP: '副总裁', 'C-Level': '高管',
          },
        },
        type: {
          label: '职位类型',
          options: {
            'Full-Time': '全职', 'Part-Time': '兼职',
            Contract: '合同工', Intern: '实习', Temporary: '临时',
          },
        },
        status: {
          label: '状态',
          options: { Open: '开放', Filled: '已满', 'On Hold': '暂停', Closed: '关闭' },
        },
        min_salary: { label: '最低薪资' },
        max_salary: { label: '最高薪资' },
        location: { label: '工作地点' },
        headcount: { label: '编制人数' },
      },
    },

    employee: {
      label: '员工',
      pluralLabel: '员工',
      fields: {
        employee_number: { label: '工号' },
        first_name: { label: '名' },
        last_name: { label: '姓' },
        email: { label: '邮箱' },
        phone: { label: '电话' },
        department_id: { label: '部门' },
        position_id: { label: '职位' },
        manager_id: { label: '上级主管' },
        hire_date: { label: '入职日期' },
        termination_date: { label: '离职日期' },
        status: {
          label: '状态',
          options: {
            Active: '在职', 'On Leave': '休假中', Terminated: '已离职',
            Probation: '试用期', Retired: '已退休',
          },
        },
        employment_type: {
          label: '用工类型',
          options: {
            'Full-Time': '全职', 'Part-Time': '兼职',
            Contract: '合同工', Intern: '实习', Temporary: '临时',
          },
        },
        location: { label: '工作地点' },
        date_of_birth: { label: '出生日期' },
        gender: {
          label: '性别',
          options: {
            Male: '男', Female: '女',
            'Non-Binary': '非二元', 'Prefer Not to Say': '不愿透露',
          },
        },
        emergency_contact_name: { label: '紧急联系人' },
        emergency_contact_phone: { label: '紧急联系电话' },
        annual_salary: { label: '年薪' },
        profile_photo: { label: '照片' },
      },
    },

    recruitment: {
      label: '招聘',
      pluralLabel: '招聘',
      fields: {
        title: { label: '职位名称' },
        description: { label: '描述' },
        department_id: { label: '部门' },
        position_id: { label: '职位' },
        status: {
          label: '状态',
          options: {
            Draft: '草稿', Open: '开放', 'In Progress': '进行中',
            'On Hold': '暂停', Filled: '已招满', Cancelled: '已取消',
          },
        },
        priority: {
          label: '优先级',
          options: { Low: '低', Medium: '中', High: '高', Urgent: '紧急' },
        },
        number_of_openings: { label: '招聘人数' },
        target_hire_date: { label: '目标入职日期' },
        hiring_manager_id: { label: '用人经理' },
        recruiter_id: { label: '招聘负责人' },
        min_salary: { label: '最低薪资' },
        max_salary: { label: '最高薪资' },
        location: { label: '工作地点' },
        employment_type: {
          label: '用工类型',
          options: {
            'Full-Time': '全职', 'Part-Time': '兼职',
            Contract: '合同工', Intern: '实习', Temporary: '临时',
          },
        },
        source_channels: { label: '招聘渠道' },
      },
    },

    candidate: {
      label: '候选人',
      pluralLabel: '候选人',
      fields: {
        first_name: { label: '名' },
        last_name: { label: '姓' },
        email: { label: '邮箱' },
        phone: { label: '电话' },
        status: {
          label: '状态',
          options: {
            New: '新建', Screening: '筛选中', Interview: '面试中',
            Assessment: '评估中', Offer: '发放录用', Hired: '已录用',
            Rejected: '已拒绝', Withdrawn: '已退出',
          },
        },
        source: {
          label: '来源',
          options: {
            LinkedIn: 'LinkedIn', Indeed: 'Indeed', Referral: '内部推荐',
            'Career Page': '招聘官网', Agency: '猎头', University: '校园招聘', Other: '其他',
          },
        },
        recruitment_id: { label: '招聘需求' },
        resume: { label: '简历' },
        cover_letter: { label: '求职信' },
        current_company: { label: '当前公司' },
        current_title: { label: '当前职位' },
        experience_years: { label: '工作年限' },
        expected_salary: { label: '期望薪资' },
        ai_score: { label: 'AI 评分', help: 'AI 生成的候选人匹配分数' },
        skills: { label: '技能' },
        notes: { label: '备注' },
      },
    },

    application: {
      label: '申请',
      pluralLabel: '申请',
      fields: {
        candidate_id: { label: '候选人' },
        recruitment_id: { label: '招聘需求' },
        status: {
          label: '状态',
          options: {
            Submitted: '已提交', 'Under Review': '审核中',
            Interview: '面试中', Assessment: '评估中',
            Offer: '发放录用', Accepted: '已接受',
            Rejected: '已拒绝', Withdrawn: '已退出',
          },
        },
        applied_date: { label: '申请日期' },
        screening_score: { label: '筛选评分' },
        notes: { label: '备注' },
        resume_match_score: { label: '简历匹配分', help: 'AI 计算的简历与岗位匹配百分比' },
      },
    },

    interview: {
      label: '面试',
      pluralLabel: '面试',
      fields: {
        candidate_id: { label: '候选人' },
        recruitment_id: { label: '招聘需求' },
        interviewer_id: { label: '面试官' },
        type: {
          label: '面试类型',
          options: {
            'Phone Screen': '电话初筛', Video: '视频面试', 'In-Person': '现场面试',
            Panel: '群面', Technical: '技术面试', 'Culture Fit': '文化匹配面试',
          },
        },
        status: {
          label: '状态',
          options: {
            Scheduled: '已安排', Completed: '已完成', Cancelled: '已取消',
            'No Show': '未出席', Rescheduled: '已改期',
          },
        },
        scheduled_date: { label: '安排日期' },
        duration_minutes: { label: '时长（分钟）' },
        location: { label: '地点' },
        rating: { label: '评分' },
        feedback: { label: '反馈' },
        recommendation: {
          label: '建议',
          options: {
            'Strong Hire': '强烈推荐', Hire: '推荐录用',
            'No Hire': '不推荐', 'Strong No Hire': '强烈不推荐',
          },
        },
      },
    },

    offer: {
      label: '录用通知',
      pluralLabel: '录用通知',
      fields: {
        candidate_id: { label: '候选人' },
        recruitment_id: { label: '招聘需求' },
        position_id: { label: '职位' },
        status: {
          label: '状态',
          options: {
            Draft: '草稿', 'Pending Approval': '待审批',
            Approved: '已批准', Extended: '已发放',
            Accepted: '已接受', Rejected: '已拒绝',
            Expired: '已过期', Withdrawn: '已撤回',
          },
        },
        salary: { label: '薪资' },
        start_date: { label: '入职日期' },
        expiration_date: { label: '截止日期' },
        signing_bonus: { label: '签约奖金' },
        equity: { label: '股权' },
        benefits_package: { label: '福利方案' },
        notes: { label: '备注' },
        approved_by_id: { label: '审批人' },
      },
    },

    onboarding: {
      label: '入职引导',
      pluralLabel: '入职引导',
      fields: {
        employee_id: { label: '员工' },
        status: {
          label: '状态',
          options: {
            'Not Started': '未开始', 'In Progress': '进行中',
            Completed: '已完成', Overdue: '已逾期',
          },
        },
        start_date: { label: '开始日期' },
        target_completion_date: { label: '目标完成日期' },
        actual_completion_date: { label: '实际完成日期' },
        checklist_items: { label: '清单项目' },
        completed_items: { label: '已完成项目' },
        buddy_id: { label: '引导人/导师' },
        notes: { label: '备注' },
      },
    },

    performance_review: {
      label: '绩效评估',
      pluralLabel: '绩效评估',
      fields: {
        employee_id: { label: '员工' },
        reviewer_id: { label: '评估人' },
        review_period: { label: '评估周期' },
        status: {
          label: '状态',
          options: {
            Draft: '草稿', 'Self-Review': '自评', 'Manager Review': '主管评估',
            Calibration: '校准', Completed: '已完成',
          },
        },
        overall_rating: {
          label: '综合评级',
          options: {
            'Exceeds Expectations': '超出预期', 'Meets Expectations': '符合预期',
            'Needs Improvement': '待改进', 'Below Expectations': '低于预期',
          },
        },
        self_assessment: { label: '自我评价' },
        manager_assessment: { label: '主管评价' },
        goals_achievement: { label: '目标达成情况' },
        strengths: { label: '优势' },
        areas_for_improvement: { label: '待提升领域' },
        development_plan: { label: '发展计划' },
        due_date: { label: '截止日期' },
      },
    },

    goal: {
      label: '目标',
      pluralLabel: '目标',
      fields: {
        title: { label: '目标名称' },
        description: { label: '描述' },
        employee_id: { label: '员工' },
        type: {
          label: '目标类型',
          options: { Individual: '个人', Team: '团队', Department: '部门', Company: '公司' },
        },
        status: {
          label: '状态',
          options: {
            Draft: '草稿', Active: '进行中', Completed: '已完成',
            Cancelled: '已取消', 'On Hold': '暂停',
          },
        },
        priority: {
          label: '优先级',
          options: { Low: '低', Medium: '中', High: '高', Critical: '紧急' },
        },
        start_date: { label: '开始日期' },
        due_date: { label: '截止日期' },
        progress: { label: '进度' },
        metric: { label: '成功指标' },
        parent_goal_id: { label: '上级目标' },
        review_id: { label: '绩效评估' },
      },
    },

    training: {
      label: '培训',
      pluralLabel: '培训',
      fields: {
        name: { label: '培训名称' },
        description: { label: '描述' },
        type: {
          label: '培训类型',
          options: {
            Online: '线上', 'In-Person': '线下', Workshop: '工作坊',
            Conference: '会议', 'Self-Paced': '自主学习', Mentoring: '导师辅导',
          },
        },
        status: {
          label: '状态',
          options: {
            Draft: '草稿', Scheduled: '已排期', 'In Progress': '进行中',
            Completed: '已完成', Cancelled: '已取消',
          },
        },
        start_date: { label: '开始日期' },
        end_date: { label: '结束日期' },
        duration_hours: { label: '时长（小时）' },
        max_participants: { label: '最大参与人数' },
        enrolled_count: { label: '已报名' },
        completed_count: { label: '已完成' },
        instructor_id: { label: '讲师' },
        location: { label: '地点' },
        cost: { label: '费用' },
        is_mandatory: { label: '是否必修' },
      },
    },

    certification: {
      label: '证书',
      pluralLabel: '证书',
      fields: {
        employee_id: { label: '员工' },
        name: { label: '证书名称' },
        issuing_body: { label: '颁发机构' },
        issue_date: { label: '颁发日期' },
        expiration_date: { label: '有效期至' },
        credential_id: { label: '证书编号' },
        status: {
          label: '状态',
          options: {
            Active: '有效', Expired: '已过期',
            Revoked: '已撤销', 'Pending Renewal': '待续期',
          },
        },
        verification_url: { label: '验证链接' },
      },
    },

    time_off: {
      label: '请假',
      pluralLabel: '请假申请',
      fields: {
        employee_id: { label: '员工' },
        type: {
          label: '假期类型',
          options: {
            Vacation: '年假', 'Sick Leave': '病假', Personal: '事假',
            Maternity: '产假', Paternity: '陪产假', Bereavement: '丧假',
            'Jury Duty': '陪审义务假', Other: '其他',
          },
        },
        status: {
          label: '状态',
          options: { Pending: '待审批', Approved: '已批准', Rejected: '已驳回', Cancelled: '已取消' },
        },
        start_date: { label: '开始日期' },
        end_date: { label: '结束日期' },
        days_requested: { label: '申请天数' },
        reason: { label: '原因' },
        approver_id: { label: '审批人' },
        approved_date: { label: '审批日期' },
      },
    },

    attendance: {
      label: '考勤',
      pluralLabel: '考勤记录',
      fields: {
        employee_id: { label: '员工' },
        date: { label: '日期' },
        clock_in: { label: '签到' },
        clock_out: { label: '签退' },
        total_hours: { label: '总工时' },
        status: {
          label: '状态',
          options: {
            Present: '出勤', Absent: '缺勤', Late: '迟到',
            'Half Day': '半天', Remote: '远程', Holiday: '节假日',
          },
        },
        notes: { label: '备注' },
      },
    },

    payroll: {
      label: '薪资',
      pluralLabel: '薪资记录',
      fields: {
        employee_id: { label: '员工' },
        period_start: { label: '起始日期' },
        period_end: { label: '截止日期' },
        status: {
          label: '状态',
          options: {
            Draft: '草稿', Calculated: '已计算', Approved: '已审批',
            Paid: '已发放', Void: '已作废',
          },
        },
        base_salary: { label: '基本工资' },
        overtime_pay: { label: '加班费' },
        deductions: { label: '扣除项' },
        tax_amount: { label: '税额' },
        net_pay: { label: '实发工资' },
        payment_date: { label: '发放日期' },
        payment_method: {
          label: '发放方式',
          options: {
            'Direct Deposit': '银行转账', Check: '支票', 'Wire Transfer': '电汇',
          },
        },
      },
    },

    benefit: {
      label: '福利',
      pluralLabel: '福利',
      fields: {
        name: { label: '福利名称' },
        description: { label: '描述' },
        type: {
          label: '福利类型',
          options: {
            'Health Insurance': '医疗保险', Dental: '牙科保险', Vision: '视力保险',
            'Life Insurance': '人寿保险', '401k': '401k退休计划', 'Stock Options': '股票期权',
            PTO: '带薪休假', Education: '教育补贴', Wellness: '健康福利', Other: '其他',
          },
        },
        status: {
          label: '状态',
          options: { Active: '启用', Inactive: '停用', Pending: '待生效' },
        },
        provider: { label: '供应商' },
        employer_contribution: { label: '企业承担部分' },
        employee_contribution: { label: '个人承担部分' },
        enrollment_start: { label: '参保开始日期' },
        enrollment_end: { label: '参保截止日期' },
        is_mandatory: { label: '是否必选' },
      },
    },

    compensation_plan: {
      label: '薪酬方案',
      pluralLabel: '薪酬方案',
      fields: {
        employee_id: { label: '员工' },
        effective_date: { label: '生效日期' },
        base_salary: { label: '基本工资' },
        bonus_target: { label: '目标奖金' },
        commission_rate: { label: '佣金比例' },
        equity_grants: { label: '股权授予' },
        total_compensation: { label: '总薪酬' },
        currency: { label: '币种' },
        status: {
          label: '状态',
          options: { Draft: '草稿', Active: '生效中', Expired: '已过期', Superseded: '已替代' },
        },
        approved_by_id: { label: '审批人' },
        notes: { label: '备注' },
      },
    },
  },

  apps: {
    hr: {
      label: '人力资本管理',
      description: '覆盖员工全生命周期管理的完整人力资源解决方案',
    },
  },

  messages: {
    'common.save': '保存',
    'common.cancel': '取消',
    'common.delete': '删除',
    'common.edit': '编辑',
    'common.create': '新建',
    'common.search': '搜索',
    'common.filter': '筛选',
    'common.export': '导出',
    'common.import': '导入',
    'common.back': '返回',
    'common.confirm': '确认',
    'common.refresh': '刷新',
    'nav.organization': '组织架构',
    'nav.talent_acquisition': '人才招聘',
    'nav.performance_development': '绩效与发展',
    'nav.time_payroll': '考勤与薪资',
    'nav.benefits_compensation': '福利与薪酬',
    'nav.views_dashboards': '视图与仪表盘',
    'nav.recruitment_pipeline': '招聘流水线',
    'nav.hr_dashboard': '人力资源仪表盘',
    'success.saved': '记录保存成功',
    'success.deleted': '记录删除成功',
    'success.employee_created': '员工创建成功',
    'success.offer_extended': '录用通知已发放',
    'success.onboarding_completed': '入职引导已完成',
    'success.review_submitted': '绩效评估已提交',
    'success.time_off_approved': '请假申请已批准',
    'success.payroll_processed': '薪资已发放',
    'confirm.delete': '确定要删除此记录吗？',
    'confirm.terminate_employee': '确认为该员工办理离职？此操作将更新所有关联记录。',
    'confirm.approve_offer': '确认批准并向候选人发放此录用通知？',
    'confirm.submit_review': '确认提交此绩效评估？提交后不可撤销。',
    'confirm.process_payroll': '确认为选定周期执行薪资发放？',
    'error.required': '此字段为必填项',
    'error.load_failed': '数据加载失败',
    'error.save_failed': '保存记录失败',
    'error.employee_not_found': '未找到该员工',
    'error.duplicate_employee_number': '该工号已存在',
    'error.interview_conflict': '该时段与其他面试冲突',
  },

  validationMessages: {
    hire_date_required: '在职员工必须填写入职日期',
    salary_range_invalid: '最高薪资必须大于最低薪资',
    time_off_exceeds_balance: '申请天数超出可用假期余额',
    review_incomplete: '提交前必须完成所有必填部分',
    offer_expired: '此录用通知已超过截止日期',
    interview_date_past: '面试时间不能安排在过去',
    onboarding_already_completed: '该员工的入职引导已完成',
    termination_date_before_hire: '离职日期不能早于入职日期',
    payroll_period_overlap: '薪资周期与现有记录重叠',
    certification_expired: '此证书已过期，需要续期',
    goal_due_date_required: '进行中的目标必须设置截止日期',
    compensation_effective_date_required: '薪酬方案必须填写生效日期',
  },
};
