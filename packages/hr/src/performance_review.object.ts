import { ObjectSchema, Field } from '@objectstack/spec/data';

export const PerformanceReview = ObjectSchema.create({
  name: 'performance_review',
  label: 'Performance Review',
  pluralLabel: 'Performance Reviews',
  icon: 'chart-line',
  description: 'Employee performance evaluation and review management',

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
      description: 'Typically the direct manager',
      required: true
    }),
    review_period: Field.select({
      label: 'Review Period',
      defaultValue: 'annual',
      options: [
        {
          "label": "Quarterly",
          "value": "quarterly"
        },
        {
          "label": "Semi-Annual",
          "value": "semi_annual"
        },
        {
          "label": "Annual",
          "value": "annual"
        },
        {
          "label": "Probation",
          "value": "probation"
        },
        {
          "label": "Ad-hoc",
          "value": "ad_hoc"
        }
      ]
    }),
    review_type: Field.select({
      label: 'Review Type',
      options: [
        {
          "label": "Self Review",
          "value": "self_review"
        },
        {
          "label": "Manager Review",
          "value": "manager_review"
        },
        {
          "label": "360 Review",
          "value": "peer_360_review"
        },
        {
          "label": "Probation Review",
          "value": "probation_review"
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
      defaultValue: 'not_started',
      options: [
        {
          "label": "Not Started",
          "value": "not_started"
        },
        {
          "label": "In Progress",
          "value": "in_progress"
        },
        {
          "label": "Pending Review",
          "value": "pending_review"
        },
        {
          "label": "Completed",
          "value": "completed"
        },
        {
          "label": "Cancelled",
          "value": "cancelled"
        }
      ]
    }),
    overall_rating: Field.select({
      label: 'Overall Rating',
      options: [
        {
          "label": "Outstanding",
          "value": "outstanding"
        },
        {
          "label": "Exceeds Expectations",
          "value": "exceeds_expectations"
        },
        {
          "label": "Meets Expectations",
          "value": "meets_expectations"
        },
        {
          "label": "Needs Improvement",
          "value": "needs_improvement"
        },
        {
          "label": "Unsatisfactory",
          "value": "unsatisfactory"
        }
      ]
    }),
    overall_score: Field.number({
      label: 'Overall Score',
      description: 'Overall score (0-100)',
      min: 0,
      max: 100,
      precision: 2
    }),
    achievements: Field.textarea({
      label: 'Key Achievements',
      description: 'Key achievements and contributions during the review period',
    }),
    strengths: Field.textarea({
      label: 'Strengths',
    }),
    areas_for_improvement: Field.textarea({
      label: 'Areas for Improvement',
    }),
    development_plan: Field.textarea({
      label: 'Development Plan',
      description: 'Development goals and action plan for the next period',
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