import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Account = ObjectSchema.create({
  name: 'account',
  label: 'Account',
  pluralLabel: 'Accounts',
  icon: 'building',
  description: '企业客户和组织管理',

  fields: {
    name: Field.text({
      label: 'Account Name',
      required: true,
      unique: true,
      maxLength: 255
    }),
    account_number: Field.text({
      label: 'Account Number',
      unique: true,
      maxLength: 40
    }),
    type: Field.select({
      label: 'Account Type',
      options: [
        {
          "label": "Prospect",
          "value": "Prospect"
        },
        {
          "label": "Customer",
          "value": "Customer"
        },
        {
          "label": "Partner",
          "value": "Partner"
        },
        {
          "label": "Competitor",
          "value": "Competitor"
        },
        {
          "label": "Other",
          "value": "Other"
        }
      ]
    }),
    industry: Field.select({
      label: 'Industry',
      options: [
        {
          "label": "Technology",
          "value": "Technology"
        },
        {
          "label": "Finance",
          "value": "Finance"
        },
        {
          "label": "Manufacturing",
          "value": "Manufacturing"
        },
        {
          "label": "Retail",
          "value": "Retail"
        },
        {
          "label": "Healthcare",
          "value": "Healthcare"
        },
        {
          "label": "Education",
          "value": "Education"
        },
        {
          "label": "Real Estate",
          "value": "RealEstate"
        },
        {
          "label": "Energy",
          "value": "Energy"
        },
        {
          "label": "Consulting",
          "value": "Consulting"
        },
        {
          "label": "Other",
          "value": "Other"
        }
      ]
    }),
    annual_revenue: Field.currency({
      label: 'Annual Revenue',
      precision: 2
    }),
    number_of_employees: Field.number({ label: 'Number of Employees' }),
    rating: Field.select({
      label: 'Rating',
      options: [
        {
          "label": "Hot 🔥",
          "value": "Hot"
        },
        {
          "label": "Warm ⭐",
          "value": "Warm"
        },
        {
          "label": "Cold ❄️",
          "value": "Cold"
        }
      ]
    }),
    phone: Field.phone({ label: 'Phone' }),
    fax: Field.phone({ label: 'Fax' }),
    website: Field.url({ label: 'Website' }),
    email: Field.email({ label: 'Email' }),
    billing_street: Field.textarea({
      label: 'Billing Street',
    }),
    billing_city: Field.text({
      label: 'Billing City',
      maxLength: 40
    }),
    billing_state: Field.text({
      label: 'Billing State/Province',
      maxLength: 40
    }),
    billing_postal_code: Field.text({
      label: 'Billing Postal Code',
      maxLength: 20
    }),
    billing_country: Field.text({
      label: 'Billing Country',
      maxLength: 40
    }),
    shipping_street: Field.textarea({
      label: 'Shipping Street',
    }),
    shipping_city: Field.text({
      label: 'Shipping City',
      maxLength: 40
    }),
    shipping_state: Field.text({
      label: 'Shipping State/Province',
      maxLength: 40
    }),
    shipping_postal_code: Field.text({
      label: 'Shipping Postal Code',
      maxLength: 20
    }),
    shipping_country: Field.text({
      label: 'Shipping Country',
      maxLength: 40
    }),
    customer_status: Field.select({
      label: 'Customer Status',
      defaultValue: 'Prospect',
      options: [
        {
          "label": "Prospect",
          "value": "Prospect"
        },
        {
          "label": "Active Customer",
          "value": "Active Customer"
        },
        {
          "label": "Churned",
          "value": "Churned"
        },
        {
          "label": "On Hold",
          "value": "On Hold"
        }
      ]
    }),
    description: Field.textarea({
      label: 'Description',
    }),
    sla_tier: Field.select({
      label: 'SLA Tier',
      description: '服务等级协议层级',
      options: [
        {
          "label": "Platinum",
          "value": "Platinum"
        },
        {
          "label": "Gold",
          "value": "Gold"
        },
        {
          "label": "Silver",
          "value": "Silver"
        },
        {
          "label": "Standard",
          "value": "Standard"
        }
      ]
    }),
    health_score: Field.number({
      label: 'Health Score',
      description: '客户健康度评分 (0-100)',
      min: 0,
      max: 100,
      precision: 0
    }),
    next_renewal_date: Field.date({ label: 'Next Renewal Date' }),
    contract_value: Field.currency({
      label: 'Contract Value',
      description: '所有有效合同的总价值',
      readonly: true,
      precision: 2
    }),
    owner_id: Field.lookup('users', {
      label: 'Owner',
      required: true,
      defaultValue: '$currentUser'
    }),
    parent_id: Field.lookup('account', { label: 'Parent Account' })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    activities: true,
    feeds: true,
    files: true
  },
});