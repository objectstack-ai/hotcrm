import { ObjectSchema, Field } from '@objectstack/spec/data';

export const PerformanceReview = ObjectSchema.create({
  name: 'performance_review',
  label: 'Performance Review',
  pluralLabel: 'Performance Reviews',
  icon: 'chart-line',
  description: '员工绩效评估和考核管理',

  fields: {
    review_name: Field.text({
      label: 'Review Name',
      required: true,
      maxLength: 255
    }),
    employee_id: Field.lookup('employee', {
      label: 'Reviewed Employee',
      required: true
    }),
    reviewer_id: Field.lookup('employee', {
      label: 'Reviewer',
      description: '通常是直属经理',
      required: true
    }),
    review_period: Field.select({
      label: 'Review Period',
      defaultValue: 'Annual',
      options: [
        {
          "label": "Quarterly",
          "value": "Quarterly"
        },
        {
          "label": "Semi-Annual",
          "value": "Semi-Annual"
        },
        {
          "label": "Annual",
          "value": "Annual"
        },
        {
          "label": "Probation",
          "value": "Probation"
        },
        {
          "label": "Ad-hoc",
          "value": "Ad-hoc"
        }
      ]
    }),
    review_type: Field.select({
      label: 'Review Type',
      options: [
        {
          "label": "Self Review",
          "value": "Self Review"
        },
        {
          "label": "Manager Review",
          "value": "Manager Review"
        },
        {
          "label": "360 Review",
          "value": "360 Review"
        },
        {
          "label": "Probation Review",
          "value": "Probation Review"
        }
      ]
    }),
    start_date: Field.date({
      label: 'Review Start Date',
      required: true
    }),
    end_date: Field.date({
      label: 'Review End Date',
      required: true
    }),
    due_date: Field.date({ label: 'Due Date' }),
    status: Field.select({
      label: 'Status',
      defaultValue: 'Not Started',
      options: [
        {
          "label": "Not Started",
          "value": "Not Started"
        },
        {
          "label": "In Progress",
          "value": "In Progress"
        },
        {
          "label": "Pending Review",
          "value": "Pending Review"
        },
        {
          "label": "Completed",
          "value": "Completed"
        },
        {
          "label": "Cancelled",
          "value": "Cancelled"
        }
      ]
    }),
    overall_rating: Field.select({
      label: 'Overall Rating',
      options: [
        {
          "label": "Outstanding",
          "value": "Outstanding"
        },
        {
          "label": "Exceeds Expectations",
          "value": "Exceeds Expectations"
        },
        {
          "label": "Meets Expectations",
          "value": "Meets Expectations"
        },
        {
          "label": "Needs Improvement",
          "value": "Needs Improvement"
        },
        {
          "label": "Unsatisfactory",
          "value": "Unsatisfactory"
        }
      ]
    }),
    overall_score: Field.number({
      label: 'Overall Score',
      description: '综合评分（0-100）',
      min: 0,
      max: 100,
      precision: 2
    }),
    achievements: Field.textarea({
      label: 'Key Achievements',
      description: '评估期内的关键成就和贡献',
    }),
    strengths: Field.textarea({
      label: 'Strengths',
    }),
    areas_for_improvement: Field.textarea({
      label: 'Areas for Improvement',
    }),
    development_plan: Field.textarea({
      label: 'Development Plan',
      description: '下一阶段的发展目标和行动计划',
    }),
    employee_comments: Field.textarea({
      label: 'Employee Comments',
    }),
    manager_comments: Field.textarea({
      label: 'Manager Comments',
    }),
    promotion_recommendation: Field.boolean({
      label: 'Promotion Recommendation',
      defaultValue: false
    }),
    salary_increase_recommendation: Field.percent({ label: 'Recommended Salary Increase' }),
    notes: Field.textarea({
      label: 'Notes',
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    activities: true,
    feeds: true,
  },
});