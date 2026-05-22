import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Lead = ObjectSchema.create({
  name: 'lead',
  label: 'Lead',
  pluralLabel: 'Leads',
  icon: 'user-plus',
  description: 'AI-Native Lead Management Object',

  fields: {
    first_name: Field.text({
      label: 'First Name',
      maxLength: 40
    }),
    last_name: Field.text({
      label: 'Last Name',
      required: true,
      maxLength: 80
    }),
    company: Field.text({
      label: 'Company',
      required: true,
      searchable: true,
      maxLength: 255
    }),
    title: Field.text({
      label: 'Title',
      maxLength: 128
    }),
    email: Field.email({
      label: 'Email',
      searchable: true,
      unique: true
    }),
    phone: Field.phone({
      label: 'Phone'
    }),
    mobile_phone: Field.phone({
      label: 'Mobile'
    }),
    website: Field.url({
      label: 'Website'
    }),
    status: Field.select({
      label: 'Status',
      defaultValue: 'new',
      options: [
        { label: 'New', value: 'new' },
        { label: 'Contacted', value: 'contacted' },
        { label: 'Qualified', value: 'qualified' },
        { label: 'Unqualified', value: 'unqualified' },
        { label: 'Converted', value: 'converted' },
        { label: "Working", value: "working" }
      ]
    }),
    rating: Field.select({
      label: 'Rating',
      options: [
        { label: 'Hot 🔥', value: 'hot' },
        { label: 'Warm ⭐', value: 'warm' },
        { label: 'Cold ❄️', value: 'cold' }
      ]
    }),
    lead_score: Field.number({
      label: 'Lead Score',
      defaultValue: 0,
      precision: 0,
      min: 0
    }),
    data_completeness: Field.number({
      label: 'Data Completeness (%)',
      defaultValue: 0,
      precision: 0,
      min: 0,
      max: 100
    }),
    industry: Field.select({
      label: 'Industry',
      options: [
        { label: 'Technology', value: 'technology' },
        { label: 'Finance', value: 'finance' },
        { label: 'Manufacturing', value: 'manufacturing' },
        { label: 'Retail', value: 'retail' },
        { label: 'Healthcare', value: 'healthcare' },
        { label: 'Education', value: 'education' },
        { label: 'Real Estate', value: 'realestate' },
        { label: 'Energy', value: 'energy' },
        { label: 'Consulting', value: 'consulting' },
        { label: 'Other', value: 'other' },
        { label: "Financial Services", value: "financial_services" },
        { label: "Construction", value: "construction" },
        { label: "Transportation", value: "transportation" },
        { label: "Agriculture", value: "agriculture" },
        { label: "Media & Entertainment", value: "media_entertainment" },
        { label: "Aerospace", value: "aerospace" },
        { label: "Food & Beverage", value: "food_beverage" }
      ]
    }),
    number_of_employees: Field.number({
      label: 'Number of Employees',
      precision: 0
    }),
    annual_revenue: Field.currency({
      label: 'Annual Revenue',
      precision: 2
    }),
    lead_source: Field.select({
      label: 'Lead Source',
      options: [
        { label: 'Web', value: 'web' },
        { label: 'Phone Inquiry', value: 'phone_inquiry' },
        { label: 'Partner Referral', value: 'partner_referral' },
        { label: 'Purchased List', value: 'purchased_list' },
        { label: 'Other', value: 'other' },
        { label: "Referral", value: "referral" },
        { label: "Trade Show", value: "trade_show" },
        { label: "Partner", value: "partner" },
        { label: "Cold Call", value: "cold_call" }
      ]
    }),
    is_in_public_pool: Field.boolean({
      label: 'Is In Public Pool',
      defaultValue: false
    }),
    pool_entry_date: Field.datetime({
      label: 'Pool Entry Date'
    }),
    claimed_date: Field.datetime({
      label: 'Claimed Date'
    }),
    street: Field.textarea({
      label: 'Street'
    }),
    city: Field.text({
      label: 'City',
      maxLength: 40
    }),
    state: Field.text({
      label: 'State/Province',
      maxLength: 40
    }),
    postal_code: Field.text({
      label: 'Postal Code',
      maxLength: 20
    }),
    country: Field.text({
      label: 'Country',
      maxLength: 40
    }),
    description: Field.textarea({
      label: 'Description'
    }),
    owner_id: Field.lookup('users', {
      label: 'Owner',
      required: true,
      defaultValue: '$currentUser'
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    activities: true,
    feeds: true,
    files: true
  }
});
