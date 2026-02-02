import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Candidate = ObjectSchema.create({
  name: 'candidate',
  label: '候选人',
  pluralLabel: '候选人',
  icon: 'user-check',
  description: '求职候选人信息管理',

  fields: {
    first_name: Field.text({
      label: '名',
      required: true,
      maxLength: 40
    }),
    last_name: Field.text({
      label: '姓',
      required: true,
      maxLength: 80
    }),
    email: Field.email({
      label: '邮箱',
      required: true,
      unique: true
    }),
    phone: Field.phone({ label: '电话' }),
    mobile_phone: Field.phone({
      label: '手机',
      required: true
    }),
    linkedin_url: Field.url({ label: 'LinkedIn链接' }),
    current_company: Field.text({
      label: '当前公司',
      maxLength: 255
    }),
    current_title: Field.text({
      label: '当前职位',
      maxLength: 255
    }),
    years_of_experience: Field.number({
      label: '工作年限',
      description: '总工作年限',
      precision: 1
    }),
    highest_education: Field.select({
      label: '最高学历',
      options: [
        {
          "label": "博士",
          "value": "PhD"
        },
        {
          "label": "硕士",
          "value": "Master"
        },
        {
          "label": "本科",
          "value": "Bachelor"
        },
        {
          "label": "专科",
          "value": "Associate"
        },
        {
          "label": "高中",
          "value": "High School"
        },
        {
          "label": "其他",
          "value": "Other"
        }
      ]
    }),
    university: Field.text({
      label: '毕业院校',
      maxLength: 255
    }),
    major: Field.text({
      label: '专业',
      maxLength: 255
    }),
    current_salary: Field.currency({
      label: '当前薪资',
      precision: 2
    }),
    expected_salary: Field.currency({
      label: '期望薪资',
      precision: 2
    }),
    notice_period: Field.select({
      label: '离职周期',
      options: [
        {
          "label": "立即到岗",
          "value": "Immediate"
        },
        {
          "label": "1周",
          "value": "1 Week"
        },
        {
          "label": "2周",
          "value": "2 Weeks"
        },
        {
          "label": "1个月",
          "value": "1 Month"
        },
        {
          "label": "2个月",
          "value": "2 Months"
        },
        {
          "label": "3个月",
          "value": "3 Months"
        }
      ]
    }),
    source: Field.select({
      label: '来源渠道',
      options: [
        {
          "label": "招聘网站",
          "value": "Job Board"
        },
        {
          "label": "内推",
          "value": "Employee Referral"
        },
        {
          "label": "猎头",
          "value": "Headhunter"
        },
        {
          "label": "社交媒体",
          "value": "Social Media"
        },
        {
          "label": "校园招聘",
          "value": "Campus"
        },
        {
          "label": "主动投递",
          "value": "Direct Application"
        },
        {
          "label": "其他",
          "value": "Other"
        }
      ]
    }),
    rating: /* TODO: Unknown type 'rating' */ null,
    status: Field.select({
      label: '状态',
      defaultValue: 'New',
      options: [
        {
          "label": "新候选人",
          "value": "New"
        },
        {
          "label": "审核中",
          "value": "Under Review"
        },
        {
          "label": "面试中",
          "value": "Interviewing"
        },
        {
          "label": "已录用",
          "value": "Hired"
        },
        {
          "label": "已拒绝",
          "value": "Rejected"
        },
        {
          "label": "已撤回",
          "value": "Withdrawn"
        }
      ]
    }),
    skills: /* TODO: Unknown type 'tags' */ null,
    resume_url: Field.url({ label: '简历链接' }),
    city: Field.text({
      label: '所在城市',
      maxLength: 40
    }),
    country: Field.text({
      label: '国家',
      maxLength: 40
    }),
    notes: Field.textarea({
      label: '备注',
      rows: 4
    })
  },

  enable: {
    searchEnabled: true,
    trackHistory: true,
    allowActivities: true,
    allowFeeds: true,
    allowAttachments: true
  },
});