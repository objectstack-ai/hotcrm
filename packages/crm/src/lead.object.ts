import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Lead = ObjectSchema.create({
  name: 'lead',
  label: '线索',
  pluralLabel: '线索',
  icon: 'user-plus',
  description: 'AI-Native Lead Management Object',

  fields: {
    first_name: Field.text({
      label: '名',
      maxLength: 40
    }),
    last_name: Field.text({
      label: '姓',
      required: true,
      maxLength: 80
    }),
    company: Field.text({
      label: '公司',
      required: true,
      searchable: true,
      maxLength: 255
    }),
    title: Field.text({
      label: '职位',
      maxLength: 128
    }),
    email: Field.email({
      label: '邮箱',
      searchable: true,
      unique: true
    }),
    phone: Field.phone({
      label: '电话'
    }),
    mobile_phone: Field.phone({
      label: '手机'
    }),
    website: Field.url({
      label: '网站'
    }),
    status: Field.select({
      label: '状态',
      defaultValue: 'New',
      options: [
        { label: '新线索', value: 'new' },
        { label: '已联系', value: 'contacted' },
        { label: '已认证', value: 'qualified' },
        { label: '未认证', value: 'unqualified' },
        { label: '已转化', value: 'converted' }
      ]
    }),
    rating: Field.select({
      label: '等级',
      options: [
        { label: '热门 🔥', value: 'hot' },
        { label: '温暖 ⭐', value: 'warm' },
        { label: '冷淡 ❄️', value: 'cold' }
      ]
    }),
    lead_score: Field.number({
      label: '线索评分',
      defaultValue: 0,
      precision: 0,
      min: 0
    }),
    data_completeness: Field.number({
      label: '资料完整度(%)',
      defaultValue: 0,
      precision: 0,
      min: 0,
      max: 100
    }),
    industry: Field.select({
      label: '行业',
      options: [
        { label: '科技/互联网', value: 'technology' },
        { label: '金融服务', value: 'finance' },
        { label: '制造业', value: 'manufacturing' },
        { label: '零售', value: 'retail' },
        { label: '医疗健康', value: 'healthcare' },
        { label: '教育', value: 'education' },
        { label: '房地产', value: 'realestate' },
        { label: '能源', value: 'energy' },
        { label: '咨询服务', value: 'consulting' },
        { label: '其他', value: 'other' }
      ]
    }),
    number_of_employees: Field.number({
      label: '员工数',
      precision: 0
    }),
    annual_revenue: Field.currency({
      label: '年收入',
      precision: 2
    }),
    lead_source: Field.select({
      label: '线索来源',
      options: [
        { label: 'Web', value: 'web' },
        { label: 'Phone Inquiry', value: 'phone_inquiry' },
        { label: 'Partner Referral', value: 'partner_referral' },
        { label: 'Purchased List', value: 'purchased_list' },
        { label: 'Other', value: 'other' }
      ]
    }),
    is_in_public_pool: Field.boolean({
      label: '是否在公海池',
      defaultValue: false
    }),
    pool_entry_date: Field.datetime({
      label: '进入公海时间'
    }),
    claimed_date: Field.datetime({
      label: '领取时间'
    }),
    street: Field.textarea({
      label: '街道'
    }),
    city: Field.text({
      label: '城市',
      maxLength: 40
    }),
    state: Field.text({
      label: '省份/州',
      maxLength: 40
    }),
    postal_code: Field.text({
      label: '邮编',
      maxLength: 20
    }),
    country: Field.text({
      label: '国家',
      maxLength: 40
    }),
    description: Field.textarea({
      label: '描述'
    }),
    owner_id: Field.lookup('users', {
      label: '负责人',
      required: true,
      defaultValue: '$currentUser'
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    activities: true,
    feeds: true,
    files: true,
    enableDuplicateDetection: true
  }
});
