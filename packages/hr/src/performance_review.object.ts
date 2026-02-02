import { ObjectSchema, Field } from '@objectstack/spec/data';

export const PerformanceReview = ObjectSchema.create({
  name: 'performance_review',
  label: '绩效评估',
  pluralLabel: '绩效评估',
  icon: 'chart-line',
  description: '员工绩效评估和考核管理',

  fields: {
    review_name: Field.text({
      label: '评估名称',
      required: true,
      maxLength: 255
    }),
    employee_id: Field.lookup('employee', {
      label: '被评估员工',
      required: true
    }),
    reviewer_id: Field.lookup('employee', {
      label: '评估人',
      description: '通常是直属经理',
      required: true
    }),
    review_period: Field.select({
      label: '评估周期',
      defaultValue: 'Annual',
      options: [
        {
          "label": "季度",
          "value": "Quarterly"
        },
        {
          "label": "半年度",
          "value": "Semi-Annual"
        },
        {
          "label": "年度",
          "value": "Annual"
        },
        {
          "label": "试用期",
          "value": "Probation"
        },
        {
          "label": "临时",
          "value": "Ad-hoc"
        }
      ]
    }),
    review_type: Field.select({
      label: '评估类型',
      options: [
        {
          "label": "自评",
          "value": "Self Review"
        },
        {
          "label": "经理评估",
          "value": "Manager Review"
        },
        {
          "label": "360度评估",
          "value": "360 Review"
        },
        {
          "label": "试用期评估",
          "value": "Probation Review"
        }
      ]
    }),
    start_date: Field.date({
      label: '评估开始日期',
      required: true
    }),
    end_date: Field.date({
      label: '评估结束日期',
      required: true
    }),
    due_date: Field.date({ label: '提交截止日期' }),
    status: Field.select({
      label: '状态',
      defaultValue: 'Not Started',
      options: [
        {
          "label": "未开始",
          "value": "Not Started"
        },
        {
          "label": "进行中",
          "value": "In Progress"
        },
        {
          "label": "待审核",
          "value": "Pending Review"
        },
        {
          "label": "已完成",
          "value": "Completed"
        },
        {
          "label": "已取消",
          "value": "Cancelled"
        }
      ]
    }),
    overall_rating: Field.select({
      label: '总体评级',
      options: [
        {
          "label": "优秀",
          "value": "Outstanding"
        },
        {
          "label": "超出期望",
          "value": "Exceeds Expectations"
        },
        {
          "label": "达到期望",
          "value": "Meets Expectations"
        },
        {
          "label": "需要改进",
          "value": "Needs Improvement"
        },
        {
          "label": "不满意",
          "value": "Unsatisfactory"
        }
      ]
    }),
    overall_score: Field.number({
      label: '总体评分',
      description: '综合评分（0-100）',
      min: 0,
      max: 100,
      precision: 2
    }),
    achievements: Field.textarea({
      label: '主要成就',
      description: '评估期内的关键成就和贡献',
    }),
    strengths: Field.textarea({
      label: '优势',
    }),
    areas_for_improvement: Field.textarea({
      label: '改进方向',
    }),
    development_plan: Field.textarea({
      label: '发展计划',
      description: '下一阶段的发展目标和行动计划',
    }),
    employee_comments: Field.textarea({
      label: '员工自评/反馈',
    }),
    manager_comments: Field.textarea({
      label: '经理评语',
    }),
    promotion_recommendation: Field.boolean({
      label: '推荐晋升',
      defaultValue: false
    }),
    salary_increase_recommendation: Field.percent({ label: '建议加薪比例' }),
    notes: Field.textarea({
      label: '备注',
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    activities: true,
    feeds: true,
  },
});