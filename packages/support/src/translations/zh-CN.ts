import type { TranslationData } from '@objectstack/spec/system';

/**
 * 简体中文 (zh-CN) — 客户支持翻译
 *
 * Per-locale file: one file per language, following the `per_locale` convention.
 * Each file exports a single `TranslationData` object for its locale.
 *
 * Covers all 23 Support objects with field labels, select options, and help texts.
 */
export const zhCN: TranslationData = {
  objects: {
    case: {
      label: '工单',
      pluralLabel: '工单',
      fields: {
        case_number: { label: '工单编号' },
        subject: { label: '主题' },
        description: { label: '描述' },
        status: {
          label: '状态',
          options: { New: '新建', Working: '处理中', Escalated: '已升级', Closed: '已关闭' },
        },
        priority: {
          label: '优先级',
          options: { Low: '低', Medium: '中', High: '高 🔴', Critical: '紧急 🚨' },
        },
        origin: {
          label: '工单来源',
          options: {
            Phone: '电话', Email: '电子邮件', Web: '网页',
            Chat: '在线聊天', 'Social Media': '社交媒体',
          },
        },
        type: {
          label: '工单类型',
          options: {
            Question: '咨询', Problem: '问题',
            'Feature Request': '功能请求', Incident: '故障',
          },
        },
        account_id: { label: '客户' },
        contact_id: { label: '联系人' },
        owner_id: { label: '工单负责人' },
        closed_date: { label: '关闭日期' },
        resolution: { label: '解决方案' },
      },
    },

    case_comment: {
      label: '工单评论',
      pluralLabel: '工单评论',
      fields: {
        case_id: { label: '工单' },
        body: { label: '评论内容' },
        is_public: { label: '公开', help: '客户可通过门户查看' },
        created_by: { label: '创建人' },
      },
    },

    knowledge_article: {
      label: '知识文章',
      pluralLabel: '知识文章',
      fields: {
        title: { label: '标题' },
        url_name: { label: 'URL 名称', help: '文章的 URL 友好标识' },
        body: { label: '文章正文' },
        summary: { label: '摘要' },
        status: {
          label: '状态',
          options: { Draft: '草稿', Published: '已发布 ✅', Archived: '已归档' },
        },
        article_type: {
          label: '文章类型',
          options: {
            FAQ: '常见问题', 'How-To': '操作指南', Troubleshooting: '故障排除',
            'Best Practice': '最佳实践', Reference: '参考资料',
          },
        },
        category: { label: '分类' },
        language: { label: '语言' },
        view_count: { label: '浏览量' },
        helpful_count: { label: '有帮助' },
        not_helpful_count: { label: '无帮助' },
        version_number: { label: '版本号' },
        owner_id: { label: '作者' },
      },
    },

    sla_policy: {
      label: 'SLA 策略',
      pluralLabel: 'SLA 策略',
      fields: {
        name: { label: '策略名称' },
        description: { label: '描述' },
        is_active: { label: '启用' },
        priority: {
          label: '优先级',
          options: { Low: '低', Medium: '中', High: '高', Critical: '紧急' },
        },
        first_response_time: { label: '首次响应时间（分钟）', help: '首次响应的最大时间（分钟）' },
        resolution_time: { label: '解决时间（分钟）', help: '解决问题的最大时间（分钟）' },
        business_hours_id: { label: '工作时间' },
        escalation_rule_id: { label: '升级规则' },
      },
    },

    sla_template: {
      label: 'SLA 模板',
      pluralLabel: 'SLA 模板',
      fields: {
        name: { label: '模板名称' },
        description: { label: '描述' },
        type: {
          label: '模板类型',
          options: { Standard: '标准版', Premium: '高级版', Enterprise: '企业版', Custom: '自定义' },
        },
        is_active: { label: '启用' },
      },
    },

    sla_milestone: {
      label: 'SLA 里程碑',
      pluralLabel: 'SLA 里程碑',
      fields: {
        name: { label: '里程碑名称' },
        sla_policy_id: { label: 'SLA 策略' },
        type: {
          label: '里程碑类型',
          options: {
            'First Response': '首次响应', Resolution: '解决',
            Update: '更新', Escalation: '升级',
          },
        },
        target_minutes: { label: '目标时间（分钟）', help: '目标完成时间（分钟）' },
        warning_minutes: { label: '预警时间（分钟）', help: '达到目标前的预警阈值（分钟）' },
        is_completed: { label: '已完成' },
        completed_date: { label: '完成日期' },
      },
    },

    business_hours: {
      label: '工作时间',
      pluralLabel: '工作时间',
      fields: {
        name: { label: '名称' },
        timezone: { label: '时区' },
        is_default: { label: '默认', help: '用作 SLA 计算的默认工作时间' },
        is_active: { label: '启用' },
      },
    },

    holiday_calendar: {
      label: '假日日历',
      pluralLabel: '假日日历',
      fields: {
        name: { label: '日历名称' },
        description: { label: '描述' },
        is_active: { label: '启用' },
        business_hours_id: { label: '工作时间' },
      },
    },

    holiday: {
      label: '假日',
      pluralLabel: '假日',
      fields: {
        name: { label: '假日名称' },
        calendar_id: { label: '日历' },
        date: { label: '日期' },
        is_recurring: { label: '每年重复', help: '每年在同一日期重复' },
      },
    },

    queue: {
      label: '队列',
      pluralLabel: '队列',
      fields: {
        name: { label: '队列名称' },
        description: { label: '描述' },
        is_active: { label: '启用' },
        routing_type: {
          label: '路由类型',
          options: {
            'Round Robin': '轮询分配', 'Least Active': '最少活跃',
            'Most Experienced': '最有经验', Manual: '手动分配',
          },
        },
        supported_objects: { label: '支持的对象' },
      },
    },

    queue_member: {
      label: '队列成员',
      pluralLabel: '队列成员',
      fields: {
        queue_id: { label: '队列' },
        user_id: { label: '用户' },
        is_active: { label: '启用' },
        capacity: { label: '容量', help: '可同时处理的最大工单数' },
        current_load: { label: '当前负载', help: '当前已分配的工单数' },
      },
    },

    routing_rule: {
      label: '路由规则',
      pluralLabel: '路由规则',
      fields: {
        name: { label: '规则名称' },
        description: { label: '描述' },
        is_active: { label: '启用' },
        priority: { label: '优先级', help: '数值越小优先级越高' },
        criteria: { label: '条件' },
        queue_id: { label: '目标队列' },
        owner_id: { label: '指派给' },
      },
    },

    escalation_rule: {
      label: '升级规则',
      pluralLabel: '升级规则',
      fields: {
        name: { label: '规则名称' },
        description: { label: '描述' },
        is_active: { label: '启用' },
        criteria: { label: '条件' },
        escalation_time: { label: '升级时间（分钟）', help: '触发升级前的等待时间（分钟）' },
        escalation_to: { label: '升级至' },
        notification_template: { label: '通知模板' },
      },
    },

    skill: {
      label: '技能',
      pluralLabel: '技能',
      fields: {
        name: { label: '技能名称' },
        description: { label: '描述' },
        category: { label: '分类' },
        is_active: { label: '启用' },
      },
    },

    agent_skill: {
      label: '坐席技能',
      pluralLabel: '坐席技能',
      fields: {
        agent_id: { label: '坐席' },
        skill_id: { label: '技能' },
        proficiency_level: {
          label: '熟练程度',
          options: { Beginner: '初级', Intermediate: '中级', Advanced: '高级', Expert: '专家' },
        },
        is_primary: { label: '主要技能' },
      },
    },

    email_to_case: {
      label: '邮件转工单',
      pluralLabel: '邮件转工单设置',
      fields: {
        name: { label: '配置名称' },
        email_address: { label: '电子邮件地址' },
        is_active: { label: '启用' },
        queue_id: { label: '默认队列' },
        priority: {
          label: '默认优先级',
          options: { Low: '低', Medium: '中', High: '高', Critical: '紧急' },
        },
        case_origin: { label: '工单来源' },
      },
    },

    web_to_case: {
      label: '网页转工单',
      pluralLabel: '网页转工单设置',
      fields: {
        name: { label: '配置名称' },
        is_active: { label: '启用' },
        queue_id: { label: '默认队列' },
        return_url: { label: '返回 URL', help: '表单提交后的跳转地址' },
        enable_recaptcha: { label: '启用 reCAPTCHA', help: '启用 reCAPTCHA 验证以防止垃圾信息' },
      },
    },

    social_media_case: {
      label: '社交媒体工单',
      pluralLabel: '社交媒体工单',
      fields: {
        case_id: { label: '工单' },
        platform: {
          label: '平台',
          options: {
            Twitter: 'Twitter', Facebook: 'Facebook', Instagram: 'Instagram',
            LinkedIn: 'LinkedIn', YouTube: 'YouTube', TikTok: 'TikTok',
          },
        },
        post_url: { label: '帖子链接' },
        author_name: { label: '作者' },
        sentiment: {
          label: '情感倾向',
          options: { Positive: '正面 😊', Neutral: '中性 😐', Negative: '负面 😠' },
        },
        reach: { label: '触达量', help: '看到该帖子的用户数' },
        engagement: { label: '互动量', help: '总互动数（点赞、分享、评论）' },
      },
    },

    portal_user: {
      label: '门户用户',
      pluralLabel: '门户用户',
      fields: {
        contact_id: { label: '联系人' },
        username: { label: '用户名' },
        is_active: { label: '启用' },
        role: {
          label: '角色',
          options: { Standard: '标准用户', 'Power User': '高级用户', Admin: '管理员' },
        },
        last_login: { label: '最后登录' },
        login_count: { label: '登录次数' },
        profile_photo: { label: '头像' },
      },
    },

    forum_topic: {
      label: '论坛主题',
      pluralLabel: '论坛主题',
      fields: {
        title: { label: '标题' },
        body: { label: '正文' },
        category: {
          label: '分类',
          options: {
            General: '综合讨论', 'Product Questions': '产品问答',
            'Feature Requests': '功能建议', 'Tips & Tricks': '技巧分享',
            Announcements: '公告',
          },
        },
        status: {
          label: '状态',
          options: { Open: '开放', Closed: '已关闭', Pinned: '已置顶 📌', Archived: '已归档' },
        },
        author_id: { label: '作者' },
        view_count: { label: '浏览量' },
        reply_count: { label: '回复数' },
        is_pinned: { label: '置顶' },
        is_locked: { label: '锁定' },
      },
    },

    forum_post: {
      label: '论坛帖子',
      pluralLabel: '论坛帖子',
      fields: {
        topic_id: { label: '主题' },
        body: { label: '正文' },
        author_id: { label: '作者' },
        is_best_answer: { label: '最佳回答', help: '被主题作者标记为最佳回答' },
        helpful_count: { label: '有帮助' },
      },
    },

    chatbot_config: {
      label: '聊天机器人配置',
      pluralLabel: '聊天机器人配置',
      fields: {
        name: { label: '机器人名称' },
        description: { label: '描述' },
        is_active: { label: '启用' },
        welcome_message: { label: '欢迎语', help: '向客户显示的初始问候语' },
        fallback_message: { label: '兜底回复', help: '机器人无法理解时显示的消息' },
        language: { label: '语言' },
        queue_id: { label: '升级队列', help: '机器人升级时路由到的队列' },
        model_provider: { label: 'AI 模型提供商' },
        max_turns: { label: '最大对话轮次', help: '自动升级前的最大对话轮次' },
      },
    },

    macro: {
      label: '宏',
      pluralLabel: '宏',
      fields: {
        name: { label: '宏名称' },
        description: { label: '描述' },
        is_active: { label: '启用' },
        steps: { label: '步骤', help: '按顺序执行的操作列表' },
        target_object: { label: '目标对象' },
        folder: { label: '文件夹' },
        owner_id: { label: '所有者' },
      },
    },
  },

  apps: {
    support: {
      label: '客户支持',
      description: '客户支持管理，包括工单、知识库和 SLA 跟踪',
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
    'nav.support': '支持',
    'nav.sla_management': 'SLA 管理',
    'nav.automation_ai': '自动化与 AI',
    'nav.community_portal': '社区门户',
    'nav.views_dashboards': '视图与仪表盘',
    'nav.case_board': '工单看板',
    'nav.support_dashboard': '支持仪表盘',
    'success.saved': '记录保存成功',
    'success.deleted': '记录删除成功',
    'success.case_closed': '工单已关闭',
    'success.article_published': '文章发布成功',
    'success.macro_executed': '宏执行成功',
    'confirm.delete': '确定要删除此记录吗？',
    'confirm.close_case': '关闭此工单？需要填写解决方案。',
    'confirm.publish_article': '发布此文章？发布后所有用户均可查看。',
    'confirm.escalate': '将此工单升级到下一层级？',
    'error.required': '此字段为必填项',
    'error.load_failed': '数据加载失败',
    'error.save_failed': '记录保存失败',
    'error.sla_breach': 'SLA 违规 — 请立即处理',
    'error.queue_full': '目标队列已满',
  },

  validationMessages: {
    sla_breach_warning: '此工单即将超过 SLA 截止时间',
    case_requires_contact: '保存工单前必须关联联系人',
    article_publish_incomplete: '发布前必须填写标题、正文和摘要',
    resolution_required_to_close: '关闭工单前必须提供解决方案',
    escalation_time_positive: '升级时间必须大于零',
    target_minutes_positive: '目标时间必须大于零',
    capacity_exceeded: '坐席容量已超出上限',
    duplicate_queue_member: '该用户已是此队列的成员',
  },
};
